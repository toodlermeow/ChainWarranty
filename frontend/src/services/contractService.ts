import { BrowserProvider, Contract } from 'ethers';

import contractConfig from '../contracts/contractConfig.json';
import type { 
  WarrantyRecordOnChain, 
  VerificationResult, 
  TransactionReceiptSummary,
  VerificationStatus 
} from '../types';

/**
 * Reusable contract service for ChainWarranty.
 * Enforces pre-flight checks:
 * 1. MetaMask installed & connected.
 * 2. Active account selected.
 * 3. Chain ID matches configured local network (31337).
 * 4. Contract deployed at configured address.
 */

export class ContractServiceError extends Error {
  public code?: string | number;
  constructor(message: string, code?: string | number) {
    super(message);
    this.name = 'ContractServiceError';
    this.code = code;
  }
}

export function parseContractError(err: any): string {
  if (!err) return 'Unknown error occurred.';
  if (err.code === 4001 || err.info?.error?.code === 4001) {
    return 'Transaction rejected by user in MetaMask.';
  }
  if (err.code === -32002) {
    return 'A MetaMask request is already pending. Please open your wallet extension.';
  }
  if (err.reason) {
    return `Smart contract reverted: ${err.reason}`;
  }
  if (err.shortMessage) {
    return err.shortMessage;
  }
  if (err.message) {
    if (err.message.includes('ChainWarranty: caller is not an authorized seller')) {
      return 'Action rejected: Your connected wallet is not an authorized seller on the contract.';
    }
    if (err.message.includes('ChainWarranty: caller is not the owner')) {
      return 'Action rejected: Only the contract deployer (owner) can perform this action.';
    }
    if (err.message.includes('ChainWarranty: warranty already exists')) {
      return 'Action rejected: A warranty with this ID already exists.';
    }
    if (err.message.includes('ChainWarranty: caller not authorized to revoke')) {
      return 'Action rejected: Only the owner or the original issuing seller can revoke this warranty.';
    }
    return err.message;
  }
  return String(err);
}

export class ContractService {
  private static expectedChainId = Number(contractConfig.chainId);
  private static contractAddress = contractConfig.address;
  private static contractAbi = contractConfig.abi;

  /**
   * Pre-flight validation before interacting with contract.
   */
  private static async validateEnvironment(requiresSigner = false) {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new ContractServiceError('MetaMask is not installed or available in this browser.');
    }

    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);

    if (currentChainId !== this.expectedChainId) {
      throw new ContractServiceError(
        `Wrong network detected (Chain ID: ${currentChainId}). Please switch MetaMask to Hardhat Local (Chain ID: ${this.expectedChainId}).`
      );
    }

    if (!this.contractAddress || this.contractAddress === '') {
      throw new ContractServiceError('Contract address is missing from configuration.');
    }

    // Verify contract code exists at this address
    const code = await provider.getCode(this.contractAddress);
    if (!code || code === '0x' || code === '0x0') {
      throw new ContractServiceError(
        `No contract found at address ${this.contractAddress} on Chain ID ${currentChainId}. Please ensure your local Hardhat node is running and deploy the contract using 'npm run deploy:local'.`
      );
    }

    if (requiresSigner) {
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      if (!signerAddress) {
        throw new ContractServiceError('No account connected in MetaMask. Please connect your wallet first.');
      }
      return { provider, signer, accountAddress: signerAddress };
    }


    return { provider };
  }

  /**
   * Returns read-only contract instance.
   */
  public static async getReadContract(): Promise<Contract> {
    const { provider } = await this.validateEnvironment(false);
    return new Contract(this.contractAddress, this.contractAbi, provider);
  }

  /**
   * Returns write-enabled contract instance bound to signer.
   */
  public static async getWriteContract(): Promise<{ contract: Contract; accountAddress: string }> {
    const { signer, accountAddress } = await this.validateEnvironment(true);
    const contract = new Contract(this.contractAddress, this.contractAbi, signer);
    return { contract, accountAddress: accountAddress! };
  }

  /**
   * Checks if a given address is an authorized seller.
   */
  public static async checkSellerAuthorization(sellerAddress: string): Promise<boolean> {
    const contract = await this.getReadContract();
    return await contract.isAuthorizedSeller(sellerAddress);
  }

  /**
   * Checks the contract owner address.
   */
  public static async getOwner(): Promise<string> {
    const contract = await this.getReadContract();
    return await contract.owner();
  }

  /**
   * Issues a new warranty card on-chain.
   * Parameter order: (warrantyId, detailsHash, purchaseTime, expiryTime)
   */
  public static async issueWarranty(
    warrantyId: string,
    detailsHash: string,
    purchaseTimestamp: number,
    expiryTimestamp: number
  ): Promise<TransactionReceiptSummary> {
    const { contract, accountAddress } = await this.getWriteContract();

    // Pre-flight seller authorization check
    const isAuth = await contract.isAuthorizedSeller(accountAddress);
    if (!isAuth) {
      throw new ContractServiceError(
        `Connected wallet (${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}) is not an authorized seller. Only authorized sellers can issue warranties.`
      );
    }

    // Call issueWarranty on smart contract
    const tx = await contract.issueWarranty(
      warrantyId,
      detailsHash,
      purchaseTimestamp,
      expiryTimestamp
    );

    // Explicitly wait for block confirmation
    const receipt = await tx.wait();

    return {
      warrantyId,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      detailsHash,
      sellerAddress: accountAddress,
      purchaseTimestamp,
      expiryTimestamp,
    };
  }

  /**
   * Verifies a warranty using both on-chain status and candidate details hash.
   */
  public static async verifyWarranty(
    warrantyId: string,
    candidateDetailsHash: string
  ): Promise<VerificationResult> {
    const contract = await this.getReadContract();

    // Call verifyWarranty(bytes32, bytes32)
    const [isValid, statusString]: [boolean, string] = await contract.verifyWarranty(
      warrantyId,
      candidateDetailsHash
    );

    let onChainRecord: WarrantyRecordOnChain | undefined = undefined;

    // If record exists, fetch raw details
    if (statusString !== 'NOT_FOUND') {
      try {
        const raw = await contract.getWarranty(warrantyId);
        onChainRecord = {
          warrantyId: raw.warrantyId,
          detailsHash: raw.detailsHash,
          issuingSeller: raw.issuingSeller,
          purchaseTime: Number(raw.purchaseTime),
          expiryTime: Number(raw.expiryTime),
          isRevoked: Boolean(raw.revoked),
        };
      } catch {
        // Fallback if getWarranty fails
      }
    }

    return {
      isValid,
      statusString: statusString as VerificationStatus,
      computedDetailsHash: candidateDetailsHash,
      onChainRecord,
      checkedAt: new Date().toLocaleTimeString(),
    };
  }

  /**
   * Retrieves full warranty record by ID.
   */
  public static async getWarranty(warrantyId: string): Promise<WarrantyRecordOnChain> {
    const contract = await this.getReadContract();
    const raw = await contract.getWarranty(warrantyId);
    return {
      warrantyId: raw.warrantyId,
      detailsHash: raw.detailsHash,
      issuingSeller: raw.issuingSeller,
      purchaseTime: Number(raw.purchaseTime),
      expiryTime: Number(raw.expiryTime),
      isRevoked: Boolean(raw.revoked),
    };
  }

  /**
   * Revokes a warranty record.
   * Access: Owner or original issuing seller.
   */
  public static async revokeWarranty(warrantyId: string, reason: string): Promise<string> {
    const { contract } = await this.getWriteContract();
    const tx = await contract.revokeWarranty(warrantyId, reason);
    await tx.wait();
    return tx.hash;
  }

  /**
   * Authorizes a seller (Owner only).
   */
  public static async authorizeSeller(sellerAddress: string): Promise<string> {
    const { contract } = await this.getWriteContract();
    const tx = await contract.authorizeSeller(sellerAddress);
    await tx.wait();
    return tx.hash;
  }

  /**
   * Removes an authorized seller (Owner only).
   */
  public static async removeSeller(sellerAddress: string): Promise<string> {
    const { contract } = await this.getWriteContract();
    const tx = await contract.removeSeller(sellerAddress);
    await tx.wait();
    return tx.hash;
  }

  /**
   * Fetches recent warranty issued events reliably from local block logs.
   */
  public static async fetchRecentIssuedEvents(limit = 10): Promise<WarrantyRecordOnChain[]> {
    try {
      const contract = await this.getReadContract();
      const filter = contract.filters.WarrantyIssued();
      const events = await contract.queryFilter(filter, 0, 'latest');

      const recentEvents = events.slice(-limit).reverse();
      const records: WarrantyRecordOnChain[] = [];

      for (const event of recentEvents) {
        if ('args' in event && event.args) {
          const id = event.args[0];
          try {
            const raw = await contract.getWarranty(id);
            records.push({
              warrantyId: raw.warrantyId,
              detailsHash: raw.detailsHash,
              issuingSeller: raw.issuingSeller,
              purchaseTime: Number(raw.purchaseTime),
              expiryTime: Number(raw.expiryTime),
              isRevoked: Boolean(raw.revoked),
            });
          } catch {
            // Ignore single query error
          }
        }
      }

      return records;
    } catch {
      return [];
    }
  }
}

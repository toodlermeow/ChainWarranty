export interface AppConfig {
  appName: string;
  version: string;
  description: string;
}

export type PageId = 'dashboard' | 'issue' | 'verify' | 'list';

export interface NavItem {
  id: PageId;
  label: string;
  description: string;
}

export interface WarrantyFormData {
  productName: string;
  productCategory: string;
  serialNumber: string;
  purchaseDate: string;
  durationMonths: number;
}

export interface FormErrors {
  productName?: string;
  productCategory?: string;
  serialNumber?: string;
  purchaseDate?: string;
  durationMonths?: string;
}

export interface WarrantyRecordPlaceholder {
  id: string;
  productName: string;
  category: string;
  serialNumber: string;
  purchaseDate: string;
  expiryDate: string;
  status: 'Active' | 'Expired' | 'Revoked';
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  expectedChainId: number;
  expectedNetworkName: string;
  contractAddress: string;
  isMetaMaskInstalled: boolean;
  isConnecting: boolean;
  errorMessage: string | null;
}

export interface WarrantyRecordOnChain {
  warrantyId: string;
  detailsHash: string;
  issuingSeller: string;
  purchaseTime: number;
  expiryTime: number;
  isRevoked: boolean;
}

export type VerificationStatus = 'VALID' | 'REVOKED' | 'EXPIRED' | 'HASH_MISMATCH' | 'NOT_FOUND';

export interface VerificationResult {
  isValid: boolean;
  statusString: VerificationStatus;
  computedDetailsHash: string;
  onChainRecord?: WarrantyRecordOnChain;
  checkedAt: string;
}

export interface TransactionReceiptSummary {
  warrantyId: string;
  transactionHash: string;
  blockNumber: number;
  detailsHash: string;
  sellerAddress: string;
  purchaseTimestamp: number;
  expiryTimestamp: number;
}

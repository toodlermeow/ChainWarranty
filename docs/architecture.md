# ChainWarranty Architecture & Workflows

This document details the architectural layout, component interactions, security model, and data flows of the **ChainWarranty** decentralized digital warranty system.

---

## 1. System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["Frontend Client Layer (Browser)"]
        User["User / Merchant / Auditor"]
        UI["React 19 + TypeScript + Vite UI<br/>(Tailwind CSS & Lucide Icons)"]
        WalletHook["useWallet Hook<br/>(Account & Network State)"]
        ContractSvc["ContractService<br/>(Ethers.js v6 Wrapper & Validation)"]
        HashUtil["Hash Utilities<br/>(Canonical Normalization & Keccak-256)"]
        Config["contractConfig.json<br/>(ABI & Local Contract Address)"]
    end

    subgraph WalletLayer["Web3 Wallet Provider"]
        MetaMask["MetaMask Browser Extension<br/>(Signer & JSON-RPC Provider)"]
    end

    subgraph BlockchainLayer["Blockchain Network (Local Hardhat Node)"]
        RPC["Hardhat RPC Node<br/>(http://127.0.0.1:8545 / Chain ID 31337)"]
        Contract["ChainWarranty Smart Contract<br/>(Solidity 0.8.20)"]
        
        subgraph Storage["On-Chain Storage"]
            OwnerVar["owner (address)"]
            AuthMapping["isAuthorizedSeller (mapping)"]
            WarrantiesMapping["warranties (mapping bytes32 => WarrantyRecord)"]
        end
        
        subgraph Events["Contract Event Logs"]
            AuthEvent["SellerAuthorizationUpdated"]
            IssueEvent["WarrantyIssued"]
            RevokeEvent["WarrantyRevoked"]
        end
    end

    User -->|Interacts with UI| UI
    UI --> WalletHook
    UI --> ContractSvc
    UI --> HashUtil
    ContractSvc --> Config
    WalletHook --> MetaMask
    ContractSvc --> MetaMask
    MetaMask -->|JSON-RPC Transactions / Calls| RPC
    RPC --> Contract
    Contract --> Storage
    Contract --> Events
    Events -.->|Filter / Query Logs| ContractSvc
```

---

## 2. Core Operational Workflows

### A. Seller Authorization Workflow (Owner Only)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Contract Owner (Deployer)
    participant UI as ChainWarranty Frontend / Script
    participant MM as MetaMask Wallet
    participant SC as ChainWarranty Smart Contract

    Owner->>UI: Request authorization for seller address
    UI->>MM: Prepare `authorizeSeller(sellerAddress)` transaction
    MM->>SC: Send transaction signed by Owner
    SC->>SC: Require caller == owner
    SC->>SC: Require sellerAddress != 0x0 && !isAuthorizedSeller[address]
    SC->>SC: isAuthorizedSeller[address] = true
    SC-->>UI: Emit SellerAuthorizationUpdated(sellerAddress, true)
    UI-->>Owner: Confirmation: Seller is now authorized to issue warranties
```

---

### B. Warranty Issuance Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Seller as Authorized Seller
    participant UI as Issue Warranty Page
    participant HashUtil as hashUtils.ts
    participant MM as MetaMask Wallet
    participant SC as ChainWarranty Smart Contract

    Seller->>UI: Enter Product Metadata (Category, Model, Serial, Dates)
    UI->>HashUtil: sanitizeField() & buildCanonicalDetailsString()
    Note over HashUtil: Canonical format: category:<cat>|product:<prod>|serial:<serial>
    HashUtil-->>UI: Compute Keccak-256 detailsHash
    UI->>HashUtil: generateSecureWarrantyId() via window.crypto.getRandomValues
    HashUtil-->>UI: bytes32 warrantyId
    UI->>MM: Submit `issueWarranty(warrantyId, detailsHash, purchaseTime, expiryTime)`
    MM->>SC: Send transaction from Seller account
    SC->>SC: Check onlyAuthorizedSeller
    SC->>SC: Validate timestamps (expiry > purchase) & uniqueness
    SC->>SC: Store WarrantyRecord struct
    SC-->>UI: Emit WarrantyIssued(warrantyId, detailsHash, seller, purchaseTime, expiryTime)
    UI-->>Seller: Success: Digital Warranty Card issued on-chain
```

---

### C. Warranty Verification Workflow (Public Read)

```mermaid
sequenceDiagram
    autonumber
    actor Verifier as Consumer / Merchant / Auditor
    participant UI as Verify Warranty Page
    participant HashUtil as hashUtils.ts
    participant SC as ChainWarranty Smart Contract

    Verifier->>UI: Enter warrantyId + claimed product details
    UI->>HashUtil: Normalize details & compute candidateHash
    UI->>SC: Call `verifyWarranty(warrantyId, candidateHash)` (View call - 0 gas)
    SC->>SC: Lookup warranty record by warrantyId
    alt Warranty does not exist
        SC-->>UI: (false, "NOT_FOUND")
    else Warranty is flagged isRevoked
        SC-->>UI: (false, "REVOKED")
    else block.timestamp >= expiryTime
        SC-->>UI: (false, "EXPIRED")
    else record.detailsHash != candidateHash
        SC-->>UI: (false, "HASH_MISMATCH")
    else All checks pass
        SC-->>UI: (true, "VALID")
    end
    UI-->>Verifier: Display color-coded verification status banner & record metadata
```

---

### D. Warranty Revocation Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Caller as Contract Owner OR Issuing Seller
    participant UI as Warranty List / Revoke Modal
    participant MM as MetaMask Wallet
    participant SC as ChainWarranty Smart Contract

    Caller->>UI: Select warranty & enter revocation reason
    UI->>MM: Request `revokeWarranty(warrantyId, reason)`
    MM->>SC: Submit signed transaction
    SC->>SC: Check warranty exists and !isRevoked
    SC->>SC: Require msg.sender == owner OR msg.sender == issuingSeller
    SC->>SC: record.isRevoked = true
    SC-->>UI: Emit WarrantyRevoked(warrantyId, caller, reason)
    UI-->>Caller: Confirmation: Warranty marked REVOKED permanently on-chain
```

---

## 3. Privacy & Cryptographic Verification Rationale

1. **Zero Personally Identifiable Information (PII) On-Chain**:
   - Product categories, product names, and serial numbers are never stored in plaintext on the blockchain.
   - Only a cryptographic fingerprint (`detailsHash = keccak256(...)`) is stored.
2. **Canonical Normalization**:
   - Fields are trimmed, lowercased, and joined with explicit prefixes and delimiters (`category:...|product:...|serial:...`).
   - The pipe symbol `|` is prohibited in raw inputs to prevent injection or boundary collisions.
3. **Verification Boundary**:
   - Cryptographic hash verification proves mathematically that the submitted details match the exact parameters recorded at issuance time.
   - It guarantees mathematical consistency and tamper detection; it does not replace physical authentication of physical goods.

# Recommended Project Screenshots Guide

To showcase ChainWarranty in your portfolio, project presentations, and GitHub repository, you can capture screenshots from your browser while running the local application (`npm run dev` in `frontend/`).

Place your captured image files in this directory (`docs/screenshots/`).

### Suggested Screenshots to Capture:

1. **`01_dashboard.png`**
   - **Page**: Dashboard Overview
   - **What to show**: The main dashboard displaying system summary statistics (Total Warranties, Active Records, System State), network connection status (Hardhat Local Chain ID `31337`), and quick navigation.

2. **`02_issue_warranty.png`**
   - **Page**: Issue Warranty (`/issue`)
   - **What to show**: The warranty issuance form populated with product details (Category, Product Name, Serial Number, Purchase Date, Expiry Date), with an authorized seller account connected.

3. **`03_transaction_confirmed.png`**
   - **Page**: Issue Warranty or MetaMask Notification
   - **What to show**: Transaction success alert showing the generated Warranty ID and computed Keccak-256 Details Hash recorded on the local blockchain.

4. **`04_verify_valid.png`**
   - **Page**: Verify Warranty (`/verify`)
   - **What to show**: The verification form showing a green **VALID** status banner confirming matching cryptographic hash, active expiry, and unrevoked status.

5. **`05_warranty_list.png`**
   - **Page**: Warranty Records List (`/list`)
   - **What to show**: The table or card list populated from contract events (`WarrantyIssued` and `WarrantyRevoked`), showing records with their respective status tags.

6. **`06_verify_revoked.png`**
   - **Page**: Verify Warranty (`/verify`)
   - **What to show**: Verification result displaying a red **REVOKED** status badge after a warranty has been invalidated on-chain.

> [!NOTE]
> Ensure no sensitive personal information, private keys, or seed phrases are visible in browser extensions when capturing screenshots.

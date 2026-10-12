// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title ChainWarranty
 * @dev Blockchain-Based Digital Warranty Card System.
 * 
 * College Project Implementation:
 * - Second-year BTech CSE friendly: well-commented, modular, and easy to explain in a viva.
 * - Stores normalized SHA-256 / keccak256 hashes of warranty parameters rather than PII (Personally Identifiable Information).
 * - Restricts seller authorization to the contract deployer (owner) only; no public self-authorization.
 * - Restricts warranty issuance to currently authorized sellers.
 * - Enforces immutable record keeping, timestamp sanity, and explicit revocation policy.
 */
contract ChainWarranty {
    // -------------------------------------------------------------------------
    // STATE VARIABLES
    // -------------------------------------------------------------------------

    /// @notice Contract administrator/deployer (analogous to 'root' or 'admin' in software systems).
    address public owner;

    /// @notice Tracks authorization status for each seller address (address => bool).
    mapping(address => bool) public isAuthorizedSeller;

    /// @dev Structure representing an on-chain digital warranty record.
    /// In C/C++, this is equivalent to a 'struct WarrantyRecord'.
    struct WarrantyRecord {
        bytes32 warrantyId;       // Unique cryptographic/system identifier for the warranty card
        bytes32 detailsHash;      // Keccak256 hash of normalized details (product, serial number, etc.)
        address issuingSeller;    // Address of the authorized seller that minted this record
        uint256 purchaseTime;     // Unix timestamp (seconds) when product was purchased
        uint256 expiryTime;       // Unix timestamp (seconds) when warranty expires
        bool isRevoked;           // Revocation flag (true = warranty voided/revoked)
    }

    /// @notice Mapping from warrantyId to its full WarrantyRecord data.
    /// In C++ this is like std::unordered_map<bytes32, WarrantyRecord>.
    /// In Java this is like HashMap<bytes32, WarrantyRecord>.
    /// In Python this is like dict[bytes32, WarrantyRecord].
    mapping(bytes32 => WarrantyRecord) private warranties;

    // -------------------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------------------

    /// @notice Emitted when a seller's authorization is granted or revoked by the owner.
    event SellerAuthorizationUpdated(address indexed seller, bool isAuthorized);

    /// @notice Emitted when a new digital warranty card is recorded on-chain.
    event WarrantyIssued(
        bytes32 indexed warrantyId,
        bytes32 indexed detailsHash,
        address indexed issuingSeller,
        uint256 purchaseTime,
        uint256 expiryTime
    );

    /// @notice Emitted when a warranty card is explicitly revoked.
    event WarrantyRevoked(bytes32 indexed warrantyId, address indexed revokedBy, string reason);

    // -------------------------------------------------------------------------
    // MODIFIERS (Function Guards)
    // -------------------------------------------------------------------------

    /// @dev Restricts execution to the contract owner.
    modifier onlyOwner() {
        require(msg.sender == owner, "ChainWarranty: caller is not the owner");
        _;
    }

    /// @dev Restricts execution to actively authorized sellers.
    modifier onlyAuthorizedSeller() {
        require(isAuthorizedSeller[msg.sender], "ChainWarranty: caller is not an authorized seller");
        _;
    }

    // -------------------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------------------

    /// @notice Initializes contract and sets deployer as contract owner.
    constructor() {
        owner = msg.sender;
    }

    // -------------------------------------------------------------------------
    // SELLER MANAGEMENT (Owner Only)
    // -------------------------------------------------------------------------

    /**
     * @notice Authorizes a merchant/brand address to issue digital warranties.
     * @dev Only the contract owner can call this. No public self-authorization.
     * @param _seller The Ethereum address of the seller to authorize.
     */
    function authorizeSeller(address _seller) external onlyOwner {
        require(_seller != address(0), "ChainWarranty: seller cannot be zero address");
        require(!isAuthorizedSeller[_seller], "ChainWarranty: seller already authorized");
        
        isAuthorizedSeller[_seller] = true;
        emit SellerAuthorizationUpdated(_seller, true);
    }

    /**
     * @notice Revokes the authorization of an existing seller.
     * @dev Only the contract owner can call this.
     * @param _seller The Ethereum address of the seller to de-authorize.
     */
    function removeSeller(address _seller) external onlyOwner {
        require(_seller != address(0), "ChainWarranty: seller cannot be zero address");
        require(isAuthorizedSeller[_seller], "ChainWarranty: seller is not authorized");
        
        isAuthorizedSeller[_seller] = false;
        emit SellerAuthorizationUpdated(_seller, false);
    }

    // -------------------------------------------------------------------------
    // WARRANTY ISSUANCE (Authorized Sellers Only)
    // -------------------------------------------------------------------------

    /**
     * @notice Issues a new immutable digital warranty card record.
     * @dev Only currently authorized sellers can issue warranties.
     * @param _warrantyId Unique bytes32 identifier for this warranty.
     * @param _detailsHash Keccak256 hash of normalized product metadata (protects customer privacy).
     * @param _purchaseTime Unix timestamp of purchase (must be <= current block time or non-future).
     * @param _expiryTime Unix timestamp of warranty expiry (must be strictly > purchaseTime).
     */
    function issueWarranty(
        bytes32 _warrantyId,
        bytes32 _detailsHash,
        uint256 _purchaseTime,
        uint256 _expiryTime
    ) external onlyAuthorizedSeller {
        require(_warrantyId != bytes32(0), "ChainWarranty: warrantyId cannot be zero");
        require(_detailsHash != bytes32(0), "ChainWarranty: detailsHash cannot be zero");
        require(warranties[_warrantyId].warrantyId == bytes32(0), "ChainWarranty: warranty already exists");
        require(_purchaseTime > 0, "ChainWarranty: purchaseTime must be positive");
        require(_expiryTime > _purchaseTime, "ChainWarranty: expiryTime must be after purchaseTime");

        // Record warranty in storage mapping
        warranties[_warrantyId] = WarrantyRecord({
            warrantyId: _warrantyId,
            detailsHash: _detailsHash,
            issuingSeller: msg.sender,
            purchaseTime: _purchaseTime,
            expiryTime: _expiryTime,
            isRevoked: false
        });

        emit WarrantyIssued(
            _warrantyId,
            _detailsHash,
            msg.sender,
            _purchaseTime,
            _expiryTime
        );
    }

    // -------------------------------------------------------------------------
    // WARRANTY REVOCATION
    // -------------------------------------------------------------------------

    /**
     * @notice Revokes a warranty under authorized policy:
     * - Contract owner can revoke any warranty.
     * - The seller who originally issued the warranty can revoke their own issued warranty.
     * - Unauthorized accounts are strictly rejected.
     * @param _warrantyId The unique ID of the warranty to revoke.
     * @param _reason A brief description explaining why the warranty was voided.
     */
    function revokeWarranty(bytes32 _warrantyId, string calldata _reason) external {
        WarrantyRecord storage record = warranties[_warrantyId];
        require(record.warrantyId != bytes32(0), "ChainWarranty: warranty does not exist");
        require(!record.isRevoked, "ChainWarranty: warranty is already revoked");

        // Authorization check: Only owner OR original issuing seller can revoke
        require(
            msg.sender == owner || msg.sender == record.issuingSeller,
            "ChainWarranty: caller not authorized to revoke this warranty"
        );

        record.isRevoked = true;
        emit WarrantyRevoked(_warrantyId, msg.sender, _reason);
    }

    // -------------------------------------------------------------------------
    // WARRANTY INSPECTION & VERIFICATION (Public Read)
    // -------------------------------------------------------------------------

    /**
     * @notice Retrieves full record data for a given warranty ID.
     * @param _warrantyId Unique bytes32 identifier of the warranty.
     * @return warrantyId Unique ID
     * @return detailsHash Hash of normalized parameters
     * @return issuingSeller Address of issuing seller
     * @return purchaseTime Unix timestamp of purchase
     * @return expiryTime Unix timestamp of expiry
     * @return revoked Revocation flag
     */
    function getWarranty(bytes32 _warrantyId)
        external
        view
        returns (
            bytes32 warrantyId,
            bytes32 detailsHash,
            address issuingSeller,
            uint256 purchaseTime,
            uint256 expiryTime,
            bool revoked
        )
    {
        WarrantyRecord memory record = warranties[_warrantyId];
        require(record.warrantyId != bytes32(0), "ChainWarranty: warranty does not exist");

        return (
            record.warrantyId,
            record.detailsHash,
            record.issuingSeller,
            record.purchaseTime,
            record.expiryTime,
            record.isRevoked
        );
    }


    /**
     * @notice Checks whether a warranty ID exists in storage.
     * @param _warrantyId Unique bytes32 identifier.
     * @return True if recorded on-chain, false otherwise.
     */
    function exists(bytes32 _warrantyId) external view returns (bool) {
        return warranties[_warrantyId].warrantyId != bytes32(0);
    }

    /**
     * @notice Checks if the provided details hash matches the recorded hash.
     * @dev Demonstrates consistency with supplied records (does not claim physical authenticity).
     * @param _warrantyId Unique bytes32 identifier.
     * @param _candidateHash Hash calculated off-chain from user-provided record parameters.
     * @return True if warranty exists and candidateHash equals detailsHash; false otherwise.
     */
    function checkDetailsMatch(bytes32 _warrantyId, bytes32 _candidateHash)
        external
        view
        returns (bool)
    {
        WarrantyRecord memory record = warranties[_warrantyId];
        if (record.warrantyId == bytes32(0)) {
            return false;
        }
        return record.detailsHash == _candidateHash;
    }

    /**
     * @notice Checks whether a recorded warranty has passed its expiration timestamp.
     * @param _warrantyId Unique bytes32 identifier.
     * @return True if expired (block.timestamp >= expiryTime), false if still within valid duration.
     */
    function isExpired(bytes32 _warrantyId) external view returns (bool) {
        WarrantyRecord memory record = warranties[_warrantyId];
        require(record.warrantyId != bytes32(0), "ChainWarranty: warranty does not exist");
        return block.timestamp >= record.expiryTime;
    }

    /**
     * @notice Checks whether a warranty is revoked.
     * @param _warrantyId Unique bytes32 identifier.
     * @return True if revoked, false otherwise.
     */
    function isRevoked(bytes32 _warrantyId) external view returns (bool) {
        WarrantyRecord memory record = warranties[_warrantyId];
        require(record.warrantyId != bytes32(0), "ChainWarranty: warranty does not exist");
        return record.isRevoked;
    }

    /**
     * @notice Evaluates complete active validity in a single call:
     * - Warranty exists.
     * - Warranty is NOT revoked.
     * - Warranty has NOT expired (block.timestamp < expiryTime).
     * - Provided detailsHash matches the stored on-chain hash.
     * @param _warrantyId Unique bytes32 identifier.
     * @param _candidateHash Hash of claimed product details.
     * @return isValid Boolean indicating full valid state.
     * @return statusString Human-readable status string ("VALID", "REVOKED", "EXPIRED", "HASH_MISMATCH", "NOT_FOUND").
     */
    function verifyWarranty(bytes32 _warrantyId, bytes32 _candidateHash)
        external
        view
        returns (bool isValid, string memory statusString)
    {
        WarrantyRecord memory record = warranties[_warrantyId];
        if (record.warrantyId == bytes32(0)) {
            return (false, "NOT_FOUND");
        }
        if (record.isRevoked) {
            return (false, "REVOKED");
        }
        if (block.timestamp >= record.expiryTime) {
            return (false, "EXPIRED");
        }
        if (record.detailsHash != _candidateHash) {
            return (false, "HASH_MISMATCH");
        }

        return (true, "VALID");
    }
}

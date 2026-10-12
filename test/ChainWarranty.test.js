const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ChainWarranty Smart Contract Test Suite", function () {
  let chainWarranty;
  let owner;
  let seller1;
  let seller2;
  let customer;
  let unauthorizedAccount;

  // Standard sample data
  const sampleWarrantyId = ethers.keccak256(ethers.toUtf8Bytes("WARRANTY-SERIAL-10001"));
  const sampleDetailsHash = ethers.keccak256(
    ethers.toUtf8Bytes("category:electronics|product:headphones|serial:SN-987654321")
  );
  const mismatchedDetailsHash = ethers.keccak256(
    ethers.toUtf8Bytes("category:electronics|product:fakephone|serial:SN-000000000")
  );

  beforeEach(async function () {
    [owner, seller1, seller2, customer, unauthorizedAccount] = await ethers.getSigners();

    const ChainWarrantyFactory = await ethers.getContractFactory("ChainWarranty");
    chainWarranty = await ChainWarrantyFactory.deploy();
    await chainWarranty.waitForDeployment();
  });

  // ---------------------------------------------------------------------------
  // 1. OWNERSHIP & INITIALIZATION
  // ---------------------------------------------------------------------------
  describe("1. Ownership & Initialization", function () {
    it("Should initialize the deployer as the owner", async function () {
      expect(await chainWarranty.owner()).to.equal(owner.address);
    });

    it("Should not have any sellers authorized initially", async function () {
      expect(await chainWarranty.isAuthorizedSeller(seller1.address)).to.be.false;
      expect(await chainWarranty.isAuthorizedSeller(seller2.address)).to.be.false;
    });
  });

  // ---------------------------------------------------------------------------
  // 2. SELLER AUTHORIZATION
  // ---------------------------------------------------------------------------
  describe("2. Seller Authorization Controls", function () {
    it("Owner can authorize a seller", async function () {
      await expect(chainWarranty.connect(owner).authorizeSeller(seller1.address))
        .to.emit(chainWarranty, "SellerAuthorizationUpdated")
        .withArgs(seller1.address, true);

      expect(await chainWarranty.isAuthorizedSeller(seller1.address)).to.be.true;
    });

    it("Owner can remove an authorized seller", async function () {
      await chainWarranty.connect(owner).authorizeSeller(seller1.address);
      expect(await chainWarranty.isAuthorizedSeller(seller1.address)).to.be.true;

      await expect(chainWarranty.connect(owner).removeSeller(seller1.address))
        .to.emit(chainWarranty, "SellerAuthorizationUpdated")
        .withArgs(seller1.address, false);

      expect(await chainWarranty.isAuthorizedSeller(seller1.address)).to.be.false;
    });

    it("Non-owner cannot authorize sellers", async function () {
      await expect(
        chainWarranty.connect(unauthorizedAccount).authorizeSeller(seller1.address)
      ).to.be.revertedWith("ChainWarranty: caller is not the owner");
    });

    it("Non-owner cannot remove sellers", async function () {
      await chainWarranty.connect(owner).authorizeSeller(seller1.address);

      await expect(
        chainWarranty.connect(unauthorizedAccount).removeSeller(seller1.address)
      ).to.be.revertedWith("ChainWarranty: caller is not the owner");
    });

    it("Should reject authorizing zero address", async function () {
      await expect(
        chainWarranty.connect(owner).authorizeSeller(ethers.ZeroAddress)
      ).to.be.revertedWith("ChainWarranty: seller cannot be zero address");
    });

    it("Should reject duplicate authorization of an already authorized seller", async function () {
      await chainWarranty.connect(owner).authorizeSeller(seller1.address);
      await expect(
        chainWarranty.connect(owner).authorizeSeller(seller1.address)
      ).to.be.revertedWith("ChainWarranty: seller already authorized");
    });

    it("Should reject removing an unauthorized seller", async function () {
      await expect(
        chainWarranty.connect(owner).removeSeller(seller1.address)
      ).to.be.revertedWith("ChainWarranty: seller is not authorized");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. WARRANTY ISSUANCE
  // ---------------------------------------------------------------------------
  describe("3. Warranty Issuance", function () {
    let now;
    let purchaseTime;
    let expiryTime;

    beforeEach(async function () {
      await chainWarranty.connect(owner).authorizeSeller(seller1.address);
      now = await time.latest();
      purchaseTime = now;
      expiryTime = now + 365 * 24 * 3600; // 1 year later
    });

    it("Authorized seller can issue a valid warranty and emit WarrantyIssued", async function () {
      await expect(
        chainWarranty
          .connect(seller1)
          .issueWarranty(sampleWarrantyId, sampleDetailsHash, purchaseTime, expiryTime)
      )
        .to.emit(chainWarranty, "WarrantyIssued")
        .withArgs(sampleWarrantyId, sampleDetailsHash, seller1.address, purchaseTime, expiryTime);

      expect(await chainWarranty.exists(sampleWarrantyId)).to.be.true;
    });

    it("Unauthorized account cannot issue a warranty", async function () {
      await expect(
        chainWarranty
          .connect(unauthorizedAccount)
          .issueWarranty(sampleWarrantyId, sampleDetailsHash, purchaseTime, expiryTime)
      ).to.be.revertedWith("ChainWarranty: caller is not an authorized seller");
    });

    it("De-authorized seller cannot issue a warranty", async function () {
      await chainWarranty.connect(owner).removeSeller(seller1.address);

      await expect(
        chainWarranty
          .connect(seller1)
          .issueWarranty(sampleWarrantyId, sampleDetailsHash, purchaseTime, expiryTime)
      ).to.be.revertedWith("ChainWarranty: caller is not an authorized seller");
    });

    it("Rejects duplicate warranty ID", async function () {
      await chainWarranty
        .connect(seller1)
        .issueWarranty(sampleWarrantyId, sampleDetailsHash, purchaseTime, expiryTime);

      await expect(
        chainWarranty
          .connect(seller1)
          .issueWarranty(sampleWarrantyId, sampleDetailsHash, purchaseTime, expiryTime)
      ).to.be.revertedWith("ChainWarranty: warranty already exists");
    });

    it("Rejects zero warranty ID", async function () {
      await expect(
        chainWarranty
          .connect(seller1)
          .issueWarranty(ethers.ZeroHash, sampleDetailsHash, purchaseTime, expiryTime)
      ).to.be.revertedWith("ChainWarranty: warrantyId cannot be zero");
    });

    it("Rejects zero detailsHash", async function () {
      await expect(
        chainWarranty
          .connect(seller1)
          .issueWarranty(sampleWarrantyId, ethers.ZeroHash, purchaseTime, expiryTime)
      ).to.be.revertedWith("ChainWarranty: detailsHash cannot be zero");
    });

    it("Rejects zero purchase timestamp", async function () {
      await expect(
        chainWarranty
          .connect(seller1)
          .issueWarranty(sampleWarrantyId, sampleDetailsHash, 0, expiryTime)
      ).to.be.revertedWith("ChainWarranty: purchaseTime must be positive");
    });

    it("Rejects expiry time before or equal to purchase time", async function () {
      // Expiry equal to purchase
      await expect(
        chainWarranty
          .connect(seller1)
          .issueWarranty(sampleWarrantyId, sampleDetailsHash, purchaseTime, purchaseTime)
      ).to.be.revertedWith("ChainWarranty: expiryTime must be after purchaseTime");

      // Expiry before purchase
      await expect(
        chainWarranty
          .connect(seller1)
          .issueWarranty(sampleWarrantyId, sampleDetailsHash, purchaseTime, purchaseTime - 100)
      ).to.be.revertedWith("ChainWarranty: expiryTime must be after purchaseTime");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. RETRIEVAL & HASH VERIFICATION
  // ---------------------------------------------------------------------------
  describe("4. Record Retrieval & Hash Verification", function () {
    let purchaseTime;
    let expiryTime;

    beforeEach(async function () {
      await chainWarranty.connect(owner).authorizeSeller(seller1.address);
      const now = await time.latest();
      purchaseTime = now;
      expiryTime = now + 180 * 24 * 3600; // 6 months

      await chainWarranty
        .connect(seller1)
        .issueWarranty(sampleWarrantyId, sampleDetailsHash, purchaseTime, expiryTime);
    });

    it("getWarranty returns all exact record fields", async function () {
      const record = await chainWarranty.getWarranty(sampleWarrantyId);
      expect(record.warrantyId).to.equal(sampleWarrantyId);
      expect(record.detailsHash).to.equal(sampleDetailsHash);
      expect(record.issuingSeller).to.equal(seller1.address);
      expect(record.purchaseTime).to.equal(purchaseTime);
      expect(record.expiryTime).to.equal(expiryTime);
      expect(record.revoked).to.be.false;
    });

    it("getWarranty reverts on non-existent warranty ID", async function () {
      const nonExistentId = ethers.keccak256(ethers.toUtf8Bytes("DOES_NOT_EXIST"));
      await expect(chainWarranty.getWarranty(nonExistentId)).to.be.revertedWith(
        "ChainWarranty: warranty does not exist"
      );
    });

    it("checkDetailsMatch returns true for matching hash and false for mismatching hash", async function () {
      expect(await chainWarranty.checkDetailsMatch(sampleWarrantyId, sampleDetailsHash)).to.be.true;
      expect(await chainWarranty.checkDetailsMatch(sampleWarrantyId, mismatchedDetailsHash)).to.be.false;
    });

    it("checkDetailsMatch returns false for non-existent warranty ID", async function () {
      const nonExistentId = ethers.keccak256(ethers.toUtf8Bytes("NON_EXISTENT_ID"));
      expect(await chainWarranty.checkDetailsMatch(nonExistentId, sampleDetailsHash)).to.be.false;
    });
  });

  // ---------------------------------------------------------------------------
  // 5. EXPIRATION BEHAVIOR
  // ---------------------------------------------------------------------------
  describe("5. Expiration Behavior", function () {
    let expiryTime;

    beforeEach(async function () {
      await chainWarranty.connect(owner).authorizeSeller(seller1.address);
      const now = await time.latest();
      const purchaseTime = now;
      expiryTime = now + 60; // expires in 60 seconds

      await chainWarranty
        .connect(seller1)
        .issueWarranty(sampleWarrantyId, sampleDetailsHash, purchaseTime, expiryTime);
    });

    it("isExpired returns false before expiry time", async function () {
      expect(await chainWarranty.isExpired(sampleWarrantyId)).to.be.false;
    });

    it("isExpired returns true after time passes expiry time", async function () {
      // Fast forward time past expiry
      await time.increaseTo(expiryTime + 1);
      expect(await chainWarranty.isExpired(sampleWarrantyId)).to.be.true;
    });

    it("verifyWarranty returns EXPIRED status after expiration", async function () {
      await time.increaseTo(expiryTime + 5);
      const result = await chainWarranty.verifyWarranty(sampleWarrantyId, sampleDetailsHash);
      expect(result.isValid).to.be.false;
      expect(result.statusString).to.equal("EXPIRED");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. REVOCATION POLICY & SECURITY
  // ---------------------------------------------------------------------------
  describe("6. Revocation Policy & Access Control", function () {
    beforeEach(async function () {
      await chainWarranty.connect(owner).authorizeSeller(seller1.address);
      const now = await time.latest();
      const purchaseTime = now;
      const expiryTime = now + 365 * 24 * 3600;

      await chainWarranty
        .connect(seller1)
        .issueWarranty(sampleWarrantyId, sampleDetailsHash, purchaseTime, expiryTime);
    });

    it("Issuing seller can revoke their own warranty", async function () {
      await expect(
        chainWarranty.connect(seller1).revokeWarranty(sampleWarrantyId, "Product refunded by customer")
      )
        .to.emit(chainWarranty, "WarrantyRevoked")
        .withArgs(sampleWarrantyId, seller1.address, "Product refunded by customer");

      expect(await chainWarranty.isRevoked(sampleWarrantyId)).to.be.true;
    });

    it("Contract owner can revoke any warranty", async function () {
      await expect(
        chainWarranty.connect(owner).revokeWarranty(sampleWarrantyId, "Voided due to manufacturer recall")
      )
        .to.emit(chainWarranty, "WarrantyRevoked")
        .withArgs(sampleWarrantyId, owner.address, "Voided due to manufacturer recall");

      expect(await chainWarranty.isRevoked(sampleWarrantyId)).to.be.true;
    });

    it("Unauthorized account cannot revoke warranty", async function () {
      await expect(
        chainWarranty
          .connect(unauthorizedAccount)
          .revokeWarranty(sampleWarrantyId, "Malicious attempt")
      ).to.be.revertedWith("ChainWarranty: caller not authorized to revoke this warranty");
    });

    it("Another authorized seller cannot revoke a warranty they did not issue", async function () {
      await chainWarranty.connect(owner).authorizeSeller(seller2.address);

      await expect(
        chainWarranty
          .connect(seller2)
          .revokeWarranty(sampleWarrantyId, "Cross-seller attempt")
      ).to.be.revertedWith("ChainWarranty: caller not authorized to revoke this warranty");
    });

    it("Cannot revoke an already revoked warranty", async function () {
      await chainWarranty.connect(seller1).revokeWarranty(sampleWarrantyId, "First revocation");
      await expect(
        chainWarranty.connect(seller1).revokeWarranty(sampleWarrantyId, "Second attempt")
      ).to.be.revertedWith("ChainWarranty: warranty is already revoked");
    });

    it("Revoked warranty fails verifyWarranty with REVOKED status", async function () {
      await chainWarranty.connect(owner).revokeWarranty(sampleWarrantyId, "Fraudulent serial");
      const result = await chainWarranty.verifyWarranty(sampleWarrantyId, sampleDetailsHash);
      expect(result.isValid).to.be.false;
      expect(result.statusString).to.equal("REVOKED");
    });
  });

  // ---------------------------------------------------------------------------
  // 7. COMPREHENSIVE VERIFICATION FUNCTION
  // ---------------------------------------------------------------------------
  describe("7. verifyWarranty Evaluation Outcomes", function () {
    let now;
    let purchaseTime;
    let expiryTime;

    beforeEach(async function () {
      await chainWarranty.connect(owner).authorizeSeller(seller1.address);
      now = await time.latest();
      purchaseTime = now;
      expiryTime = now + 1000;

      await chainWarranty
        .connect(seller1)
        .issueWarranty(sampleWarrantyId, sampleDetailsHash, purchaseTime, expiryTime);
    });

    it("Returns VALID when warranty is active, unrevoked, unexpired, and hash matches", async function () {
      const result = await chainWarranty.verifyWarranty(sampleWarrantyId, sampleDetailsHash);
      expect(result.isValid).to.be.true;
      expect(result.statusString).to.equal("VALID");
    });

    it("Returns NOT_FOUND for unregistered warranty ID", async function () {
      const nonExistentId = ethers.keccak256(ethers.toUtf8Bytes("NON_EXISTENT"));
      const result = await chainWarranty.verifyWarranty(nonExistentId, sampleDetailsHash);
      expect(result.isValid).to.be.false;
      expect(result.statusString).to.equal("NOT_FOUND");
    });

    it("Returns HASH_MISMATCH when candidate hash does not match stored hash", async function () {
      const result = await chainWarranty.verifyWarranty(sampleWarrantyId, mismatchedDetailsHash);
      expect(result.isValid).to.be.false;
      expect(result.statusString).to.equal("HASH_MISMATCH");
    });
  });
});

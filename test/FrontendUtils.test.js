const { expect } = require("chai");
const { ethers } = require("ethers");

describe("Frontend Utilities & Integration Logic Tests", function () {
  // Test normalization logic
  function sanitizeField(val, fieldName) {
    if (typeof val !== "string") {
      throw new Error(`Field '${fieldName}' must be a string.`);
    }
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) {
      throw new Error(`Field '${fieldName}' cannot be empty.`);
    }
    if (trimmed.includes("|")) {
      throw new Error(`Field '${fieldName}' cannot contain the delimiter character '|'.`);
    }
    return trimmed;
  }

  function buildCanonicalDetailsString(details) {
    const normCategory = sanitizeField(details.category, "category");
    const normProduct = sanitizeField(details.productName, "productName");
    const normSerial = sanitizeField(details.serialNumber, "serialNumber");
    return `category:${normCategory}|product:${normProduct}|serial:${normSerial}`;
  }

  function computeDetailsHash(details) {
    const canonicalString = buildCanonicalDetailsString(details);
    return ethers.keccak256(ethers.toUtf8Bytes(canonicalString));
  }

  function isValidBytes32(val) {
    if (!val || typeof val !== "string") return false;
    const trimmed = val.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return false;
    const bytes = ethers.getBytes(trimmed);
    return bytes.some((b) => b !== 0);
  }

  function dateStringToUnixSeconds(dateStr) {
    if (!dateStr || typeof dateStr !== "string") throw new Error("Date string cannot be empty.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error("Invalid date format, expected YYYY-MM-DD.");
    }
    const parts = dateStr.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(Date.UTC(year, month, day, 0, 0, 0));
    if (isNaN(date.getTime())) throw new Error("Invalid date.");
    return Math.floor(date.getTime() / 1000);
  }


  function parseContractError(err) {
    if (!err) return "Unknown error occurred.";
    if (err.code === 4001 || err.info?.error?.code === 4001) {
      return "Transaction rejected by user in MetaMask.";
    }
    if (err.code === -32002) {
      return "A MetaMask request is already pending. Please open your wallet extension.";
    }
    if (err.reason) {
      return `Smart contract reverted: ${err.reason}`;
    }
    if (err.message && err.message.includes("ChainWarranty: caller is not an authorized seller")) {
      return "Action rejected: Your connected wallet is not an authorized seller on the contract.";
    }
    return err.message || String(err);
  }

  describe("1. Canonical Hashing Normalization", function () {
    it("Normalizes casing and trims whitespace identically", function () {
      const input1 = {
        category: "  Electronics & Gadgets ",
        productName: "Sony WH-1000XM5 Headphones",
        serialNumber: "SN-987654321  ",
      };
      const input2 = {
        category: "electronics & gadgets",
        productName: "  sony wh-1000xm5 headphones  ",
        serialNumber: "sn-987654321",
      };

      const hash1 = computeDetailsHash(input1);
      const hash2 = computeDetailsHash(input2);

      expect(hash1).to.equal(hash2);
      expect(hash1).to.match(/^0x[a-f0-9]{64}$/);
    });

    it("Rejects pipe delimiter '|' in category, product, or serial number", function () {
      expect(() =>
        computeDetailsHash({
          category: "electronics|fraud",
          productName: "valid product",
          serialNumber: "SN-1",
        })
      ).to.throw("cannot contain the delimiter character '|'");

      expect(() =>
        computeDetailsHash({
          category: "electronics",
          productName: "product|injection",
          serialNumber: "SN-1",
        })
      ).to.throw("cannot contain the delimiter character '|'");

      expect(() =>
        computeDetailsHash({
          category: "electronics",
          productName: "valid product",
          serialNumber: "SN|1",
        })
      ).to.throw("cannot contain the delimiter character '|'");
    });

    it("Rejects empty fields", function () {
      expect(() =>
        computeDetailsHash({
          category: "",
          productName: "valid product",
          serialNumber: "SN-1",
        })
      ).to.throw("cannot be empty");
    });
  });

  describe("2. bytes32 Validation", function () {
    it("Validates proper non-zero 32-byte hex strings", function () {
      const validId = "0x" + "ab".repeat(32);
      expect(isValidBytes32(validId)).to.be.true;
    });

    it("Rejects all-zero 32-byte hex string", function () {
      const zeroId = ethers.ZeroHash;
      expect(isValidBytes32(zeroId)).to.be.false;
    });

    it("Rejects invalid length and invalid hex characters", function () {
      expect(isValidBytes32("0x1234")).to.be.false;
      expect(isValidBytes32("0x" + "zz".repeat(32))).to.be.false;
      expect(isValidBytes32("")).to.be.false;
      expect(isValidBytes32(null)).to.be.false;
    });
  });

  describe("3. Date & Timestamp Conversion", function () {
    it("Converts YYYY-MM-DD to UTC Unix seconds accurately", function () {
      const ts = dateStringToUnixSeconds("2026-10-12");
      const d = new Date(ts * 1000);
      expect(d.getUTCFullYear()).to.equal(2026);
      expect(d.getUTCMonth()).to.equal(9); // 0-indexed month: October = 9
      expect(d.getUTCDate()).to.equal(12);
      expect(d.getUTCHours()).to.equal(0);
    });

    it("Rejects malformed date strings", function () {
      expect(() => dateStringToUnixSeconds("12-10-2026")).to.throw();
      expect(() => dateStringToUnixSeconds("")).to.throw();
    });
  });

  describe("4. Error Parsing & Mapping", function () {
    it("Parses user rejection code 4001 gracefully", function () {
      const msg = parseContractError({ code: 4001 });
      expect(msg).to.equal("Transaction rejected by user in MetaMask.");
    });

    it("Parses pending request code -32002 gracefully", function () {
      const msg = parseContractError({ code: -32002 });
      expect(msg).to.include("MetaMask request is already pending");
    });

    it("Parses unauthorized seller revert reason", function () {
      const msg = parseContractError({
        message: "execution reverted: ChainWarranty: caller is not an authorized seller",
      });
      expect(msg).to.include("not an authorized seller");
    });
  });
});

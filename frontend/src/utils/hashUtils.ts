import { keccak256, toUtf8Bytes, getBytes } from 'ethers';

/**
 * Canonical warranty hashing specification for ChainWarranty.
 * 
 * Rules for canonical normalization:
 * 1. Surrounding whitespace trimmed for each parameter (.trim()).
 * 2. Cased to lower-case (.toLowerCase()).
 * 3. Delimiter pipe '|' is forbidden in fields to prevent field-boundary ambiguity.
 * 4. Deterministic ordered string format:
 *    category:<normalized_category>|product:<normalized_product>|serial:<normalized_serial>
 */

export interface RawWarrantyDetails {
  category: string;
  productName: string;
  serialNumber: string;
}

export function sanitizeField(val: string, fieldName: string): string {
  if (typeof val !== 'string') {
    throw new Error(`Field '${fieldName}' must be a string.`);
  }
  const trimmed = val.trim().toLowerCase();
  if (!trimmed) {
    throw new Error(`Field '${fieldName}' cannot be empty.`);
  }
  if (trimmed.includes('|')) {
    throw new Error(`Field '${fieldName}' cannot contain the delimiter character '|'.`);
  }
  return trimmed;
}

/**
 * Returns the exact canonical string to be hashed.
 */
export function buildCanonicalDetailsString(details: RawWarrantyDetails): string {
  const normCategory = sanitizeField(details.category, 'category');
  const normProduct = sanitizeField(details.productName, 'productName');
  const normSerial = sanitizeField(details.serialNumber, 'serialNumber');

  return `category:${normCategory}|product:${normProduct}|serial:${normSerial}`;
}

/**
 * Computes the bytes32 keccak256 detailsHash for normalized warranty parameters.
 */
export function computeDetailsHash(details: RawWarrantyDetails): string {
  const canonicalString = buildCanonicalDetailsString(details);
  return keccak256(toUtf8Bytes(canonicalString));
}

/**
 * Securely generates a non-zero bytes32 warranty ID using the browser's crypto.getRandomValues.
 * Never uses Math.random() for cryptographic identifiers.
 */
export function generateSecureWarrantyId(): string {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.getRandomValues) {
    throw new Error('Secure random source (crypto.getRandomValues) is unavailable in this environment.');
  }

  const randomBytes = new Uint8Array(32);
  let isAllZero = true;

  // Ensure non-zero bytes32
  while (isAllZero) {
    window.crypto.getRandomValues(randomBytes);
    for (let i = 0; i < randomBytes.length; i++) {
      if (randomBytes[i] !== 0) {
        isAllZero = false;
        break;
      }
    }
  }

  const hexString = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `0x${hexString}`;
}

/**
 * Validates whether a string is a valid non-zero bytes32 hexadecimal string (0x followed by 64 hex chars).
 */
export function isValidBytes32(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return false;
  // Check not all zeros
  const bytes = getBytes(trimmed);
  return bytes.some((b) => b !== 0);
}

/**
 * Converts a date string (YYYY-MM-DD) to Unix timestamp in seconds at 00:00:00 UTC.
 */
export function dateStringToUnixSeconds(dateStr: string): number {
  if (!dateStr || typeof dateStr !== 'string') throw new Error('Date string cannot be empty.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Invalid date format, expected YYYY-MM-DD.');
  }
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(Date.UTC(year, month, day, 0, 0, 0));
  if (isNaN(date.getTime())) throw new Error('Invalid date.');
  return Math.floor(date.getTime() / 1000);
}


/**
 * Calculates an expiry date given a purchase date string (YYYY-MM-DD)
 * and warranty duration in months.
 * 
 * Returns formatted string "YYYY-MM-DD" or empty string if input is invalid.
 */
export function calculateExpiryDate(purchaseDateStr: string, durationMonths: number): string {
  if (!purchaseDateStr || durationMonths <= 0) return '';
  const date = new Date(purchaseDateStr);
  if (isNaN(date.getTime())) return '';

  // Add months
  date.setMonth(date.getMonth() + durationMonths);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD for input max/defaults
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

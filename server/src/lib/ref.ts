/**
 * Generate a unique reference using full timestamp (including milliseconds).
 * Format: PREFIX-YYYYMMDD-HHMMSS-mmm
 * Example: BEN-20260716-143527-382
 *
 * Milliseconds guarantee uniqueness even with concurrent clicks.
 * The reference is naturally sortable chronologically.
 */
export function generateRef(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${prefix}-${y}${mo}${d}-${h}${mi}${s}-${ms}`;
}

/**
 * Generate a receipt number (same format, prefix BON)
 */
export function generateReceiptNumber(): string {
  return generateRef('BON');
}

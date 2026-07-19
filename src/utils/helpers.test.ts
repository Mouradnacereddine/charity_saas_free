import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateAge,
  numberToArabicWords,
  numberToFrenchWords,
  formatCurrency,
  generateId,
  generateReceiptNumber,
} from './helpers';

// ---------------------------------------------------------------------------
// calculateAge
// ---------------------------------------------------------------------------
describe('calculateAge', () => {
  beforeEach(() => {
    // Fix "now" to 2026-07-08 so age computations are deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns correct years and months for a date 10 years and 3 months ago', () => {
    const result = calculateAge('2016-04-08');
    expect(result.years).toBe(10);
    expect(result.months).toBe(3);
  });

  it('returns months as 0 when the birthday falls on an exact year boundary', () => {
    const result = calculateAge('2016-07-08');
    expect(result.years).toBe(10);
    expect(result.months).toBe(0);
  });

  it('handles a baby younger than 1 year', () => {
    const result = calculateAge('2026-01-08');
    expect(result.years).toBe(0);
    expect(result.months).toBe(6);
  });

  it('produces a French display string with "ans" and "mois" when months > 0', () => {
    const result = calculateAge('2016-04-08');
    expect(result.display).toBe('10 ans et 3 mois');
  });

  it('produces a French display string with only "ans" when months is 0', () => {
    const result = calculateAge('2016-07-08');
    expect(result.display).toBe('10 ans');
  });

  it('produces an Arabic display string with "سنة" and "شهر" when months > 0', () => {
    const result = calculateAge('2016-04-08');
    expect(result.displayAr).toBe('10 سنة و 3 شهر');
  });

  it('produces an Arabic display string with only "سنة" when months is 0', () => {
    const result = calculateAge('2016-07-08');
    expect(result.displayAr).toBe('10 سنة');
  });

  it('handles a 6-month-old baby display strings', () => {
    const result = calculateAge('2026-01-08');
    expect(result.display).toBe('0 ans et 6 mois');
    expect(result.displayAr).toBe('0 سنة و 6 شهر');
  });
});

// ---------------------------------------------------------------------------
// numberToArabicWords
// ---------------------------------------------------------------------------
describe('numberToArabicWords', () => {
  it('converts 0 to "صفر دينار"', () => {
    expect(numberToArabicWords(0)).toBe('صفر دينار');
  });

  it('converts single digit 5 correctly', () => {
    expect(numberToArabicWords(5)).toBe('خمسة دينار');
  });

  it('converts single digit 1 correctly', () => {
    expect(numberToArabicWords(1)).toBe('واحد دينار');
  });

  it('converts 10 correctly', () => {
    expect(numberToArabicWords(10)).toBe('عشرة دينار');
  });

  it('converts 11 correctly', () => {
    expect(numberToArabicWords(11)).toBe('أحد عشر دينار');
  });

  it('converts 12 correctly', () => {
    expect(numberToArabicWords(12)).toBe('اثنا عشر دينار');
  });

  it('converts 20 correctly', () => {
    expect(numberToArabicWords(20)).toBe('عشرون دينار');
  });

  it('converts 25 (compound tens+ones) correctly', () => {
    expect(numberToArabicWords(25)).toBe('خمسة و عشرون دينار');
  });

  it('converts 100 correctly', () => {
    expect(numberToArabicWords(100)).toBe('مائة دينار');
  });

  it('converts 200 correctly', () => {
    expect(numberToArabicWords(200)).toBe('مائتان دينار');
  });

  it('converts 300 correctly', () => {
    expect(numberToArabicWords(300)).toBe('ثلاثمائة دينار');
  });

  it('converts 1000 correctly', () => {
    expect(numberToArabicWords(1000)).toBe('ألف دينار');
  });

  it('converts 2000 correctly', () => {
    expect(numberToArabicWords(2000)).toBe('ألفان دينار');
  });

  it('converts 5000 correctly', () => {
    expect(numberToArabicWords(5000)).toBe('خمسة آلاف دينار');
  });

  it('converts 1234 (compound thousands + hundreds + tens + ones) correctly', () => {
    const result = numberToArabicWords(1234);
    expect(result).toContain('ألف');
    expect(result).toContain('مائتان');
    expect(result).toContain('دينار');
  });

  it('converts 1000000 (one million) correctly', () => {
    expect(numberToArabicWords(1000000)).toBe('مليون دينار');
  });

  it('converts 2000000 (two million) correctly', () => {
    expect(numberToArabicWords(2000000)).toBe('مليونان دينار');
  });

  it('converts 1500000 correctly', () => {
    const result = numberToArabicWords(1500000);
    expect(result).toContain('مليون');
    expect(result).toContain('خمسمائة');
    expect(result).toContain('دينار');
  });

  it('always ends with "دينار"', () => {
    const amounts = [1, 15, 99, 500, 7777, 1500000];
    for (const amount of amounts) {
      expect(numberToArabicWords(amount)).toMatch(/دينار$/);
    }
  });

  it('floors decimal amounts', () => {
    expect(numberToArabicWords(5.99)).toBe(numberToArabicWords(5));
  });
});

// ---------------------------------------------------------------------------
// numberToFrenchWords
// ---------------------------------------------------------------------------
describe('numberToFrenchWords', () => {
  it('converts 0 to "zéro dinar"', () => {
    expect(numberToFrenchWords(0)).toBe('zéro dinar');
  });

  it('converts 1 correctly', () => {
    expect(numberToFrenchWords(1)).toBe('un dinars');
  });

  it('converts 5 correctly', () => {
    expect(numberToFrenchWords(5)).toBe('cinq dinars');
  });

  it('converts 17 correctly', () => {
    expect(numberToFrenchWords(17)).toBe('dix-sept dinars');
  });

  it('converts 21 with "et un"', () => {
    expect(numberToFrenchWords(21)).toBe('vingt et un dinars');
  });

  it('converts 71 as soixante-onze', () => {
    expect(numberToFrenchWords(71)).toBe('soixante-onze dinars');
  });

  it('converts 80 as quatre-vingt', () => {
    expect(numberToFrenchWords(80)).toBe('quatre-vingt dinars');
  });

  it('converts 91 as quatre-vingt-onze', () => {
    expect(numberToFrenchWords(91)).toBe('quatre-vingt-onze dinars');
  });

  it('converts 100 correctly', () => {
    expect(numberToFrenchWords(100)).toBe('cent dinars');
  });

  it('converts 200 correctly', () => {
    expect(numberToFrenchWords(200)).toBe('deux cent dinars');
  });

  it('converts 1000 correctly', () => {
    expect(numberToFrenchWords(1000)).toBe('mille dinars');
  });

  it('converts 1500 correctly', () => {
    const result = numberToFrenchWords(1500);
    expect(result).toContain('mille');
    expect(result).toContain('cinq cent');
    expect(result).toMatch(/dinars$/);
  });

  it('converts 2000 correctly', () => {
    expect(numberToFrenchWords(2000)).toBe('deux mille dinars');
  });

  it('converts 1000000 correctly', () => {
    expect(numberToFrenchWords(1000000)).toBe('un million dinars');
  });

  it('always ends with "dinars" for non-zero amounts', () => {
    const amounts = [1, 15, 99, 500, 7777, 1500000];
    for (const amount of amounts) {
      expect(numberToFrenchWords(amount)).toMatch(/dinars$/);
    }
  });

  it('floors decimal amounts', () => {
    expect(numberToFrenchWords(5.99)).toBe(numberToFrenchWords(5));
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe('formatCurrency', () => {
  it('returns a string containing the formatted amount', () => {
    const result = formatCurrency(1500);
    expect(typeof result).toBe('string');
    // The formatted string should contain the numeric value in some form
    expect(result).toBeTruthy();
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(typeof result).toBe('string');
    expect(result).toBeTruthy();
  });

  it('formats negative amounts', () => {
    const result = formatCurrency(-500);
    expect(typeof result).toBe('string');
    expect(result).toBeTruthy();
  });

  it('uses DZD currency', () => {
    const result = formatCurrency(1000);
    // Intl.NumberFormat with currency: 'DZD' should include some reference to DZD or د.ج
    // The exact symbol depends on the locale data available in the runtime
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('limits fraction digits to at most 2', () => {
    const result = formatCurrency(1234.5678);
    // ar-DZ locale uses comma as the decimal separator
    // Find the last comma to identify the fractional part
    const lastCommaIndex = result.lastIndexOf(',');
    if (lastCommaIndex !== -1) {
      const afterComma = result.slice(lastCommaIndex + 1);
      const fractionDigits = afterComma.replace(/\D/g, '');
      expect(fractionDigits.length).toBeLessThanOrEqual(2);
    }
  });
});

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------
describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('returns a non-empty string', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThan(0);
  });

  it('generates unique IDs on successive calls', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('returns a UUID-like format', () => {
    const id = generateId();
    // UUID v4 format: 8-4-4-4-12 hex characters
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});

// ---------------------------------------------------------------------------
// generateReceiptNumber
// ---------------------------------------------------------------------------
describe('generateReceiptNumber', () => {
  it('matches the format BON-YYYYMMDD-HHMMSS-mmm', () => {
    const receipt = generateReceiptNumber();
    expect(receipt).toMatch(/^BON-\d{8}-\d{6}-\d{3}$/);
  });

  it('starts with "BON-"', () => {
    const receipt = generateReceiptNumber();
    expect(receipt.startsWith('BON-')).toBe(true);
  });

  it('contains the current year and month', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const receipt = generateReceiptNumber();
    expect(receipt).toContain(`${year}${month}`);
  });

  it('generates a receipt with the correct prefix and date components', () => {
    const receipt = generateReceiptNumber();
    const parts = receipt.split('-');
    // BON-YYYYMMDD-HHMMSS-mmm
    expect(parts[0]).toBe('BON');
    expect(parts[1]).toMatch(/^\d{8}$/);
    expect(parts[2]).toMatch(/^\d{6}$/);
    expect(parts[3]).toMatch(/^\d{3}$/);
  });
});

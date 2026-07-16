import { differenceInYears, differenceInMonths } from 'date-fns';

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): { years: number; months: number; display: string; displayAr: string } {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const years = differenceInYears(now, dob);
  const months = differenceInMonths(now, dob) % 12;

  const display = months > 0 ? `${years} ans et ${months} mois` : `${years} ans`;
  const displayAr = months > 0 ? `${years} سنة و ${months} شهر` : `${years} سنة`;

  return { years, months, display, displayAr };
}

/**
 * Convert number to Arabic words (simplified for common amounts)
 */
const onesAr = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const tensAr = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const hundredsAr = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function convertHundredsAr(num: number): string {
  if (num === 0) return '';
  const h = Math.floor(num / 100);
  const remainder = num % 100;
  const t = Math.floor(remainder / 10);
  const o = remainder % 10;

  const parts: string[] = [];
  if (h > 0) parts.push(hundredsAr[h]);

  if (remainder === 0) {
    // nothing
  } else if (remainder < 10) {
    parts.push(onesAr[o]);
  } else if (remainder === 10) {
    parts.push('عشرة');
  } else if (remainder === 11) {
    parts.push('أحد عشر');
  } else if (remainder === 12) {
    parts.push('اثنا عشر');
  } else if (remainder < 20) {
    parts.push(onesAr[o] + ' عشر');
  } else if (o === 0) {
    parts.push(tensAr[t]);
  } else {
    parts.push(onesAr[o] + ' و ' + tensAr[t]);
  }

  return parts.join(' و ');
}

export function numberToArabicWords(amount: number): string {
  if (amount === 0) return 'صفر دينار';

  const num = Math.floor(amount);
  const parts: string[] = [];

  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions === 10) parts.push('عشرة ملايين');
    else parts.push(convertHundredsAr(millions) + ' ملايين');
  }

  const afterMillions = num % 1000000;
  if (afterMillions >= 1000) {
    const thousands = Math.floor(afterMillions / 1000);
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands === 10) parts.push('عشرة آلاف');
    else if (thousands <= 9) parts.push(onesAr[thousands] + ' آلاف');
    else parts.push(convertHundredsAr(thousands) + ' ألف');
  }

  const afterThousands = afterMillions % 1000;
  if (afterThousands > 0) {
    parts.push(convertHundredsAr(afterThousands));
  }

  return parts.join(' و ') + ' دينار';
}

/**
 * Convert number to French words (simplified)
 */
const onesFr = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const tensFr = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function convertHundredsFr(num: number): string {
  if (num === 0) return '';

  const h = Math.floor(num / 100);
  const remainder = num % 100;
  const parts: string[] = [];

  if (h > 0) {
    if (h === 1) parts.push('cent');
    else parts.push(onesFr[h] + ' cent');
  }

  if (remainder === 0) {
    // nothing
  } else if (remainder < 20) {
    parts.push(onesFr[remainder]);
  } else {
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;
    if (t === 7 || t === 9) {
      const base = tensFr[t];
      const unit = remainder - (t === 7 ? 60 : 80);
      if (unit < 20) parts.push(base + '-' + onesFr[unit]);
      else parts.push(base + '-' + onesFr[o]);
    } else {
      if (o === 0) parts.push(tensFr[t]);
      else if (o === 1 && t !== 8) parts.push(tensFr[t] + ' et un');
      else parts.push(tensFr[t] + '-' + onesFr[o]);
    }
  }

  return parts.join(' ');
}

export function numberToFrenchWords(amount: number): string {
  if (amount === 0) return 'zéro dinar';

  const num = Math.floor(amount);
  const parts: string[] = [];

  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    if (millions === 1) parts.push('un million');
    else parts.push(convertHundredsFr(millions) + ' millions');
  }

  const afterMillions = num % 1000000;
  if (afterMillions >= 1000) {
    const thousands = Math.floor(afterMillions / 1000);
    if (thousands === 1) parts.push('mille');
    else parts.push(convertHundredsFr(thousands) + ' mille');
  }

  const afterThousands = afterMillions % 1000;
  if (afterThousands > 0) {
    parts.push(convertHundredsFr(afterThousands));
  }

  return parts.join(' ') + ' dinars';
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency: 'DZD',
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ar-DZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Generate receipt number
 */
function generateTimestampRef(prefix: string): string {
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
 * Generate Receipt Number
 */
export function generateReceiptNumber(): string {
  return generateTimestampRef('BON');
}

/**
 * Generate Article Reference
 */
export function generateArticleReference(): string {
  return generateTimestampRef('ART');
}

/**
 * Generate Loan Reference
 */
export function generateLoanReference(): string {
  return generateTimestampRef('LOAN');
}

/**
 * Generate Beneficiary Reference
 */
export function generateBeneficiaryReference(): string {
  return generateTimestampRef('BEN');
}

/**
 * Generate Donor Reference
 */
export function generateDonorReference(): string {
  return generateTimestampRef('DON');
}

/**
 * Generate Medical Referral Reference
 */
export function generateMedicalReferralReference(): string {
  return generateTimestampRef('MED');
}


/**
 * Generate unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

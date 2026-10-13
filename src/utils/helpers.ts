import { differenceInYears, differenceInMonths } from 'date-fns';
import i18n from '../i18n';
import { translateSystemLabel } from './system-labels';

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): { years: number; months: number; display: string; displayAr: string; displayEn: string; displayFr: string } {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const years = differenceInYears(now, dob);
  const months = differenceInMonths(now, dob) % 12;

  const displayFr = months > 0 ? `${years} ans et ${months} mois` : `${years} ans`;
  const displayAr = months > 0 ? `${years} سنة و ${months} شهر` : `${years} سنة`;
  const displayEn = months > 0 ? `${years} years and ${months} months` : `${years} years`;
  // Pour compatibilité ascendante : display = displayFr
  const display = displayFr;

  return { years, months, display, displayAr, displayEn, displayFr };
}

/**
 * Retourne l'âge formaté dans la langue active.
 */
export function getAgeDisplay(dateOfBirth: string): string {
  const age = calculateAge(dateOfBirth);
  const lang = i18n.language;
  if (lang === 'ar') return age.displayAr;
  if (lang === 'en') return age.displayEn;
  return age.displayFr;
}

/**
 * Normalise un montant monétaire au centime (2 décimales, arrondi
 * « half away from zero ») avant de l'envoyer au serveur ou de l'afficher.
 * Corrige les artefacts IEEE-754 du type 1999.8999999999999 qui, sinon,
 * sont stockés tels quels dans les colonnes Decimal (Prisma ne ré-arrondit
 * PAS un nombre JS flottant) et ressortent en « perte de quelques centimes ».
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Somme une liste de montants en centimes entiers, puis redivise — évite
 *  la dérive d'addition flottante (0.1 + 0.2 ≠ 0.3). */
export function sumMoney(values: number[]): number {
  const cents = values.reduce((acc, v) => acc + Math.round((Number(v) + Number.EPSILON) * 100), 0);
  return cents / 100;
}

/**
 * Parse un montant saisi librement par l'utilisateur, en tolérant les
 * séparateurs de milliers et la virgule décimale française.
 *   "1 500,50"  -> 1500.5   (espace insécable / fine / normale)
 *   "1.500,50"  -> 1500.5   (point = milliers, virgule = décimale)
 *   "1500.5"    -> 1500.5
 * Renvoie NaN si rien de numérique n'est trouvé.
 */
export function parseMoneyInput(input: string): number {
  if (input == null) return NaN;
  let s = String(input).trim().replace(/[\s   ]/g, '');
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // Le séparateur le plus à droite est la décimale, l'autre est les milliers.
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = s.replace(/,/g, '.'); // virgule décimale
  }
  return parseFloat(s);
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

  const num = Math.floor(roundMoney(amount));
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
 * Montant en lettres (arabe) incluant les centimes : « 1500,50 » devient
 * « ... دينار و خمسون سنتيماً » au lieu de perdre les centimes.
 */
export function amountToArabicWords(amount: number): string {
  const total = roundMoney(amount);
  const dinars = Math.floor(total);
  const cents = Math.round((total - dinars) * 100);
  const base = numberToArabicWords(dinars);
  if (cents <= 0) return base;
  const centWords = convertHundredsAr(cents);
  return `${base} و ${centWords} سنتيماً`;
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

  const num = Math.floor(roundMoney(amount));
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
 * Montant en lettres (français) incluant les centimes : « 1500,50 » devient
 * « mille cinq cents dinars et cinquante centimes » au lieu de perdre les
 * centimes (exigence d'exactitude des reçus de don).
 */
export function amountToFrenchWords(amount: number): string {
  const total = roundMoney(amount);
  const dinars = Math.floor(total);
  const cents = Math.round((total - dinars) * 100);
  const base = numberToFrenchWords(dinars);
  if (cents <= 0) return base;
  return `${base} et ${convertHundredsFr(cents)} centimes`;
}

/**
 * Format currency
 */
function getLocale(): string {
  const lang = i18n.language;
  // Arabe et francais -> format francais, anglais -> format US
  if (lang === 'en') return 'en-US';
  return 'fr-FR';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: 'DZD',
    // minimumFractionDigits = maximumFractionDigits = 2 : un entier s'affiche
    // « 1 500,00 DZD » et un montant à centimes « 1 500,50 DZD », de façon
    // homogène. On normalise d'abord au centime pour ne jamais laisser
    // fuiter un artefact flottant (ex : 19.990000000000002).
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(amount));
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(getLocale(), {
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
 * Retourne la description dans la langue de l'UI. Désormais la description est
 * stockée en un seul exemplaire (langue de l'association), et la couche i18n
 * ne fait que traduire d'éventuels préfixes système.
 */
export function localizedDesc(description?: string, descriptionAr?: string): string {
  const lang = i18n.language;
  // descriptionAr est conservé en signature pour rétrocompat mais ignoré
  // (la valeur est désormais unique).
  return translateSystemLabel(description || descriptionAr || '', lang) || '';
}

/**
 * Convert number to words in the active language.
 * Arabic → numberToArabicWords, French → numberToFrenchWords,
 * English → "{n} DZD" (fallback latin).
 */
export function numberToWords(n: number): string {
  const lang = i18n.language;
  if (lang === 'ar') return numberToArabicWords(n);
  if (lang === 'fr') return numberToFrenchWords(n);
  return `${n.toLocaleString('en')} DZD`;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Précision monétaire — helper central côté serveur.
 *
 * Le schéma Prisma stocke tous les montants en `Decimal`, MAIS Prisma
 * n'arrondit PAS un nombre JS flottant : `new Decimal(1999.8999999999999)`
 * conserve l'artefact IEEE-754 tel quel en base. Toute valeur écrite comme
 * nombre JS (lue depuis `Number(decimal)` puis recomposée, ou reçue du
 * client) doit donc être normalisée au centime AVANT persistance, sinon la
 * colonne Decimal conserve la dérive et l'utilisateur voit « le montant
 * diminue de quelques centimes ».
 */

/** Nombre de décimales conservées pour un montant (DZD a des centimes). */
export const MONEY_SCALE = 2;

/**
 * Arrondit un montant au centime, « half away from zero ».
 * `+ Number.EPSILON` corrige le biais binaire (ex : 1.005 -> 1.00 sans lui).
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Normalise toute valeur d'entrée (string DB, number, Decimal) en un nombre
 * arrondi au centime. À utiliser pour chaque montant avant écriture.
 */
export function moneyNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return roundMoney(n);
}
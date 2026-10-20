/**
 * Politique de date des opérations — helper central côté serveur.
 *
 * Seul le super-administrateur peut fixer la date d'une opération, et
 * uniquement dans le passé ou le jour même — jamais dans le futur. Pour tout
 * autre rôle, la date éventuellement envoyée par le client est ignorée et
 * l'horodatage courant est retenu.
 *
 * Le contrôle DOIT vivre ici, côté serveur : l'interface n'est qu'un
 * habillage, et une requête HTTP directe contourne tout champ masqué.
 */

/** Fuseau de référence des utilisateurs (Algérie, UTC+1). */
const APP_TIME_ZONE = 'Africa/Algiers';

/** Seul rôle autorisé à choisir manuellement la date d'une opération. */
const DATE_ROLE = 'super_admin';

/**
 * Jour calendaire local d'un instant, au format `YYYY-MM-DD`.
 *
 * `en-CA` produit nativement l'ordre ISO, ce qui rend deux jours comparables
 * par simple comparaison de chaînes. Le fuseau est explicite car le serveur
 * (Vercel) tourne en UTC : sans lui, une opération datée « aujourd'hui » en
 * Algérie passerait pour « demain » entre 23 h et minuit locales.
 */
export function localDay(instant: Date, timeZone: string = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Jour courant local au format `YYYY-MM-DD`. */
export function todayLocalISO(now: Date = new Date()): string {
  return localDay(now);
}

export interface ResolvedDate {
  date: Date;
  /** true si la date fournie par le client a été retenue telle quelle. */
  honored: boolean;
}

export type DateResolution = ResolvedDate | { error: string };

/**
 * Applique la politique de date à la valeur reçue du client.
 *
 * - rôle ≠ super_admin → la valeur du client est ignorée, `now` est retenu.
 * - valeur absente → `now`.
 * - valeur non parsable → `error` (au lieu du `Invalid Date` silencieux que
 *   produisait `new Date(garbage)`).
 * - jour candidat postérieur au jour courant → `error`.
 * - sinon → l'instant candidat est retenu tel quel (même sémantique que
 *   l'ancien champ date du formulaire).
 */
export function resolveTransactionDate(
  role: string | undefined,
  rawDate: unknown,
  now: Date = new Date(),
): DateResolution {
  // Seul le super-admin peut imposer une date ; pour tous les autres rôles la
  // valeur envoyée est neutralisée (le contournement par appel direct devient
  // sans effet plutôt qu'une erreur, ce qui ne casse aucun client existant).
  if (role !== DATE_ROLE) {
    return { date: now, honored: false };
  }

  if (rawDate === undefined || rawDate === null || rawDate === '') {
    return { date: now, honored: false };
  }

  const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate));
  if (Number.isNaN(parsed.getTime())) {
    return { error: 'Invalid date' };
  }

  // Un `<input type="date">` envoie toujours `YYYY-MM-DD`. Pour cette forme
  // précise, JS « déborde » silencieusement les jours inexistants
  // (2026-02-30 -> 2 mars) : on exige donc un aller-retour identique, sinon
  // l'opération serait datée d'un jour que personne n'a choisi.
  const isoDay = String(rawDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay) && localDay(parsed) !== isoDay) {
    return { error: 'Invalid date' };
  }

  // Comparaison sur le jour calendaire local, pas sur l'instant : une
  // opération datée « aujourd'hui » à 00:00 UTC reste valide en Algérie.
  if (localDay(parsed) > localDay(now)) {
    return { error: 'La date ne peut pas être dans le futur' };
  }

  return { date: parsed, honored: true };
}

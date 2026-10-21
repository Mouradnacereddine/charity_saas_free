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

/**
 * Instant UTC du début d'un jour local (`YYYY-MM-DD` → 00:00 en Algérie).
 *
 * Inverse de `localDay`, et nécessaire parce que les filtres `dateFrom`/`dateTo`
 * raisonnent en jours calendaires alors que `Transaction.date` stocke un
 * instant. Les borner à `new Date('2026-10-20')` — soit minuit UTC — décale la
 * fenêtre d'une heure : une opération créée entre 23 h et minuit UTC porte le
 * jour local *suivant* à l'affichage, mais serait exclue du filtre de ce
 * jour-là et incluse dans celui de la veille.
 *
 * Le décalage est lu depuis `timeZone` plutôt que codé en dur, pour que le
 * fuseau de référence reste défini à un seul endroit.
 */
export function startOfLocalDay(day: string, timeZone: string = APP_TIME_ZONE): Date {
  const [y, m, d] = day.split('-').map(Number);
  const utcGuess = Date.UTC(y, m - 1, d);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcGuess));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  // `% 24` : Intl peut rendre « 24 » pour minuit selon l'ICU du runtime.
  const asIfUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  // `utcGuess` interprété comme heure locale → décalage appliqué en sens inverse.
  return new Date(utcGuess - (asIfUTC - utcGuess));
}

/** Jour local suivant `day`, au format `YYYY-MM-DD`. */
export function nextLocalDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  // Date.UTC reporte les débordements : jour 32 → 1er du mois suivant.
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
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

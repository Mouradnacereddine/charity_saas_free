/**
 * Helpers de localisation des données métier.
 *
 * Contexte : la langue active est désormais stockée par association (colonne
 * `Association.locale`), et chaque entité ne possède plus qu'UN seul champ
 * textuel par attribut (ex: `name`), saisi dans la langue de l'association.
 * Aucune version suffixée `Ar` n'existe plus en base.
 *
 * Ces normaliseurs d'affichage garantissent que le rendu reste robuste même si
 * une donnée arrive incomplète (fallback sur une clé alternative présente
 * historiquement), et exposent la direction d'écriture (RTL/LTR) pilotée par
 * la locale de l'association — pas par la langue de l'UI du navigateur.
 *
 * Usage :
 *   localizedName(caisse)                       // "Caisse El-Baraka"
 *   localizedFullName(donor)                     // "Ahmed Mansouri"
 *   dirFromLocale(association?.locale)           // "rtl" | "ltr"
 *   // Pour les formulaires : dirForInput(locale)  → "rtl" si arabe, sinon "ltr"
 */

export type Locale = 'ar' | 'fr' | 'en';

/** Langue active d'une entité (association), normalisée. */
export function normalizeLocale(locale: string | undefined | null): Locale {
  if (locale === 'fr' || locale === 'en' || locale === 'ar') return locale;
  return 'ar';
}

/** true si la locale implique une écriture droite-à-gauche. */
export function isRtl(locale: string | undefined | null): boolean {
  return normalizeLocale(locale) === 'ar';
}

/** Direction d'affichage pour un conteneur, selon la langue de l'association. */
export function dirFromLocale(locale: string | undefined | null): 'rtl' | 'ltr' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

/**
 * Direction d'un champ de SAISIE dans un formulaire : pilotée par la locale de
 * l'association. On saisit en arabe (rtl) uniquement si l'association est en
 * arabe ; sinon en latin (ltr), quelle que soit la langue de l'UI.
 */
export function dirForInput(locale: string | undefined | null): 'rtl' | 'ltr' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

type NamedLike = { name?: string | null; [k: string]: any };

/**
 * Retourne le nom localisé d'une entité à champ unique `name`.
 * Fallback défensif sur d'éventuelles clés `nameAr`/`nameLatin` historiques
 * (le type en dépendrait encore au moment de la migration progressive) —
 * privilégie toujours la clé canonique `name`.
 */
export function localizedName(item: NamedLike | null | undefined): string {
  if (!item) return '';
  return item.name ?? item.nameAr ?? item.nameLatin ?? '';
}

/**
 * Nom complet localisé "Prénom Nom" pour les personnes (donateur, bénéficiaire,
 * médecin). Lit `firstName`/`lastName` ; fallback sur `firstNameAr`/`lastNameAr`
 * pendant la transition.
 */
export function localizedFullName(item: { firstName?: string | null; lastName?: string | null; [k: string]: any } | null | undefined): string {
  if (!item) return '';
  const first = item.firstName ?? item.firstNameAr ?? '';
  const last = item.lastName ?? item.lastNameAr ?? '';
  return [first, last].filter(Boolean).join(' ').trim() || first || last || '';
}

/** Adresse localisée (fallback défensif sur `addressAr`). */
export function localizedAddress(item: { address?: string | null; [k: string]: any } | null | undefined): string {
  if (!item) return '';
  return item.address ?? item.addressAr ?? '';
}

/** Description localisée (fallback sur `descriptionAr`). */
export function localizedDescription(item: { description?: string | null; [k: string]: any } | null | undefined): string {
  if (!item) return '';
  return item.description ?? item.descriptionAr ?? '';
}

/** Montant en lettres localisé (un seul champ `amountInWords` désormais). */
export function localizedAmountInWords(item: { amountInWords?: string | null; [k: string]: any } | null | undefined): string {
  if (!item) return '';
  return item.amountInWords ?? item.amountInWordsAr ?? '';
}

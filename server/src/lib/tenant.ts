/**
 * Masquage des relations lues hors du périmètre de l'association.
 *
 * Problème de fond : Prisma n'applique aucun filtre tenant automatique. Un
 * `include: { caisse: true }` renvoie la ligne liée quelle que soit son
 * association, alors que seul l'enregistrement racine est filtré par le
 * `where: { associationId }` de la requête.
 *
 * Pourquoi ces lignes peuvent pointer ailleurs : avant le commit f2d90e4, les
 * routes acceptaient `beneficiaryId`, `caisseId`, `donorId`… depuis le body
 * sans vérifier leur appartenance. Les écritures sont désormais contrôlées,
 * mais les lignes antérieures subsistent en base — et c'est par elles que le
 * cloisonnement fuit aujourd'hui.
 *
 * Les relations to-many se contraignent directement dans l'`include`
 * (`where: { associationId }`). Pour les relations to-one, Prisma n'accepte pas
 * de `where` : il faut masquer après lecture. C'est l'objet de ce module.
 *
 * Le contrôle ne coûte aucune requête supplémentaire : chaque ligne liée porte
 * son propre `associationId`, déjà chargée par Prisma.
 */

/** Une relation to-one appartenant à une autre association devient `null`. */
export function relationAutorisee<T>(relation: T | null | undefined, associationId: string): T | null {
  if (!relation || typeof relation !== 'object') return null;
  const row = relation as unknown as { associationId?: string };
  return row.associationId === associationId ? (relation as T) : null;
}

/** Applique `relationAutorisee` aux champs désignés d'une ligne. */
export function masquerRelationsHorsTenant<T extends Record<string, any>>(
  row: T,
  associationId: string,
  champs: readonly string[],
): T {
  if (!row) return row;
  const out: Record<string, any> = { ...row };
  let modifie = false;
  for (const champ of champs) {
    if (!(champ in out)) continue;
    const valeur = relationAutorisee(out[champ], associationId);
    if (valeur !== out[champ]) {
      out[champ] = valeur;
      modifie = true;
    }
  }
  return (modifie ? out : row) as T;
}

/** Variante liste, pour les réponses qui renvoient plusieurs lignes. */
export function masquerRelationsListe<T extends Record<string, any>>(
  rows: T[],
  associationId: string,
  champs: readonly string[],
): T[] {
  return rows.map((row) => masquerRelationsHorsTenant(row, associationId, champs));
}

/** Champs de relation portés par une transaction financière. */
export const RELATIONS_TRANSACTION = ['caisse', 'bankAccount', 'donor', 'beneficiary'] as const;

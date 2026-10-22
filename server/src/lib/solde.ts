// Import purement typé : ce module ne dépend du client Prisma qu'à la
// compilation (types `TransactionClient` / `WhereInput`), jamais à l'exécution.
// Il reste donc testable sans base ni client instancié.
import type { Prisma } from '../generated/prisma/client';
import { roundMoney } from './money';

/**
 * Solde réellement dépensable — helper central côté serveur.
 *
 * `Caisse.balance` et `BankAccount.balance` sont le solde DÉTENU : tout
 * l'argent présent physiquement. Ce n'est pas ce qui est disponible. Une
 * partie de ce solde est déjà PROMISE :
 *
 *   - les dons affectés à un bénéficiaire qui n'a pas encore encaissé
 *     (`DonationAllocation.remainingAmount > 0`) : le don a crédité la caisse à
 *     la remise des espèces, mais l'argent reste dû ;
 *   - les débits en attente : argent engagé, pas encore sorti.
 *
 * Comparer une sortie au solde brut laisse engager deux fois la même somme :
 * un retrait consomme les fonds promis à un bénéficiaire, puis la confirmation
 * de ce don vide la caisse et la fait passer en négatif.
 *
 * Invariant, appliqué à chaque sortie d'argent :
 *
 *   disponible = solde − réservé
 *   autorisé si disponible ≥ montant
 *
 * … où `réservé` EXCLUT la réservation que la sortie éteint — la promesse
 * qu'elle paie, ou le débit en attente qu'elle confirme. Payer une promesse
 * consomme sa propre réservation : elle ne doit pas être comptée deux fois,
 * une fois comme réservé et une fois comme sortie, sinon l'opération la plus
 * normale serait refusée (solde 10, réservé 10, disponible 0).
 *
 * Une dépense libre (retrait, orientation médicale sans allocation) n'éteint
 * rien : elle doit être couverte par des fonds non réservés.
 */

/** Client transactionnel Prisma : ce que reçoit le callback de `$transaction`. */
export type TxClient = Prisma.TransactionClient;

/** Compte sur lequel une sortie d'argent est imputée. */
export interface CompteCible {
  caisseId?: string | null;
  bankAccountId?: string | null;
}

/** Réservations que la sortie en cours éteint (au plus une des deux). */
export interface ReservationEteinte {
  allocationId?: string;
  transactionId?: string;
}

/** Filtres de rattachement au compte, par colonne, dans l'ordre du compte visé. */
function rattachements(compte: CompteCible): Prisma.TransactionWhereInput[] {
  const where: Prisma.TransactionWhereInput[] = [];
  if (compte.caisseId) where.push({ caisseId: compte.caisseId });
  if (compte.bankAccountId) where.push({ bankAccountId: compte.bankAccountId });
  return where;
}

/** Solde brut (détenu), lu sur la caisse ou le compte bancaire visé. */
export async function soldeDetenu(
  tx: TxClient,
  associationId: string,
  compte: CompteCible,
): Promise<number> {
  if (compte.caisseId) {
    const caisse = await tx.caisse.findFirst({
      where: { id: compte.caisseId, associationId },
      select: { balance: true },
    });
    return Number(caisse?.balance ?? 0);
  }
  if (compte.bankAccountId) {
    const banque = await tx.bankAccount.findFirst({
      where: { id: compte.bankAccountId, associationId },
      select: { balance: true },
    });
    return Number(banque?.balance ?? 0);
  }
  return 0;
}

/**
 * Montants promis mais non encore sortis pour ce compte.
 *
 * L'imputation suit le mouvement réel du solde : une transaction portant un
 * `bankAccountId` mobilise aussi ce compte. On agrège donc par colonne
 * (`caisseId` / `bankAccountId`) plutôt que par `fundSource`, pour rester
 * aligné sur ce que les routes débitent effectivement.
 *
 * `exclure` retire les réservations que la sortie en cours éteint — voir
 * `verifierSortie`.
 */
export async function montantReserve(
  tx: TxClient,
  associationId: string,
  compte: CompteCible,
  exclure: ReservationEteinte = {},
): Promise<number> {
  const ou = rattachements(compte);
  if (ou.length === 0) return 0;

  // 1. Dons affectés non encore versés (le reste dû au bénéficiaire).
  const allocations = await tx.donationAllocation.aggregate({
    where: {
      associationId,
      remainingAmount: { gt: 0 },
      creditTransaction: { is: { OR: ou } },
      ...(exclure.allocationId ? { id: { not: exclure.allocationId } } : {}),
    },
    _sum: { remainingAmount: true },
  });

  // 2. Débits en attente : argent engagé, pas encore sorti. Au moment de la
  //    confirmation, l'argent sortira du compte désigné par `fundSource` — et
  //    de lui seul. On ne peut donc PAS s'appuyer sur `caisseId`/`bankAccountId`
  //    seuls : `caisseId` est un champ obligatoire de `Transaction`, renseigné
  //    même pour un débit bancaire, alors qu'un débit `banque` ne touche jamais
  //    la caisse. Sans ce filtre, une caisse afficherait comme réservés des
  //    engagements qui ne la concernent pas.
  const debits: Prisma.TransactionWhereInput[] = [];
  if (compte.caisseId) {
    debits.push({ fundSource: 'caisse_physique', caisseId: compte.caisseId });
  }
  if (compte.bankAccountId) {
    debits.push({ fundSource: 'banque', bankAccountId: compte.bankAccountId });
  }

  const debitEnAttente = debits.length
    ? await tx.transaction.aggregate({
        where: {
          associationId,
          status: 'pending',
          type: 'debit',
          OR: debits,
          ...(exclure.transactionId ? { id: { not: exclure.transactionId } } : {}),
        },
        _sum: { amount: true },
      })
    : null;

  return roundMoney(
    Number(allocations._sum.remainingAmount ?? 0) +
      Number(debitEnAttente?._sum.amount ?? 0),
  );
}

/**
 * Compte effectivement mouvementé par une opération, déduit de `fundSource`.
 *
 * C'est ICI, et nulle part ailleurs, qu'est définie la règle « d'où sort (ou
 * où entre) l'argent ». Elle est volontairement EXCLUSIVE : un crédit ou un
 * débit bancaire ne touche jamais la caisse, et réciproquement.
 *
 * Les quatre sites qui déplacent réellement un solde — création d'un débit,
 * création d'un crédit, confirmation d'une transaction, déboursement d'une
 * allocation — doivent tous passer par ce helper. Ils avaient fini par
 * diverger : le chemin crédit incrémentait la caisse ET la banque (le même
 * argent compté deux fois, donc des soldes totaux gonflés et des retraits
 * possibles sur des fonds jamais entrés), tandis que le débit n'en débitait
 * qu'un. Un seul point de vérité empêche la divergence de revenir.
 */
export function compteDuMouvement(op: {
  fundSource?: string | null;
  caisseId?: string | null;
  bankAccountId?: string | null;
}): CompteCible | null {
  if (op.fundSource === 'banque') {
    return op.bankAccountId ? { bankAccountId: op.bankAccountId } : null;
  }
  if (op.fundSource === 'caisse_physique') {
    return op.caisseId ? { caisseId: op.caisseId } : null;
  }
  // `fundSource` absent sur des lignes anciennes : on retombe sur le compte
  // réellement désigné.
  if (op.bankAccountId) return { bankAccountId: op.bankAccountId };
  return op.caisseId ? { caisseId: op.caisseId } : null;
}

/** Solde détenu moins les montants déjà promis. */
export async function soldeDisponible(
  tx: TxClient,
  associationId: string,
  compte: CompteCible,
): Promise<number> {
  const solde = await soldeDetenu(tx, associationId, compte);
  const reserve = await montantReserve(tx, associationId, compte);
  return roundMoney(solde - reserve);
}

export interface SortieAutorisee {
  autorise: boolean;
  disponible: number;
  reserve: number;
  solde: number;
}

/**
 * Vérifie qu'une sortie d'argent est couverte.
 *
 * `eteint` désigne la réservation que cette sortie solde, s'il y en a une :
 *
 *   - `allocationId` — paiement d'une promesse (confirmer un don affecté,
 *     débourser une allocation, débit rattaché à une allocation) ;
 *   - `transactionId` — confirmation d'un débit en attente, qui libère sa
 *     propre réservation en passant à `completed`.
 *
 * Elle est retirée du réservé par `montantReserve` : c'est le seul endroit où
 * il faut le faire, soustraire en plus son montant reviendrait à l'exclure
 * deux fois et autoriserait un découvert.
 *
 * Ne décrémente rien : la garde `updateMany({ where: { balance: { gte } } })`
 * reste le compare-and-swap de dernier recours, exécuté juste après.
 */
export async function verifierSortie(
  tx: TxClient,
  associationId: string,
  compte: CompteCible,
  montant: number,
  eteint: ReservationEteinte = {},
): Promise<SortieAutorisee> {
  const solde = await soldeDetenu(tx, associationId, compte);
  const reserve = await montantReserve(tx, associationId, compte, eteint);

  const valeur = roundMoney(Math.max(0, montant));
  const disponible = roundMoney(solde - reserve);

  return {
    autorise: disponible >= valeur,
    disponible,
    reserve,
    solde,
  };
}

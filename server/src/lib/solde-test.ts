/**
 * Vérification autonome de `solde.ts` — rejoue les scénarios de découvert.
 *
 * Aucune base requise : `solde.ts` n'importe Prisma qu'en types, on lui passe
 * donc un faux client transactionnel. Exécution :
 *
 *   cd server && npx ts-node src/lib/solde-test.ts
 *
 * Le script sort en code 1 au premier échec.
 */
import { verifierSortie, soldeDisponible, montantReserve, type TxClient } from './solde';

// --- Faux client Prisma -----------------------------------------------------
// Reproduit la sémantique de filtrage : OR sur les colonnes de rattachement,
// plus `status`/`type`/`remainingAmount > 0` et l'exclusion par id.

interface Etat {
  caisse: { balance: number };
  banque: { balance: number };
  allocations: { id: string; remainingAmount: number; caisseId: string; bankAccountId?: string }[];
  debits: { id: string; amount: number; status: 'pending' | 'completed'; caisseId: string; bankAccountId?: string }[];
}

function fauxClient(etat: Etat): TxClient {
  // Prisma ne compare que les champs réellement présents dans le critère :
  // `{ caisseId: 'c1' }` ne doit pas correspondre à un enregistrement dont le
  // `bankAccountId` vaut `undefined` (les deux étant indéfinis, un `===` naïf
  // les déclarerait égaux et ferait fuiter les réservations entre comptes).
  const rattache = (o: { caisseId?: string; bankAccountId?: string }, w: any) => {
    const ou = w?.OR ?? [];
    if (ou.length === 0) return true;
    return ou.some(
      (c: any) =>
        (c.caisseId !== undefined && o.caisseId === c.caisseId) ||
        (c.bankAccountId !== undefined && o.bankAccountId === c.bankAccountId),
    );
  };

  return {
    caisse: { findFirst: async () => ({ balance: etat.caisse.balance }) },
    bankAccount: { findFirst: async () => ({ balance: etat.banque.balance }) },
    donationAllocation: {
      aggregate: async ({ where }: any) => {
        const somme = etat.allocations
          .filter((a) => a.remainingAmount > (where?.remainingAmount?.gt ?? -Infinity))
          .filter((a) => rattache(a, where?.creditTransaction?.is))
          .filter((a) => !where?.id?.not || a.id !== where.id.not)
          .reduce((s, a) => s + a.remainingAmount, 0);
        return { _sum: { remainingAmount: somme } };
      },
      findFirst: async ({ where }: any) => {
        const a = etat.allocations.find((x) => x.id === where.id);
        return a ? { remainingAmount: a.remainingAmount } : null;
      },
    },
    transaction: {
      aggregate: async ({ where }: any) => {
        const somme = etat.debits
          .filter((d) => d.status === (where?.status ?? d.status))
          .filter((d) => d.amount > 0)
          .filter((d) => rattache(d, where))
          // Exclusion de la réservation que la sortie éteint (débit confirmé).
          .filter((d) => !where?.id?.not || d.id !== where.id.not)
          .reduce((s, d) => s + d.amount, 0);
        return { _sum: { amount: somme } };
      },
      findFirst: async ({ where }: any) => {
        const d = etat.debits.find((x) => x.id === where.id && x.status === where.status);
        return d ? { amount: d.amount } : null;
      },
    },
  } as unknown as TxClient;
}

// --- Micro-framework --------------------------------------------------------

let echecs = 0;
function attendu(intitule: string, reel: unknown, voulu: unknown) {
  const ok = JSON.stringify(reel) === JSON.stringify(voulu);
  if (!ok) echecs++;
  console.log(`${ok ? '  ok  ' : ' ÉCHEC'} ${intitule}${ok ? '' : ` — attendu ${JSON.stringify(voulu)}, obtenu ${JSON.stringify(reel)}`}`);
}

const AID = 'asso-1';
const CAISSE = { caisseId: 'c1' };

// Le corps est enveloppé dans `main` : le projet compile en `commonjs`, qui
// n'accepte pas d'`await` au niveau racine.
async function main() {
// --- Scénario signalé -------------------------------------------------------
console.log('\nScénario utilisateur : dépôt 10 · don 10 à un bénéficiaire · retrait 20 · confirmation');

// Étape 1 — dépôt libre de 10 : solde 10, rien de promis.
{
  const tx = fauxClient({
    caisse: { balance: 10 }, banque: { balance: 0 },
    allocations: [], debits: [],
  });
  attendu('étape 1 — disponible = 10', await soldeDisponible(tx, AID, CAISSE), 10);
}

// Étape 2 — don de 10 affecté à un bénéficiaire, non versé.
// Économiquement : le donateur a remis 10 espèces qui appartiennent déjà au
// bénéficiaire. Le solde détenu passe à 20, mais 10 sont promis.
{
  const tx = fauxClient({
    caisse: { balance: 20 }, banque: { balance: 0 },
    allocations: [{ id: 'a1', remainingAmount: 10, caisseId: 'c1' }],
    debits: [],
  });
  attendu('étape 2 — réservé = 10', await montantReserve(tx, AID, CAISSE), 10);
  attendu('étape 2 — disponible = 10 (et non 20)', await soldeDisponible(tx, AID, CAISSE), 10);

  // Étape 3 — retrait libre de 20 : ne reste que 10 non réservés → refusé.
  const r = await verifierSortie(tx, AID, CAISSE, 20);
  attendu('étape 3 — retrait de 20 REFUSÉ', r.autorise, false);
  attendu('étape 3 — disponible = 10', r.disponible, 10);

  // Un retrait libre de 10 reste possible.
  attendu('étape 3 bis — retrait de 10 autorisé', (await verifierSortie(tx, AID, CAISSE, 10)).autorise, true);
}

// Étape 4 — confirmation du don : elle paie la promesse, qui s'éteint.
{
  const tx = fauxClient({
    caisse: { balance: 20 }, banque: { balance: 0 },
    allocations: [{ id: 'a1', remainingAmount: 10, caisseId: 'c1' }],
    debits: [],
  });
  const r = await verifierSortie(tx, AID, CAISSE, 10, { allocationId: 'a1' });
  attendu('étape 4 — versement de 10 autorisé (solde 20)', r.autorise, true);
}

// Étape 4 (variante signalée) — l'argent promis a été dépensé entre-temps :
// solde 0, la promesse de 10 reste due. La confirmation doit être REFUSÉE,
// sinon la caisse finit à −10.
{
  const tx = fauxClient({
    caisse: { balance: 0 }, banque: { balance: 0 },
    allocations: [{ id: 'a1', remainingAmount: 10, caisseId: 'c1' }],
    debits: [],
  });
  const r = await verifierSortie(tx, AID, CAISSE, 10, { allocationId: 'a1' });
  attendu('étape 4 bis — versement REFUSÉ, pas de découvert', r.autorise, false);
  attendu('étape 4 bis — disponible = 0', r.disponible, 0);
}

// --- Cas limites ------------------------------------------------------------
console.log('\nCas limites');

// Versement partiel : le don est de 10, on libère 4 avec un solde de 4.
// La promesse n'exige pas de fonds en plus (elle EST l'affectation).
{
  const tx = fauxClient({
    caisse: { balance: 4 }, banque: { balance: 0 },
    allocations: [{ id: 'a1', remainingAmount: 10, caisseId: 'c1' }],
    debits: [],
  });
  attendu('versement partiel 4 sur solde 4 autorisé', (await verifierSortie(tx, AID, CAISSE, 4, { allocationId: 'a1' })).autorise, true);
}

// Confirmation d'un débit en attente : le débit est enregistré et réserve son
// montant. Le confirmer éteint cette réservation — il ne doit pas être refusé
// pour cette raison.
{
  const tx = fauxClient({
    caisse: { balance: 10 }, banque: { balance: 0 },
    allocations: [],
    debits: [{ id: 'd1', amount: 10, status: 'pending', caisseId: 'c1' }],
  });
  attendu('débit en attente réserve 10', await montantReserve(tx, AID, CAISSE), 10);
  attendu('confirmation du débit autorisée', (await verifierSortie(tx, AID, CAISSE, 10, { transactionId: 'd1' })).autorise, true);

  // Mais s'il n'y a plus les fonds : refus.
  const vide = fauxClient({
    caisse: { balance: 0 }, banque: { balance: 0 },
    allocations: [],
    debits: [{ id: 'd1', amount: 10, status: 'pending', caisseId: 'c1' }],
  });
  attendu('débit en attente sans fonds REFUSÉ', (await verifierSortie(vide, AID, CAISSE, 10, { transactionId: 'd1' })).autorise, false);
}

// Dépense libre pendant deux promesses en cours.
{
  const tx = fauxClient({
    caisse: { balance: 30 }, banque: { balance: 0 },
    allocations: [
      { id: 'a1', remainingAmount: 10, caisseId: 'c1' },
      { id: 'a2', remainingAmount: 5, caisseId: 'c1' },
    ],
    debits: [],
  });
  attendu('réservé = 15', await montantReserve(tx, AID, CAISSE), 15);
  attendu('dépense libre de 15 autorisée', (await verifierSortie(tx, AID, CAISSE, 15)).autorise, true);
  attendu('dépense libre de 16 refusée', (await verifierSortie(tx, AID, CAISSE, 16)).autorise, false);
}

// Une allocation déjà soldée ne réserve plus rien.
{
  const tx = fauxClient({
    caisse: { balance: 10 }, banque: { balance: 0 },
    allocations: [{ id: 'a1', remainingAmount: 0, caisseId: 'c1' }],
    debits: [],
  });
  attendu('allocation soldée ne réserve plus', await montantReserve(tx, AID, CAISSE), 0);
}

// Isolation : la réservation d'une autre caisse ne bloque pas celle-ci.
{
  const tx = fauxClient({
    caisse: { balance: 10 }, banque: { balance: 0 },
    allocations: [{ id: 'a1', remainingAmount: 10, caisseId: 'AUTRE' }],
    debits: [],
  });
  attendu("réservation d'une autre caisse ignorée", await montantReserve(tx, AID, CAISSE), 0);
}

console.log(echecs === 0 ? '\nTous les cas passent.\n' : `\n${echecs} cas en échec.\n`);
process.exit(echecs === 0 ? 0 : 1);
}

main();

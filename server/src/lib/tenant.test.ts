import { describe, it, expect } from 'vitest';
import {
  relationAutorisee,
  masquerRelationsHorsTenant,
  masquerRelationsListe,
  RELATIONS_TRANSACTION,
} from './tenant';

/**
 * Ces tests protègent l'invariant central du SaaS multi-tenant : une ligne lue
 * dans le périmètre de l'association A ne doit jamais exposer une relation
 * appartenant à l'association B.
 *
 * Pourquoi c'est critique : Prisma n'applique aucun filtre tenant automatique.
 * Un `where: { associationId }` ne contraint QUE la table racine ; les relations
 * to-one (`include: { donor: true }`) ramènent la ligne liée quelle que soit son
 * association. Ces helpers sont donc la dernière barrière avant la réponse HTTP.
 *
 * Un échec ici signifie une fuite de données entre associations.
 */

const ASSOC_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ASSOC_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('relationAutorisee — relation to-one', () => {
  it('conserve une relation appartenant à la même association', () => {
    const caisse = { id: 'c1', associationId: ASSOC_A, reference: 'C-1' };
    expect(relationAutorisee(caisse, ASSOC_A)).toBe(caisse);
  });

  it('renvoie null pour une relation d une AUTRE association', () => {
    const caisseEtrangere = { id: 'c2', associationId: ASSOC_B, reference: 'C-2' };
    expect(relationAutorisee(caisseEtrangere, ASSOC_A)).toBeNull();
  });

  it('renvoie null pour une relation absente (null / undefined)', () => {
    expect(relationAutorisee(null, ASSOC_A)).toBeNull();
    expect(relationAutorisee(undefined, ASSOC_A)).toBeNull();
  });

  it('renvoie null quand la relation ne porte pas d associationId', () => {
    // Objet partiel ou mal typé : l'appartenance n'est pas prouvable, donc on
    // ne l'expose pas.
    expect(relationAutorisee({ id: 'x' } as any, ASSOC_A)).toBeNull();
  });
});

describe('masquerRelationsHorsTenant — ligne unique', () => {
  it('masque uniquement les relations étrangères, garde les autres champs', () => {
    const ligne = {
      id: 't1',
      associationId: ASSOC_A,
      amount: 500,
      caisse: { id: 'c1', associationId: ASSOC_A, reference: 'C-1' },
      donor: { id: 'd1', associationId: ASSOC_B, name: 'Donateur de B' },
      beneficiary: null,
    };

    const sortie = masquerRelationsHorsTenant(ligne as any, ASSOC_A, ['caisse', 'donor', 'beneficiary']);

    // La caisse de A reste visible…
    expect(sortie.caisse).toEqual(ligne.caisse);
    // …celle de B est masquée : plus aucune donnée de l'association voisine.
    expect(sortie.donor).toBeNull();
    expect(sortie.beneficiary).toBeNull();
    // Les champs propres à la transaction sont intacts.
    expect(sortie.id).toBe('t1');
    expect(sortie.amount).toBe(500);
  });

  it('ignore un champ désigné qui n existe pas sur la ligne', () => {
    const ligne = { id: 't1', associationId: ASSOC_A };
    const sortie = masquerRelationsHorsTenant(ligne as any, ASSOC_A, ['donor']);
    expect(sortie).toEqual({ id: 't1', associationId: ASSOC_A });
  });

  it('ne modifie pas la ligne d origine (pas d effet de bord)', () => {
    const ligne = { id: 't2', donor: { id: 'd2', associationId: ASSOC_B } };
    const sortie = masquerRelationsHorsTenant(ligne as any, ASSOC_A, ['donor']);
    expect(sortie.donor).toBeNull();
    // L'objet d'entrée garde sa valeur : un appelant qui le relit ne doit pas
    // être surpris par une mutation silencieuse.
    expect(ligne.donor).toEqual({ id: 'd2', associationId: ASSOC_B });
  });
});

describe('masquerRelationsListe — collection', () => {
  it('traite chaque élément indépendamment', () => {
    const lignes = [
      { id: 'l1', donor: { id: 'd1', associationId: ASSOC_A } },
      { id: 'l2', donor: { id: 'd2', associationId: ASSOC_B } },
    ];

    const sortie = masquerRelationsListe(lignes as any[], ASSOC_A, ['donor']);

    expect(sortie[0].donor).toEqual({ id: 'd1', associationId: ASSOC_A });
    expect(sortie[1].donor).toBeNull();
  });

  it('accepte une liste vide', () => {
    expect(masquerRelationsListe([], ASSOC_A, ['donor'])).toEqual([]);
  });
});

describe('RELATIONS_TRANSACTION — constante de cloisonnement', () => {
  it('couvre les quatre relations exposées par une transaction', () => {
    // Sans cette liste complète, une relation oubliée passerait au client sans
    // masquage : le donateur d'une autre association apparaîtrait sur le
    // tableau de bord.
    expect([...RELATIONS_TRANSACTION].sort()).toEqual(
      ['bankAccount', 'beneficiary', 'caisse', 'donor'],
    );
  });
});

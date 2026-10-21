import { describe, it, expect } from 'vitest';
import {
  localDay,
  todayLocalISO,
  startOfLocalDay,
  nextLocalDay,
  resolveTransactionDate,
  type DateResolution,
  type ResolvedDate,
} from './datePolicy';

// `DateResolution` est une union sans champ discriminant : on la rétrécit par
// `in`, ce qui rend le test lisible sans toucher au type de production.
function dateRetenue(r: DateResolution): ResolvedDate {
  if (!('honored' in r)) throw new Error(`date attendue, erreur reçue : « ${r.error} »`);
  return r;
}
function erreurRendue(r: DateResolution): string {
  if (!('error' in r)) throw new Error('erreur attendue, date reçue');
  return r.error;
}

// ---------------------------------------------------------------------------
// localDay — le jour calendaire est celui de l'Algérie, pas celui d'UTC
//
// Le serveur (Vercel) tourne en UTC. Sans fuseau explicite, une opération
// saisie « aujourd'hui » entre 23 h et minuit en Algérie passerait pour
// « demain », et serait refusée comme date future.
// ---------------------------------------------------------------------------
describe('localDay', () => {
  it('rend le jour algérien, en avance sur le jour UTC après 23 h', () => {
    const instant = new Date('2026-10-19T23:30:00Z');
    expect(localDay(instant)).toBe('2026-10-20');
    // Le même instant, vu en UTC, appartient encore à la veille : c'est
    // exactement l'écart que le fuseau explicite doit corriger.
    expect(instant.toISOString().slice(0, 10)).toBe('2026-10-19');
  });

  it('rend un format ISO à deux chiffres, comparable comme une chaîne', () => {
    expect(localDay(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
  });

  it('todayLocalISO suit localDay', () => {
    const now = new Date('2026-10-19T23:30:00Z');
    expect(todayLocalISO(now)).toBe(localDay(now));
  });
});

// ---------------------------------------------------------------------------
// startOfLocalDay / nextLocalDay — bornes de filtre
//
// `Transaction.date` stocke un instant, mais les filtres de l'interface
// raisonnent en jours. Les borner à `new Date('2026-10-20')` (minuit UTC)
// décalait la fenêtre d'une heure.
// ---------------------------------------------------------------------------
describe('startOfLocalDay', () => {
  it('rend minuit local, soit 23 h UTC la veille (Algérie = UTC+1)', () => {
    expect(startOfLocalDay('2026-10-20').toISOString()).toBe('2026-10-19T23:00:00.000Z');
  });

  it('est l’inverse exact de localDay', () => {
    for (const day of ['2026-01-01', '2026-02-28', '2026-06-15', '2026-12-31']) {
      expect(localDay(startOfLocalDay(day))).toBe(day);
    }
  });
});

describe('nextLocalDay', () => {
  it('avance d’un jour', () => {
    expect(nextLocalDay('2026-10-20')).toBe('2026-10-21');
  });

  it('franchit la fin de mois et la fin d’année', () => {
    expect(nextLocalDay('2026-10-31')).toBe('2026-11-01');
    expect(nextLocalDay('2026-12-31')).toBe('2027-01-01');
  });

  it('franchit le 29 février d’une année bissextile', () => {
    expect(nextLocalDay('2028-02-28')).toBe('2028-02-29');
    expect(nextLocalDay('2028-02-29')).toBe('2028-03-01');
  });

  it('borne une fenêtre d’exactement 24 h (Algérie sans heure d’été)', () => {
    const debut = startOfLocalDay('2026-10-20');
    const fin = startOfLocalDay(nextLocalDay('2026-10-20'));
    expect(fin.getTime() - debut.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// resolveTransactionDate — politique de date des opérations
//
// `now` est pris en plein milieu de journée : ainsi ni le jour courant ni les
// jours voisins ne basculent selon le fuseau d'exécution de la machine de test.
// ---------------------------------------------------------------------------
describe('resolveTransactionDate', () => {
  const now = new Date('2026-10-20T12:00:00Z');

  describe('rôle non autorisé', () => {
    it('ignore une date passée et retient l’instant courant', () => {
      expect(resolveTransactionDate('treasurer', '2026-10-15', now)).toEqual({
        date: now,
        honored: false,
      });
    });

    it('neutralise la valeur plutôt que de la refuser (aucun client cassé)', () => {
      // Le client envoie toujours une date ; répondre 400 casserait les clients
      // existants pour un champ dont la valeur est simplement ignorée.
      const r = dateRetenue(resolveTransactionDate('volunteer', '2026-10-15', now));
      expect(r.honored).toBe(false);
    });

    it('n’honore pas non plus une date invalide', () => {
      expect(resolveTransactionDate(undefined, 'n’importe quoi', now)).toEqual({
        date: now,
        honored: false,
      });
    });
  });

  describe('super-administrateur', () => {
    it('honore une date passée', () => {
      const r = dateRetenue(resolveTransactionDate('super_admin', '2026-10-15', now));
      expect(r.honored).toBe(true);
      expect(r.date.toISOString()).toBe('2026-10-15T00:00:00.000Z');
    });

    it('honore le jour même', () => {
      expect(dateRetenue(resolveTransactionDate('super_admin', '2026-10-20', now)).honored).toBe(
        true,
      );
    });

    it('refuse une date future', () => {
      expect(erreurRendue(resolveTransactionDate('super_admin', '2026-10-21', now))).toBe(
        'La date ne peut pas être dans le futur',
      );
    });

    it('retient l’instant courant quand aucune date n’est fournie', () => {
      for (const vide of [undefined, null, '']) {
        expect(resolveTransactionDate('super_admin', vide, now)).toEqual({
          date: now,
          honored: false,
        });
      }
    });

    it('refuse un jour inexistant plutôt que de le faire déborder', () => {
      // `new Date('2026-02-30')` vaut le 2 mars : JS reporte silencieusement.
      // Sans garde, l'opération serait datée d'un jour que personne n'a choisi.
      expect(erreurRendue(resolveTransactionDate('super_admin', '2026-02-30', now))).toBe(
        'Invalid date',
      );
      expect(erreurRendue(resolveTransactionDate('super_admin', '2026-13-01', now))).toBe(
        'Invalid date',
      );
    });

    it('refuse un format de date non ISO', () => {
      expect(erreurRendue(resolveTransactionDate('super_admin', '20/10/2026', now))).toBe(
        'Invalid date',
      );
    });

    it('accepte le jour même choisi tard le soir en Algérie (23 h 30 locales)', () => {
      // Piège du fuseau : à 22:30Z il est 23:30 en Algérie, le jour local est
      // toujours le 20. Comparer sur l'instant UTC plutôt que sur le jour local
      // aurait fait passer « aujourd'hui » pour demain.
      const tard = new Date('2026-10-20T22:30:00Z');
      expect(dateRetenue(resolveTransactionDate('super_admin', '2026-10-20', tard)).honored).toBe(
        true,
      );
    });
  });
});

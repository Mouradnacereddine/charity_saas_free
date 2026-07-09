import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../lib/db';
import { useCaisseStore } from './caisseStore';

describe('caisseStore', () => {
  beforeEach(async () => {
    await db.caisses.clear();
    await db.transactions.clear();
    // Reset the zustand store state
    useCaisseStore.setState({ caisses: [], loading: false });
  });

  afterEach(async () => {
    await db.caisses.clear();
    await db.transactions.clear();
  });

  describe('loadCaisses', () => {
    it('loads caisses from the database', async () => {
      const now = new Date();
      await db.caisses.bulkAdd([
        {
          id: 'caisse-1',
          reference: 'CAI-TEST-XXX' ,
          name: 'Caisse Sociale',
          nameAr: 'الصندوق الاجتماعي',
          subCategories: [],
          balance: 1000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'caisse-2',
          reference: 'CAI-TEST-XXX' ,
          name: 'Caisse Medicale',
          nameAr: 'الصندوق الطبي',
          subCategories: [],
          balance: 2000,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const store = useCaisseStore.getState();
      await store.loadCaisses();

      const state = useCaisseStore.getState();
      expect(state.caisses).toHaveLength(2);
      expect(state.caisses.map((c) => c.name)).toContain('Caisse Sociale');
      expect(state.caisses.map((c) => c.name)).toContain('Caisse Medicale');
      expect(state.loading).toBe(false);
    });

    it('returns empty array when no caisses exist', async () => {
      const store = useCaisseStore.getState();
      await store.loadCaisses();

      const state = useCaisseStore.getState();
      expect(state.caisses).toHaveLength(0);
    });
  });

  describe('addCaisse', () => {
    it('creates a caisse with correct fields', async () => {
      const store = useCaisseStore.getState();
      await store.addCaisse('Caisse Test', 'صندوق اختبار', 'CAI-TEST-ADD');

      const state = useCaisseStore.getState();
      expect(state.caisses).toHaveLength(1);

      const caisse = state.caisses[0];
      expect(caisse.name).toBe('Caisse Test');
      expect(caisse.nameAr).toBe('صندوق اختبار');
      expect(caisse.subCategories).toEqual([]);
      expect(caisse.balance).toBe(0);
      expect(caisse.id).toBeDefined();
      expect(caisse.createdAt).toBeInstanceOf(Date);
      expect(caisse.updatedAt).toBeInstanceOf(Date);

      // Verify persisted in db
      const dbCaisse = await db.caisses.get(caisse.id);
      expect(dbCaisse).toBeDefined();
      expect(dbCaisse!.name).toBe('Caisse Test');
    });
  });

  describe('updateCaisse', () => {
    it('modifies name and nameAr', async () => {
      const now = new Date();
      await db.caisses.add({
        id: 'caisse-upd',
          reference: 'CAI-TEST-XXX' ,
        name: 'Old Name',
        nameAr: 'اسم قديم',
        subCategories: [],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      });

      const store = useCaisseStore.getState();
      await store.loadCaisses();
      await store.updateCaisse('caisse-upd', { name: 'New Name', nameAr: 'اسم جديد' });

      const state = useCaisseStore.getState();
      const caisse = state.caisses.find((c) => c.id === 'caisse-upd');
      expect(caisse).toBeDefined();
      expect(caisse!.name).toBe('New Name');
      expect(caisse!.nameAr).toBe('اسم جديد');

      // Verify persisted in db
      const dbCaisse = await db.caisses.get('caisse-upd');
      expect(dbCaisse!.name).toBe('New Name');
    });
  });

  describe('deleteCaisse', () => {
    it('removes a caisse from the database', async () => {
      const now = new Date();
      await db.caisses.add({
        id: 'caisse-del',
          reference: 'CAI-TEST-XXX' ,
        name: 'To Delete',
        nameAr: 'للحذف',
        subCategories: [],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      });

      const store = useCaisseStore.getState();
      await store.loadCaisses();
      expect(useCaisseStore.getState().caisses).toHaveLength(1);

      await store.deleteCaisse('caisse-del');

      const state = useCaisseStore.getState();
      expect(state.caisses).toHaveLength(0);

      // Verify removed from db
      const dbCaisse = await db.caisses.get('caisse-del');
      expect(dbCaisse).toBeUndefined();
    });
  });

  describe('addSubCategory', () => {
    it('adds a sub-category to a caisse', async () => {
      const now = new Date();
      await db.caisses.add({
        id: 'caisse-sub',
          reference: 'CAI-TEST-XXX' ,
        name: 'Caisse Sub',
        nameAr: 'صندوق فرعي',
        subCategories: [],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      });

      const store = useCaisseStore.getState();
      await store.loadCaisses();
      await store.addSubCategory('caisse-sub', 'Aide alimentaire', 'مساعدة غذائية');

      const state = useCaisseStore.getState();
      const caisse = state.caisses.find((c) => c.id === 'caisse-sub');
      expect(caisse).toBeDefined();
      expect(caisse!.subCategories).toHaveLength(1);
      expect(caisse!.subCategories[0].name).toBe('Aide alimentaire');
      expect(caisse!.subCategories[0].nameAr).toBe('مساعدة غذائية');
      expect(caisse!.subCategories[0].id).toBeDefined();
    });
  });

  describe('updateSubCategory', () => {
    it('modifies a sub-category', async () => {
      const now = new Date();
      await db.caisses.add({
        id: 'caisse-sub-upd',
          reference: 'CAI-TEST-XXX' ,
        name: 'Caisse',
        nameAr: 'صندوق',
        subCategories: [{ id: 'sub-1', name: 'Old Sub', nameAr: 'فرعي قديم' }],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      });

      const store = useCaisseStore.getState();
      await store.loadCaisses();
      await store.updateSubCategory('caisse-sub-upd', 'sub-1', 'New Sub', 'فرعي جديد');

      const state = useCaisseStore.getState();
      const caisse = state.caisses.find((c) => c.id === 'caisse-sub-upd');
      expect(caisse!.subCategories[0].name).toBe('New Sub');
      expect(caisse!.subCategories[0].nameAr).toBe('فرعي جديد');
      expect(caisse!.subCategories[0].id).toBe('sub-1');
    });
  });

  describe('deleteSubCategory', () => {
    it('removes a sub-category from a caisse', async () => {
      const now = new Date();
      await db.caisses.add({
        id: 'caisse-sub-del',
          reference: 'CAI-TEST-XXX' ,
        name: 'Caisse',
        nameAr: 'صندوق',
        subCategories: [
          { id: 'sub-a', name: 'Sub A', nameAr: 'فرعي أ' },
          { id: 'sub-b', name: 'Sub B', nameAr: 'فرعي ب' },
        ],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      });

      const store = useCaisseStore.getState();
      await store.loadCaisses();
      await store.deleteSubCategory('caisse-sub-del', 'sub-a');

      const state = useCaisseStore.getState();
      const caisse = state.caisses.find((c) => c.id === 'caisse-sub-del');
      expect(caisse!.subCategories).toHaveLength(1);
      expect(caisse!.subCategories[0].id).toBe('sub-b');
    });
  });

  describe('getCaisseBalance', () => {
    it('returns the correct balance for a loaded caisse', async () => {
      const now = new Date();
      await db.caisses.add({
        id: 'caisse-bal',
          reference: 'CAI-TEST-XXX' ,
        name: 'Balance Caisse',
        nameAr: 'صندوق الرصيد',
        subCategories: [],
        balance: 5000,
        createdAt: now,
        updatedAt: now,
      });

      const store = useCaisseStore.getState();
      await store.loadCaisses();

      const balance = useCaisseStore.getState().getCaisseBalance('caisse-bal');
      expect(balance).toBe(5000);
    });

    it('returns 0 for a non-existent caisse', async () => {
      const store = useCaisseStore.getState();
      await store.loadCaisses();

      const balance = useCaisseStore.getState().getCaisseBalance('non-existent');
      expect(balance).toBe(0);
    });
  });
});

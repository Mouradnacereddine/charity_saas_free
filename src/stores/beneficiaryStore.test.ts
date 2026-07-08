import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../lib/db';
import { useBeneficiaryStore } from './beneficiaryStore';
import type { Beneficiary } from '../types';

describe('beneficiaryStore', () => {
  beforeEach(async () => {
    await db.beneficiaries.clear();
    useBeneficiaryStore.setState({ beneficiaries: [], loading: false });
  });

  afterEach(async () => {
    await db.beneficiaries.clear();
  });

  const makeBeneficiary = (overrides: Partial<Beneficiary> & { id: string }): Beneficiary => ({
    reference: 'BEN-TEST-001',
    firstName: 'Fatima',
    lastName: 'Bouzid',
    firstNameAr: 'فاطمة',
    lastNameAr: 'بوزيد',
    address: '10 Rue Didouche',
    addressAr: 'شارع ديدوش 10',
    phone: '0555111222',
    nationalCardNumber: '123456789',
    dateOfBirth: '1985-03-15',
    attribut: 'veuve',
    children: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('addBeneficiary', () => {
    it('creates a beneficiary with all fields', async () => {
      const store = useBeneficiaryStore.getState();
      await store.addBeneficiary({
        firstName: 'Khadija',
        lastName: 'Amrani',
        firstNameAr: 'خديجة',
        lastNameAr: 'عمراني',
        address: '5 Rue Larbi',
        addressAr: 'شارع العربي 5',
        phone: '0555222333',
        nationalCardNumber: '987654321',
        dateOfBirth: '1990-06-20',
        attribut: 'veuve',
        children: [
          {
            id: 'child-1',
            firstName: 'Youssef',
            lastName: 'Amrani',
            firstNameAr: 'يوسف',
            lastNameAr: 'عمراني',
            dateOfBirth: '2015-09-01',
            healthStatus: 'bonne_sante',
          },
        ],
        situation: 'Needs urgent help',
        situationAr: 'بحاجة لمساعدة عاجلة',
      });

      const state = useBeneficiaryStore.getState();
      expect(state.beneficiaries).toHaveLength(1);

      const ben = state.beneficiaries[0];
      expect(ben.firstName).toBe('Khadija');
      expect(ben.lastNameAr).toBe('عمراني');
      expect(ben.attribut).toBe('veuve');
      expect(ben.children).toHaveLength(1);
      expect(ben.children[0].firstName).toBe('Youssef');
      expect(ben.id).toBeDefined();
      expect(ben.createdAt).toBeInstanceOf(Date);

      // Verify persisted in db
      const dbBen = await db.beneficiaries.get(ben.id);
      expect(dbBen).toBeDefined();
      expect(dbBen!.firstName).toBe('Khadija');
    });
  });

  describe('updateBeneficiary', () => {
    it('modifies fields of an existing beneficiary', async () => {
      await db.beneficiaries.add(makeBeneficiary({ id: 'ben-upd' }));

      const store = useBeneficiaryStore.getState();
      await store.loadBeneficiaries();
      await store.updateBeneficiary('ben-upd', {
        firstName: 'Aicha',
        firstNameAr: 'عائشة',
        phone: '0666999888',
      });

      const state = useBeneficiaryStore.getState();
      const ben = state.beneficiaries.find((b) => b.id === 'ben-upd');
      expect(ben).toBeDefined();
      expect(ben!.firstName).toBe('Aicha');
      expect(ben!.firstNameAr).toBe('عائشة');
      expect(ben!.phone).toBe('0666999888');
      // Unchanged fields should remain
      expect(ben!.lastName).toBe('Bouzid');

      // Verify in db
      const dbBen = await db.beneficiaries.get('ben-upd');
      expect(dbBen!.firstName).toBe('Aicha');
    });
  });

  describe('deleteBeneficiary', () => {
    it('removes a beneficiary from the database', async () => {
      await db.beneficiaries.add(makeBeneficiary({ id: 'ben-del' }));

      const store = useBeneficiaryStore.getState();
      await store.loadBeneficiaries();
      expect(useBeneficiaryStore.getState().beneficiaries).toHaveLength(1);

      await store.deleteBeneficiary('ben-del');

      const state = useBeneficiaryStore.getState();
      expect(state.beneficiaries).toHaveLength(0);

      const dbBen = await db.beneficiaries.get('ben-del');
      expect(dbBen).toBeUndefined();
    });
  });

  describe('searchBeneficiaries', () => {
    beforeEach(async () => {
      await db.beneficiaries.bulkAdd([
        makeBeneficiary({
          id: 'ben-1',
          firstName: 'Fatima',
          lastName: 'Bouzid',
          firstNameAr: 'فاطمة',
          lastNameAr: 'بوزيد',
          attribut: 'veuve',
          caisseId: 'caisse-soc',
          children: [
            {
              id: 'c1',
              firstName: 'Ali',
              lastName: 'Bouzid',
              firstNameAr: 'علي',
              lastNameAr: 'بوزيد',
              dateOfBirth: '2018-05-10',
              healthStatus: 'bonne_sante',
            },
            {
              id: 'c2',
              firstName: 'Sara',
              lastName: 'Bouzid',
              firstNameAr: 'سارة',
              lastNameAr: 'بوزيد',
              dateOfBirth: '2020-11-22',
              healthStatus: 'bonne_sante',
            },
          ],
        }),
        makeBeneficiary({
          id: 'ben-2',
          firstName: 'Mohamed',
          lastName: 'Khaldi',
          firstNameAr: 'محمد',
          lastNameAr: 'خالدي',
          attribut: 'handicape',
          caisseId: 'caisse-med',
          phone: '0777111222',
          nationalCardNumber: '555666777',
          children: [],
        }),
        makeBeneficiary({
          id: 'ben-3',
          firstName: 'Amina',
          lastName: 'Saidi',
          firstNameAr: 'أمينة',
          lastNameAr: 'سعيدي',
          attribut: 'veuve',
          caisseId: 'caisse-soc',
          children: [
            {
              id: 'c3',
              firstName: 'Omar',
              lastName: 'Saidi',
              firstNameAr: 'عمر',
              lastNameAr: 'سعيدي',
              dateOfBirth: '2010-01-01',
              healthStatus: 'bonne_sante',
            },
          ],
        }),
      ]);
    });

    it('filters by attribut', async () => {
      const store = useBeneficiaryStore.getState();
      const results = await store.searchBeneficiaries({ attribut: 'veuve' });
      expect(results).toHaveLength(2);
      expect(results.every((b) => b.attribut === 'veuve')).toBe(true);
    });

    it('filters by caisseId', async () => {
      const store = useBeneficiaryStore.getState();
      const results = await store.searchBeneficiaries({ caisseId: 'caisse-med' });
      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Mohamed');
    });

    it('filters by searchTerm (name)', async () => {
      const store = useBeneficiaryStore.getState();
      const results = await store.searchBeneficiaries({ searchTerm: 'Khaldi' });
      expect(results).toHaveLength(1);
      expect(results[0].lastName).toBe('Khaldi');
    });

    it('filters by searchTerm (phone)', async () => {
      const store = useBeneficiaryStore.getState();
      const results = await store.searchBeneficiaries({ searchTerm: '0777' });
      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Mohamed');
    });

    it('filters by minChildren', async () => {
      const store = useBeneficiaryStore.getState();
      const results = await store.searchBeneficiaries({ minChildren: 2 });
      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Fatima');
    });

    it('filters by maxChildAge', async () => {
      const store = useBeneficiaryStore.getState();
      // ben-1: children born 2018 (~8yo) and 2020 (~5yo) => has children <= 10
      // ben-2: no children => excluded by maxChildAge (no child matches)
      // ben-3: child born 2010 (~16yo) => no child <= 10 => excluded
      const results = await store.searchBeneficiaries({ maxChildAge: 10 });
      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Fatima');
    });

    it('combines multiple filters', async () => {
      const store = useBeneficiaryStore.getState();
      const results = await store.searchBeneficiaries({
        attribut: 'veuve',
        minChildren: 2,
      });
      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Fatima');
    });
  });

  describe('findWidowsWithMostChildren', () => {
    beforeEach(async () => {
      await db.beneficiaries.bulkAdd([
        makeBeneficiary({
          id: 'widow-1',
          firstName: 'Fatima',
          attribut: 'veuve',
          children: [
            { id: 'w1c1', firstName: 'A', lastName: 'X', firstNameAr: '', lastNameAr: '', dateOfBirth: '2018-01-01', healthStatus: 'bonne_sante' },
            { id: 'w1c2', firstName: 'B', lastName: 'X', firstNameAr: '', lastNameAr: '', dateOfBirth: '2020-01-01', healthStatus: 'bonne_sante' },
            { id: 'w1c3', firstName: 'C', lastName: 'X', firstNameAr: '', lastNameAr: '', dateOfBirth: '2022-01-01', healthStatus: 'bonne_sante' },
          ],
        }),
        makeBeneficiary({
          id: 'widow-2',
          firstName: 'Amina',
          attribut: 'veuve',
          children: [
            { id: 'w2c1', firstName: 'D', lastName: 'Y', firstNameAr: '', lastNameAr: '', dateOfBirth: '2019-06-15', healthStatus: 'bonne_sante' },
          ],
        }),
        makeBeneficiary({
          id: 'widow-3',
          firstName: 'Khadija',
          attribut: 'veuve',
          children: [
            { id: 'w3c1', firstName: 'E', lastName: 'Z', firstNameAr: '', lastNameAr: '', dateOfBirth: '2016-03-10', healthStatus: 'bonne_sante' },
            { id: 'w3c2', firstName: 'F', lastName: 'Z', firstNameAr: '', lastNameAr: '', dateOfBirth: '2021-07-20', healthStatus: 'bonne_sante' },
          ],
        }),
        makeBeneficiary({
          id: 'not-widow',
          firstName: 'Mohamed',
          attribut: 'handicape',
          children: [
            { id: 'nwc1', firstName: 'G', lastName: 'W', firstNameAr: '', lastNameAr: '', dateOfBirth: '2017-01-01', healthStatus: 'bonne_sante' },
            { id: 'nwc2', firstName: 'H', lastName: 'W', firstNameAr: '', lastNameAr: '', dateOfBirth: '2019-01-01', healthStatus: 'bonne_sante' },
            { id: 'nwc3', firstName: 'I', lastName: 'W', firstNameAr: '', lastNameAr: '', dateOfBirth: '2021-01-01', healthStatus: 'bonne_sante' },
            { id: 'nwc4', firstName: 'J', lastName: 'W', firstNameAr: '', lastNameAr: '', dateOfBirth: '2023-01-01', healthStatus: 'bonne_sante' },
          ],
        }),
      ]);
    });

    it('returns widows sorted by children count (descending)', async () => {
      const store = useBeneficiaryStore.getState();
      const results = await store.findWidowsWithMostChildren();

      expect(results).toHaveLength(3); // only widows, not handicape
      expect(results[0].firstName).toBe('Fatima'); // 3 children
      expect(results[1].firstName).toBe('Khadija'); // 2 children
      expect(results[2].firstName).toBe('Amina'); // 1 child
    });

    it('filters children by maxChildAge and re-sorts', async () => {
      const store = useBeneficiaryStore.getState();
      // maxChildAge=5 => only children born after ~2021
      // Fatima: C (2022) => 1 child
      // Amina: D (2019) => ~7 years old => excluded => 0 children
      // Khadija: F (2021) => ~5 years old => 1 child
      const results = await store.findWidowsWithMostChildren(5);

      // After filtering, counts change:
      expect(results.length).toBeGreaterThanOrEqual(2);
      // Fatima and Khadija should each have 1 qualifying child
      // Amina's child (2019) is ~7 so filtered out => 0 children
      const fatimaResult = results.find((r) => r.firstName === 'Fatima');
      const aminaResult = results.find((r) => r.firstName === 'Amina');
      expect(fatimaResult!.children.length).toBeGreaterThanOrEqual(1);
      expect(aminaResult!.children.length).toBe(0);
    });
  });
});

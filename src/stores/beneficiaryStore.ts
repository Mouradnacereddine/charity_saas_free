import { create } from 'zustand';
import { db } from '../lib/db';
import type { Beneficiary, BeneficiaryFilter } from '../types';
import { generateId, calculateAge, generateBeneficiaryReference } from '../utils/helpers';

interface BeneficiaryStore {
  beneficiaries: Beneficiary[];
  loading: boolean;
  loadBeneficiaries: (filter?: BeneficiaryFilter) => Promise<void>;
  addBeneficiary: (data: Omit<Beneficiary, 'id' | 'reference' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBeneficiary: (id: string, data: Partial<Beneficiary>) => Promise<void>;
  deleteBeneficiary: (id: string) => Promise<void>;
  searchBeneficiaries: (filter: BeneficiaryFilter) => Promise<Beneficiary[]>;
  findWidowsWithMostChildren: (maxChildAge?: number) => Promise<Beneficiary[]>;
}

export const useBeneficiaryStore = create<BeneficiaryStore>((set, get) => ({
  beneficiaries: [],
  loading: false,

  loadBeneficiaries: async (filter?: BeneficiaryFilter) => {
    set({ loading: true });
    let results = await db.beneficiaries.toArray();

    if (filter) {
      results = applyFilter(results, filter);
    }

    set({ beneficiaries: results, loading: false });
  },

  addBeneficiary: async (data) => {
    const now = new Date();
    await db.beneficiaries.add({
      ...data,
      id: generateId(),
      reference: generateBeneficiaryReference(),
      createdAt: now,
      updatedAt: now,
    });
    await get().loadBeneficiaries();
  },

  updateBeneficiary: async (id, data) => {
    await db.beneficiaries.update(id, { ...data, updatedAt: new Date() });
    await get().loadBeneficiaries();
  },

  deleteBeneficiary: async (id) => {
    await db.beneficiaries.delete(id);
    await get().loadBeneficiaries();
  },

  searchBeneficiaries: async (filter: BeneficiaryFilter) => {
    const all = await db.beneficiaries.toArray();
    return applyFilter(all, filter);
  },

  findWidowsWithMostChildren: async (maxChildAge?: number) => {
    let widows = await db.beneficiaries.where('attribut').equals('veuve').toArray();

    if (maxChildAge !== undefined) {
      widows = widows.map((w) => ({
        ...w,
        children: w.children.filter((c) => {
          const age = calculateAge(c.dateOfBirth);
          return age.years <= maxChildAge;
        }),
      }));
    }

    return widows.sort((a, b) => b.children.length - a.children.length);
  },
}));

function applyFilter(beneficiaries: Beneficiary[], filter: BeneficiaryFilter): Beneficiary[] {
  let results = [...beneficiaries];

  if (filter.attribut) {
    results = results.filter((b) => b.attribut === filter.attribut);
  }

  if (filter.caisseId) {
    results = results.filter((b) => b.caisseId === filter.caisseId);
  }

  if (filter.minChildren !== undefined) {
    results = results.filter((b) => b.children.length >= filter.minChildren!);
  }

  if (filter.maxChildAge !== undefined) {
    results = results.filter((b) =>
      b.children.some((c) => {
        const age = calculateAge(c.dateOfBirth);
        return age.years <= filter.maxChildAge!;
      })
    );
  }

  if (filter.situation) {
    results = results.filter(
      (b) =>
        b.situation?.toLowerCase().includes(filter.situation!.toLowerCase()) ||
        b.situationAr?.includes(filter.situation!)
    );
  }

  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    results = results.filter(
      (b) =>
        b.firstName.toLowerCase().includes(term) ||
        b.lastName.toLowerCase().includes(term) ||
        b.firstNameAr.includes(term) ||
        b.lastNameAr.includes(term) ||
        b.nationalCardNumber.includes(term) ||
        b.phone.includes(term)
    );
  }

  return results;
}

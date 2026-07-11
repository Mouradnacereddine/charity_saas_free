import { create } from 'zustand';
import { db } from '../lib/db';
import type { Donor, DonorFilter, DonationReceipt } from '../types';
import { generateId, generateDonorReference } from '../utils/helpers';

interface DonorStore {
  donors: Donor[];
  receipts: DonationReceipt[];
  loading: boolean;
  loadDonors: (filter?: DonorFilter) => Promise<void>;
  addDonor: (data: Omit<Donor, 'id' | 'reference' | 'totalDonated' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDonor: (id: string, data: Partial<Donor>) => Promise<void>;
  deleteDonor: (id: string) => Promise<void>;
  loadReceipts: (donorId?: string) => Promise<void>;
}

export const useDonorStore = create<DonorStore>((set, get) => ({
  donors: [],
  receipts: [],
  loading: false,

  loadDonors: async (filter?: DonorFilter) => {
    set({ loading: true });
    let results = await db.donors.toArray();

    if (filter) {
      if (filter.caisseId) {
        // Get donors who donated to this caisse
        const txs = await db.transactions
          .where('caisseId')
          .equals(filter.caisseId)
          .toArray();
        const donorIds = new Set(txs.filter((t) => t.donorId).map((t) => t.donorId!));
        results = results.filter((d) => donorIds.has(d.id));
      }
      if (filter.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        results = results.filter(
          (d) =>
            d.firstName.toLowerCase().includes(term) ||
            d.lastName.toLowerCase().includes(term) ||
            d.firstNameAr.includes(term) ||
            d.lastNameAr.includes(term) ||
            d.phone.includes(term)
        );
      }
    }

    // Compute receiptCount for all results (needed for min/max donation filter)
    const allReceipts = await db.donationReceipts.toArray();
    const countMap = new Map<string, number>();
    for (const r of allReceipts) {
      if (r.donorId) countMap.set(r.donorId, (countMap.get(r.donorId) || 0) + 1);
    }
    const donorsWithCount = results.map((d) => ({ ...d, receiptCount: countMap.get(d.id) || 0 }));

    if (filter) {
      // Apply min/max donation filter on receiptCount (number of donations)
      const minCnt = filter.minDonation;
      const maxCnt = filter.maxDonation;
      if (minCnt !== undefined || maxCnt !== undefined) {
        let filtered = donorsWithCount;
        if (minCnt !== undefined) filtered = filtered.filter((d) => d.receiptCount >= minCnt!);
        if (maxCnt !== undefined) filtered = filtered.filter((d) => d.receiptCount <= maxCnt!);
        set({ donors: filtered, loading: false });
        return;
      }
    }

    set({ donors: donorsWithCount, loading: false });
  },

  addDonor: async (data) => {
    const now = new Date();
    await db.donors.add({
      ...data,
      id: generateId(),
      reference: generateDonorReference(),
      totalDonated: 0,
      createdAt: now,
      updatedAt: now,
    });
    await get().loadDonors();
  },

  updateDonor: async (id, data) => {
    await db.donors.update(id, { ...data, updatedAt: new Date() });
    await get().loadDonors();
  },

  deleteDonor: async (id) => {
    await db.donors.delete(id);
    await get().loadDonors();
  },

  loadReceipts: async (donorId?: string) => {
    let receipts: DonationReceipt[];
    if (donorId) {
      receipts = await db.donationReceipts.where('donorId').equals(donorId).toArray();
    } else {
      receipts = await db.donationReceipts.toArray();
    }
    set({ receipts });
  },
}));

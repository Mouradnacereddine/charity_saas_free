import { create } from 'zustand';
import { db } from '../lib/db';
import type { MedicalReferral } from '../types';
import { generateId, numberToArabicWords, numberToFrenchWords, generateMedicalReferralReference } from '../utils/helpers';

interface MedicalStore {
  referrals: MedicalReferral[];
  loading: boolean;
  loadReferrals: (beneficiaryId?: string) => Promise<void>;
  addReferral: (data: Omit<MedicalReferral, 'id' | 'reference' | 'amountInWords' | 'amountInWordsAr' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReferral: (id: string, data: Partial<MedicalReferral>) => Promise<void>;
  deleteReferral: (id: string) => Promise<void>;
}

export const useMedicalStore = create<MedicalStore>((set, get) => ({
  referrals: [],
  loading: false,

  loadReferrals: async (beneficiaryId?: string) => {
    set({ loading: true });
    let referrals: MedicalReferral[];
    if (beneficiaryId) {
      referrals = await db.medicalReferrals.where('beneficiaryId').equals(beneficiaryId).toArray();
    } else {
      referrals = await db.medicalReferrals.toArray();
    }
    set({ referrals, loading: false });
  },

  addReferral: async (data) => {
    const now = new Date();
    await db.medicalReferrals.add({
      ...data,
      id: generateId(),
      reference: generateMedicalReferralReference(),
      amountInWords: numberToFrenchWords(data.amount),
      amountInWordsAr: numberToArabicWords(data.amount),
      createdAt: now,
      updatedAt: now,
    });
    await get().loadReferrals();
  },

  updateReferral: async (id, data) => {
    await db.medicalReferrals.update(id, { ...data, updatedAt: new Date() });
    await get().loadReferrals();
  },

  deleteReferral: async (id) => {
    await db.medicalReferrals.delete(id);
    await get().loadReferrals();
  },
}));

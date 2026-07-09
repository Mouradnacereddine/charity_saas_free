import { create } from 'zustand';
import { db } from '../lib/db';
import type { Caisse, SubCategory } from '../types';
import { generateId } from '../utils/helpers';

interface CaisseStore {
  caisses: Caisse[];
  loading: boolean;
  loadCaisses: () => Promise<void>;
  addCaisse: (name: string, nameAr: string, reference: string) => Promise<void>;
  updateCaisse: (id: string, data: Partial<Caisse>) => Promise<void>;
  deleteCaisse: (id: string) => Promise<void>;
  addSubCategory: (caisseId: string, name: string, nameAr: string) => Promise<void>;
  updateSubCategory: (caisseId: string, subCatId: string, name: string, nameAr: string) => Promise<void>;
  deleteSubCategory: (caisseId: string, subCatId: string) => Promise<void>;
  getCaisseBalance: (caisseId: string) => number;
}

export const useCaisseStore = create<CaisseStore>((set, get) => ({
  caisses: [],
  loading: false,

  loadCaisses: async () => {
    set({ loading: true });
    const caisses = await db.caisses.toArray();
    set({ caisses, loading: false });
  },

  addCaisse: async (name: string, nameAr: string, reference: string) => {
    const now = new Date();
    const caisse: Caisse = {
      id: generateId(),
      reference,
      name,
      nameAr,
      subCategories: [],
      balance: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.caisses.add(caisse);
    await get().loadCaisses();
  },

  updateCaisse: async (id: string, data: Partial<Caisse>) => {
    await db.caisses.update(id, { ...data, updatedAt: new Date() });
    await get().loadCaisses();
  },

  deleteCaisse: async (id: string) => {
    await db.caisses.delete(id);
    await get().loadCaisses();
  },

  addSubCategory: async (caisseId: string, name: string, nameAr: string) => {
    const caisse = await db.caisses.get(caisseId);
    if (!caisse) return;
    const newSub: SubCategory = { id: generateId(), name, nameAr };
    caisse.subCategories.push(newSub);
    await db.caisses.update(caisseId, { subCategories: caisse.subCategories, updatedAt: new Date() });
    await get().loadCaisses();
  },

  updateSubCategory: async (caisseId: string, subCatId: string, name: string, nameAr: string) => {
    const caisse = await db.caisses.get(caisseId);
    if (!caisse) return;
    caisse.subCategories = caisse.subCategories.map((s) =>
      s.id === subCatId ? { ...s, name, nameAr } : s
    );
    await db.caisses.update(caisseId, { subCategories: caisse.subCategories, updatedAt: new Date() });
    await get().loadCaisses();
  },

  deleteSubCategory: async (caisseId: string, subCatId: string) => {
    const caisse = await db.caisses.get(caisseId);
    if (!caisse) return;
    caisse.subCategories = caisse.subCategories.filter((s) => s.id !== subCatId);
    await db.caisses.update(caisseId, { subCategories: caisse.subCategories, updatedAt: new Date() });
    await get().loadCaisses();
  },

  getCaisseBalance: (caisseId: string) => {
    const caisse = get().caisses.find((c) => c.id === caisseId);
    return caisse?.balance ?? 0;
  },
}));

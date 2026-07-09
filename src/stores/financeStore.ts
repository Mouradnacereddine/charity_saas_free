import { create } from 'zustand';
import { db } from '../lib/db';
import type { Transaction, BankAccount, TransactionFilter } from '../types';
import { generateId, numberToArabicWords, numberToFrenchWords, generateReceiptNumber } from '../utils/helpers';

interface FinanceStore {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  totalCash: number;
  loading: boolean;
  loadTransactions: (filter?: TransactionFilter) => Promise<void>;
  loadBankAccounts: () => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'amountInWords' | 'amountInWordsAr' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  addBankAccount: (data: Omit<BankAccount, 'id' | 'balance' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBankAccount: (id: string, data: Partial<BankAccount>) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  calculateTotalCash: () => Promise<void>;
  getTotalBankBalance: () => number;
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  transactions: [],
  bankAccounts: [],
  totalCash: 0,
  loading: false,

  loadTransactions: async (filter?: TransactionFilter) => {
    set({ loading: true });
    let query = db.transactions.orderBy('createdAt').reverse();

    let results = await query.toArray();

    if (filter) {
      if (filter.type) results = results.filter((t) => t.type === filter.type);
      if (filter.fundSource) results = results.filter((t) => t.fundSource === filter.fundSource);
      if (filter.caisseId) results = results.filter((t) => t.caisseId === filter.caisseId);
      if (filter.dateFrom) results = results.filter((t) => t.date >= filter.dateFrom!);
      if (filter.dateTo) results = results.filter((t) => t.date <= filter.dateTo!);
      if (filter.minAmount) results = results.filter((t) => t.amount >= filter.minAmount!);
      if (filter.maxAmount) results = results.filter((t) => t.amount <= filter.maxAmount!);
      if (filter.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        results = results.filter(
          (t) =>
            t.description.toLowerCase().includes(term) ||
            t.descriptionAr.includes(term) ||
            t.receiptNumber?.toLowerCase().includes(term)
        );
      }
    }

    set({ transactions: results, loading: false });
  },

  loadBankAccounts: async () => {
    const accounts = await db.bankAccounts.toArray();
    set({ bankAccounts: accounts });
  },

  addTransaction: async (data) => {
    const now = new Date();

    // Check available balance before debit
    if (data.type === 'debit') {
      // Check caisse balance
      const caisseCheck = await db.caisses.get(data.caisseId);
      if (caisseCheck && caisseCheck.balance < data.amount) {
        throw new Error(`رصيد الصندوق غير كافٍ. الرصيد المتاح: ${caisseCheck.balance}`)
      }
      // Check bank account balance if source is bank
      if (data.fundSource === 'banque' && data.bankAccountId) {
        const bankCheck = await db.bankAccounts.get(data.bankAccountId)
        if (bankCheck && bankCheck.balance < data.amount) {
          throw new Error(`رصيد الحساب البنكي غير كافٍ. الرصيد المتاح: ${bankCheck.balance}`)
        }
      }
    }

    const transaction: Transaction = {
      ...data,
      id: generateId(),
      receiptNumber: data.receiptNumber || generateReceiptNumber(),
      amountInWords: numberToFrenchWords(data.amount),
      amountInWordsAr: numberToArabicWords(data.amount),
      createdAt: now,
      updatedAt: now,
    };
    await db.transactions.add(transaction);

    // Update caisse balance
    const caisse = await db.caisses.get(data.caisseId);
    if (caisse) {
      const newBalance = data.type === 'credit'
        ? caisse.balance + data.amount
        : caisse.balance - data.amount;
      await db.caisses.update(data.caisseId, { balance: newBalance, updatedAt: now });
    }

    // Update bank balance if bank transaction
    if (data.fundSource === 'banque' && data.bankAccountId) {
      const account = await db.bankAccounts.get(data.bankAccountId);
      if (account) {
        const newBalance = data.type === 'credit'
          ? account.balance + data.amount
          : account.balance - data.amount;
        await db.bankAccounts.update(data.bankAccountId, { balance: newBalance, updatedAt: now });
      }
    }

    // Auto-generate receipt for donations
    if (data.type === 'credit' && data.donorId) {
      const donor = await db.donors.get(data.donorId);
      const caisseInfo = await db.caisses.get(data.caisseId);
      if (donor && caisseInfo) {
        await db.donationReceipts.add({
          id: generateId(),
          receiptNumber: generateReceiptNumber(),
          donorId: data.donorId,
          donorName: `${donor.firstName} ${donor.lastName}`,
          donorNameAr: `${donor.firstNameAr} ${donor.lastNameAr}`,
          transactionId: transaction.id,
          amount: data.amount,
          amountInWords: numberToFrenchWords(data.amount),
          amountInWordsAr: numberToArabicWords(data.amount),
          caisseId: data.caisseId,
          caisseName: caisseInfo.name,
          caisseNameAr: caisseInfo.nameAr,
          date: data.date,
          createdAt: now,
        });

        // Update donor total
        await db.donors.update(data.donorId, {
          totalDonated: (donor.totalDonated || 0) + data.amount,
          updatedAt: now,
        });
      }
    }

    await get().loadTransactions();
    await get().loadBankAccounts();
    await get().calculateTotalCash();

    return transaction;
  },

  addBankAccount: async (data) => {
    const now = new Date();
    await db.bankAccounts.add({
      ...data,
      id: generateId(),
      balance: 0,
      createdAt: now,
      updatedAt: now,
    });
    await get().loadBankAccounts();
  },

  updateBankAccount: async (id, data) => {
    await db.bankAccounts.update(id, { ...data, updatedAt: new Date() });
    await get().loadBankAccounts();
  },

  deleteBankAccount: async (id) => {
    await db.bankAccounts.delete(id);
    await get().loadBankAccounts();
  },

  calculateTotalCash: async () => {
    const transactions = await db.transactions.where('fundSource').equals('caisse_physique').toArray();
    let total = 0;
    for (const t of transactions) {
      total += t.type === 'credit' ? t.amount : -t.amount;
    }
    set({ totalCash: total });
  },

  getTotalBankBalance: () => {
    return get().bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  },
}));

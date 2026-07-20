import { create } from 'zustand';
import { db } from '../lib/db';
import type { Article, Loan, LoanItem } from '../types';
import { generateId, generateArticleReference, generateLoanReference } from '../utils/helpers';

interface InventoryStore {
  articles: Article[];
  loans: Loan[];
  loading: boolean;
  loadArticles: () => Promise<void>;
  addArticle: (data: Omit<Article, 'id' | 'reference' | 'availableQuantity' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateArticle: (id: string, data: Partial<Article>) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  loadLoans: (beneficiaryId?: string) => Promise<void>;
  createLoan: (data: Omit<Loan, 'id' | 'reference' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  returnItems: (loanId: string, returns: { articleId: string; quantity: number; condition: string }[]) => Promise<void>;
  addItemToLoan: (loanId: string, item: LoanItem) => Promise<void>;
  removeItemFromLoan: (loanId: string, articleId: string) => Promise<void>;
  markLoanDefinitive: (loanId: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  articles: [],
  loans: [],
  loading: false,

  loadArticles: async () => {
    set({ loading: true });
    const articles = await db.articles.toArray();
    set({ articles, loading: false });
  },

  addArticle: async (data) => {
    const now = new Date();
    await db.articles.add({
      ...data,
      id: generateId(),
      reference: generateArticleReference(),
      availableQuantity: data.quantity,
      createdAt: now,
      updatedAt: now,
    });
    await get().loadArticles();
  },

  updateArticle: async (id, data) => {
    await db.articles.update(id, { ...data, updatedAt: new Date() });
    await get().loadArticles();
  },

  deleteArticle: async (id) => {
    await db.articles.delete(id);
    await get().loadArticles();
  },

  loadLoans: async (beneficiaryId?: string) => {
    let loans: Loan[];
    if (beneficiaryId) {
      loans = await db.loans.where('beneficiaryId').equals(beneficiaryId).toArray();
    } else {
      loans = await db.loans.orderBy('createdAt').reverse().toArray();
    }
    set({ loans });
  },

  createLoan: async (data) => {
    const now = new Date();
    const loan: Loan = {
      ...data,
      id: generateId(),
      reference: generateLoanReference(),
      createdAt: now,
      updatedAt: now,
    };
    await db.loans.add(loan);

    // Update article availability
    for (const item of data.items) {
      const article = await db.articles.get(item.articleId);
      if (article) {
        await db.articles.update(item.articleId, {
          availableQuantity: article.availableQuantity - item.quantity,
          status: article.availableQuantity - item.quantity <= 0 ? 'prete' : article.status,
          updatedAt: now,
        });
      }
    }

    await get().loadLoans();
    await get().loadArticles();
  },

  returnItems: async (loanId, returns) => {
    const loan = await db.loans.get(loanId);
    if (!loan) return;
    const now = new Date();

    for (const ret of returns) {
      const itemIdx = loan.items.findIndex((i) => i.articleId === ret.articleId);
      if (itemIdx === -1) continue;

      loan.items[itemIdx].returnedQuantity += ret.quantity;
      const oldCondition = loan.items[itemIdx].conditionOnReturn || '';
      const newConditionText = `${ret.condition} (الكمية: ${ret.quantity})`;
      loan.items[itemIdx].conditionOnReturn = oldCondition
        ? `${oldCondition} | ${newConditionText}`
        : newConditionText;

      // Update article availability
      const article = await db.articles.get(ret.articleId);
      if (article) {
        await db.articles.update(ret.articleId, {
          availableQuantity: article.availableQuantity + ret.quantity,
          status: 'disponible',
          updatedAt: now,
        });
      }
    }

    // Check if all items returned
    const allReturned = loan.items.every((i) => i.returnedQuantity >= i.quantity);
    const someReturned = loan.items.some((i) => i.returnedQuantity > 0);

    loan.status = allReturned ? 'definitif' : someReturned ? 'partiellement_retourne' : 'en_cours';
    if (allReturned) loan.actualReturnDate = new Date().toISOString().split('T')[0];

    await db.loans.update(loanId, { items: loan.items, status: loan.status, actualReturnDate: loan.actualReturnDate, updatedAt: now });
    await get().loadLoans();
    await get().loadArticles();
  },

  addItemToLoan: async (loanId, item) => {
    const loan = await db.loans.get(loanId);
    if (!loan) return;
    const now = new Date();

    loan.items.push(item);
    await db.loans.update(loanId, { items: loan.items, updatedAt: now });

    // Update article availability
    const article = await db.articles.get(item.articleId);
    if (article) {
      await db.articles.update(item.articleId, {
        availableQuantity: article.availableQuantity - item.quantity,
        updatedAt: now,
      });
    }

    await get().loadLoans();
    await get().loadArticles();
  },

  removeItemFromLoan: async (loanId, articleId) => {
    const loan = await db.loans.get(loanId);
    if (!loan) return;
    const now = new Date();

    const item = loan.items.find((i) => i.articleId === articleId);
    if (!item) return;

    loan.items = loan.items.filter((i) => i.articleId !== articleId);
    await db.loans.update(loanId, { items: loan.items, updatedAt: now });

    // Restore article availability
    const article = await db.articles.get(articleId);
    if (article) {
      await db.articles.update(articleId, {
        availableQuantity: article.availableQuantity + (item.quantity - item.returnedQuantity),
        updatedAt: now,
      });
    }

    await get().loadLoans();
    await get().loadArticles();
  },

  markLoanDefinitive: async (loanId) => {
    const loan = await db.loans.get(loanId);
    if (!loan) return;
    await db.loans.update(loanId, { status: 'definitif', updatedAt: new Date() });
    await get().loadLoans();
  },
}));

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../lib/db';
import { useInventoryStore } from './inventoryStore';
import type { Article } from '../types';

describe('inventoryStore', () => {
  beforeEach(async () => {
    await db.articles.clear();
    await db.loans.clear();
    useInventoryStore.setState({ articles: [], loans: [], loading: false });
  });

  afterEach(async () => {
    await db.articles.clear();
    await db.loans.clear();
  });

  const makeArticle = (overrides: Partial<Article> & { id: string }): Article => ({
    reference: 'ART-TEST-001',
    name: 'Wheelchair',
    nameAr: 'كرسي متحرك',
    category: 'Medical',
    categoryAr: 'طبي',
    quantity: 10,
    availableQuantity: 10,
    status: 'disponible',
    storageLocation: 'Depot A',
    storageLocationAr: 'المستودع أ',
    condition: 'Neuf',
    conditionAr: 'جديد',
    isPermanent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('addArticle', () => {
    it('creates an article with availableQuantity equal to quantity', async () => {
      const store = useInventoryStore.getState();
      await store.addArticle({
        name: 'Crutches',
        nameAr: 'عكازات',
        category: 'Medical',
        categoryAr: 'طبي',
        quantity: 20,
        status: 'disponible',
        storageLocation: 'Depot B',
        storageLocationAr: 'المستودع ب',
        condition: 'Neuf',
        conditionAr: 'جديد',
        isPermanent: false,
      });

      const state = useInventoryStore.getState();
      expect(state.articles).toHaveLength(1);
      expect(state.articles[0].name).toBe('Crutches');
      expect(state.articles[0].quantity).toBe(20);
      expect(state.articles[0].availableQuantity).toBe(20);
      expect(state.articles[0].id).toBeDefined();

      // Verify in db
      const dbArticle = await db.articles.get(state.articles[0].id);
      expect(dbArticle!.availableQuantity).toBe(20);
    });
  });

  describe('createLoan', () => {
    it('reduces article availableQuantity', async () => {
      await db.articles.add(makeArticle({ id: 'art-loan', quantity: 10, availableQuantity: 10 }));

      const store = useInventoryStore.getState();
      await store.createLoan({
        beneficiaryId: 'ben-1',
        beneficiaryName: 'Fatima Bouzid',
        beneficiaryNameAr: 'فاطمة بوزيد',
        items: [
          {
            articleId: 'art-loan',
            articleName: 'Wheelchair',
            articleNameAr: 'كرسي متحرك',
            quantity: 3,
            returnedQuantity: 0,
            conditionOnLoan: 'Bon',
          },
        ],
        status: 'en_cours',
        loanDate: '2026-07-08',
        expectedReturnDate: '2026-08-08',
      });

      // Check article availability reduced
      const article = await db.articles.get('art-loan');
      expect(article!.availableQuantity).toBe(7);

      // Check loan created
      await store.loadLoans();
      const loansState = useInventoryStore.getState();
      expect(loansState.loans).toHaveLength(1);
      expect(loansState.loans[0].status).toBe('en_cours');
    });
  });

  describe('returnItems', () => {
    let loanId: string;

    beforeEach(async () => {
      await db.articles.add(makeArticle({ id: 'art-ret', quantity: 10, availableQuantity: 7 }));

      const now = new Date();
      loanId = 'loan-ret';
      await db.loans.add({
        id: loanId,
        reference: 'LOAN-RET-TEST',
        beneficiaryId: 'ben-1',
        beneficiaryName: 'Fatima Bouzid',
        beneficiaryNameAr: 'فاطمة بوزيد',
        items: [
          {
            articleId: 'art-ret',
            articleName: 'Wheelchair',
            articleNameAr: 'كرسي متحرك',
            quantity: 3,
            returnedQuantity: 0,
            conditionOnLoan: 'Bon',
          },
        ],
        status: 'en_cours',
        loanDate: '2026-07-01',
        expectedReturnDate: '2026-08-01',
        createdAt: now,
        updatedAt: now,
      });
    });

    it('increases availableQuantity on return', async () => {
      const store = useInventoryStore.getState();
      await store.returnItems(loanId, [
        { articleId: 'art-ret', quantity: 2, condition: 'Bon' },
      ]);

      const article = await db.articles.get('art-ret');
      expect(article!.availableQuantity).toBe(9); // 7 + 2
    });

    it('partial return sets status to partiellement_retourne', async () => {
      const store = useInventoryStore.getState();
      await store.returnItems(loanId, [
        { articleId: 'art-ret', quantity: 1, condition: 'Bon' },
      ]);

      const loan = await db.loans.get(loanId);
      expect(loan!.status).toBe('partiellement_retourne');
    });

    it('full return sets status to retourne', async () => {
      const store = useInventoryStore.getState();
      await store.returnItems(loanId, [
        { articleId: 'art-ret', quantity: 3, condition: 'Bon' },
      ]);

      const loan = await db.loans.get(loanId);
      expect(loan!.status).toBe('retourne');
      expect(loan!.actualReturnDate).toBeDefined();

      const article = await db.articles.get('art-ret');
      expect(article!.availableQuantity).toBe(10); // 7 + 3
    });
  });

  describe('markLoanDefinitive', () => {
    it('sets loan status to definitif', async () => {
      const now = new Date();
      await db.loans.add({
        id: 'loan-def',
        reference: 'LOAN-DEF-TEST',
        beneficiaryId: 'ben-1',
        beneficiaryName: 'Test',
        beneficiaryNameAr: 'اختبار',
        items: [
          {
            articleId: 'art-1',
            articleName: 'Item',
            articleNameAr: 'عنصر',
            quantity: 1,
            returnedQuantity: 0,
            conditionOnLoan: 'Bon',
          },
        ],
        status: 'en_cours',
        loanDate: '2026-07-01',
        createdAt: now,
        updatedAt: now,
      });

      const store = useInventoryStore.getState();
      await store.markLoanDefinitive('loan-def');

      const loan = await db.loans.get('loan-def');
      expect(loan!.status).toBe('definitif');
    });
  });

  describe('addItemToLoan', () => {
    it('adds a new item to an existing loan and reduces article availability', async () => {
      const now = new Date();
      await db.articles.add(makeArticle({ id: 'art-add', quantity: 5, availableQuantity: 5 }));
      await db.loans.add({
        id: 'loan-add',
        reference: 'LOAN-ADD-TEST',
        beneficiaryId: 'ben-1',
        beneficiaryName: 'Test',
        beneficiaryNameAr: 'اختبار',
        items: [],
        status: 'en_cours',
        loanDate: '2026-07-01',
        createdAt: now,
        updatedAt: now,
      });

      const store = useInventoryStore.getState();
      await store.addItemToLoan('loan-add', {
        articleId: 'art-add',
        articleName: 'Wheelchair',
        articleNameAr: 'كرسي متحرك',
        quantity: 2,
        returnedQuantity: 0,
        conditionOnLoan: 'Bon',
      });

      // Check loan has the item
      const loan = await db.loans.get('loan-add');
      expect(loan!.items).toHaveLength(1);
      expect(loan!.items[0].articleId).toBe('art-add');
      expect(loan!.items[0].quantity).toBe(2);

      // Check article availability reduced
      const article = await db.articles.get('art-add');
      expect(article!.availableQuantity).toBe(3);
    });
  });

  describe('removeItemFromLoan', () => {
    it('removes an item from a loan and restores article availability', async () => {
      const now = new Date();
      await db.articles.add(makeArticle({ id: 'art-rem', quantity: 10, availableQuantity: 7 }));
      await db.loans.add({
        id: 'loan-rem',
        reference: 'LOAN-REM-TEST',
        beneficiaryId: 'ben-1',
        beneficiaryName: 'Test',
        beneficiaryNameAr: 'اختبار',
        items: [
          {
            articleId: 'art-rem',
            articleName: 'Wheelchair',
            articleNameAr: 'كرسي متحرك',
            quantity: 3,
            returnedQuantity: 0,
            conditionOnLoan: 'Bon',
          },
        ],
        status: 'en_cours',
        loanDate: '2026-07-01',
        createdAt: now,
        updatedAt: now,
      });

      const store = useInventoryStore.getState();
      await store.removeItemFromLoan('loan-rem', 'art-rem');

      // Check item removed from loan
      const loan = await db.loans.get('loan-rem');
      expect(loan!.items).toHaveLength(0);

      // Check article availability restored (quantity - returnedQuantity = 3 - 0 = 3 restored)
      const article = await db.articles.get('art-rem');
      expect(article!.availableQuantity).toBe(10); // 7 + 3
    });

    it('restores only unreturned quantity when some items were already returned', async () => {
      const now = new Date();
      await db.articles.add(makeArticle({ id: 'art-rem2', quantity: 10, availableQuantity: 8 }));
      await db.loans.add({
        id: 'loan-rem2',
        reference: 'LOAN-REM2-TEST',
        beneficiaryId: 'ben-1',
        beneficiaryName: 'Test',
        beneficiaryNameAr: 'اختبار',
        items: [
          {
            articleId: 'art-rem2',
            articleName: 'Wheelchair',
            articleNameAr: 'كرسي متحرك',
            quantity: 3,
            returnedQuantity: 1, // 1 already returned
            conditionOnLoan: 'Bon',
          },
        ],
        status: 'partiellement_retourne',
        loanDate: '2026-07-01',
        createdAt: now,
        updatedAt: now,
      });

      const store = useInventoryStore.getState();
      await store.removeItemFromLoan('loan-rem2', 'art-rem2');

      // Only 2 unreturned items should be restored (3 - 1 = 2)
      const article = await db.articles.get('art-rem2');
      expect(article!.availableQuantity).toBe(10); // 8 + 2
    });
  });
});

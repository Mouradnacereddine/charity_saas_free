import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../lib/db';
import { useFinanceStore } from './financeStore';

describe('financeStore', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.bankAccounts.clear();
    await db.caisses.clear();
    await db.donors.clear();
    await db.donationReceipts.clear();
    // Reset zustand store state
    useFinanceStore.setState({ transactions: [], bankAccounts: [], totalCash: 0, loading: false });
  });

  afterEach(async () => {
    await db.transactions.clear();
    await db.bankAccounts.clear();
    await db.caisses.clear();
    await db.donors.clear();
    await db.donationReceipts.clear();
  });

  describe('loadBankAccounts', () => {
    it('loads bank accounts from the database', async () => {
      const now = new Date();
      await db.bankAccounts.bulkAdd([
        {
          id: 'bank-1',
          bankName: 'BNA',
          bankNameAr: 'البنك الوطني',
          accountNumber: '001',
          rib: '001-RIB',
          iban: '',
          swift: '',
          balance: 10000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'bank-2',
          bankName: 'CPA',
          bankNameAr: 'القرض الشعبي',
          accountNumber: '002',
          rib: '002-RIB',
          iban: '',
          swift: '',
          balance: 20000,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const store = useFinanceStore.getState();
      await store.loadBankAccounts();

      const state = useFinanceStore.getState();
      expect(state.bankAccounts).toHaveLength(2);
      expect(state.bankAccounts.map((a) => a.bankName)).toContain('BNA');
      expect(state.bankAccounts.map((a) => a.bankName)).toContain('CPA');
    });
  });

  describe('addBankAccount', () => {
    it('creates a bank account with balance 0', async () => {
      const store = useFinanceStore.getState();
      await store.addBankAccount({
        bankName: 'New Bank',
        bankNameAr: 'بنك جديد',
        accountNumber: '12345',
        rib: 'RIB-12345',
        iban: 'DZ123',
        swift: 'SWIFT123',
      });

      const state = useFinanceStore.getState();
      expect(state.bankAccounts).toHaveLength(1);
      expect(state.bankAccounts[0].bankName).toBe('New Bank');
      expect(state.bankAccounts[0].balance).toBe(0);
      expect(state.bankAccounts[0].id).toBeDefined();

      // Verify in db
      const dbAccount = await db.bankAccounts.get(state.bankAccounts[0].id);
      expect(dbAccount).toBeDefined();
      expect(dbAccount!.balance).toBe(0);
    });
  });

  describe('addTransaction', () => {
    const setupCaisse = async () => {
      const now = new Date();
      await db.caisses.add({
        id: 'caisse-fin',
        reference: 'CAI-TEST-FIN',
        name: 'Caisse Generale',
        nameAr: 'الصندوق العام',
        subCategories: [],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      });
    };

    it('credit transaction increases caisse balance', async () => {
      await setupCaisse();

      const store = useFinanceStore.getState();
      await store.addTransaction({
        type: 'credit',
        amount: 5000,
        fundSource: 'caisse_physique',
        caisseId: 'caisse-fin',
        description: 'Donation received',
        descriptionAr: 'تبرع مستلم',
        date: '2026-07-08',
      });

      // Verify caisse balance increased
      const caisse = await db.caisses.get('caisse-fin');
      expect(caisse!.balance).toBe(5000);

      // Verify transaction in store
      const state = useFinanceStore.getState();
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].type).toBe('credit');
      expect(state.transactions[0].amount).toBe(5000);
    });

    it('debit transaction decreases caisse balance', async () => {
      await setupCaisse();
      // Set initial balance
      await db.caisses.update('caisse-fin', { balance: 10000 });

      const store = useFinanceStore.getState();
      await store.addTransaction({
        type: 'debit',
        amount: 3000,
        fundSource: 'caisse_physique',
        caisseId: 'caisse-fin',
        description: 'Payment made',
        descriptionAr: 'دفعة',
        date: '2026-07-08',
      });

      const caisse = await db.caisses.get('caisse-fin');
      expect(caisse!.balance).toBe(7000);
    });

    it('transaction with bank source updates bank account balance', async () => {
      await setupCaisse();
      const now = new Date();
      await db.bankAccounts.add({
        id: 'bank-fin',
        bankName: 'BNA',
        bankNameAr: 'البنك الوطني',
        accountNumber: '001',
        rib: '001-RIB',
        iban: '',
        swift: '',
        balance: 50000,
        createdAt: now,
        updatedAt: now,
      });

      const store = useFinanceStore.getState();
      await store.addTransaction({
        type: 'credit',
        amount: 10000,
        fundSource: 'banque',
        caisseId: 'caisse-fin',
        bankAccountId: 'bank-fin',
        description: 'Bank deposit',
        descriptionAr: 'إيداع بنكي',
        date: '2026-07-08',
      });

      const bank = await db.bankAccounts.get('bank-fin');
      expect(bank!.balance).toBe(60000);

      // Also verify caisse balance updated
      const caisse = await db.caisses.get('caisse-fin');
      expect(caisse!.balance).toBe(10000);
    });

    it('transaction with donor auto-creates donation receipt and updates donor totalDonated', async () => {
      await setupCaisse();
      const now = new Date();
      await db.donors.add({
        id: 'donor-1',
        reference: 'DON-TEST-001',
        firstName: 'Ahmed',
        lastName: 'Benali',
        firstNameAr: 'أحمد',
        lastNameAr: 'بن علي',
        phone: '0555123456',
        totalDonated: 1000,
        createdAt: now,
        updatedAt: now,
      });

      const store = useFinanceStore.getState();
      const tx = await store.addTransaction({
        type: 'credit',
        amount: 5000,
        fundSource: 'caisse_physique',
        caisseId: 'caisse-fin',
        donorId: 'donor-1',
        description: 'Donation from Ahmed',
        descriptionAr: 'تبرع من أحمد',
        date: '2026-07-08',
      });

      // Verify donation receipt was created
      const receipts = await db.donationReceipts.toArray();
      expect(receipts).toHaveLength(1);
      expect(receipts[0].donorId).toBe('donor-1');
      expect(receipts[0].transactionId).toBe(tx.id);
      expect(receipts[0].amount).toBe(5000);
      expect(receipts[0].donorName).toBe('Ahmed Benali');
      expect(receipts[0].receiptNumber).toMatch(/^BON-/);

      // Verify donor totalDonated updated
      const donor = await db.donors.get('donor-1');
      expect(donor!.totalDonated).toBe(6000);
    });
  });

  describe('loadTransactions with filters', () => {
    beforeEach(async () => {
      const now = new Date();
      await db.caisses.add({
        id: 'caisse-filter',
        reference: 'CAI-TEST-FIN',
        name: 'Filter Caisse',
        nameAr: 'صندوق فلتر',
        subCategories: [],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      });

      // Add several transactions with different attributes
      await db.transactions.bulkAdd([
        {
          id: 'tx-1',
          type: 'credit',
          amount: 1000,
          amountInWords: 'mille dinars',
          amountInWordsAr: 'ألف دينار',
          fundSource: 'caisse_physique',
          caisseId: 'caisse-filter',
          description: 'First transaction',
          descriptionAr: 'المعاملة الأولى',
          date: '2026-01-15',
          createdAt: new Date('2026-01-15'),
          updatedAt: new Date('2026-01-15'),
        },
        {
          id: 'tx-2',
          type: 'debit',
          amount: 500,
          amountInWords: 'cinq cent dinars',
          amountInWordsAr: 'خمسمائة دينار',
          fundSource: 'banque',
          caisseId: 'caisse-filter',
          description: 'Bank withdrawal',
          descriptionAr: 'سحب بنكي',
          date: '2026-03-20',
          createdAt: new Date('2026-03-20'),
          updatedAt: new Date('2026-03-20'),
        },
        {
          id: 'tx-3',
          type: 'credit',
          amount: 3000,
          amountInWords: 'trois mille dinars',
          amountInWordsAr: 'ثلاثة آلاف دينار',
          fundSource: 'caisse_physique',
          caisseId: 'caisse-other',
          description: 'Other caisse donation',
          descriptionAr: 'تبرع صندوق آخر',
          date: '2026-06-01',
          createdAt: new Date('2026-06-01'),
          updatedAt: new Date('2026-06-01'),
        },
      ]);
    });

    it('filters by type', async () => {
      const store = useFinanceStore.getState();
      await store.loadTransactions({ type: 'credit' });

      const state = useFinanceStore.getState();
      expect(state.transactions).toHaveLength(2);
      expect(state.transactions.every((t) => t.type === 'credit')).toBe(true);
    });

    it('filters by fundSource', async () => {
      const store = useFinanceStore.getState();
      await store.loadTransactions({ fundSource: 'banque' });

      const state = useFinanceStore.getState();
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].fundSource).toBe('banque');
    });

    it('filters by caisseId', async () => {
      const store = useFinanceStore.getState();
      await store.loadTransactions({ caisseId: 'caisse-filter' });

      const state = useFinanceStore.getState();
      expect(state.transactions).toHaveLength(2);
      expect(state.transactions.every((t) => t.caisseId === 'caisse-filter')).toBe(true);
    });

    it('filters by date range', async () => {
      const store = useFinanceStore.getState();
      await store.loadTransactions({ dateFrom: '2026-02-01', dateTo: '2026-05-01' });

      const state = useFinanceStore.getState();
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].id).toBe('tx-2');
    });
  });

  describe('calculateTotalCash', () => {
    it('computes net of credit minus debit for caisse_physique transactions', async () => {
      await db.transactions.bulkAdd([
        {
          id: 'cash-1',
          type: 'credit',
          amount: 10000,
          amountInWords: '',
          amountInWordsAr: '',
          fundSource: 'caisse_physique',
          caisseId: 'c1',
          description: '',
          descriptionAr: '',
          date: '2026-07-01',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cash-2',
          type: 'debit',
          amount: 3000,
          amountInWords: '',
          amountInWordsAr: '',
          fundSource: 'caisse_physique',
          caisseId: 'c1',
          description: '',
          descriptionAr: '',
          date: '2026-07-02',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cash-3',
          type: 'credit',
          amount: 2000,
          amountInWords: '',
          amountInWordsAr: '',
          fundSource: 'caisse_physique',
          caisseId: 'c2',
          description: '',
          descriptionAr: '',
          date: '2026-07-03',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cash-bank',
          type: 'credit',
          amount: 50000,
          amountInWords: '',
          amountInWordsAr: '',
          fundSource: 'banque',
          caisseId: 'c1',
          description: '',
          descriptionAr: '',
          date: '2026-07-04',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const store = useFinanceStore.getState();
      await store.calculateTotalCash();

      const state = useFinanceStore.getState();
      // 10000 - 3000 + 2000 = 9000 (banque transaction excluded)
      expect(state.totalCash).toBe(9000);
    });
  });

  describe('getTotalBankBalance', () => {
    it('sums all bank account balances', async () => {
      const now = new Date();
      await db.bankAccounts.bulkAdd([
        {
          id: 'b1',
          bankName: 'BNA',
          bankNameAr: '',
          accountNumber: '',
          rib: '',
          iban: '',
          swift: '',
          balance: 15000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'b2',
          bankName: 'CPA',
          bankNameAr: '',
          accountNumber: '',
          rib: '',
          iban: '',
          swift: '',
          balance: 25000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'b3',
          bankName: 'BEA',
          bankNameAr: '',
          accountNumber: '',
          rib: '',
          iban: '',
          swift: '',
          balance: 10000,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const store = useFinanceStore.getState();
      await store.loadBankAccounts();

      const total = useFinanceStore.getState().getTotalBankBalance();
      expect(total).toBe(50000);
    });

    it('returns 0 when no bank accounts exist', async () => {
      const store = useFinanceStore.getState();
      await store.loadBankAccounts();

      const total = useFinanceStore.getState().getTotalBankBalance();
      expect(total).toBe(0);
    });
  });
});

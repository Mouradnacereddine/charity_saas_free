import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/finance/transactions — list with filters
router.get('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      type, fundSource, caisseId, bankAccountId,
      dateFrom, dateTo, minAmount, maxAmount, searchTerm,
    } = req.query;

    const where: any = { associationId };

    if (type) where.type = String(type);
    if (fundSource) where.fundSource = String(fundSource);
    if (caisseId) where.caisseId = String(caisseId);
    if (bankAccountId) where.bankAccountId = String(bankAccountId);

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(String(dateFrom));
      if (dateTo) where.date.lte = new Date(String(dateTo));
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(String(minAmount));
      if (maxAmount) where.amount.lte = parseFloat(String(maxAmount));
    }

    if (searchTerm) {
      const term = String(searchTerm);
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { descriptionAr: { contains: term, mode: 'insensitive' } },
        { receiptNumber: { contains: term, mode: 'insensitive' } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        caisse: true,
        bankAccount: true,
        donor: true,
        beneficiary: true,
      },
      orderBy: { date: 'desc' },
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error listing transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/finance/transactions — create with balance validation and auto receipt
router.post('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      type, amount, amountInWords, amountInWordsAr,
      fundSource, caisseId, subCategoryId, bankAccountId,
      donorId, beneficiaryId, description, descriptionAr,
      receiptNumber, date,
    } = req.body;

    if (!type || amount === undefined || amount === null || !fundSource || !caisseId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!['credit', 'debit'].includes(type)) {
      res.status(400).json({ error: 'Invalid transaction type' });
      return;
    }

    if (!['banque', 'caisse_physique'].includes(fundSource)) {
      res.status(400).json({ error: 'Invalid fund source' });
      return;
    }

    // Auto-generate amountInWords if not provided
    const words = amountInWords || `${amount} DZD`;
    const wordsAr = amountInWordsAr || `${amount} دينار`;

    // Auto-generate receipt number for credits
    const ref = receiptNumber || `BON-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // Verify caisse belongs to association
    const caisse = await prisma.caisse.findFirst({
      where: { id: caisseId, associationId },
    });

    if (!caisse) {
      res.status(400).json({ error: 'Caisse not found' });
      return;
    }

    // For debit transactions, check balance
    if (type === 'debit') {
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

      if (fundSource === 'caisse_physique') {
        if (caisse.balance < numericAmount) {
          res.status(400).json({ error: 'رصيد الصندوق غير كافٍ' });
          return;
        }
      } else if (fundSource === 'banque') {
        if (bankAccountId) {
          const bankAccount = await prisma.bankAccount.findFirst({
            where: { id: bankAccountId, associationId },
          });
          if (!bankAccount || bankAccount.balance < numericAmount) {
            res.status(400).json({ error: 'Insufficient bank balance' });
            return;
          }
        }
      }
    }

    // Use a transaction to create the transaction and update balances
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          associationId,
          type,
          amount,
          amountInWords: words,
          amountInWordsAr: wordsAr,
          fundSource,
          caisseId,
          subCategoryId,
          bankAccountId,
          donorId,
          beneficiaryId,
          description,
          descriptionAr,
          receiptNumber: ref,
          date: date ? new Date(date) : new Date(),
        },
      });

      // Update caisse balance
      const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (type === 'credit') {
        await tx.caisse.update({
          where: { id: caisseId },
          data: { balance: { increment: amountNum } },
        });
      } else {
        await tx.caisse.update({
          where: { id: caisseId },
          data: { balance: { decrement: amountNum } },
        });
      }

      // Update bank account balance if applicable
      if (bankAccountId) {
        if (type === 'credit') {
          await tx.bankAccount.update({
            where: { id: bankAccountId },
            data: { balance: { increment: amountNum } },
          });
        } else {
          await tx.bankAccount.update({
            where: { id: bankAccountId },
            data: { balance: { decrement: amountNum } },
          });
        }
      }

      // Update donor totalDonated if applicable
      if (donorId && type === 'credit') {
        await tx.donor.update({
          where: { id: donorId },
          data: { totalDonated: { increment: amountNum } },
        });
      }

      // Auto-create donation receipt if donorId is present and type is credit
      let receipt = null;
      if (donorId && type === 'credit' && receiptNumber) {
        const donor = await tx.donor.findUnique({
          where: { id: donorId },
        });

        if (donor) {
          receipt = await tx.donationReceipt.create({
            data: {
              associationId,
              receiptNumber,
              donorId,
              donorName: `${donor.firstName} ${donor.lastName}`,
              donorNameAr: `${donor.lastNameAr} ${donor.firstNameAr}`,
              transactionId: transaction.id,
              amount: amountNum,
              amountInWords,
              amountInWordsAr,
              caisseId,
              caisseName: caisse.name,
              caisseNameAr: caisse.nameAr,
              date: date ? new Date(date) : new Date(),
            },
          });
        }
      }

      return { transaction, receipt };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/finance/transactions/:id
router.get('/transactions/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const transaction = await prisma.transaction.findFirst({
      where: { id, associationId },
      include: {
        caisse: true,
        bankAccount: true,
        donor: true,
        beneficiary: true,
        donationReceipts: true,
      },
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/finance/bank-accounts
router.get('/bank-accounts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const accounts = await prisma.bankAccount.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(accounts);
  } catch (error) {
    console.error('Error listing bank accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/finance/bank-accounts
router.post('/bank-accounts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { bankName, bankNameAr, accountNumber, rib, iban, swift, balance } = req.body;

    if (!bankName || !bankNameAr || !accountNumber) {
      res.status(400).json({ error: 'Missing required fields: bankName, bankNameAr, accountNumber' });
      return;
    }

    const account = await prisma.bankAccount.create({
      data: {
        associationId,
        bankName,
        bankNameAr,
        accountNumber,
        rib: rib || '',
        iban: iban || '',
        swift: swift || '',
        balance: balance || 0,
      },
    });

    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating bank account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/finance/bank-accounts/:id
router.put('/bank-accounts/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.bankAccount.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }

    const { bankName, bankNameAr, accountNumber, rib, iban, swift, balance } = req.body;

    const data: any = {};
    if (bankName !== undefined) data.bankName = bankName;
    if (bankNameAr !== undefined) data.bankNameAr = bankNameAr;
    if (accountNumber !== undefined) data.accountNumber = accountNumber;
    if (rib !== undefined) data.rib = rib;
    if (iban !== undefined) data.iban = iban;
    if (swift !== undefined) data.swift = swift;
    if (balance !== undefined) data.balance = balance;

    const account = await prisma.bankAccount.update({
      where: { id },
      data,
    });

    res.json(account);
  } catch (error) {
    console.error('Error updating bank account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/finance/bank-accounts/:id
router.delete('/bank-accounts/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.bankAccount.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }

    await prisma.bankAccount.delete({ where: { id } });
    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/finance/stats — total bank balance and total cash
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { associationId },
    });

    const caisses = await prisma.caisse.findMany({
      where: { associationId },
    });

    const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalCashBalance = caisses.reduce((sum, c) => sum + c.balance, 0);

    res.json({
      totalBankBalance,
      totalCashBalance,
      bankAccounts,
      caisses,
    });
  } catch (error) {
    console.error('Error getting finance stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

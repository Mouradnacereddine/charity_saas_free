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
      donorId, beneficiaryId,
    } = req.query;

    const where: any = { associationId };

    if (type) where.type = String(type);
    if (fundSource) where.fundSource = String(fundSource);
    if (caisseId) where.caisseId = String(caisseId);
    if (bankAccountId) where.bankAccountId = String(bankAccountId);
    if (donorId) where.donorId = String(donorId);
    if (beneficiaryId) where.beneficiaryId = String(beneficiaryId);

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
// Accepts optional `status`: "pending" (no balance impact) or "completed" (default)
router.post('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      type, amount, amountInWords, amountInWordsAr,
      fundSource, caisseId, subCategoryId, bankAccountId,
      donorId, beneficiaryId, allocatedBeneficiaryId, allocationId, description, descriptionAr,
      receiptNumber, date, status,
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

    const txStatus: string = status || 'completed';
    if (!['pending', 'completed', 'cancelled'].includes(txStatus)) {
      res.status(400).json({ error: 'Invalid transaction status' });
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

    // For completed debit transactions, check balance
    if (type === 'debit' && txStatus === 'completed') {
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
          receiptNumber: txStatus === 'completed' ? ref : null,
          status: txStatus as any,
          date: date ? new Date(date) : new Date(),
        },
      });

      const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
      let receipt = null;
      let allocation = null;

      // Only update balances and create receipt if status is 'completed'
      if (txStatus === 'completed') {
        // Update caisse balance
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
        if (donorId && type === 'credit' && ref) {
          const donor = await tx.donor.findUnique({
            where: { id: donorId },
          });

          let subCat: any = null;
          if (subCategoryId) {
            const cais = await tx.caisse.findUnique({ where: { id: caisseId } });
            if (cais && cais.subCategories) {
              const subs = cais.subCategories as any[];
              subCat = subs.find((s) => s.id === subCategoryId);
            }
          }

          if (donor) {
            receipt = await tx.donationReceipt.create({
              data: {
                associationId,
                receiptNumber: ref,
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
                subCategoryId: subCat?.id,
                subCategoryName: subCat?.name,
                subCategoryNameAr: subCat?.nameAr,
                date: date ? new Date(date) : new Date(),
              },
            });
          }
        }

        // If a debit is linked to an allocation, update the remaining amount
        if (allocationId && type === 'debit') {
          const alloc = await tx.donationAllocation.findUnique({
            where: { id: allocationId },
          });
          if (alloc && alloc.associationId === associationId) {
            const newRemaining = Math.max(0, alloc.remainingAmount - amountNum);
            await tx.donationAllocation.update({
              where: { id: allocationId },
              data: { remainingAmount: newRemaining, debitTransactionId: transaction.id },
            });
          }
        }
      }

      // If a beneficiary is designated for this donation, create an allocation
      // (even for pending — records the promise)
      if (allocatedBeneficiaryId && donorId && type === 'credit') {
        const donor = await tx.donor.findUnique({
          where: { id: donorId },
        });
        const beneficiary = await tx.beneficiary.findUnique({
          where: { id: allocatedBeneficiaryId },
        });
        if (donor && beneficiary) {
          allocation = await tx.donationAllocation.create({
            data: {
              associationId,
              donorId,
              beneficiaryId: allocatedBeneficiaryId,
              creditTransactionId: transaction.id,
              amount: amountNum,
              remainingAmount: amountNum,
              notes: `تبرع مخصص من ${donor.lastNameAr} ${donor.firstNameAr} إلى ${beneficiary.lastNameAr} ${beneficiary.firstNameAr}`,
            },
          });
        }
      }

      return { transaction, receipt, allocation };
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

// PUT /api/finance/transactions/:id/confirm — change pending → completed
router.put('/transactions/:id/confirm', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const tx = await prisma.transaction.findFirst({
      where: { id, associationId },
      include: { caisse: true },
    });

    if (!tx) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    if (tx.status !== 'pending') {
      res.status(400).json({ error: 'Seules les transactions en attente peuvent être confirmées' });
      return;
    }

    const amountNum = tx.amount;

    // Check balance for debits
    if (tx.type === 'debit') {
      if (tx.fundSource === 'caisse_physique') {
        if (tx.caisse.balance < amountNum) {
          res.status(400).json({ error: 'رصيد الصندوق غير كافٍ لإكمال هذه المعاملة' });
          return;
        }
      } else if (tx.fundSource === 'banque' && tx.bankAccountId) {
        const bankAccount = await prisma.bankAccount.findFirst({
          where: { id: tx.bankAccountId, associationId },
        });
        if (!bankAccount || bankAccount.balance < amountNum) {
          res.status(400).json({ error: 'Insufficient bank balance to confirm' });
          return;
        }
      }
    }

    const result = await prisma.$transaction(async (prismaTx) => {
      // Update status
      const updated = await prismaTx.transaction.update({
        where: { id },
        data: { status: 'completed' },
      });

      // Update caisse balance
      if (tx.type === 'credit') {
        await prismaTx.caisse.update({
          where: { id: tx.caisseId },
          data: { balance: { increment: amountNum } },
        });
      } else {
        await prismaTx.caisse.update({
          where: { id: tx.caisseId },
          data: { balance: { decrement: amountNum } },
        });
      }

      // Update bank account balance if applicable
      if (tx.bankAccountId) {
        if (tx.type === 'credit') {
          await prismaTx.bankAccount.update({
            where: { id: tx.bankAccountId },
            data: { balance: { increment: amountNum } },
          });
        } else {
          await prismaTx.bankAccount.update({
            where: { id: tx.bankAccountId },
            data: { balance: { decrement: amountNum } },
          });
        }
      }

      // Update donor totalDonated for credits
      if (tx.donorId && tx.type === 'credit') {
        await prismaTx.donor.update({
          where: { id: tx.donorId },
          data: { totalDonated: { increment: amountNum } },
        });

        // Create donation receipt
        const donor = await prismaTx.donor.findUnique({ where: { id: tx.donorId } });
        const caisse = await prismaTx.caisse.findUnique({ where: { id: tx.caisseId } });
        const ref = tx.receiptNumber || `BON-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

        if (donor && caisse) {
          await prismaTx.donationReceipt.create({
            data: {
              associationId,
              receiptNumber: ref,
              donorId: tx.donorId,
              donorName: `${donor.firstName} ${donor.lastName}`,
              donorNameAr: `${donor.lastNameAr} ${donor.firstNameAr}`,
              transactionId: tx.id,
              amount: amountNum,
              amountInWords: tx.amountInWords,
              amountInWordsAr: tx.amountInWordsAr,
              caisseId: tx.caisseId,
              caisseName: caisse.name,
              caisseNameAr: caisse.nameAr,
              subCategoryId: tx.subCategoryId || undefined,
              date: tx.date,
            },
          });
        }
      }

      // For debits linked to allocation, update remaining amount
      // Find any allocation linked to this debit via creditAllocations
      const debitAlloc = await prismaTx.donationAllocation.findFirst({
        where: { debitTransactionId: tx.id },
      });

      return updated;
    });

    res.json(result);
  } catch (error) {
    console.error('Error confirming transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/finance/transactions/:id/cancel — change pending → cancelled
router.put('/transactions/:id/cancel', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const tx = await prisma.transaction.findFirst({
      where: { id, associationId },
    });

    if (!tx) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    if (tx.status !== 'pending') {
      res.status(400).json({ error: 'Seules les transactions en attente peuvent être annulées' });
      return;
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error cancelling transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================================================
// DONATION ALLOCATIONS (tracabilite donateur → beneficiaire)
// ========================================================================

// GET /api/finance/allocations — list allocations with optional filters
router.get('/allocations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { donorId, beneficiaryId, status } = req.query;

    const where: any = { associationId };
    if (donorId) where.donorId = String(donorId);
    if (beneficiaryId) where.beneficiaryId = String(beneficiaryId);

    const allocations = await prisma.donationAllocation.findMany({
      where,
      include: {
        donor: { select: { id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, reference: true } },
        beneficiary: { select: { id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, reference: true } },
        creditTransaction: { select: { id: true, date: true, receiptNumber: true, caisseId: true, status: true } },
        debitTransaction: { select: { id: true, date: true, receiptNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(allocations);
  } catch (error) {
    console.error('Error listing allocations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/finance/allocations/:id/distribute — link a debit transaction to an allocation
router.put('/allocations/:id/distribute', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;
    const { debitTransactionId, amount } = req.body;

    const allocation = await prisma.donationAllocation.findFirst({
      where: { id, associationId },
    });

    if (!allocation) {
      res.status(404).json({ error: 'Allocation not found' });
      return;
    }

    const distributeAmount = amount || allocation.remainingAmount;
    const newRemaining = allocation.remainingAmount - distributeAmount;

    const updated = await prisma.donationAllocation.update({
      where: { id },
      data: {
        debitTransactionId: debitTransactionId || undefined,
        remainingAmount: Math.max(0, newRemaining),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error distributing allocation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

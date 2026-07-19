import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { generateRef } from '../lib/ref';

const router = Router();

router.use(requireAuth);

// GET /api/finance/transactions — list with filters
router.get('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      type, fundSource, caisseId, bankAccountId, status,
      dateFrom, dateTo, minAmount, maxAmount, searchTerm,
      donorId, beneficiaryId,
    } = req.query;

    const where: any = { associationId };

    if (type) where.type = String(type);
    if (fundSource) where.fundSource = String(fundSource);
    if (caisseId) where.caisseId = String(caisseId);
    if (bankAccountId) where.bankAccountId = String(bankAccountId);
    if (status) where.status = String(status);
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
        { donor: { firstNameAr: { contains: term, mode: 'insensitive' } } },
        { donor: { lastNameAr: { contains: term, mode: 'insensitive' } } },
        { donor: { firstName: { contains: term, mode: 'insensitive' } } },
        { donor: { lastName: { contains: term, mode: 'insensitive' } } },
        { beneficiary: { firstNameAr: { contains: term, mode: 'insensitive' } } },
        { beneficiary: { lastNameAr: { contains: term, mode: 'insensitive' } } },
        { beneficiary: { firstName: { contains: term, mode: 'insensitive' } } },
        { beneficiary: { lastName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        caisse: true,
        bankAccount: true,
        donor: true,
        beneficiary: true,
        creditAllocations: {
          select: {
            id: true,
            amount: true,
            remainingAmount: true,
            debitTransactionId: true,
            donorId: true,
            beneficiaryId: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Attach debit allocations for debit transactions
    const debitAllocMap = new Map<string, { remainingAmount: number; allocationId: string }>();
    const allocIds = transactions.filter(t => t.type === 'debit').map(t => t.id).filter(Boolean);
    if (allocIds.length > 0) {
      const debitAllocs = await prisma.donationAllocation.findMany({
        where: { debitTransactionId: { in: allocIds } },
        select: { id: true, amount: true, remainingAmount: true, debitTransactionId: true },
      });
      for (const da of debitAllocs) {
        debitAllocMap.set(da.debitTransactionId!, { remainingAmount: da.remainingAmount, allocationId: da.id });
      }
    }

    const enriched = transactions.map(tx => {
      const alloc = (tx as any).creditAllocations?.[0];
      const debitAlloc = debitAllocMap.get(tx.id);
      let rem: number | null = null;
      let allocId: string | null = null;
      if (tx.type === 'credit' && alloc) {
        rem = alloc.remainingAmount;
        allocId = alloc.id;
      } else if (tx.type === 'debit' && debitAlloc) {
        rem = debitAlloc.remainingAmount;
        allocId = debitAlloc.allocationId;
      }
      return {
        ...tx,
        remainingAmount: rem,
        allocationId: allocId,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Error listing transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/finance/transactions — create with balance validation and auto receipt
// Accepts optional `status`: "pending" or "completed" (default)
// CREDIT PENDING: money enters caisse immediately (donor has given), but beneficiary hasn't received yet
// DEBIT PENDING: money does NOT leave caisse until confirmed (beneficiary hasn't received yet)
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

    // Auto-generate receipt number for all transactions
    const ref = receiptNumber || generateRef('BON');

    // Verify caisse belongs to association
    const caisse = await prisma.caisse.findFirst({
      where: { id: caisseId, associationId },
    });

    if (!caisse) {
      res.status(400).json({ error: 'Caisse not found' });
      return;
    }

    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // For completed debit transactions, check balance
    if (type === 'debit' && txStatus === 'completed') {
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
          status: txStatus as any,
          date: date ? new Date(date) : new Date(),
        },
      });

      const amountNum = numericAmount;
      let receipt = null;
      let allocation = null;

      // =====================================================
      // CREDIT: money enters caisse IMMEDIATELY (even pending)
      // because the donor has physically given the money.
      // =====================================================
      if (type === 'credit') {
        // Update caisse balance
        await tx.caisse.update({
          where: { id: caisseId },
          data: { balance: { increment: amountNum } },
        });

        // Update bank account balance if applicable
        if (bankAccountId) {
          await tx.bankAccount.update({
            where: { id: bankAccountId },
            data: { balance: { increment: amountNum } },
          });
        }

        // Update donor totalDonated
        if (donorId) {
          await tx.donor.update({
            where: { id: donorId },
            data: { totalDonated: { increment: amountNum } },
          });
        }

        // Auto-create donation receipt if donorId is present
        if (donorId && ref) {
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
      }

      // =====================================================
      // DEBIT: money leaves caisse ONLY if completed
      // (pending = beneficiary hasn't received yet)
      // =====================================================
      if (type === 'debit' && txStatus === 'completed') {
        await tx.caisse.update({
          where: { id: caisseId },
          data: { balance: { decrement: amountNum } },
        });

        if (bankAccountId) {
          await tx.bankAccount.update({
            where: { id: bankAccountId },
            data: { balance: { decrement: amountNum } },
          });
        }

        // If linked to an allocation, update remaining amount
        if (allocationId) {
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

      // If beneficiary is set on credit, create allocation (tracks donor→beneficiary)
      const allocBenefId = beneficiaryId || allocatedBeneficiaryId;
      if (allocBenefId && donorId && type === 'credit') {
        const donor = await tx.donor.findUnique({ where: { id: donorId } });
        const beneficiary = await tx.beneficiary.findUnique({ where: { id: allocBenefId } });
        if (donor && beneficiary) {
          allocation = await tx.donationAllocation.create({
            data: {
              associationId, donorId, beneficiaryId: allocBenefId, creditTransactionId: transaction.id,
              amount: amountNum, remainingAmount: amountNum,
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
      // Allow completed credits with remaining amount to continue disbursing
      if (!(tx.type === 'credit' && tx.status === 'completed')) {
        res.status(400).json({ error: 'Seules les transactions en attente peuvent être confirmées' });
        return;
      }
    }

    const amountNum = tx.amount;
    const confirmAmount = req.body.amount !== undefined ? Number(req.body.amount) : amountNum;

    if (isNaN(confirmAmount) || confirmAmount <= 0 || confirmAmount > amountNum) {
      res.status(400).json({ error: 'المبلغ المدخل غير صالح' });
      return;
    }

    // Check balance for debits
    if (tx.type === 'debit') {
      if (tx.fundSource === 'caisse_physique') {
        if (tx.caisse.balance < confirmAmount) {
          res.status(400).json({ error: 'رصيد الصندوق غير كافٍ لإكمال هذه المعاملة' });
          return;
        }
      } else if (tx.fundSource === 'banque' && tx.bankAccountId) {
        const bankAccount = await prisma.bankAccount.findFirst({
          where: { id: tx.bankAccountId, associationId },
        });
        if (!bankAccount || bankAccount.balance < confirmAmount) {
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

      // =====================================================
      // DEBIT CONFIRMATION: Now the money physically leaves
      // the caisse/bank
      // =====================================================
      if (tx.type === 'debit') {
        await prismaTx.caisse.update({
          where: { id: tx.caisseId },
          data: { balance: { decrement: confirmAmount } },
        });

        if (tx.bankAccountId) {
          await prismaTx.bankAccount.update({
            where: { id: tx.bankAccountId },
            data: { balance: { decrement: confirmAmount } },
          });
        }

        const debitAlloc = await prismaTx.donationAllocation.findFirst({
          where: { debitTransactionId: tx.id },
        });

        if (debitAlloc) {
          const newRemaining = Math.max(0, debitAlloc.remainingAmount - confirmAmount);
          await prismaTx.donationAllocation.update({
            where: { id: debitAlloc.id },
            data: { remainingAmount: newRemaining },
          });
        }
      }

      // =====================================================
      // CREDIT CONFIRMATION:
      // If confirmAmount < original: create debit for released
      // amount, debit caisse, update allocation.
      // =====================================================
      if (tx.type === 'credit' && tx.donorId) {
        const existingReceipt = await prismaTx.donationReceipt.findFirst({
          where: { transactionId: tx.id },
        });

        if (!existingReceipt) {
          const donor = await prismaTx.donor.findUnique({ where: { id: tx.donorId } });
          const caisse = await prismaTx.caisse.findUnique({ where: { id: tx.caisseId } });
          const ref = tx.receiptNumber || generateRef('BON');

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
      }

      // =====================================================
      // CREDIT CONFIRMATION with beneficiary:
      // Money entered caisse on POST. Now release it to the
      // beneficiary via a debit transaction, regardless of
      // whether the release is partial or full.
      // =====================================================
      if (tx.type === 'credit' && tx.beneficiaryId && confirmAmount > 0) {
        const debitRef = generateRef('BON');

        const debitTx = await prismaTx.transaction.create({
          data: {
            associationId,
            type: 'debit',
            amount: confirmAmount,
            amountInWords: `${confirmAmount} DZD`,
            amountInWordsAr: `${confirmAmount} دينار`,
            fundSource: tx.fundSource,
            caisseId: tx.caisseId,
            subCategoryId: tx.subCategoryId,
            bankAccountId: tx.bankAccountId,
            beneficiaryId: tx.beneficiaryId,
            donorId: tx.donorId,
            description: tx.description,
            descriptionAr: tx.descriptionAr,
            receiptNumber: debitRef,
            status: 'completed',
            date: new Date(),
          },
        });

        await prismaTx.caisse.update({
          where: { id: tx.caisseId },
          data: { balance: { decrement: confirmAmount } },
        });

        if (tx.bankAccountId) {
          await prismaTx.bankAccount.update({
            where: { id: tx.bankAccountId },
            data: { balance: { decrement: confirmAmount } },
          });
        }

        const alloc = await prismaTx.donationAllocation.findFirst({
          where: { creditTransactionId: tx.id },
        });

        if (alloc) {
          const newRemaining = Math.max(0, alloc.remainingAmount - confirmAmount);
          await prismaTx.donationAllocation.update({
            where: { id: alloc.id },
            data: { remainingAmount: newRemaining, debitTransactionId: debitTx.id },
          });
        }
      }

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

    const updated = await prisma.$transaction(async (prismaTx) => {
      const txUpdate = await prismaTx.transaction.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      const amountNum = tx.amount;

      // If a pending CREDIT is cancelled, we must subtract the money that entered
      if (tx.type === 'credit') {
        // Decrease caisse balance
        await prismaTx.caisse.update({
          where: { id: tx.caisseId },
          data: { balance: { decrement: amountNum } },
        });

        // Decrease bank account balance if applicable
        if (tx.bankAccountId) {
          await prismaTx.bankAccount.update({
            where: { id: tx.bankAccountId },
            data: { balance: { decrement: amountNum } },
          });
        }

        // Decrease donor totalDonated if applicable
        if (tx.donorId) {
          await prismaTx.donor.update({
            where: { id: tx.donorId },
            data: { totalDonated: { decrement: amountNum } },
          });
        }
      }

      // Note: For pending DEBIT cancel, nothing was subtracted yet, so no balance change needed.

      return txUpdate;
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

// POST /api/finance/allocations/:id/disburse — create a new debit for remaining amount
router.post('/allocations/:id/disburse', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;
    const { amount } = req.body;

    const alloc = await prisma.donationAllocation.findFirst({
      where: { id, associationId },
      include: { creditTransaction: true },
    });

    if (!alloc) {
      res.status(404).json({ error: 'Allocation not found' });
      return;
    }

    const disburseAmount = amount || alloc.remainingAmount;
    if (disburseAmount <= 0 || disburseAmount > alloc.remainingAmount) {
      res.status(400).json({ error: 'المبلغ غير صالح' });
      return;
    }

    const creditTx = alloc.creditTransaction;
    if (!creditTx) {
      res.status(400).json({ error: 'Crédit associé introuvable' });
      return;
    }

    // Check caisse balance
    if (creditTx.fundSource === 'caisse_physique') {
      const caisse = await prisma.caisse.findFirst({ where: { id: creditTx.caisseId, associationId } });
      if (!caisse || caisse.balance < disburseAmount) {
        res.status(400).json({ error: 'رصيد الصندوق غير كافٍ' });
        return;
      }
    } else if (creditTx.bankAccountId) {
      const bankAccount = await prisma.bankAccount.findFirst({ where: { id: creditTx.bankAccountId, associationId } });
      if (!bankAccount || bankAccount.balance < disburseAmount) {
        res.status(400).json({ error: 'رصيد الحساب البنكي غير كافٍ' });
        return;
      }
    }

    const result = await prisma.$transaction(async (prismaTx) => {
      const ref = generateRef('BON');
      const debitTx = await prismaTx.transaction.create({
        data: {
          associationId,
          type: 'debit',
          amount: disburseAmount,
          amountInWords: `${disburseAmount} DZD`,
          amountInWordsAr: `${disburseAmount} دينار`,
          fundSource: creditTx.fundSource,
          caisseId: creditTx.caisseId,
          subCategoryId: creditTx.subCategoryId,
          bankAccountId: creditTx.bankAccountId,
          beneficiaryId: alloc.beneficiaryId,
          description: creditTx.description,
          descriptionAr: creditTx.descriptionAr,
          receiptNumber: ref,
          status: 'completed',
          date: new Date(),
        },
      });

      // Debit caisse
      await prismaTx.caisse.update({
        where: { id: creditTx.caisseId },
        data: { balance: { decrement: disburseAmount } },
      });

      if (creditTx.bankAccountId) {
        await prismaTx.bankAccount.update({
          where: { id: creditTx.bankAccountId },
          data: { balance: { decrement: disburseAmount } },
        });
      }

      // Update allocation
      const newRemaining = Math.max(0, alloc.remainingAmount - disburseAmount);
      await prismaTx.donationAllocation.update({
        where: { id },
        data: { remainingAmount: newRemaining, debitTransactionId: debitTx.id },
      });

      return { debitTx, remaining: newRemaining };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error disbursing allocation:', error);
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

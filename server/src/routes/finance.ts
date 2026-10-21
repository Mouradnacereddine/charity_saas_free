import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { generateRef } from '../lib/ref';
import { logAudit } from '../lib/audit';
import { roundMoney, moneyNumber } from '../lib/money';
import { resolveTransactionDate, localDay } from '../lib/datePolicy';
import { verifierSortie, soldeDisponible, type CompteCible, type ReservationEteinte } from '../lib/solde';

const router = Router();

router.use(requireAuth);

// GET /api/finance/transactions — list with filters
router.get('/transactions', requirePermission('transactions', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
      // `dateTo` est un jour entier, pas un instant : une borne `lte` à minuit
      // exclurait toutes les opérations du jour même. On borne donc au début du
      // jour suivant, en exclu — nécessaire depuis que les opérations portent
      // l'instant réel de création et non plus minuit.
      if (dateTo) {
        const end = new Date(String(dateTo));
        end.setUTCDate(end.getUTCDate() + 1);
        where.date.lt = end;
      }
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
        { receiptNumber: { contains: term, mode: 'insensitive' } },
        { donor: { firstName: { contains: term, mode: 'insensitive' } } },
        { donor: { lastName: { contains: term, mode: 'insensitive' } } },
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
      orderBy: [{ createdAt: 'desc' }, { date: 'desc' }],
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
        debitAllocMap.set(da.debitTransactionId!, { remainingAmount: Number(da.remainingAmount), allocationId: da.id });
      }
    }

    const enriched = transactions.map(tx => {
      const alloc = (tx as any).creditAllocations?.[0];
      const debitAlloc = debitAllocMap.get(tx.id);
      let rem: number | null = null;
      let allocId: string | null = null;
      if (tx.type === 'credit' && alloc) {
        rem = Number(alloc.remainingAmount);
        allocId = alloc.id;
      } else if (tx.type === 'debit' && debitAlloc) {
        rem = Number(debitAlloc.remainingAmount);
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
router.post('/transactions', requirePermission('transactions', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      type, amount, amountInWords,
      fundSource, caisseId, subCategoryId, bankAccountId,
      donorId, beneficiaryId, allocatedBeneficiaryId, allocationId, description,
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

    // Seul le super-admin peut fixer la date, et seulement dans le passé ou le
    // jour même : la valeur d'un autre rôle est ignorée (jour courant). Le
    // contrôle est ici, pas dans le formulaire — une requête directe
    // contournerait un champ simplement masqué.
    const dateResolution = resolveTransactionDate(req.user!.role, date);
    if ('error' in dateResolution) {
      res.status(400).json({ error: dateResolution.error });
      return;
    }
    const txDate = dateResolution.date;

    // Auto-generate amountInWords if not provided
    const words = amountInWords || `${amount} DZD`;

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

    // Normalise le montant reçu au centime AVANT toute écriture : Prisma
    // stocke tel quel un nombre JS flottant (ex : 1999.8999999999999) dans la
    // colonne Decimal, d'où la « perte de quelques centimes » sur les soldes
    // et allocations. roundMoney garantit une valeur à 2 décimales exactes.
    const numericAmount = moneyNumber(amount);

    // Un montant négatif inverse le sens du mouvement : un débit de -50 sur
    // une caisse à 0 passait le contrôle `balance < numericAmount` (0 < -50 est
    // faux) et CRÉAIT 50 DZD. Un non-numérique ("abc") ressortait à 0 via
    // roundMoney, donc un montant nul accepté. Les deux sont refusés ici.
    if (isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'المبلغ يجب أن يكون رقماً أكبر من صفر' });
      return;
    }

    // `description` est non-nullable en base et sans valeur par défaut : la
    // recevoir absente ou nulle faisait échouer Prisma, donc remonter un 500
    // opaque au lieu d'une création normale. On la ramène à une chaîne vide,
    // comportement inchangé pour un client qui envoie déjà "" (le reçu masque
    // les descriptions vides) — sans transformer le champ en obligatoire.
    if (description !== undefined && description !== null && typeof description !== 'string') {
      res.status(400).json({ error: 'Invalid description' });
      return;
    }
    const descriptionText: string = description ?? '';

    // Use a transaction to create the transaction and update balances
    const result = await prisma.$transaction(async (tx) => {
      // Un débit « completed » fait sortir l'argent immédiatement : le solde
      // est contrôlé ICI, dans la transaction, et non avant. Un contrôle
      // préalable lisait une valeur périmée — deux débits concurrents le
      // passaient tous deux et le second creusait la caisse, qui pouvait
      // devenir négative.
      if (type === 'debit' && txStatus === 'completed') {
        // Le solde brut ne suffit pas : une partie est déjà promise (dons
        // affectés non versés, débits en attente). Un débit rattaché à une
        // allocation paie cette promesse et l'éteint ; une dépense libre doit
        // se contenter des fonds non réservés.
        const compte = fundSource === 'banque' && bankAccountId
          ? { bankAccountId }
          : { caisseId };

        const sortie = await verifierSortie(
          tx,
          associationId,
          compte,
          numericAmount,
          allocationId ? { allocationId } : {},
        );
        if (!sortie.autorise) {
          throw new Error('INSUFFICIENT_DISPONIBLE');
        }

        if (fundSource === 'caisse_physique') {
          const decCaisse = await tx.caisse.updateMany({
            where: { id: caisseId, associationId, balance: { gte: numericAmount } },
            data: { balance: { decrement: numericAmount } },
          });
          if (decCaisse.count === 0) {
            throw new Error('INSUFFICIENT_CAISSE_BALANCE');
          }
        } else if (fundSource === 'banque' && bankAccountId) {
          const decBank = await tx.bankAccount.updateMany({
            where: { id: bankAccountId, associationId, balance: { gte: numericAmount } },
            data: { balance: { decrement: numericAmount } },
          });
          if (decBank.count === 0) {
            throw new Error('INSUFFICIENT_BANK_BALANCE');
          }
        }
      }
      const transaction = await tx.transaction.create({
        data: {
          associationId,
          type,
          amount: numericAmount,
          amountInWords: words,
          fundSource,
          caisseId,
          subCategoryId,
          bankAccountId,
          donorId,
          beneficiaryId,
          description: descriptionText,
          receiptNumber: ref,
          status: txStatus as any,
          date: txDate,
          createdBy: req.user!.userId,
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

        // Auto-create donation receipt if donorId is present.
        // Le reçu est émis dès la création, y compris pour un crédit
        // « pending » : ici « pending » qualifie la REMISE au bénéficiaire,
        // pas la réception du don. Le POST crédite déjà la caisse et
        // incrémente donor.totalDonated (juste au-dessus) — l'argent est reçu —
        // et l'annulation défait symétriquement ces trois écritures, reçu
        // compris (PUT /transactions/:id/cancel). Retenir le reçu ici ferait
        // diverger receiptCount de totalDonated pour le flux principal (crédit
        // avec bénéficiaire = pending), soit exactement l'anomalie « Total des
        // dons à 0 » signalée.
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
                transactionId: transaction.id,
                amount: amountNum,
                // `words` (calculé plus haut) retombe sur « <montant> DZD »
                // quand le client omet amountInWords. Utiliser ici la variable
                // brute du body faisait échouer la création du reçu (champ
                // requis null) dès qu'un appelant ne l'envoyait pas.
                amountInWords: words,
                caisseId,
                caisseName: caisse.name,
                subCategoryId: subCat?.id,
                subCategoryName: subCat?.name,
                // Même valeur que la Transaction : le reçu ne doit pas pouvoir
                // diverger de la date de l'opération qu'il atteste.
                date: txDate,
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
        // Le solde a déjà été débité par le compare-and-swap ci-dessus.
        // If linked to an allocation, update remaining amount
        if (allocationId) {
          const alloc = await tx.donationAllocation.findUnique({
            where: { id: allocationId },
          });
          if (alloc && alloc.associationId === associationId) {
            const newRemaining = Math.max(0, roundMoney(Number(alloc.remainingAmount) - Number(amountNum)));
            await tx.donationAllocation.update({
              where: { id: allocationId },
              data: { remainingAmount: newRemaining, debitTransactionId: transaction.id },
            });
          }
        }
      }

      // If beneficiary is set on credit, create allocation (tracks donor→beneficiary
      // or caisse→beneficiary when no donor is associated)
      const allocBenefId = beneficiaryId || allocatedBeneficiaryId;
      if (allocBenefId && type === 'credit') {
        const donor = donorId ? await tx.donor.findUnique({ where: { id: donorId } }) : null;
        const beneficiary = await tx.beneficiary.findUnique({ where: { id: allocBenefId } });
        if (beneficiary) {
          allocation = await tx.donationAllocation.create({
            data: {
              associationId, donorId: donorId || null, beneficiaryId: allocBenefId, creditTransactionId: transaction.id,
              amount: amountNum, remainingAmount: amountNum,
              notes: donor
                ? `تبرع مخصص من ${donor.lastName} ${donor.firstName} إلى ${beneficiary.lastName} ${beneficiary.firstName}`
                : ` Affectation depuis la caisse vers ${beneficiary.lastName} ${beneficiary.firstName}`,
            },
          });
        }
      }

      return { transaction, receipt, allocation };
    });

    // Trace : une date choisie manuellement (et non le jour courant) est
    // inhabituelle — on l'enregistre pour qu'elle reste imputable.
    const manualDate =
      dateResolution.honored && localDay(txDate) !== localDay(new Date());

    await logAudit(req, {
      action: 'create',
      resource: 'transaction',
      resourceId: result.transaction.id,
      description: 'Transaction créée',
      ...(manualDate
        ? { metadata: { manualDate: txDate.toISOString(), chosenBy: req.user!.userId } }
        : {}),
    });
    res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_CAISSE_BALANCE') {
      res.status(400).json({ error: 'رصيد الصندوق غير كافٍ' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_BANK_BALANCE') {
      res.status(400).json({ error: 'Insufficient bank balance' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_DISPONIBLE') {
      res.status(400).json({
        error: 'رصيد غير كافٍ : المبلغ المتبقي مخصص لدعم معلّق',
      });
      return;
    }
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/finance/transactions/:id
router.get('/transactions/:id', requirePermission('transactions', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.get('/bank-accounts', requirePermission('bank_accounts', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const accounts = await prisma.bankAccount.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
    });

    // Même logique que GET /api/caisses : `balance` est le solde détenu, on y
    // joint le disponible pour que l'interface ne montre pas un montant plus
    // élevé que ce que le contrôle des sorties autorisera.
    const avecDisponible = await Promise.all(
      accounts.map(async (a) => ({
        ...a,
        availableBalance: await soldeDisponible(prisma, associationId, { bankAccountId: a.id }),
      })),
    );

    res.json(avecDisponible);
  } catch (error) {
    console.error('Error listing bank accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/finance/bank-accounts
router.post('/bank-accounts', requirePermission('bank_accounts', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { bankName, accountNumber, rib, iban, swift, balance } = req.body;

    if (!bankName || !accountNumber) {
      res.status(400).json({ error: 'Missing required fields: bankName, accountNumber' });
      return;
    }

    const account = await prisma.bankAccount.create({
      data: {
        associationId,
        bankName,
        accountNumber,
        rib: rib || '',
        iban: iban || '',
        swift: swift || '',
        balance: moneyNumber(balance ?? 0),
        createdBy: req.user!.userId,
      },
    });

    await logAudit(req, { action: 'create', resource: 'bank_account', resourceId: account.id, description: 'Compte bancaire créé' });
    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating bank account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/finance/bank-accounts/:id
router.put('/bank-accounts/:id', requirePermission('bank_accounts', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    const { bankName, accountNumber, rib, iban, swift, balance } = req.body;

    const data: any = {};
    if (bankName !== undefined) data.bankName = bankName;
    if (accountNumber !== undefined) data.accountNumber = accountNumber;
    if (rib !== undefined) data.rib = rib;
    if (iban !== undefined) data.iban = iban;
    if (swift !== undefined) data.swift = swift;
    if (balance !== undefined) data.balance = moneyNumber(balance);
    data.updatedBy = req.user!.userId;

    const account = await prisma.bankAccount.update({
      where: { id },
      data,
    });

    await logAudit(req, { action: 'update', resource: 'bank_account', resourceId: account.id, description: 'Compte bancaire modifié' });
    res.json(account);
  } catch (error) {
    console.error('Error updating bank account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/finance/bank-accounts/:id
router.delete('/bank-accounts/:id', requirePermission('bank_accounts', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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
    await logAudit(req, { action: 'delete', resource: 'bank_account', resourceId: id, description: 'Compte bancaire supprimé' });
    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/finance/stats — total bank balance and total cash
router.get('/stats', requirePermission('transactions', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { associationId },
    });

    const caisses = await prisma.caisse.findMany({
      where: { associationId },
    });

    const totalBankBalance = roundMoney(bankAccounts.reduce((sum, acc) => Number(sum) + Number(acc.balance), 0));
    const totalCashBalance = roundMoney(caisses.reduce((sum, c) => Number(sum) + Number(c.balance), 0));

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
router.put('/transactions/:id/confirm', requirePermission('transactions', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    const amountNum = moneyNumber(tx.amount);
    const confirmAmount = moneyNumber(req.body.amount !== undefined ? req.body.amount : amountNum);

    if (isNaN(confirmAmount) || confirmAmount <= 0 || confirmAmount > amountNum) {
      res.status(400).json({ error: 'المبلغ المدخل غير صالح' });
      return;
    }

    // Une confirmation fait SORTIR de l'argent de la caisse/banque dans deux
    // cas, et le solde doit être contrôlé pour les DEUX :
    //   - un débit confirmé : l'argent part au bénéficiaire ;
    //   - un crédit AVEC bénéficiaire : la confirmation crée le débit de
    //     libération plus bas, donc l'argent sort aussi.
    // Contrôler le seul cas « debit » laissait confirmer un crédit alors que
    // les fonds avaient été engagés ailleurs entre-temps, ce qui produisait un
    // solde de caisse négatif.
    const isOutflow = tx.type === 'debit' || (tx.type === 'credit' && !!tx.beneficiaryId);

    const result = await prisma.$transaction(async (prismaTx) => {
      // Débit conditionnel ATOMIQUE du solde : le `WHERE balance >= montant`
      // fait vérifier et décrémenter par la base en une seule instruction, donc
      // la course est fermée quelle que soit l'isolation. Un simple contrôle
      // préalable (lire puis décrémenter) laissait deux opérations
      // concurrentes lire le même solde, passer toutes deux, et produire un
      // découvert. 0 ligne touchée = solde insuffisant, on annule tout.
      //
      // Le premier décrément qui échoue interrompt la transaction : la
      // caisse/bank partiellement débitée est restaurée par le rollback.
      if (isOutflow) {
        // Réservation que cette sortie éteint, donc à ne pas compter dans le
        // réservé (sinon elle serait comptée deux fois et l'opération la plus
        // normale — payer la promesse — serait refusée) :
        //   - confirmer un débit en attente libère sa propre réservation ;
        //   - un débit rattaché à une allocation paie cette promesse ;
        //   - confirmer un crédit affecté paie la promesse du don.
        const eteint: ReservationEteinte = {};
        if (tx.type === 'debit') {
          // Confirmer un débit en attente libère sa propre réservation.
          if (tx.status === 'pending') eteint.transactionId = tx.id;
          // Un débit rattaché à une promesse la paie. Le lien vit sur
          // `DonationAllocation.debitTransactionId` — `Transaction` n'a pas de
          // champ `allocationId`.
          const promesse = await prismaTx.donationAllocation.findFirst({
            where: { debitTransactionId: tx.id, associationId },
            select: { id: true },
          });
          if (promesse) eteint.allocationId = promesse.id;
        } else if (tx.beneficiaryId) {
          const promesse = await prismaTx.donationAllocation.findFirst({
            where: { creditTransactionId: tx.id, associationId },
            select: { id: true },
          });
          if (promesse) eteint.allocationId = promesse.id;
        }

        // Les deux comptes réellement débités par le compare-and-swap ci-dessous.
        const comptes: CompteCible[] = [{ caisseId: tx.caisseId }];
        if (tx.bankAccountId) comptes.push({ bankAccountId: tx.bankAccountId });
        for (const compte of comptes) {
          const sortie = await verifierSortie(prismaTx, associationId, compte, confirmAmount, eteint);
          if (!sortie.autorise) {
            throw new Error('INSUFFICIENT_DISPONIBLE');
          }
        }

        const decCaisse = await prismaTx.caisse.updateMany({
          where: { id: tx.caisseId, associationId, balance: { gte: confirmAmount } },
          data: { balance: { decrement: confirmAmount } },
        });
        if (decCaisse.count === 0) {
          throw new Error('INSUFFICIENT_CAISSE_BALANCE');
        }
        if (tx.bankAccountId) {
          const decBank = await prismaTx.bankAccount.updateMany({
            where: { id: tx.bankAccountId, associationId, balance: { gte: confirmAmount } },
            data: { balance: { decrement: confirmAmount } },
          });
          if (decBank.count === 0) {
            throw new Error('INSUFFICIENT_BANK_BALANCE');
          }
        }
      }

      // Update status
      const updated = await prismaTx.transaction.update({
        where: { id },
        data: { status: 'completed', updatedBy: req.user!.userId },
      });

      // =====================================================
      // DEBIT CONFIRMATION: Now the money physically leaves
      // the caisse/bank
      // =====================================================
      if (tx.type === 'debit') {
        // Le solde a déjà été débité par le compare-and-swap ci-dessus.
        const debitAlloc = await prismaTx.donationAllocation.findFirst({
          where: { debitTransactionId: tx.id },
        });

        if (debitAlloc) {
          const newRemaining = Math.max(0, roundMoney(Number(debitAlloc.remainingAmount) - Number(confirmAmount)));
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
                transactionId: tx.id,
                amount: amountNum,
                amountInWords: tx.amountInWords,
                caisseId: tx.caisseId,
                caisseName: caisse.name,
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
            fundSource: tx.fundSource,
            caisseId: tx.caisseId,
            subCategoryId: tx.subCategoryId,
            bankAccountId: tx.bankAccountId,
            beneficiaryId: tx.beneficiaryId,
            donorId: tx.donorId,
            description: tx.description,
            receiptNumber: debitRef,
            status: 'completed',
            date: new Date(),
          },
        });

        // Le solde a déjà été débité par le compare-and-swap ci-dessus.
        const alloc = await prismaTx.donationAllocation.findFirst({
          where: { creditTransactionId: tx.id },
        });

        if (alloc) {
          const newRemaining = Math.max(0, roundMoney(Number(alloc.remainingAmount) - Number(confirmAmount)));
          await prismaTx.donationAllocation.update({
            where: { id: alloc.id },
            data: { remainingAmount: newRemaining, debitTransactionId: debitTx.id },
          });
        }
      }

      return updated;
    });

    await logAudit(req, { action: 'confirm', resource: 'transaction', resourceId: result.id, description: 'Transaction confirmée' });
    res.json(result);
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_CAISSE_BALANCE') {
      res.status(400).json({ error: 'رصيد الصندوق غير كافٍ لإكمال هذه المعاملة' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_BANK_BALANCE') {
      res.status(400).json({ error: 'Insufficient bank balance to confirm' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_DISPONIBLE') {
      res.status(400).json({
        error: 'رصيد غير كافٍ : المبلغ المتبقي مخصص لدعم معلّق',
      });
      return;
    }
    console.error('Error confirming transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/finance/transactions/:id/cancel — change pending → cancelled
router.put('/transactions/:id/cancel', requirePermission('transactions', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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
        data: { status: 'cancelled', updatedBy: req.user!.userId },
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

        // If this pending credit had an allocation, void it (no funds
        // were disbursed against a pending credit, so remaining == amount).
        const alloc = await prismaTx.donationAllocation.findFirst({
          where: { creditTransactionId: id },
        });
        if (alloc) {
          await prismaTx.donationAllocation.update({
            where: { id: alloc.id },
            data: { remainingAmount: 0 },
          });
        }

        // Supprimer le reçu du crédit annulé. L'annulation défait la
        // réception du don : l'argent ressort de la caisse et
        // donor.totalDonated est décrémenté juste au-dessus. Le don n'a donc
        // pas eu lieu, et GET /donors dérive totalDonated et receiptCount des
        // reçus : le laisser en place laisserait apparaître un don annulé dans
        // le total affiché. deleteMany est sans effet sur zéro ligne.
        await prismaTx.donationReceipt.deleteMany({
          where: { transactionId: id, associationId },
        });
      }

      // Note: For pending DEBIT cancel, nothing was subtracted yet, so no balance change needed.

      return txUpdate;
    });

    await logAudit(req, { action: 'cancel', resource: 'transaction', resourceId: updated.id, description: 'Transaction annulée' });
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
router.get('/allocations', requirePermission('allocations', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { donorId, beneficiaryId, status } = req.query;

    const where: any = { associationId };
    if (donorId) where.donorId = String(donorId);
    if (beneficiaryId) where.beneficiaryId = String(beneficiaryId);

    const allocations = await prisma.donationAllocation.findMany({
      where,
      include: {
        donor: { select: { id: true, firstName: true, lastName: true, reference: true } },
        beneficiary: { select: { id: true, firstName: true, lastName: true, reference: true } },
        // `amount` est indispensable : la fiche bénéficiaire s'en sert pour
        // borner le montant à confirmer et pour activer le bouton
        // (BeneficiariesPage, modal « Confirmer la transaction »). Sans lui,
        // Number(undefined) → NaN → borne 0 → bouton désactivé à jamais.
        creditTransaction: { select: { id: true, date: true, receiptNumber: true, caisseId: true, status: true, amount: true } },
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
router.post('/allocations/:id/disburse', requirePermission('allocations', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    const disburseAmount = roundMoney(amount || Number(alloc.remainingAmount));
    if (disburseAmount <= 0 || disburseAmount > Number(alloc.remainingAmount)) {
      res.status(400).json({ error: 'المبلغ غير صالح' });
      return;
    }

    const creditTx = alloc.creditTransaction;
    if (!creditTx) {
      res.status(400).json({ error: 'Crédit associé introuvable' });
      return;
    }

    const result = await prisma.$transaction(async (prismaTx) => {
      // Débourser une allocation, c'est payer la promesse qu'elle porte : on
      // l'éteint donc du réservé, sinon le montant serait compté deux fois
      // (une fois comme réservé, une fois comme sortie) et tout déboursement
      // légitime serait refusé dès que la caisse ne contient que ces fonds.
      const eteint: ReservationEteinte = { allocationId: id };
      const comptes: CompteCible[] = [];
      if (creditTx.fundSource === 'caisse_physique') comptes.push({ caisseId: creditTx.caisseId });
      if (creditTx.bankAccountId) comptes.push({ bankAccountId: creditTx.bankAccountId });
      for (const compte of comptes) {
        const sortie = await verifierSortie(prismaTx, associationId, compte, disburseAmount, eteint);
        if (!sortie.autorise) {
          throw new Error('INSUFFICIENT_DISPONIBLE');
        }
      }

      // Contrôle du solde À L'INTÉRIEUR de la transaction : fait avant, la
      // valeur lue pouvait être périmée et deux déboursements concurrents
      // passaient tous deux le contrôle, produisant un solde négatif.
      if (creditTx.fundSource === 'caisse_physique') {
        const decCaisse = await prismaTx.caisse.updateMany({
          where: { id: creditTx.caisseId, associationId, balance: { gte: disburseAmount } },
          data: { balance: { decrement: disburseAmount } },
        });
        if (decCaisse.count === 0) {
          throw new Error('INSUFFICIENT_CAISSE_BALANCE');
        }
      }
      if (creditTx.bankAccountId) {
        const decBank = await prismaTx.bankAccount.updateMany({
          where: { id: creditTx.bankAccountId, associationId, balance: { gte: disburseAmount } },
          data: { balance: { decrement: disburseAmount } },
        });
        if (decBank.count === 0) {
          throw new Error('INSUFFICIENT_BANK_BALANCE');
        }
      }

      const ref = generateRef('BON');
      const debitTx = await prismaTx.transaction.create({
        data: {
          associationId,
          type: 'debit',
          amount: disburseAmount,
          amountInWords: `${disburseAmount} DZD`,
          fundSource: creditTx.fundSource,
          caisseId: creditTx.caisseId,
          subCategoryId: creditTx.subCategoryId,
          bankAccountId: creditTx.bankAccountId,
          beneficiaryId: alloc.beneficiaryId,
          description: creditTx.description,
          receiptNumber: ref,
          status: 'completed',
          date: new Date(),
        },
      });

      // Debit caisse — déjà fait par le compare-and-swap ci-dessus.

      // Update allocation
      const newRemaining = Math.max(0, roundMoney(Number(alloc.remainingAmount) - Number(disburseAmount)));
      await prismaTx.donationAllocation.update({
        where: { id },
        data: { remainingAmount: newRemaining, debitTransactionId: debitTx.id },
      });

      return { debitTx, remaining: newRemaining };
    });

    await logAudit(req, { action: 'create', resource: 'allocation', resourceId: result.debitTx?.id, description: 'Déboursement d’allocation' });
    res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_CAISSE_BALANCE') {
      res.status(400).json({ error: 'رصيد الصندوق غير كافٍ' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_BANK_BALANCE') {
      res.status(400).json({ error: 'رصيد الحساب البنكي غير كافٍ' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_DISPONIBLE') {
      res.status(400).json({
        error: 'رصيد غير كافٍ : المبلغ المتبقي مخصص لدعم معلّق',
      });
      return;
    }
    console.error('Error disbursing allocation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/finance/allocations/:id/distribute — link a debit transaction to an allocation
router.put('/allocations/:id/distribute', requirePermission('allocations', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    // `amount` alimente `remainingAmount` par soustraction, et cette colonne
    // est le « réservé » que `verifierSortie` retranche du solde disponible.
    // Un montant négatif faisait donc *augmenter* la réservation (remaining
    // − (−100) = +100), réduisant d'autant le disponible et bloquant des
    // dépenses légitimes. Un non-numérique ressortait à 0 via roundMoney.
    const distributeAmount = amount === undefined || amount === null
      ? Number(allocation.remainingAmount)
      : Number(amount);
    if (!Number.isFinite(distributeAmount) || distributeAmount < 0
        || distributeAmount > Number(allocation.remainingAmount)) {
      res.status(400).json({ error: 'المبلغ غير صالح' });
      return;
    }
    const newRemaining = roundMoney(Number(allocation.remainingAmount) - distributeAmount);

    const updated = await prisma.donationAllocation.update({
      where: { id },
      data: {
        debitTransactionId: debitTransactionId || undefined,
        remainingAmount: Math.max(0, newRemaining),
      },
    });

    await logAudit(req, { action: 'update', resource: 'allocation', resourceId: updated.id, description: 'Allocation distribuée' });
    res.json(updated);
  } catch (error) {
    console.error('Error distributing allocation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

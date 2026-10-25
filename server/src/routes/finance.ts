import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { generateRef } from '../lib/ref';
import { logAudit } from '../lib/audit';
import { roundMoney, moneyNumber } from '../lib/money';
import { resolveTransactionDate, localDay, startOfLocalDay, nextLocalDay } from '../lib/datePolicy';
import { verifierSortie, soldeDisponible, compteDuMouvement, type ReservationEteinte } from '../lib/solde';

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
      // Les bornes sont des jours calendaires locaux, pas des instants UTC :
      // `new Date('2026-10-20')` vaut minuit UTC, soit 01:00 en Algérie. Une
      // opération créée entre 23 h et minuit UTC porte le jour local suivant à
      // l'affichage, mais tombait alors hors du filtre de ce jour-là — absente
      // de son propre jour, et comptée la veille. On passe donc par
      // `startOfLocalDay`, qui est l'inverse exact de `localDay` utilisé pour
      // l'affichage.
      if (dateFrom) where.date.gte = startOfLocalDay(String(dateFrom));
      // `dateTo` est un jour entier, inclusif : la borne haute est le début du
      // jour local suivant, en exclu — une borne `lte` à minuit exclurait
      // toutes les opérations du jour même.
      if (dateTo) where.date.lt = startOfLocalDay(nextLocalDay(String(dateTo)));
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
        // `associationId` est indispensable : sans lui, une allocation d'une
        // autre association pointant vers l'une de ces transactions serait
        // fusionnée dans la réponse (cf. /allocations/:id/distribute).
        where: { debitTransactionId: { in: allocIds }, associationId },
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
      res.status(400).json({ code: 'AMOUNT_INVALID', error: 'Amount must be a number greater than zero' });
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

    // Portée multi-tenant des rattachements optionnels. `caisseId` est vérifié
    // juste au-dessus, mais les trois autres identifiants entrants ne
    // l'étaient pas : un `donorId`/`beneficiaryId` d'une AUTRE association
    // était accepté tel quel, et les écritures qui en découlent sortent du
    // périmètre du tenant — `donor.totalDonated` incrémenté chez le voisin,
    // reçu de don créé avec un donateur étranger, allocation rattachée à un
    // bénéficiaire qui n'est pas le sien. On refuse désormais franchement
    // plutôt que d'ignorer en silence : un identifiant fourni qui n'appartient
    // pas à l'association est une erreur d'appel, pas un champ absent.
    if (donorId) {
      const donor = await prisma.donor.findFirst({ where: { id: donorId, associationId }, select: { id: true } });
      if (!donor) {
        res.status(400).json({ error: 'Donor not found' });
        return;
      }
    }
    const benefId = beneficiaryId || allocatedBeneficiaryId;
    if (benefId) {
      const benef = await prisma.beneficiary.findFirst({ where: { id: benefId, associationId }, select: { id: true } });
      if (!benef) {
        res.status(400).json({ error: 'Beneficiary not found' });
        return;
      }
    }
    if (bankAccountId) {
      const banque = await prisma.bankAccount.findFirst({ where: { id: bankAccountId, associationId }, select: { id: true } });
      if (!banque) {
        res.status(400).json({ error: 'Bank account not found' });
        return;
      }
    }
    if (allocationId) {
      const alloc = await prisma.donationAllocation.findFirst({ where: { id: allocationId, associationId }, select: { id: true } });
      if (!alloc) {
        res.status(400).json({ error: 'Allocation not found' });
        return;
      }
    }

    // Compte réellement mouvementé par cette opération — un seul, jamais les
    // deux (voir `compteDuMouvement`). Pour un crédit bancaire le client envoie
    // AUSSI un `caisseId` (champ obligatoire de `Transaction`) : s'en servir
    // pour créditer la caisse faisait entrer le même argent deux fois, dans
    // deux comptes, et gonflait le total affiché.
    const compteMouvement = compteDuMouvement({ fundSource, caisseId, bankAccountId });
    if (!compteMouvement) {
      // `fundSource: 'banque'` sans compte bancaire : aucun solde à mouvoir.
      res.status(400).json({ error: 'Bank account is required for banque fund source' });
      return;
    }

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
        const sortie = await verifierSortie(
          tx,
          associationId,
          compteMouvement,
          numericAmount,
          allocationId ? { allocationId } : {},
        );
        if (!sortie.autorise) {
          throw new Error('INSUFFICIENT_DISPONIBLE');
        }

        // Débit conditionnel ATOMIQUE sur le compte réellement visé : le
        // `WHERE balance >= montant` fait vérifier et décrémenter par la base
        // en une seule instruction. Un compte bancaire crédite la banque, une
        // caisse physique décrémente la caisse — jamais les deux.
        const debitOk = compteMouvement.bankAccountId
          ? await tx.bankAccount.updateMany({
              where: { id: compteMouvement.bankAccountId, associationId, balance: { gte: numericAmount } },
              data: { balance: { decrement: numericAmount } },
            })
          : await tx.caisse.updateMany({
              where: { id: compteMouvement.caisseId!, associationId, balance: { gte: numericAmount } },
              data: { balance: { decrement: numericAmount } },
            });
        if (debitOk.count === 0) {
          throw new Error(
            compteMouvement.bankAccountId ? 'INSUFFICIENT_BANK_BALANCE' : 'INSUFFICIENT_CAISSE_BALANCE',
          );
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
      // CREDIT: money enters IMMEDIATELY (even pending)
      // because the donor has physically given the money.
      // =====================================================
      if (type === 'credit') {
        // INC/DEC sur le compte réellement mouvementé, et sur lui seul.
        // L'incrément conditionnel reprend le garde-fou du débit : si le compte
        // a disparu entre-temps (supprimé concurremment), l'écriture ne touche
        // zéro ligne et la transaction est annulée au lieu de créer un
        // mouvement sans contrepartie.
        const creditOk = compteMouvement.bankAccountId
          ? await tx.bankAccount.updateMany({
              where: { id: compteMouvement.bankAccountId, associationId },
              data: { balance: { increment: amountNum } },
            })
          : await tx.caisse.updateMany({
              where: { id: compteMouvement.caisseId!, associationId },
              data: { balance: { increment: amountNum } },
            });
        if (creditOk.count === 0) {
          throw new Error(
            compteMouvement.bankAccountId ? 'INSUFFICIENT_BANK_BALANCE' : 'INSUFFICIENT_CAISSE_BALANCE',
          );
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
      const allocBenefId = benefId;
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
      res.status(400).json({ code: 'INSUFFICIENT_CAISSE_BALANCE', error: 'Insufficient cash balance' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_BANK_BALANCE') {
      res.status(400).json({ code: 'INSUFFICIENT_BANK_BALANCE', error: 'Insufficient bank balance' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_DISPONIBLE') {
      res.status(400).json({
        code: 'INSUFFICIENT_DISPONIBLE',
        error: 'Insufficient available balance: the remaining amount is reserved for a pending disbursement',
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
      where: { id, associationId },
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

    await prisma.bankAccount.delete({ where: { id, associationId } });
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
      // Une transaction non « pending » est déjà réglée : la rejouer n'est pas
      // une opération idempotente ici — elle redébite le compte et recrée un
      // débit de libération. Constaté en recette : deux appels successifs sur
      // un crédit déjà confirmé produisaient DEUX débits sortis du compte avec
      // le même numéro de reçu, vidant la caisse. Une confirmation est un acte
      // unique ; pour poursuivre un déboursement partiel, la route dédiée est
      // POST /finance/allocations/:id/disburse.
      res.status(400).json({ error: 'Seules les transactions en attente peuvent être confirmées' });
      return;
    }

    const amountNum = moneyNumber(tx.amount);
    const confirmAmount = moneyNumber(req.body.amount !== undefined ? req.body.amount : amountNum);

    if (isNaN(confirmAmount) || confirmAmount <= 0 || confirmAmount > amountNum) {
      res.status(400).json({ code: 'AMOUNT_INVALID', error: 'Invalid amount' });
      return;
    }
    // Un crédit partiel (le bénéficiaire n'a reçu qu'une partie) doit être
    // libéré par le solde restant de la promesse, et non par le montant
    // d'origine lu sur la transaction — sinon on peut libérer deux fois le même
    // argent. La promesse fait foi de ce qui reste dû.
    let plafond = amountNum;
    if (tx.type === 'credit' && tx.beneficiaryId) {
      const alloc = await prisma.donationAllocation.findFirst({
        where: { creditTransactionId: tx.id, associationId },
        select: { remainingAmount: true },
      });
      if (alloc && Number(alloc.remainingAmount) > 0) {
        plafond = moneyNumber(alloc.remainingAmount);
        if (confirmAmount > plafond) {
          res.status(400).json({ code: 'AMOUNT_EXCEEDS_ALLOCATION', error: 'Amount exceeds the remaining allocation' });
          return;
        }
      }
    }

    // Une confirmation fait SORTIR de l'argent du compte mouvementé par
    // l'opération, et de lui seul (voir `compteDuMouvement`) :
    //   - un débit confirmé : l'argent part au bénéficiaire ;
    //   - un crédit AVEC bénéficiaire : la confirmation crée le débit de
    //     libération plus bas, donc l'argent sort aussi.
    // Le crédit bancaire débitait malgré tout la CAISSE (décrément
    // inconditionnel) en plus du compte bancaire : la caisse se vidait d'un
    // argent qu'elle n'avait jamais reçu, jusqu'à devenir négative.
    const isOutflow = tx.type === 'debit' || (tx.type === 'credit' && !!tx.beneficiaryId);
    const compteMouvement = compteDuMouvement({
      fundSource: tx.fundSource,
      caisseId: tx.caisseId,
      bankAccountId: tx.bankAccountId,
    });

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

        // Le compte réellement débité par le compare-and-swap ci-dessous : un
        // seul. En lister deux (caisse + banque) refusait une sortie bancaire
        // légitime dont la caisse, non mouvementée, était à sec — et
        // l'inverse.
        if (compteMouvement) {
          const sortie = await verifierSortie(prismaTx, associationId, compteMouvement, confirmAmount, eteint);
          if (!sortie.autorise) {
            throw new Error('INSUFFICIENT_DISPONIBLE');
          }
        }

        if (!compteMouvement) {
          throw new Error('INSUFFICIENT_DISPONIBLE');
        }

        const debitOk = compteMouvement.bankAccountId
          ? await prismaTx.bankAccount.updateMany({
              where: { id: compteMouvement.bankAccountId, associationId, balance: { gte: confirmAmount } },
              data: { balance: { decrement: confirmAmount } },
            })
          : await prismaTx.caisse.updateMany({
              where: { id: compteMouvement.caisseId!, associationId, balance: { gte: confirmAmount } },
              data: { balance: { decrement: confirmAmount } },
            });
        if (debitOk.count === 0) {
          throw new Error(
            compteMouvement.bankAccountId ? 'INSUFFICIENT_BANK_BALANCE' : 'INSUFFICIENT_CAISSE_BALANCE',
          );
        }
      }

      // Update status
      const updated = await prismaTx.transaction.update({
        where: { id, associationId },
        data: { status: 'completed', updatedBy: req.user!.userId },
      });

      // =====================================================
      // DEBIT CONFIRMATION: Now the money physically leaves
      // the caisse/bank
      // =====================================================
      if (tx.type === 'debit') {
        // Le solde a déjà été débité par le compare-and-swap ci-dessus.
        const debitAlloc = await prismaTx.donationAllocation.findFirst({
          // `tx.id` est déjà vérifié comme nôtre (681), mais l'allocation qui
          // pointe vers lui ne l'était pas : une FK héritée d'une autre
          // association faisait modifier *son* remainingAmount (cf. /distribute).
          where: { debitTransactionId: tx.id, associationId },
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
          where: { transactionId: tx.id, associationId },
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
          where: { creditTransactionId: tx.id, associationId },
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
      res.status(400).json({ code: 'INSUFFICIENT_CAISSE_BALANCE', error: 'Insufficient cash balance to complete this transaction' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_BANK_BALANCE') {
      res.status(400).json({ code: 'INSUFFICIENT_BANK_BALANCE', error: 'Insufficient bank balance to confirm' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_DISPONIBLE') {
      res.status(400).json({
        code: 'INSUFFICIENT_DISPONIBLE',
        error: 'Insufficient available balance: the remaining amount is reserved for a pending disbursement',
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
        where: { id, associationId },
        data: { status: 'cancelled', updatedBy: req.user!.userId },
      });

      const amountNum = moneyNumber(tx.amount);

      // If a pending CREDIT is cancelled, we must subtract the money that entered
      if (tx.type === 'credit') {
        // Décrément sur le compte réellement crédité, et sur lui seul. Le
        // décrément était inconditionnel sur la caisse ET sur la banque : le
        // crédit bancaire retirait donc de la caisse un argent qu'elle n'avait
        // jamais reçu, la faisant passer en négatif. Le garde-fou `gte` ferme
        // en plus la course avec un retrait concurrent.
        const compte = compteDuMouvement({
          fundSource: tx.fundSource,
          caisseId: tx.caisseId,
          bankAccountId: tx.bankAccountId,
        });
        if (compte) {
          const annule = compte.bankAccountId
            ? await prismaTx.bankAccount.updateMany({
                where: { id: compte.bankAccountId, associationId, balance: { gte: amountNum } },
                data: { balance: { decrement: amountNum } },
              })
            : await prismaTx.caisse.updateMany({
                where: { id: compte.caisseId!, associationId, balance: { gte: amountNum } },
                data: { balance: { decrement: amountNum } },
              });
          if (annule.count === 0) {
            // Les fonds reçus ont déjà été engagés ailleurs : annuler
            // creuserait le compte. On refuse, la transaction reste en attente.
            // Le code d'erreur suit le compte réellement débité, sinon le
            // message parle de caisse pour une opération bancaire.
            throw new Error(
              compte.bankAccountId ? 'INSUFFICIENT_BANK_BALANCE' : 'INSUFFICIENT_CAISSE_BALANCE',
            );
          }
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
          where: { creditTransactionId: id, associationId },
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
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_CAISSE_BALANCE') {
      res.status(400).json({
        code: 'CANCEL_AMOUNT_ALREADY_USED',
        error: 'Cannot cancel: the received amount has been used or committed',
      });
      return;
    }
    if (error?.message === 'INSUFFICIENT_BANK_BALANCE') {
      res.status(400).json({ code: 'INSUFFICIENT_BANK_BALANCE', error: 'Insufficient bank balance to cancel' });
      return;
    }
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
      res.status(400).json({ code: 'AMOUNT_INVALID', error: 'Invalid amount' });
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
      // Un déboursement sort du compte qui a reçu le don : celui de la
      // transaction de crédit, et lui seul.
      const compte = compteDuMouvement({
        fundSource: creditTx.fundSource,
        caisseId: creditTx.caisseId,
        bankAccountId: creditTx.bankAccountId,
      });
      if (!compte) {
        throw new Error('INSUFFICIENT_DISPONIBLE');
      }
      const sortie = await verifierSortie(prismaTx, associationId, compte, disburseAmount, eteint);
      if (!sortie.autorise) {
        throw new Error('INSUFFICIENT_DISPONIBLE');
      }

      // Contrôle du solde À L'INTÉRIEUR de la transaction : fait avant, la
      // valeur lue pouvait être périmée et deux déboursements concurrents
      // passaient tous deux le contrôle, produisant un solde négatif.
      const decOk = compte.bankAccountId
        ? await prismaTx.bankAccount.updateMany({
            where: { id: compte.bankAccountId, associationId, balance: { gte: disburseAmount } },
            data: { balance: { decrement: disburseAmount } },
          })
        : await prismaTx.caisse.updateMany({
            where: { id: compte.caisseId!, associationId, balance: { gte: disburseAmount } },
            data: { balance: { decrement: disburseAmount } },
          });
      if (decOk.count === 0) {
        throw new Error(compte.bankAccountId ? 'INSUFFICIENT_BANK_BALANCE' : 'INSUFFICIENT_CAISSE_BALANCE');
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
        where: { id, associationId },
        data: { remainingAmount: newRemaining, debitTransactionId: debitTx.id },
      });

      return { debitTx, remaining: newRemaining };
    });

    await logAudit(req, { action: 'create', resource: 'allocation', resourceId: result.debitTx?.id, description: 'Déboursement d’allocation' });
    res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_CAISSE_BALANCE') {
      res.status(400).json({ code: 'INSUFFICIENT_CAISSE_BALANCE', error: 'Insufficient cash balance' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_BANK_BALANCE') {
      res.status(400).json({ code: 'INSUFFICIENT_BANK_BALANCE', error: 'Insufficient bank account balance' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_DISPONIBLE') {
      res.status(400).json({
        code: 'INSUFFICIENT_DISPONIBLE',
        error: 'Insufficient available balance: the remaining amount is reserved for a pending disbursement',
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
      res.status(400).json({ code: 'AMOUNT_INVALID', error: 'Invalid amount' });
      return;
    }
    const newRemaining = roundMoney(Number(allocation.remainingAmount) - distributeAmount);

    // `debitTransactionId` est écrit tel quel dans une clé étrangère : sans ce
    // contrôle, on pouvait le pointer vers une transaction d'une autre
    // association. `GET /allocations` renvoie ensuite `debitTransaction`
    // (receiptNumber, date) — soit une lecture inter-tenant — et
    // `GET /transactions` du voisin se retrouvait contaminé en retour.
    if (debitTransactionId) {
      const debitTx = await prisma.transaction.findFirst({
        where: { id: debitTransactionId, associationId, type: 'debit' },
        select: { id: true },
      });
      if (!debitTx) {
        res.status(400).json({ error: 'Debit transaction not found' });
        return;
      }
    }

    const updated = await prisma.donationAllocation.updateMany({
      where: { id, associationId },
      data: {
        debitTransactionId: debitTransactionId || undefined,
        remainingAmount: Math.max(0, newRemaining),
      },
    });

    if (updated.count !== 1) {
      res.status(404).json({ error: 'Allocation not found' });
      return;
    }

    await logAudit(req, { action: 'update', resource: 'allocation', resourceId: id, description: 'Allocation distribuée' });
    // `updateMany` ne renvoie pas la ligne : on relit l'allocation scopée.
    const refreshed = await prisma.donationAllocation.findFirst({ where: { id, associationId } });
    res.json(refreshed);
  } catch (error) {
    console.error('Error distributing allocation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

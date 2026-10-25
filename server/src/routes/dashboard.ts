import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { roundMoney } from '../lib/money';
import { masquerRelationsListe } from '../lib/tenant';

const router = Router();

router.use(requireAuth);

// GET /api/dashboard — aggregate stats
router.get('/', requirePermission('dashboard', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    // Données financières visibles par admin, super_admin et trésorier
    const canViewFinance = ['admin', 'super_admin', 'treasurer'].includes(req.user!.role);

    // Always-available counts
    const totalBeneficiaries = await prisma.beneficiary.count({
      where: { associationId },
    });

    const totalDonors = await prisma.donor.count({
      where: { associationId },
    });

    const totalArticles = await prisma.article.count({
      where: { associationId },
    });

    const activeLoans = await prisma.loan.count({
      where: { associationId, status: { in: ['en_cours', 'partiellement_retourne'] } },
    });

    // Financial data — only for admins
    let totalBankBalance = 0;
    let totalCashBalance = 0;
    let caissesBalances: { id: string; name: string; balance: any }[] = [];
    let recentTransactions: any[] = [];

    if (canViewFinance) {
      const bankAccounts = await prisma.bankAccount.findMany({
        where: { associationId },
      });

      const caisses = await prisma.caisse.findMany({
        where: { associationId },
      });

      totalBankBalance = roundMoney(bankAccounts.reduce((sum, acc) => Number(sum) + Number(acc.balance), 0));
      totalCashBalance = roundMoney(caisses.reduce((sum, c) => Number(sum) + Number(c.balance), 0));

      caissesBalances = caisses.map((c) => ({
        id: c.id,
        name: c.name,
        balance: c.balance,
      }));

      recentTransactions = await prisma.transaction.findMany({
        where: { associationId },
        include: { caisse: true, donor: true, beneficiary: true },
        orderBy: { date: 'desc' },
        take: 10,
      });

      // Les trois relations ci-dessus ne portent aucune contrainte : la
      // transaction racine est bien filtrée, mais `caisseId`/`donorId`/
      // `beneficiaryId` pouvaient être écrits sans contrôle d'appartenance avant
      // f2d90e4. Sur un tableau de bord la fuite serait directe — un donateur
      // d'une autre association apparaîtrait dans « dernières transactions ».
      recentTransactions = masquerRelationsListe(
        recentTransactions as any[],
        associationId,
        ['caisse', 'donor', 'beneficiary'],
      );



    }

    res.json({
      totalBankBalance,
      totalCashBalance,
      totalBeneficiaries,
      totalDonors,
      totalArticles,
      activeLoans,
      caissesBalances,
      recentTransactions,
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

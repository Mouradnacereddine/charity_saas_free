import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/dashboard — aggregate stats
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const isAdmin = req.user!.role === 'admin';

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
    let caissesBalances: { id: string; name: string; nameAr: string; balance: number }[] = [];
    let recentTransactions: any[] = [];

    if (isAdmin) {
      const bankAccounts = await prisma.bankAccount.findMany({
        where: { associationId },
      });

      const caisses = await prisma.caisse.findMany({
        where: { associationId },
      });

      totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
      totalCashBalance = caisses.reduce((sum, c) => sum + c.balance, 0);

      caissesBalances = caisses.map((c) => ({
        id: c.id,
        name: c.name,
        nameAr: c.nameAr,
        balance: c.balance,
      }));

      recentTransactions = await prisma.transaction.findMany({
        where: { associationId },
        include: { caisse: true, donor: true, beneficiary: true },
        orderBy: { date: 'desc' },
        take: 10,
      });
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

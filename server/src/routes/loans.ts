import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/loans — list
router.get('/', requirePermission('loans', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { status, beneficiaryId } = req.query;

    const where: any = { associationId };

    if (status) where.status = String(status);
    if (beneficiaryId) where.beneficiaryId = String(beneficiaryId);

    const loans = await prisma.loan.findMany({
      where,
      include: { beneficiary: true },
      orderBy: { createdAt: 'desc' },
    });

    // Enrichir les items avec les noms, références et catégories d'articles depuis la base
    const allArticles = await prisma.article.findMany({
      where: { associationId },
      select: {
        id: true, name: true, reference: true,
        category: { select: { id: true, name: true } },
      },
    });
    const articleMap = new Map(allArticles.map((a) => [a.id, a]));

    const result = loans.map((l: any) => ({
      ...l,
      items: (l.items as any[] || []).map((item: any) => {
        const article = articleMap.get(item.articleId);
        return {
          ...item,
          articleName: article?.name || '',
          articleReference: article?.reference || '',
          categoryName: article?.category?.name || '',
        };
      }),
      beneficiaryName: l.beneficiary ? `${l.beneficiary.firstName} ${l.beneficiary.lastName}` : '',
      beneficiaryReference: l.beneficiary?.reference || '',
    }));

    res.json(result);
  } catch (error) {
    console.error('Error listing loans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/loans — create
router.post('/', requirePermission('loans', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      reference, beneficiaryId, items, loanDate,
      expectedReturnDate, notes,
    } = req.body;

    if (!reference || !beneficiaryId || !items || !loanDate) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Verify beneficiary belongs to association
    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, associationId },
    });

    if (!beneficiary) {
      res.status(400).json({ error: 'Beneficiary not found' });
      return;
    }

    // Verify items exist and update available quantities
    // Chaque ligne d'item reçoit un identifiant d'occurrence unique (source de vérité).
const loanItems: any[] = (items as any[]).map((item: any) => ({
  ...item,
  itemKey: crypto.randomUUID(),
}));
    for (const item of loanItems) {
      const article = await prisma.article.findFirst({
        where: { id: item.articleId, associationId },
      });

      if (!article) {
        res.status(400).json({ error: `Article ${item.articleId} not found` });
        return;
      }

      if (article.availableQuantity < item.quantity) {
        res.status(400).json({ error: `Insufficient quantity for article ${article.name}` });
        return;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          associationId,
          reference,
          beneficiaryId,
          items: loanItems,
          loanDate: new Date(loanDate),
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          notes,
        },
      });

      // Decrease available quantities
      for (const item of loanItems) {
        await tx.article.update({
          where: { id: item.articleId },
          data: { availableQuantity: { decrement: item.quantity } },
        });
      }

      return loan;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/loans/:id
router.get('/:id', requirePermission('loans', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const loan = await prisma.loan.findFirst({
      where: { id, associationId },
      include: { beneficiary: true },
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    const articles = await prisma.article.findMany({
      where: { associationId },
      select: { id: true, name: true, reference: true, category: { select: { name: true } } },
    });
    const articleMap = new Map(articles.map((a) => [a.id, a]));

    const result = {
      ...loan,
      items: ((loan.items as any[]) || []).map((item: any) => {
        const article = articleMap.get(item.articleId);
        return {
          ...item,
          articleName: article?.name || item.articleName || '',
          articleReference: article?.reference || item.articleReference || '',
          categoryName: article?.category?.name || item.categoryName || '',
        };
      }),
      beneficiaryName: loan.beneficiary ? `${(loan.beneficiary as any).firstName} ${(loan.beneficiary as any).lastName}` : '',
      beneficiaryReference: (loan.beneficiary as any)?.reference || '',
    };

    res.json(result);
  } catch (error) {
    console.error('Error getting loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/loans/:id — update
router.put('/:id', requirePermission('loans', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    const {
      reference, beneficiaryId, items, status,
      loanDate, expectedReturnDate, actualReturnDate, notes,
    } = req.body;

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (beneficiaryId !== undefined) data.beneficiaryId = beneficiaryId;
    if (items !== undefined) {
      // Garantir un itemKey sur chaque ligne reçue (protection contre la perte des clés)
      data.items = (items as any[]).map((i: any) => ({
        ...i,
        itemKey: i.itemKey ?? crypto.randomUUID(),
      }));
    }
    if (status !== undefined) {
      const validLoanStatuses = ['en_cours', 'retourne', 'partiellement_retourne', 'definitif'];
      if (!validLoanStatuses.includes(status)) {
        res.status(400).json({ error: 'حالة الإعارة غير صالحة' });
        return;
      }
      data.status = status;
    }
    if (loanDate !== undefined) data.loanDate = new Date(loanDate);
    if (expectedReturnDate !== undefined) data.expectedReturnDate = expectedReturnDate ? new Date(expectedReturnDate) : null;
    if (actualReturnDate !== undefined) data.actualReturnDate = actualReturnDate ? new Date(actualReturnDate) : null;
    if (notes !== undefined) data.notes = notes;

    const loan = await prisma.loan.update({
      where: { id },
      data,
    });

    res.json(loan);
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/loans/:id
router.delete('/:id', requirePermission('loans', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    // Restore available quantities before deleting
    const items = existing.items as any[];
    for (const item of items) {
      await prisma.article.update({
        where: { id: item.articleId },
        data: { availableQuantity: { increment: item.quantity } },
      });
    }

    await prisma.loan.delete({ where: { id } });
    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('Error deleting loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/loans/:id/return — partial item returns
router.post('/:id/return', requirePermission('loans', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Items array is required' });
      return;
    }

    const loan = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    if (loan.status === 'retourne' || loan.status === 'definitif') {
      res.status(400).json({ error: 'Loan is already closed' });
      return;
    }

    const currentItems: any[] = loan.items as any[];

    const result = await prisma.$transaction(async (tx) => {
      // Process each returned item
      for (const returnItem of items) {
        const { itemKey, articleId, quantity, condition } = returnItem;
        const key = itemKey || articleId;

        // Find the matching item in the loan — par itemKey (occurrence précise),
        // avec fallback articleId pour les prêts legacy sans itemKey.
        const loanItem = key
          ? currentItems.find((i: any) => i.itemKey === key) ||
            currentItems.find((i: any) => !i.itemKey && i.articleId === key)
          : undefined;
        if (!loanItem) {
          throw new Error(`Article ${key} not found in loan`);
        }

        // Update returned quantity
        const returnedQty = quantity || loanItem.quantity;
        loanItem.returnedQuantity = (loanItem.returnedQuantity || 0) + returnedQty;
        if (condition) loanItem.conditionOnReturn = condition;

        // Restore available quantity (utilise l'article de la ligne ciblée)
        await tx.article.update({
          where: { id: loanItem.articleId },
          data: { availableQuantity: { increment: returnedQty } },
        });
      }

      // Determine new status
      const allReturned = currentItems.every(
        (i: any) => (i.returnedQuantity || 0) >= i.quantity
      );
      const someReturned = currentItems.some(
        (i: any) => (i.returnedQuantity || 0) > 0
      );

      let newStatus = loan.status;
      if (allReturned) {
        newStatus = 'definitif';
      } else if (someReturned) {
        newStatus = 'partiellement_retourne';
      }

      const updatedLoan = await tx.loan.update({
        where: { id },
        data: {
          items: currentItems,
          status: newStatus,
          actualReturnDate: allReturned ? new Date() : undefined,
        },
      });

      return updatedLoan;
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error processing loan return:', error);
    if (error.message?.startsWith('Article')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/loans/:id/add-item — add item to existing loan
router.post('/:id/add-item', requirePermission('loans', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;
    const {
      articleId, quantity,
      articleName, categoryName, conditionOnLoan, returnedQuantity, expectedReturnDate,
    } = req.body;

    if (!articleId || !quantity) {
      res.status(400).json({ error: 'articleId and quantity are required' });
      return;
    }

    const loan = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    if (loan.status === 'retourne' || loan.status === 'definitif') {
      res.status(400).json({ error: 'Loan is already closed' });
      return;
    }

    // Verify article exists and has enough quantity
    const article = await prisma.article.findFirst({
      where: { id: articleId, associationId },
    });

    if (!article) {
      res.status(400).json({ error: 'Article not found' });
      return;
    }

    if (article.availableQuantity < quantity) {
      res.status(400).json({ error: `Insufficient quantity for article ${article.name}` });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentItems: any[] = loan.items as any[];
      const newQty = parseInt(quantity, 10);
      const newDate = expectedReturnDate ? String(expectedReturnDate) : undefined;

      // Philosophie: chaque occurrence d'un article est une ligne distincte.
      // Deux ajouts du MÊME article ne fusionnent que s'ils portent la MÊME
      // date de retour prévue (ou si les deux n'en ont pas). Avec des dates
      // différentes → deux lignes séparées (échéances indépendantes).
      const matchIndex = currentItems.findIndex((i: any) => {
        if (i.articleId !== articleId) return false;
        const itemDate = i.expectedReturnDate ? String(i.expectedReturnDate) : undefined;
        return itemDate === newDate;
      });

      if (matchIndex >= 0) {
        // Fusion sur la même occurrence (même article + même date) : on somme
        // et on rafraîchit les attributs clients sans écraser la date existante.
        currentItems[matchIndex].quantity += newQty;
        if (articleName !== undefined) currentItems[matchIndex].articleName = articleName;
        if (categoryName !== undefined) currentItems[matchIndex].categoryName = categoryName;
        if (conditionOnLoan !== undefined) currentItems[matchIndex].conditionOnLoan = conditionOnLoan;
        // Si l'utilisateur fournit une date sur une ligne sans date, on l'applique ;
        // sinon on garde la date existante (refus d'écraser une échéance).
        if (newDate !== undefined) currentItems[matchIndex].expectedReturnDate = newDate;
      } else {
        // Nouvelle occurrence → nouvel identifiant de ligne unique.
        currentItems.push({
          itemKey: crypto.randomUUID(),
          articleId,
          articleName,
          categoryName,
          quantity: newQty,
          returnedQuantity: returnedQuantity ?? 0,
          conditionOnLoan,
          expectedReturnDate: newDate,
        });
      }

      await tx.article.update({
        where: { id: articleId },
        data: { availableQuantity: { decrement: parseInt(quantity, 10) } },
      });

      const updatedLoan = await tx.loan.update({
        where: { id },
        data: { items: currentItems },
      });

      return updatedLoan;
    });

    res.json(result);
  } catch (error) {
    console.error('Error adding item to loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/loans/:id/remove-item/:itemKey — remove one occurrence (line) from loan
router.delete('/:id/remove-item/:itemKey', requirePermission('loans', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, itemKey } = req.params;
    const associationId = req.user!.associationId;

    const loan = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    if (loan.status === 'retourne' || loan.status === 'definitif') {
      res.status(400).json({ error: 'Loan is already closed' });
      return;
    }

    const currentItems: any[] = loan.items as any[];
    // Cible une occurrence précise (itemKey) ; fallback articleId pour prêts legacy.
    const itemIndex = currentItems.findIndex(
      (i: any) => i.itemKey === itemKey || (!i.itemKey && i.articleId === itemKey)
    );

    if (itemIndex < 0) {
      res.status(404).json({ error: 'Item not found in loan' });
      return;
    }

    const removedItem = currentItems[itemIndex];

    const result = await prisma.$transaction(async (tx) => {
      const remainingQuantity = removedItem.quantity - (removedItem.returnedQuantity || 0);
      if (remainingQuantity > 0) {
        await tx.article.update({
          where: { id: removedItem.articleId },
          data: { availableQuantity: { increment: remainingQuantity } },
        });
      }

      currentItems.splice(itemIndex, 1);

      const updatedLoan = await tx.loan.update({
        where: { id },
        data: { items: currentItems },
      });

      return updatedLoan;
    });

    res.json(result);
  } catch (error) {
    console.error('Error removing item from loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/loans/:id/mark-definitive
router.put('/:id/mark-definitive', requirePermission('loans', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const loan = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    if (loan.status === 'definitif') {
      res.status(400).json({ error: 'Loan is already marked as definitive' });
      return;
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        status: 'definitif',
        actualReturnDate: new Date(),
      },
    });

    res.json(updatedLoan);
  } catch (error) {
    console.error('Error marking loan as definitive:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

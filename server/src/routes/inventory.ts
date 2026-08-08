import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { generateRef } from '../lib/ref';

const router = Router();

router.use(requireAuth);

// ========================================================================
// ARTICLES
// ========================================================================

// GET /api/inventory/articles — list articles
router.get('/articles', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { search, categoryId, storageLocationId, status } = req.query;

    const where: any = { associationId };

    if (search) {
      const term = String(search);
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = String(categoryId);
    if (storageLocationId) where.storageLocationId = String(storageLocationId);
    if (status) where.status = String(status);

    const articles = await prisma.article.findMany({
      where,
      include: { category: true, storageLocation: true, statusModel: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(articles);
  } catch (error) {
    console.error('Error listing articles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/articles — create
router.post('/articles', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      reference, name, description,
      categoryId, category, quantity, storageLocationId, storageLocation,
      notes, status, statusId,
    } = req.body;

    const resolvedCategoryId = categoryId || category;
    const resolvedStorageLocationId = storageLocationId || storageLocation;

    if (!name || !resolvedCategoryId || quantity === undefined || !resolvedStorageLocationId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const validStatuses = ['disponible', 'prete', 'endommage', 'hors_service'];
    const finalStatus = status || 'disponible';
    if (!validStatuses.includes(finalStatus)) {
      res.status(400).json({ error: `الحالة غير صالحة. القيم المسموحة: ${validStatuses.join(', ')}` });
      return;
    }

    // Auto-generate reference if not provided
    const ref = reference || generateRef('ART');

    // Resolve isPermanent from the selected custom status
    let isPermanentValue = false;
    if (statusId) {
      const statusType = await prisma.articleStatusType.findFirst({
        where: { id: statusId, associationId },
      });
      if (statusType) {
        isPermanentValue = statusType.isPermanent;
      }
    }

    const article = await prisma.article.create({
      data: {
        associationId,
        reference: ref,
        name,
        description,
        categoryId: resolvedCategoryId,
        quantity: parseInt(quantity, 10),
        availableQuantity: parseInt(quantity, 10),
        storageLocationId: resolvedStorageLocationId,
        isPermanent: isPermanentValue,
        notes,
        status: finalStatus,
        statusId: statusId || undefined,
      },
    });

    res.status(201).json(article);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/articles/:id
router.get('/articles/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const article = await prisma.article.findFirst({
      where: { id, associationId },
      include: { category: true, storageLocation: true, statusModel: true },
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json(article);
  } catch (error) {
    console.error('Error getting article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/inventory/articles/:id
router.put('/articles/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.article.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    const {
      reference, name, description,
      categoryId, category, quantity, availableQuantity, status, statusId,
      storageLocationId, storageLocation, isPermanent, notes,
    } = req.body;

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (category !== undefined) data.categoryId = category;
    if (quantity !== undefined) {
      const newQty = parseInt(quantity, 10);
      const oldQty = existing.quantity;
      data.quantity = newQty;
      // If availableQuantity is not explicitly provided, adjust it by the same delta as quantity
      if (availableQuantity === undefined) {
        data.availableQuantity = Math.max(0, existing.availableQuantity + (newQty - oldQty));
      }
    }
    if (availableQuantity !== undefined) data.availableQuantity = parseInt(availableQuantity, 10);
    if (status !== undefined) data.status = status;
    if (statusId !== undefined) {
      data.statusId = statusId;
      // Auto-resolve isPermanent from the selected custom status
      if (statusId) {
        const statusType = await prisma.articleStatusType.findFirst({
          where: { id: statusId, associationId },
        });
        if (statusType) {
          data.isPermanent = statusType.isPermanent;
        }
      } else {
        data.isPermanent = false;
      }
    }
    if (storageLocationId !== undefined) data.storageLocationId = storageLocationId;
    if (storageLocation !== undefined) data.storageLocationId = storageLocation;
    if (isPermanent !== undefined) data.isPermanent = isPermanent;
    if (notes !== undefined) data.notes = notes;

    const article = await prisma.article.update({
      where: { id },
      data,
    });

    res.json(article);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/articles/:id
router.delete('/articles/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.article.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    // Check if article is referenced in any active loans
    const activeLoans = await prisma.loan.findMany({
      where: {
        associationId,
        status: { in: ['en_cours', 'partiellement_retourne'] },
      },
    });

    const isReferenced = activeLoans.some((loan) => {
      const items = loan.items as any[];
      return items.some((item) => item.articleId === id);
    });

    if (isReferenced) {
      res.status(400).json({ error: 'لا يمكن حذف هذا المقال لأنه مرتبط بإعارات نشطة' });
      return;
    }

    await prisma.article.delete({ where: { id } });
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================================================
// ARTICLE CATEGORIES
// ========================================================================

// GET /api/inventory/article-categories
router.get('/article-categories', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const categories = await prisma.articleCategory.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(categories);
  } catch (error) {
    console.error('Error listing article categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/article-categories
router.post('/article-categories', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    const category = await prisma.articleCategory.create({
      data: { associationId, name },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating article category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/inventory/article-categories/:id
router.put('/article-categories/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.articleCategory.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Article category not found' });
      return;
    }

    const { name } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;

    const category = await prisma.articleCategory.update({
      where: { id },
      data,
    });

    res.json(category);
  } catch (error) {
    console.error('Error updating article category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/article-categories/:id
router.delete('/article-categories/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.articleCategory.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Article category not found' });
      return;
    }

    // Unset this category on all articles that reference it
    await prisma.article.updateMany({
      where: { categoryId: id, associationId },
      data: { categoryId: null },
    });
    await prisma.articleCategory.delete({ where: { id } });
    res.json({ message: 'Article category deleted successfully' });
  } catch (error) {
    console.error('Error deleting article category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================================================
// STORAGE LOCATIONS
// ========================================================================

// GET /api/inventory/storage-locations
router.get('/storage-locations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const locations = await prisma.storageLocation.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(locations);
  } catch (error) {
    console.error('Error listing storage locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/storage-locations
router.post('/storage-locations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    const location = await prisma.storageLocation.create({
      data: { associationId, name },
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Error creating storage location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/inventory/storage-locations/:id
router.put('/storage-locations/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.storageLocation.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Storage location not found' });
      return;
    }

    const { name } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;

    const location = await prisma.storageLocation.update({
      where: { id },
      data,
    });

    res.json(location);
  } catch (error) {
    console.error('Error updating storage location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/storage-locations/:id
router.delete('/storage-locations/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.storageLocation.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Storage location not found' });
      return;
    }

    // Unset this location on all articles that reference it
    await prisma.article.updateMany({
      where: { storageLocationId: id, associationId },
      data: { storageLocationId: null },
    });
    await prisma.storageLocation.delete({ where: { id } });
    res.json({ message: 'Storage location deleted successfully' });
  } catch (error) {
    console.error('Error deleting storage location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================================================
// SCHOOL GRADES
// ========================================================================

// GET /api/inventory/school-grades
router.get('/school-grades', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const grades = await prisma.schoolGrade.findMany({
      where: { associationId },
      orderBy: { name: 'asc' },
    });

    res.json(grades);
  } catch (error) {
    console.error('Error listing school grades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/school-grades
router.post('/school-grades', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const grade = await prisma.schoolGrade.create({
      data: {
        associationId,
        name,
        createdAt: new Date(),
      },
    });

    res.status(201).json(grade);
  } catch (error) {
    console.error('Error creating school grade:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/inventory/school-grades/:id
router.put('/school-grades/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.schoolGrade.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'School grade not found' });
      return;
    }

    const { name } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;

    const grade = await prisma.schoolGrade.update({
      where: { id },
      data,
    });

    res.json(grade);
  } catch (error) {
    console.error('Error updating school grade:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/school-grades/:id
router.delete('/school-grades/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.schoolGrade.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'School grade not found' });
      return;
    }

    await prisma.schoolGrade.delete({ where: { id } });
    res.json({ message: 'School grade deleted successfully' });
  } catch (error) {
    console.error('Error deleting school grade:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================================================
// ARTICLE STATUSES
// ========================================================================

// GET /api/inventory/article-statuses
router.get('/article-statuses', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const statuses = await prisma.articleStatusType.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(statuses);
  } catch (error) {
    console.error('Error listing article statuses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/article-statuses
router.post('/article-statuses', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { name, description, isPermanent } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    const status = await prisma.articleStatusType.create({
      data: { associationId, name, description, isPermanent: isPermanent ?? false },
    });

    res.status(201).json(status);
  } catch (error) {
    console.error('Error creating article status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/inventory/article-statuses/:id
router.put('/article-statuses/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.articleStatusType.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Article status not found' });
      return;
    }

    const { name, description, isPermanent } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (isPermanent !== undefined) data.isPermanent = isPermanent;

    const status = await prisma.articleStatusType.update({
      where: { id },
      data,
    });

    // If isPermanent was updated, sync all articles linked to this status
    if (isPermanent !== undefined) {
      await prisma.article.updateMany({
        where: { statusId: id, associationId },
        data: { isPermanent },
      });
    }

    res.json(status);
  } catch (error) {
    console.error('Error updating article status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/article-statuses/:id
router.delete('/article-statuses/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.articleStatusType.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Article status not found' });
      return;
    }

    // Unset this status on all articles that reference it
    await prisma.article.updateMany({
      where: { statusId: id, associationId },
      data: { statusId: null, status: 'disponible' },
    });
    await prisma.articleStatusType.delete({ where: { id } });
    res.json({ message: 'Article status deleted successfully' });
  } catch (error) {
    console.error('Error deleting article status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================================================
// STOCK TAKES (Inventaire / جرد المخزون)
// ========================================================================
//
// Une session d'inventaire fige un instantané du stock DISPONIBLE
// (availableQuantity) de tous les articles. L'opérateur saisit les
// quantités réellement comptées ; à la validation, seule la quantité
// disponible est ajustée par delta (jamais la quantité totale `quantity`,
// jamais les prêts en cours).

// POST /api/inventory/stock-takes — create session (snapshot)
router.post('/stock-takes', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { notes } = req.body;

    const articles = await prisma.article.findMany({
      where: { associationId },
      select: {
        id: true,
        reference: true,
        name: true,
        availableQuantity: true,
        status: true,
        category: { select: { id: true, name: true } },
        storageLocation: { select: { id: true, name: true } },
      },
    });

    if (articles.length === 0) {
      res.status(400).json({ error: 'لا توجد مقالات للجرد' });
      return;
    }

    const items = articles.map((a) => ({
      articleId: a.id,
      articleReference: a.reference,
      articleName: a.name,
      categoryId: a.category?.id || null,
      categoryName: a.category?.name || '',
      storageLocationId: a.storageLocation?.id || null,
      storageName: a.storageLocation?.name || '',
      theoretical: a.availableQuantity,
      counted: null,
      diff: null,
      status: a.status,
    }));

    const stockTake = await prisma.stockTake.create({
      data: {
        associationId,
        reference: generateRef('STK'),
        items,
        notes: notes || null,
      },
    });

    res.status(201).json(stockTake);
  } catch (error) {
    console.error('Error creating stock take:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/stock-takes — list sessions (summary, no items payload)
router.get('/stock-takes', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const stockTakes = await prisma.stockTake.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const result = stockTakes.map((st: any) => {
      const items: any[] = st.items || [];
      const diffCount = items.filter((i: any) => i.counted !== null && i.counted !== undefined && i.counted !== i.theoretical).length;
      return {
        ...st,
        itemCount: items.length,
        diffCount,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error listing stock takes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/stock-takes/:id — detail (theoretical frozen at snapshot)
router.get('/stock-takes/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const stockTake = await prisma.stockTake.findFirst({
      where: { id, associationId },
    });

    if (!stockTake) {
      res.status(404).json({ error: 'Stock take not found' });
      return;
    }

    res.json(stockTake);
  } catch (error) {
    console.error('Error getting stock take:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/inventory/stock-takes/:id/items — save counted quantities (in_progress only)
router.put('/stock-takes/:id/items', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      res.status(400).json({ error: 'Items array is required' });
      return;
    }

    const stockTake = await prisma.stockTake.findFirst({
      where: { id, associationId },
    });

    if (!stockTake) {
      res.status(404).json({ error: 'Stock take not found' });
      return;
    }
    if (stockTake.status !== 'in_progress') {
      res.status(400).json({ error: 'Stock take is already closed' });
      return;
    }

    const currentItems: any[] = (stockTake.items as any[]) || [];
    const updated = currentItems.map((it: any) => {
      const incoming = items.find((x: any) => x.articleId === it.articleId);
      if (incoming && typeof incoming.counted === 'number' && incoming.counted >= 0) {
        const counted = Math.trunc(incoming.counted);
        it.counted = counted;
        it.diff = counted - (it.theoretical ?? 0);
      }
      return it;
    });

    const saved = await prisma.stockTake.update({
      where: { id },
      data: { items: updated },
    });

    res.json(saved);
  } catch (error) {
    console.error('Error saving stock take items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/stock-takes/:id/complete — validate & apply deltas
router.post('/stock-takes/:id/complete', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const stockTake = await prisma.stockTake.findFirst({
      where: { id, associationId },
    });

    if (!stockTake) {
      res.status(404).json({ error: 'Stock take not found' });
      return;
    }
    if (stockTake.status !== 'in_progress') {
      res.status(400).json({ error: 'Stock take is already closed' });
      return;
    }

    const items: any[] = (stockTake.items as any[]) || [];
    const missing = items.filter((i: any) => i.counted === null || i.counted === undefined);
    if (missing.length > 0) {
      res.status(400).json({ error: 'جرد غير مكتمل: بعض الأصناف لم يتم عدها' });
      return;
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        for (const item of items) {
          const article = await tx.article.findFirst({
            where: { id: item.articleId, associationId },
          });
          if (!article) continue; // article deleted mid-count — keep snapshot, skip delta

          const delta = (item.counted ?? 0) - (item.theoretical ?? 0);
          if (delta === 0) continue;

          await tx.article.update({
            where: { id: article.id },
            data: { availableQuantity: Math.max(0, article.availableQuantity + delta) },
          });
        }

        return tx.stockTake.update({
          where: { id },
          data: { status: 'completed', completedAt: new Date() },
        });
      });

      res.json(result);
    } catch (error) {
      console.error('Error completing stock take:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    console.error('Error completing stock take:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/stock-takes/:id — cancel (in_progress only, no stock impact)
router.delete('/stock-takes/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const stockTake = await prisma.stockTake.findFirst({
      where: { id, associationId },
    });

    if (!stockTake) {
      res.status(404).json({ error: 'Stock take not found' });
      return;
    }
    if (stockTake.status !== 'in_progress') {
      res.status(400).json({ error: 'Stock take is already closed' });
      return;
    }

    await prisma.stockTake.update({
      where: { id },
      data: { status: 'cancelled', completedAt: new Date() },
    });

    res.json({ message: 'Stock take cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling stock take:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

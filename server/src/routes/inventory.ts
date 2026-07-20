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
        { nameAr: { contains: term, mode: 'insensitive' } },
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
      reference, name, nameAr, description, descriptionAr,
      categoryId, category, quantity, storageLocationId, storageLocation,
      notes, status, statusId,
    } = req.body;

    const resolvedCategoryId = categoryId || category;
    const resolvedStorageLocationId = storageLocationId || storageLocation;

    if (!name || !nameAr || !resolvedCategoryId || quantity === undefined || !resolvedStorageLocationId) {
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
        nameAr,
        description,
        descriptionAr,
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
      reference, name, nameAr, description, descriptionAr,
      categoryId, category, quantity, availableQuantity, status, statusId,
      storageLocationId, storageLocation, isPermanent, notes,
    } = req.body;

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (name !== undefined) data.name = name;
    if (nameAr !== undefined) data.nameAr = nameAr;
    if (description !== undefined) data.description = description;
    if (descriptionAr !== undefined) data.descriptionAr = descriptionAr;
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
    const { name, nameAr } = req.body;

    if (!name || !nameAr) {
      res.status(400).json({ error: 'Missing required fields: name, nameAr' });
      return;
    }

    const category = await prisma.articleCategory.create({
      data: { associationId, name, nameAr },
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

    const { name, nameAr } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (nameAr !== undefined) data.nameAr = nameAr;

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
    const { name, nameAr } = req.body;

    if (!name || !nameAr) {
      res.status(400).json({ error: 'Missing required fields: name, nameAr' });
      return;
    }

    const location = await prisma.storageLocation.create({
      data: { associationId, name, nameAr },
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

    const { name, nameAr } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (nameAr !== undefined) data.nameAr = nameAr;

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
      orderBy: { nameAr: 'asc' },
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
    const { name, nameAr } = req.body;

    if (!nameAr) {
      res.status(400).json({ error: 'nameAr is required' });
      return;
    }

    const grade = await prisma.schoolGrade.create({
      data: {
        associationId,
        name: name || nameAr,
        nameAr,
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

    const { name, nameAr } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (nameAr !== undefined) data.nameAr = nameAr;

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
      orderBy: { createdAt: 'asc' },
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
    const { name, nameAr, description, descriptionAr, isPermanent } = req.body;

    if (!name || !nameAr) {
      res.status(400).json({ error: 'Missing required fields: name, nameAr' });
      return;
    }

    const status = await prisma.articleStatusType.create({
      data: { associationId, name, nameAr, description, descriptionAr, isPermanent: isPermanent ?? false },
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

    const { name, nameAr, description, descriptionAr, isPermanent } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (nameAr !== undefined) data.nameAr = nameAr;
    if (description !== undefined) data.description = description;
    if (descriptionAr !== undefined) data.descriptionAr = descriptionAr;
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

export default router;

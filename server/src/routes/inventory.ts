import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

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
      include: { category: true, storageLocation: true },
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
      categoryId, quantity, storageLocationId,
      condition, conditionAr, isPermanent, notes,
    } = req.body;

    if (!reference || !name || !nameAr || !categoryId || quantity === undefined || !storageLocationId || !condition || !conditionAr) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const article = await prisma.article.create({
      data: {
        associationId,
        reference,
        name,
        nameAr,
        description,
        descriptionAr,
        categoryId,
        quantity: parseInt(quantity, 10),
        availableQuantity: parseInt(quantity, 10),
        storageLocationId,
        condition,
        conditionAr,
        isPermanent: isPermanent || false,
        notes,
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
      include: { category: true, storageLocation: true },
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
      categoryId, quantity, availableQuantity, status,
      storageLocationId, condition, conditionAr, isPermanent, notes,
    } = req.body;

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (name !== undefined) data.name = name;
    if (nameAr !== undefined) data.nameAr = nameAr;
    if (description !== undefined) data.description = description;
    if (descriptionAr !== undefined) data.descriptionAr = descriptionAr;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (quantity !== undefined) data.quantity = parseInt(quantity, 10);
    if (availableQuantity !== undefined) data.availableQuantity = parseInt(availableQuantity, 10);
    if (status !== undefined) data.status = status;
    if (storageLocationId !== undefined) data.storageLocationId = storageLocationId;
    if (condition !== undefined) data.condition = condition;
    if (conditionAr !== undefined) data.conditionAr = conditionAr;
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

    await prisma.storageLocation.delete({ where: { id } });
    res.json({ message: 'Storage location deleted successfully' });
  } catch (error) {
    console.error('Error deleting storage location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { generateRef } from '../lib/ref';
import { logAudit } from '../lib/audit';
import { masquerRelationsListe, masquerRelationsHorsTenant } from '../lib/tenant';

const router = Router();

router.use(requireAuth);

// ========================================================================
// ARTICLES
// ========================================================================

// GET /api/inventory/articles — list articles
router.get('/articles', requirePermission('articles', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Relations to-one non contraintes : les écritures sont désormais validées,
    // mais un article hérité peut pointer une catégorie, un emplacement ou un
    // statut d'une autre association (le libellé fuiterait tel quel).
    res.json(masquerRelationsListe(articles as any[], associationId, ['category', 'storageLocation', 'statusModel']));
  } catch (error) {
    console.error('Error listing articles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/articles — create
router.post('/articles', requirePermission('articles', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    // `parseInt(quantity, 10)` acceptait tout : une entrée non numérique
    // donnait NaN (stock NaN, donc toute comparaison fausse et tout contrôle
    // contourné), un négatif créait un stock négatif, et un texte comme
    // « 5abc » passait pour 5 sans le dire. On exige un entier positif, et on
    // l'exige AVANT l'écriture.
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      res.status(400).json({ error: 'الكمية يجب أن تكون عدداً صحيحاً أكبر من صفر' });
      return;
    }

    // Auto-generate reference if not provided
    const ref = reference || generateRef('ART');

    // `categoryId` et `storageLocationId` viennent du body et atterrissent dans
    // des clés étrangères. Sans contrôle, un article de A pouvait pointer la
    // catégorie ou l'emplacement de B ; `GET /articles` fait ensuite
    // `include: { category: true, storageLocation: true }` et renvoyait donc le
    // libellé d'une autre association.
    const [ownedCategory, ownedLocation] = await Promise.all([
      prisma.articleCategory.findFirst({ where: { id: resolvedCategoryId, associationId }, select: { id: true } }),
      prisma.storageLocation.findFirst({ where: { id: resolvedStorageLocationId, associationId }, select: { id: true } }),
    ]);
    if (!ownedCategory) {
      res.status(400).json({ error: 'Category not found' });
      return;
    }
    if (!ownedLocation) {
      res.status(400).json({ error: 'Storage location not found' });
      return;
    }

    // Resolve isPermanent from the selected custom status. Le statut est aussi
    // écrit : s'il n'appartient pas à l'association, on refuse au lieu de
    // persister une FK étrangère en retombant silencieusement sur `false`.
    let isPermanentValue = false;
    if (statusId) {
      const statusType = await prisma.articleStatusType.findFirst({
        where: { id: statusId, associationId },
      });
      if (!statusType) {
        res.status(400).json({ error: 'Status not found' });
        return;
      }
      isPermanentValue = statusType.isPermanent;
    }

    const article = await prisma.article.create({
      data: {
        associationId,
        reference: ref,
        name,
        description,
        categoryId: resolvedCategoryId,
        quantity: qty,
        availableQuantity: qty,
        storageLocationId: resolvedStorageLocationId,
        isPermanent: isPermanentValue,
        notes,
        status: finalStatus,
        statusId: statusId || undefined,
        createdBy: req.user!.userId,
      },
    });

    await logAudit(req, { action: 'create', resource: 'article', resourceId: article.id, description: 'Article créé' });
    res.status(201).json(article);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/articles/:id
router.get('/articles/:id', requirePermission('articles', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    res.json(masquerRelationsHorsTenant(article as any, associationId, ['category', 'storageLocation', 'statusModel']));
  } catch (error) {
    console.error('Error getting article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/inventory/articles/:id
router.put('/articles/:id', requirePermission('articles', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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
    // `categoryId` / `storageLocationId` : ces valeurs du body finissent dans des
    // clés étrangères, et la liste renvoie `include: { category, storageLocation }`.
    // Sans contrôle d'appartenance, l'article de A affichait le libellé d'une
    // catégorie ou d'un emplacement de B (même faille qu'à la création).
    const resolvedCategoryIdUpd = categoryId ?? category;
    if (resolvedCategoryIdUpd !== undefined) {
      const ownedCategory = await prisma.articleCategory.findFirst({
        where: { id: resolvedCategoryIdUpd, associationId }, select: { id: true },
      });
      if (!ownedCategory) {
        res.status(400).json({ error: 'Category not found' });
        return;
      }
      data.categoryId = resolvedCategoryIdUpd;
    }

    // Quantité totale : entier positif. `parseInt` laissait passer NaN (stock
    // NaN, contrôles contournés) et les négatifs.
    let nouvelleQuantite: number | undefined;
    if (quantity !== undefined) {
      const newQty = Number(quantity);
      if (!Number.isFinite(newQty) || !Number.isInteger(newQty) || newQty <= 0) {
        res.status(400).json({ error: 'الكمية يجب أن تكون عدداً صحيحاً أكبر من صفر' });
        return;
      }
      // Le stock total ne peut pas descendre sous les unités actuellement
      // prêtées (quantity - availableQuantity). Sinon le prêt en cours
      // pointerait sur des articles qui n'existent plus au total : au retour,
      // availableQuantity remonterait au-dessus de quantity et le stock
      // afficherait plus d'unités que la réalité. Pour réduire le total,
      // enregistrer d'abord le retour des articles concernés.
      const pretees = existing.quantity - existing.availableQuantity;
      if (newQty < pretees) {
        res.status(400).json({
          error: `الكمية الإجمالية لا يمكن أن تقل عن الكمية المعارة حالياً (${pretees})`,
        });
        return;
      }
      nouvelleQuantite = newQty;
      data.quantity = newQty;
    }

    // Quantité disponible : idem, et elle ne peut pas dépasser la quantité
    // totale — un disponible supérieur au stock réel laissait prêter des
    // articles inexistants. Le plafond se lit sur la quantité finale, celle
    // qu'on vient de recevoir si elle est fournie, sinon celle en base.
    if (availableQuantity !== undefined) {
      const newAvail = Number(availableQuantity);
      const plafond = nouvelleQuantite ?? existing.quantity;
      if (!Number.isFinite(newAvail) || !Number.isInteger(newAvail) || newAvail < 0 || newAvail > plafond) {
        res.status(400).json({ error: 'الكمية المتاحة غير صالحة' });
        return;
      }
      data.availableQuantity = newAvail;
    } else if (nouvelleQuantite !== undefined) {
      // La quantité totale a bougé sans disponible explicite : on ajuste le
      // disponible du même delta, en le ramenant dans [0, quantité totale].
      data.availableQuantity = Math.min(
        nouvelleQuantite,
        Math.max(0, existing.availableQuantity + (nouvelleQuantite - existing.quantity)),
      );
    }
    if (status !== undefined) data.status = status;
    if (statusId !== undefined) {
      // Auto-resolve isPermanent from the selected custom status. Un statut
      // étranger est refusé plutôt qu'écrit en FK : sinon l'article de A
      // affichait le libellé du statut de B via `include: { statusModel: true }`.
      if (statusId) {
        const statusType = await prisma.articleStatusType.findFirst({
          where: { id: statusId, associationId },
        });
        if (!statusType) {
          res.status(400).json({ error: 'Status not found' });
          return;
        }
        data.isPermanent = statusType.isPermanent;
      } else {
        data.isPermanent = false;
      }
      data.statusId = statusId;
    }
    const resolvedLocationIdUpd = storageLocationId ?? storageLocation;
    if (resolvedLocationIdUpd !== undefined) {
      const ownedLocation = await prisma.storageLocation.findFirst({
        where: { id: resolvedLocationIdUpd, associationId }, select: { id: true },
      });
      if (!ownedLocation) {
        res.status(400).json({ error: 'Storage location not found' });
        return;
      }
      data.storageLocationId = resolvedLocationIdUpd;
    }
    if (isPermanent !== undefined) data.isPermanent = isPermanent;
    if (notes !== undefined) data.notes = notes;
    data.updatedBy = req.user!.userId;

    const article = await prisma.article.update({
      where: { id, associationId },
      data,
    });

    await logAudit(req, { action: 'update', resource: 'article', resourceId: article.id, description: 'Article modifié' });
    res.json(article);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/articles/:id
router.delete('/articles/:id', requirePermission('articles', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    await prisma.article.delete({ where: { id, associationId } });
    await logAudit(req, { action: 'delete', resource: 'article', resourceId: id, description: 'Article supprimé' });
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
router.get('/article-categories', requirePermission('article_categories', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.post('/article-categories', requirePermission('article_categories', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.put('/article-categories/:id', requirePermission('article_categories', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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
      where: { id, associationId },
      data,
    });

    res.json(category);
  } catch (error) {
    console.error('Error updating article category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/article-categories/:id
router.delete('/article-categories/:id', requirePermission('article_categories', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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
    await prisma.articleCategory.delete({ where: { id, associationId } });
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
router.get('/storage-locations', requirePermission('storage_locations', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.post('/storage-locations', requirePermission('storage_locations', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.put('/storage-locations/:id', requirePermission('storage_locations', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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
      where: { id, associationId },
      data,
    });

    res.json(location);
  } catch (error) {
    console.error('Error updating storage location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/storage-locations/:id
router.delete('/storage-locations/:id', requirePermission('storage_locations', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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
    await prisma.storageLocation.delete({ where: { id, associationId } });
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
router.get('/school-grades', requirePermission('school_grades', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.post('/school-grades', requirePermission('school_grades', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.put('/school-grades/:id', requirePermission('school_grades', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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
      where: { id, associationId },
      data,
    });

    res.json(grade);
  } catch (error) {
    console.error('Error updating school grade:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/school-grades/:id
router.delete('/school-grades/:id', requirePermission('school_grades', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    await prisma.schoolGrade.delete({ where: { id, associationId } });
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
router.get('/article-statuses', requirePermission('article_statuses', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.post('/article-statuses', requirePermission('article_statuses', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.put('/article-statuses/:id', requirePermission('article_statuses', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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
      where: { id, associationId },
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
router.delete('/article-statuses/:id', requirePermission('article_statuses', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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
    await prisma.articleStatusType.delete({ where: { id, associationId } });
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
router.post('/stock-takes', requirePermission('stock_takes', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.get('/stock-takes', requirePermission('stock_takes', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.get('/stock-takes/:id', requirePermission('stock_takes', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.put('/stock-takes/:id/items', requirePermission('stock_takes', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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
    // `counted` absent = ligne non comptée : c'est un état normal (saisie
    // partielle). Seules les valeurs réellement fournies et invalides sont
    // refusées.
    const ignored = items.filter((x: any) => {
      const c = x?.counted;
      if (c === undefined || c === null || c === '') return false;
      return !(typeof c === 'number' && Number.isFinite(c) && c >= 0);
    });
    // Une ligne invalide était silencieusement écartée et la route renvoyait
    // quand même 200 : la saisie de l'utilisateur disparaissait sans un mot, et
    // le décompte restait marqué « à faire » ou figé sur une valeur périmée.
    // On refuse désormais franchement, en nommant ce qui a été rejeté.
    if (ignored.length > 0) {
      res.status(400).json({
        error: 'كميات الجرد غير صالحة: يجب أن تكون أعداداً صحيحة موجبة',
        articleIds: ignored.map((x: any) => x?.articleId).filter(Boolean),
      });
      return;
    }

    const updated = currentItems.map((it: any) => {
      const incoming = items.find((x: any) => x.articleId === it.articleId);
      if (incoming && incoming.counted !== undefined && incoming.counted !== null && incoming.counted !== '') {
        const counted = Math.trunc(Number(incoming.counted));
        it.counted = counted;
        it.diff = counted - (it.theoretical ?? 0);
      }
      return it;
    });

    const saved = await prisma.stockTake.update({
      where: { id, associationId },
      data: { items: updated },
    });

    res.json(saved);
  } catch (error) {
    console.error('Error saving stock take items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/stock-takes/:id/complete — validate & apply deltas
router.post('/stock-takes/:id/complete', requirePermission('stock_takes', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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
          where: { id, associationId },
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
router.delete('/stock-takes/:id', requirePermission('stock_takes', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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
      where: { id, associationId },
      data: { status: 'cancelled', completedAt: new Date() },
    });

    res.json({ message: 'Stock take cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling stock take:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

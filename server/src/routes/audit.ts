import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/audit — journal d'audit de l'association (admin/super_admin uniquement)
// Filtres : ?userId= &userRole= &search= &action= &resource= &from= &to= &page= &limit=
router.get('/', requirePermission('audit', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50' } = req.query;

    const where = buildFilter(req);

    const take = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
    const skip = (Math.max(parseInt(String(page), 10) || 1, 1) - 1) * take;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(String(page), 10) || 1, limit: take });
  } catch (error) {
    console.error('Error listing audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Helpers partagés ─────────────────────────────────────────────────────────

/** Construit le filtre Prisma identique au GET, à partir des query params. */
function buildFilter(req: AuthRequest): any {
  const associationId = req.user!.associationId;
  const { userId, userRole, search, action, resource, from, to } = req.query;

  const where: any = { associationId };

  if (userId) where.userId = String(userId);
  if (userRole) where.userRole = String(userRole);
  if (action) where.action = String(action);
  if (resource) where.resource = String(resource);

  if (search) {
    const term = String(search);
    where.OR = [
      { userName: { contains: term, mode: 'insensitive' } },
      { userEmail: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { resourceId: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) where.createdAt.lte = new Date(String(to));
  }

  return where;
}

// DELETE /api/audit/clear — supprime toutes les activités correspondant aux
// filtres courants (mêmes paramètres que le GET). Admin+ uniquement.
// Retourne le nombre de lignes supprimées.
router.delete('/clear', requirePermission('audit', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const where = buildFilter(req);

    // Sécurité : sans aucun filtre (hors associationId), exiger une confirmation
    // explicite pour éviter une suppression accidentelle de tout le journal.
    const hasFilter = Object.keys(req.query).length > 0;
    if (!hasFilter && String(req.query.confirmAll) !== 'true') {
      res.status(400).json({
        error: 'missing_filters',
        message: 'Apply at least one filter, or pass ?confirmAll=true to purge the entire audit log',
      });
      return;
    }

    const result = await prisma.auditLog.deleteMany({ where });
    res.json({ deleted: result.count });
  } catch (error) {
    console.error('Error clearing audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/audit/:id — supprime une entrée précise du journal. Admin+ uniquement.
router.delete('/:id', requirePermission('audit', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const result = await prisma.auditLog.deleteMany({
      where: { id: String(req.params.id), associationId },
    });
    if (result.count === 0) {
      res.status(404).json({ error: 'Audit log entry not found' });
      return;
    }
    res.json({ deleted: 1 });
  } catch (error) {
    console.error('Error deleting audit log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

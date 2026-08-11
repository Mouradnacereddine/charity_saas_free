import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/audit — journal d'audit de l'association (admin/super_admin uniquement)
// Filtres : ?userId= &userRole= &search= &action= &resource= &from= &to= &page= &limit=
router.get('/', requirePermission('audit', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      userId, userRole, search, action, resource,
      from, to,
      page = '1', limit = '50',
    } = req.query;

    const where: any = { associationId };

    if (userId) where.userId = String(userId);
    if (userRole) where.userRole = String(userRole);
    if (action) where.action = String(action);
    if (resource) where.resource = String(resource);

    if (search) {
      const term = String(search);
      where.OR = [
        { userName: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { resourceId: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

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

export default router;

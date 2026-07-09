import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/notifications — list notifications for the association
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { read, limit } = req.query;

    const where: any = { associationId };

    if (read !== undefined) {
      where.read = read === 'true';
    }

    const take = limit ? parseInt(String(limit), 10) : 50;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    const unreadCount = await prisma.notification.count({
      where: { associationId, read: false },
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error listing notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications/:id/read — mark as read
router.put('/:id/read', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.notification.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications — create notification (system use)
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { type, message, messageAr, link } = req.body;

    if (!type || !message || !messageAr) {
      res.status(400).json({ error: 'Missing required fields: type, message, messageAr' });
      return;
    }

    const notification = await prisma.notification.create({
      data: {
        associationId,
        type,
        message,
        messageAr,
        link,
      },
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

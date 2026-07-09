import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/caisses — list all caisses
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const caisses = await prisma.caisse.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(caisses);
  } catch (error) {
    console.error('Error listing caisses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/caisses — create
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { reference, name, nameAr, balance, subCategories } = req.body;

    if (!reference || !name || !nameAr) {
      res.status(400).json({ error: 'Missing required fields: reference, name, nameAr' });
      return;
    }

    const caisse = await prisma.caisse.create({
      data: {
        associationId,
        reference,
        name,
        nameAr,
        balance: balance || 0,
        subCategories: subCategories || [],
      },
    });

    res.status(201).json(caisse);
  } catch (error) {
    console.error('Error creating caisse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/caisses/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const caisse = await prisma.caisse.findFirst({
      where: { id, associationId },
    });

    if (!caisse) {
      res.status(404).json({ error: 'Caisse not found' });
      return;
    }

    res.json(caisse);
  } catch (error) {
    console.error('Error getting caisse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/caisses/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.caisse.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Caisse not found' });
      return;
    }

    const { reference, name, nameAr, balance, subCategories } = req.body;

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (name !== undefined) data.name = name;
    if (nameAr !== undefined) data.nameAr = nameAr;
    if (balance !== undefined) data.balance = balance;
    if (subCategories !== undefined) data.subCategories = subCategories;

    const caisse = await prisma.caisse.update({
      where: { id },
      data,
    });

    res.json(caisse);
  } catch (error) {
    console.error('Error updating caisse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/caisses/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.caisse.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Caisse not found' });
      return;
    }

    await prisma.caisse.delete({ where: { id } });
    res.json({ message: 'Caisse deleted successfully' });
  } catch (error) {
    console.error('Error deleting caisse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

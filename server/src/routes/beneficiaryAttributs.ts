import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const DUMMY_PHONE = '__ATTRIBUT_DUMMY__';

// GET / — list all attributs (from dummy beneficiaries)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const dummies = await prisma.beneficiary.findMany({
      where: { associationId, phone: DUMMY_PHONE },
      select: { attribut: true, firstNameAr: true },
    });

    const seen = new Set<string>();
    const attributs = dummies
      .filter((b) => b.attribut && !seen.has(b.attribut) && seen.add(b.attribut))
      .map((b) => ({ name: b.attribut!, nameAr: b.firstNameAr || b.attribut! }))
      .sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));

    res.json(attributs);
  } catch (error) {
    console.error('Error listing beneficiary attributs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — create a new attribut value
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { name, nameAr, attribut } = req.body;
    const key = attribut || name;

    if (!key) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    // Upsert the dummy beneficiary
    const existing = await prisma.beneficiary.findFirst({
      where: { associationId, attribut: key, phone: DUMMY_PHONE },
    });

    if (existing) {
      // Update nameAr
      await prisma.beneficiary.update({
        where: { id: existing.id },
        data: { firstNameAr: nameAr || key },
      });
    } else {
      // Create dummy
      const ts = String(Date.now());
      await prisma.beneficiary.create({
        data: {
          associationId, reference: `ATTR-${ts}`, attribut: key,
          firstName: key, lastName: '',
          firstNameAr: nameAr || key, lastNameAr: '',
          address: '', addressAr: '',
          phone: DUMMY_PHONE,
          nationalCardNumber: `ATTR-${ts}`,
          dateOfBirth: new Date('2000-01-01'), children: [],
        },
      });
    }

    res.status(201).json({ name: key, nameAr: nameAr || key, message: 'Attribut created' });
  } catch (error) {
    console.error('Error creating beneficiary attribut:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:attribut — update an attribut (key + display name)
router.put('/:attribut', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { attribut } = req.params;
    const { name, nameAr } = req.body;
    const associationId = req.user!.associationId;
    const newKey = name || attribut;
    const newNameAr = nameAr || attribut;

    // If key changed, update all real beneficiaries + dummy
    if (newKey !== attribut) {
      await prisma.beneficiary.updateMany({
        where: { associationId, attribut },
        data: { attribut: newKey, firstNameAr: newNameAr },
      });
    } else {
      // Just update the dummy's display name
      await prisma.beneficiary.updateMany({
        where: { associationId, attribut, phone: DUMMY_PHONE },
        data: { firstNameAr: newNameAr },
      });
    }

    res.json({ name: newKey, nameAr: newNameAr, message: 'Attribut mis à jour' });
  } catch (error) {
    console.error('Error updating beneficiary attribut:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:attribut — delete an attribut value
router.delete('/:attribut', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { attribut } = req.params;
    const associationId = req.user!.associationId;

    // Count real beneficiaries using this attribut (not dummies)
    const realCount = await prisma.beneficiary.count({
      where: { associationId, attribut, phone: { not: DUMMY_PHONE } },
    });

    if (realCount > 0) {
      res.status(400).json({
        error: `لا يمكن حذف "${attribut}" لأنه مستخدم من قبل ${realCount} مستفيد`,
        inUse: realCount,
      });
      return;
    }

    // Delete the dummy beneficiary(ies) for this attribut
    await prisma.beneficiary.deleteMany({
      where: { associationId, attribut, phone: DUMMY_PHONE },
    });

    res.json({ message: `Attribut "${attribut}" supprimé` });
  } catch (error) {
    console.error('Error deleting beneficiary attribut:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

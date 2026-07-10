import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

/**
 * Beneficiary Attributs are managed through the existing Beneficiary model's `attribut` field.
 * This API provides CRUD for the distinct attribute values used across beneficiaries.
 */

// GET /api/beneficiary-attributs — list distinct attribut values
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const beneficiaries = await prisma.beneficiary.findMany({
      where: { associationId },
      select: { attribut: true, firstNameAr: true },
      distinct: ['attribut'],
    });

    const seen = new Set<string>();
    const attributs = beneficiaries
      .filter((b) => b.attribut && !seen.has(b.attribut) && seen.add(b.attribut))
      .map((b) => ({ name: b.attribut!, nameAr: b.firstNameAr || b.attribut! }))
      .sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));

    res.json(attributs);
  } catch (error) {
    console.error('Error listing beneficiary attributs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/beneficiary-attributs — add a new attribut value
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { name, nameAr, attribut } = req.body;
    const key = attribut || name;

    if (!key) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    // Check if the attribut value already exists
    const existing = await prisma.beneficiary.findFirst({
      where: { associationId, attribut: key },
    });

    if (!existing) {
      // Create a dummy beneficiary to register the attribut
      await prisma.beneficiary.create({
        data: {
          associationId,
          reference: `ATTRIBUT-${Date.now()}`,
          attribut: key,
          firstName: key,
          lastName: '',
          firstNameAr: nameAr || key,
          lastNameAr: '',
          address: '',
          addressAr: '',
          phone: '0000000000',
          nationalCardNumber: `ATTRIBUT-${Date.now()}`,
          dateOfBirth: new Date('2000-01-01'),
          children: [],
        },
      });
    }

    res.status(201).json({ name: key, nameAr: nameAr || key, message: 'Attribut value registered' });
  } catch (error) {
    console.error('Error creating beneficiary attribut:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/beneficiary-attributs/:attribut — delete an attribut value
router.delete('/:attribut', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { attribut } = req.params;
    const associationId = req.user!.associationId;

    // Check if any beneficiary is using this attribut
    const count = await prisma.beneficiary.count({
      where: { associationId, attribut },
    });

    if (count > 0) {
      res.status(400).json({
        error: `Cannot delete attribut "${attribut}" because it is used by ${count} beneficiary(ies)`,
        inUse: count,
      });
      return;
    }

    res.json({ message: `Attribut "${attribut}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting beneficiary attribut:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

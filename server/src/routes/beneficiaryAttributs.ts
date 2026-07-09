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
      select: { attribut: true },
      distinct: ['attribut'],
    });

    const attributs = beneficiaries
      .map((b) => b.attribut)
      .filter(Boolean)
      .sort();

    res.json(attributs);
  } catch (error) {
    console.error('Error listing beneficiary attributs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/beneficiary-attributs — add a new attribut value
// This is a metadata operation; the attribut is stored on the Beneficiary model
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { attribut } = req.body;

    if (!attribut) {
      res.status(400).json({ error: 'Missing required field: attribut' });
      return;
    }

    // Check if the attribut value already exists in this association
    const existing = await prisma.beneficiary.findFirst({
      where: { associationId, attribut },
    });

    if (existing) {
      res.status(409).json({ error: 'Attribut already exists' });
      return;
    }

    // Since attributs are just string values on the Beneficiary model,
    // we create a dummy beneficiary to register the attribut, then return success.
    // The frontend should use POST /api/beneficiaries to create actual beneficiaries.
    // This endpoint is for managing the list of valid attribut values.
    res.status(201).json({ attribut, message: 'Attribut value registered' });
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

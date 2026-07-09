import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// ========================================================================
// MEDICAL REFERRALS
// ========================================================================

// GET /api/medical/referrals
router.get('/referrals', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { beneficiaryId } = req.query;

    const where: any = { associationId };
    if (beneficiaryId) where.beneficiaryId = String(beneficiaryId);

    const referrals = await prisma.medicalReferral.findMany({
      where,
      include: { beneficiary: true, caisse: true },
      orderBy: { date: 'desc' },
    });

    res.json(referrals);
  } catch (error) {
    console.error('Error listing medical referrals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/medical/referrals
router.post('/referrals', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      reference, beneficiaryId, caisseId, subCategoryId,
      doctorName, doctorNameAr, analysisType, analysisTypeAr,
      hospital, hospitalAr, amount, amountInWords, amountInWordsAr,
      date, notes,
    } = req.body;

    if (!reference || !beneficiaryId || !caisseId || !doctorName || !doctorNameAr || !amount || !amountInWords || !amountInWordsAr || !date) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Verify beneficiary and caisse belong to association
    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, associationId },
    });

    if (!beneficiary) {
      res.status(400).json({ error: 'Beneficiary not found' });
      return;
    }

    const caisse = await prisma.caisse.findFirst({
      where: { id: caisseId, associationId },
    });

    if (!caisse) {
      res.status(400).json({ error: 'Caisse not found' });
      return;
    }

    // Check balance for debit
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (caisse.balance < numericAmount) {
      res.status(400).json({ error: 'Insufficient caisse balance' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Deduct from caisse
      await tx.caisse.update({
        where: { id: caisseId },
        data: { balance: { decrement: numericAmount } },
      });

      // Create the referral
      const referral = await tx.medicalReferral.create({
        data: {
          associationId,
          reference,
          beneficiaryId,
          caisseId,
          subCategoryId,
          doctorName,
          doctorNameAr,
          analysisType,
          analysisTypeAr,
          hospital,
          hospitalAr,
          amount: numericAmount,
          amountInWords,
          amountInWordsAr,
          date: new Date(date),
          notes,
        },
      });

      return referral;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating medical referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/medical/referrals/:id
router.get('/referrals/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const referral = await prisma.medicalReferral.findFirst({
      where: { id, associationId },
      include: { beneficiary: true, caisse: true },
    });

    if (!referral) {
      res.status(404).json({ error: 'Medical referral not found' });
      return;
    }

    res.json(referral);
  } catch (error) {
    console.error('Error getting medical referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/medical/referrals/:id
router.put('/referrals/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.medicalReferral.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Medical referral not found' });
      return;
    }

    const {
      reference, beneficiaryId, caisseId, subCategoryId,
      doctorName, doctorNameAr, analysisType, analysisTypeAr,
      hospital, hospitalAr, amount, amountInWords, amountInWordsAr,
      date, notes,
    } = req.body;

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (beneficiaryId !== undefined) data.beneficiaryId = beneficiaryId;
    if (caisseId !== undefined) data.caisseId = caisseId;
    if (subCategoryId !== undefined) data.subCategoryId = subCategoryId;
    if (doctorName !== undefined) data.doctorName = doctorName;
    if (doctorNameAr !== undefined) data.doctorNameAr = doctorNameAr;
    if (analysisType !== undefined) data.analysisType = analysisType;
    if (analysisTypeAr !== undefined) data.analysisTypeAr = analysisTypeAr;
    if (hospital !== undefined) data.hospital = hospital;
    if (hospitalAr !== undefined) data.hospitalAr = hospitalAr;
    if (amount !== undefined) data.amount = amount;
    if (amountInWords !== undefined) data.amountInWords = amountInWords;
    if (amountInWordsAr !== undefined) data.amountInWordsAr = amountInWordsAr;
    if (date !== undefined) data.date = new Date(date);
    if (notes !== undefined) data.notes = notes;

    const referral = await prisma.medicalReferral.update({
      where: { id },
      data,
    });

    res.json(referral);
  } catch (error) {
    console.error('Error updating medical referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/medical/referrals/:id
router.delete('/referrals/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.medicalReferral.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Medical referral not found' });
      return;
    }

    await prisma.medicalReferral.delete({ where: { id } });
    res.json({ message: 'Medical referral deleted successfully' });
  } catch (error) {
    console.error('Error deleting medical referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================================================
// MEDICAL ANALYSIS TYPES
// ========================================================================

// GET /api/medical/analysis-types
router.get('/analysis-types', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const types = await prisma.medicalAnalysisType.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(types);
  } catch (error) {
    console.error('Error listing analysis types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/medical/analysis-types
router.post('/analysis-types', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { name, nameAr } = req.body;

    if (!name || !nameAr) {
      res.status(400).json({ error: 'Missing required fields: name, nameAr' });
      return;
    }

    const type = await prisma.medicalAnalysisType.create({
      data: { associationId, name, nameAr },
    });

    res.status(201).json(type);
  } catch (error) {
    console.error('Error creating analysis type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/medical/analysis-types/:id
router.put('/analysis-types/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.medicalAnalysisType.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Analysis type not found' });
      return;
    }

    const { name, nameAr } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (nameAr !== undefined) data.nameAr = nameAr;

    const type = await prisma.medicalAnalysisType.update({
      where: { id },
      data,
    });

    res.json(type);
  } catch (error) {
    console.error('Error updating analysis type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/medical/analysis-types/:id
router.delete('/analysis-types/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.medicalAnalysisType.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Analysis type not found' });
      return;
    }

    await prisma.medicalAnalysisType.delete({ where: { id } });
    res.json({ message: 'Analysis type deleted successfully' });
  } catch (error) {
    console.error('Error deleting analysis type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================================================
// MEDICAL HOSPITALS
// ========================================================================

// GET /api/medical/hospitals
router.get('/hospitals', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const hospitals = await prisma.medicalHospital.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(hospitals);
  } catch (error) {
    console.error('Error listing hospitals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/medical/hospitals
router.post('/hospitals', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { name, nameAr } = req.body;

    if (!name || !nameAr) {
      res.status(400).json({ error: 'Missing required fields: name, nameAr' });
      return;
    }

    const hospital = await prisma.medicalHospital.create({
      data: { associationId, name, nameAr },
    });

    res.status(201).json(hospital);
  } catch (error) {
    console.error('Error creating hospital:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/medical/hospitals/:id
router.put('/hospitals/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.medicalHospital.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    const { name, nameAr } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (nameAr !== undefined) data.nameAr = nameAr;

    const hospital = await prisma.medicalHospital.update({
      where: { id },
      data,
    });

    res.json(hospital);
  } catch (error) {
    console.error('Error updating hospital:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/medical/hospitals/:id
router.delete('/hospitals/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.medicalHospital.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    await prisma.medicalHospital.delete({ where: { id } });
    res.json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    console.error('Error deleting hospital:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

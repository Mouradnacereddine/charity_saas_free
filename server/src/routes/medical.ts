import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { generateRef } from '../lib/ref';

const router = Router();

router.use(requireAuth);

// ========================================================================
// MEDICAL REFERRALS
// ========================================================================

// GET /api/medical/referrals
router.get('/referrals', requirePermission('medical_referrals', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { beneficiaryId } = req.query;

    const where: any = { associationId };
    if (beneficiaryId) where.beneficiaryId = String(beneficiaryId);

    const referrals = await prisma.medicalReferral.findMany({
      where,
      include: { beneficiary: true, caisse: true, doctor: { include: { specialty: { select: { id: true, name: true } } } } },
      orderBy: [{ createdAt: 'desc' }, { date: 'desc' }],
    });

    const result = referrals.map((r: any) => ({
      ...r,
      beneficiaryName: r.beneficiary ? `${r.beneficiary.firstName} ${r.beneficiary.lastName}` : '',
      beneficiaryReference: r.beneficiary?.reference || '',
      doctorName: r.doctor ? `${r.doctor.firstName} ${r.doctor.lastName}` : '',
      doctorSpecialty: r.doctor?.specialty?.name || '',
    }));

    res.json(result);
  } catch (error) {
    console.error('Error listing medical referrals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/medical/referrals
router.post('/referrals', requirePermission('medical_referrals', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      reference: refInput, beneficiaryId, caisseId, subCategoryId,
      doctorId, analysisType,
      hospital, amount, amountInWords,
      date, notes, children, status,
    } = req.body;

    const reference = refInput || generateRef('MED');
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    const words = amountInWords || `${numericAmount} DZD`;

    if (!beneficiaryId || !caisseId || !doctorId || !date) {
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

    // Status: pending = amount TBD by doctor later (no deduction until confirmed)
    const txStatus = status || 'pending';

    // Create referral and optionally deduct caisse balance + create transaction atomically
    const referral = await prisma.$transaction(async (tx) => {
      // Only deduct balance when status is 'completed' and amount > 0
      if (numericAmount > 0 && txStatus === 'completed') {
        const caisse = await tx.caisse.findFirst({
          where: { id: caisseId, associationId },
        });
        if (!caisse || caisse.balance < numericAmount) {
          throw new Error('INSUFFICIENT_BALANCE');
        }
        await tx.caisse.update({
          where: { id: caisseId },
          data: { balance: { decrement: numericAmount } },
        });

        // Create a transaction record for traceability
        await tx.transaction.create({
          data: {
            associationId,
            type: 'debit',
            amount: numericAmount,
            amountInWords: words,
            fundSource: 'caisse_physique',
            caisseId,
            subCategoryId: subCategoryId || undefined,
            beneficiaryId,
            description: `Medical referral - ${analysisType || ''}`,
            receiptNumber: reference,
            status: 'completed',
            date: new Date(date),
          },
        });
      }

      return tx.medicalReferral.create({
        data: {
          associationId,
          reference,
          beneficiaryId,
          caisseId,
          subCategoryId,
          doctorId,
          analysisType,
          hospital,
          amount: numericAmount,
          amountInWords: words,
          status: txStatus,
          date: new Date(date),
          notes,
          children: children || [],
        },
      });
    });

    res.status(201).json(referral);
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_BALANCE') {
      res.status(400).json({ error: 'رصيد الصندوق غير كافٍ' });
      return;
    }
    console.error('Error creating medical referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/medical/referrals/:id
router.get('/referrals/:id', requirePermission('medical_referrals', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const referral = await prisma.medicalReferral.findFirst({
      where: { id, associationId },
      include: { beneficiary: true, caisse: true, doctor: { include: { specialty: { select: { id: true, name: true } } } } },
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

// PUT /api/medical/referrals/:id/confirm — complete a referral with doctor's amount
router.put('/referrals/:id/confirm', requirePermission('medical_referrals', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    if (existing.status !== 'pending') {
      res.status(400).json({ error: 'Seules les orientations en attente peuvent être confirmées' });
      return;
    }

    const { amount, amountInWords } = req.body;
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    const words = amountInWords || `${numericAmount} DZD`;

    const referral = await prisma.$transaction(async (tx) => {
      if (numericAmount > 0) {
        // Deduct from caisse (atomic: locked within transaction)
        const caisse = await tx.caisse.findFirst({
          where: { id: existing.caisseId, associationId },
        });
        if (!caisse || caisse.balance < numericAmount) {
          throw new Error('INSUFFICIENT_BALANCE');
        }
        await tx.caisse.update({
          where: { id: existing.caisseId },
          data: { balance: { decrement: numericAmount } },
        });

        // Create a transaction record for traceability
        const beneficiary = await tx.beneficiary.findFirst({
          where: { id: existing.beneficiaryId, associationId },
          select: { lastName: true, firstName: true },
        });
        await tx.transaction.create({
          data: {
            associationId,
            type: 'debit',
            amount: numericAmount,
            amountInWords: words,
            fundSource: 'caisse_physique',
            caisseId: existing.caisseId,
            subCategoryId: existing.subCategoryId || undefined,
            beneficiaryId: existing.beneficiaryId,
            description: `Medical referral confirmed - ${existing.analysisType || ''}`,
            receiptNumber: existing.reference,
            status: 'completed',
            date: new Date(),
          },
        });
      }

      return tx.medicalReferral.update({
        where: { id },
        data: {
          amount: numericAmount,
          amountInWords: words,
          status: 'completed',
        },
      });
    });

    res.json(referral);
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_BALANCE') {
      res.status(400).json({ error: 'رصيد الصندوق غير كافٍ' });
      return;
    }
    console.error('Error confirming medical referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/medical/referrals/:id/cancel
router.put('/referrals/:id/cancel', requirePermission('medical_referrals', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    if (existing.status !== 'pending') {
      res.status(400).json({ error: 'Seules les orientations en attente peuvent être annulées' });
      return;
    }

    const referral = await prisma.medicalReferral.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    res.json(referral);
  } catch (error) {
    console.error('Error cancelling medical referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/medical/referrals/:id
router.put('/referrals/:id', requirePermission('medical_referrals', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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
      doctorId, analysisType,
      hospital, amount, amountInWords,
      date, notes,
    } = req.body;

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (beneficiaryId !== undefined) data.beneficiaryId = beneficiaryId;
    if (caisseId !== undefined) data.caisseId = caisseId;
    if (subCategoryId !== undefined) data.subCategoryId = subCategoryId;
    if (doctorId !== undefined) data.doctorId = doctorId;
    if (analysisType !== undefined) data.analysisType = analysisType;
    if (hospital !== undefined) data.hospital = hospital;
    if (amount !== undefined) data.amount = amount;
    if (amountInWords !== undefined) data.amountInWords = amountInWords;
    if (date !== undefined) data.date = new Date(date);
    if (notes !== undefined) data.notes = notes;
    if (req.body.status !== undefined) data.status = req.body.status;

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
router.delete('/referrals/:id', requirePermission('medical_referrals', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Refund the caisse if the referral was completed with amount > 0
    if (existing.status === 'completed' && Number(existing.amount) > 0) {
      await prisma.caisse.update({
        where: { id: existing.caisseId },
        data: { balance: { increment: existing.amount } },
      });
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
router.get('/analysis-types', requirePermission('analysis_types', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.post('/analysis-types', requirePermission('analysis_types', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    const type = await prisma.medicalAnalysisType.create({
      data: { associationId, name },
    });

    res.status(201).json(type);
  } catch (error) {
    console.error('Error creating analysis type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/medical/analysis-types/:id
router.put('/analysis-types/:id', requirePermission('analysis_types', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    const { name } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;

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
router.delete('/analysis-types/:id', requirePermission('analysis_types', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.get('/hospitals', requirePermission('hospitals', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.post('/hospitals', requirePermission('hospitals', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    const hospital = await prisma.medicalHospital.create({
      data: { associationId, name },
    });

    res.status(201).json(hospital);
  } catch (error) {
    console.error('Error creating hospital:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/medical/hospitals/:id
router.put('/hospitals/:id', requirePermission('hospitals', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    const { name } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;

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
router.delete('/hospitals/:id', requirePermission('hospitals', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { generateRef } from '../lib/ref';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/beneficiaries — list with filters
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      searchTerm, attribut, caisseId, situation,
      minChildren, maxChildAge, gender, minAge, maxAge,
      childGender, childHealthStatus, childSchoolGradeId, minChildAge, maxChildAge: maxChildAgeParam,
    } = req.query;
    const associationId = req.user!.associationId;

    const DUMMY_PHONE = '__ATTRIBUT_DUMMY__';
    const where: any = { associationId, phone: { not: DUMMY_PHONE } };

    if (searchTerm) {
      const term = String(searchTerm);
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { firstNameAr: { contains: term, mode: 'insensitive' } },
        { lastNameAr: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
        { nationalCardNumber: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (attribut) where.attribut = String(attribut);
    if (caisseId) where.caisseId = String(caisseId);
    if (gender) where.gender = String(gender);
    if (situation) {
      where.OR = where.OR || [];
      where.OR.push(
        { situation: { contains: String(situation), mode: 'insensitive' } },
        { situationAr: { contains: String(situation), mode: 'insensitive' } },
      );
    }

    // Fetch all and apply children/age filters in-memory (JSON/date fields)
    let beneficiaries = await prisma.beneficiary.findMany({
      where,
      include: { caisse: true },
      orderBy: { createdAt: 'desc' },
    });

    if (minChildren) {
      const min = parseInt(String(minChildren), 10);
      if (!isNaN(min)) beneficiaries = beneficiaries.filter((b: any) => (b.children || []).length >= min);
    }

    if (minAge || maxAge) {
      const now = new Date();
      beneficiaries = beneficiaries.filter((b: any) => {
        if (!b.dateOfBirth) return true;
        const age = now.getFullYear() - new Date(b.dateOfBirth).getFullYear();
        const monthDiff = now.getMonth() - new Date(b.dateOfBirth).getMonth();
        const adjustedAge = monthDiff < 0 ? age - 1 : age;
        if (minAge && adjustedAge < parseInt(String(minAge), 10)) return false;
        if (maxAge && adjustedAge > parseInt(String(maxAge), 10)) return false;
        return true;
      });
    }

    // ---- Child-focused filters ----
    // These filter beneficiaries by requiring at least one child matching ALL criteria
    const hasChildFilter = childGender || childHealthStatus || childSchoolGradeId || minChildAge || maxChildAgeParam;

    if (hasChildFilter) {
      const now = new Date();
      beneficiaries = beneficiaries.filter((b: any) => {
        const children = (b.children as any[]) || [];
        if (children.length === 0) return false;

        return children.some((child: any) => {
          // Child gender filter
          if (childGender && child.gender !== String(childGender)) return false;

          // Child health status filter
          if (childHealthStatus && child.healthStatus !== String(childHealthStatus)) return false;

          // Child school grade filter
          if (childSchoolGradeId && child.schoolGradeId !== String(childSchoolGradeId)) return false;

          // Child age filters
          if (child.dateOfBirth) {
            const age = now.getFullYear() - new Date(child.dateOfBirth).getFullYear();
            const monthDiff = now.getMonth() - new Date(child.dateOfBirth).getMonth();
            const adjustedAge = monthDiff < 0 ? age - 1 : age;
            if (minChildAge && adjustedAge < parseInt(String(minChildAge), 10)) return false;
            if (maxChildAgeParam && adjustedAge > parseInt(String(maxChildAgeParam), 10)) return false;
          }

          return true;
        });
      });
    }

    res.json(beneficiaries);
  } catch (error) {
    console.error('Error listing beneficiaries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/beneficiaries/widows/most-children — widow with most children under max age
router.get('/widows/most-children', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const maxAge = req.query.maxAge ? parseInt(String(req.query.maxAge), 10) : undefined;

    const widows = await prisma.beneficiary.findMany({
      where: {
        associationId,
        attribut: 'veuve',
      },
    });

    if (widows.length === 0) {
      res.json(null);
      return;
    }

    // Find the widow with the most children
    let result: any = null;
    let maxCount = 0;

    for (const widow of widows) {
      const children = (widow.children as any[]) || [];
      let count = children.length;

      if (maxAge !== undefined) {
        const now = new Date();
        count = children.filter((child: any) => {
          if (child.dateOfBirth) {
            const age = now.getFullYear() - new Date(child.dateOfBirth).getFullYear();
            return age <= maxAge;
          }
          return true;
        }).length;
      }

      if (count > maxCount) {
        maxCount = count;
        result = { ...widow, childrenCount: count };
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error finding widow with most children:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/beneficiaries — create
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      reference: refInput, firstName, lastName, firstNameAr, lastNameAr,
      address, addressAr, phone, nationalCardNumber, dateOfBirth,
      attribut, gender, onBehalfOfName, situation, situationAr,
      children, caisseId, subCategoryId,
    } = req.body;

    const reference = refInput || generateRef('BEN');

    if (!firstName || !lastName || !firstNameAr || !lastNameAr || !address || !addressAr || !phone || !nationalCardNumber || !dateOfBirth || !attribut) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const beneficiary = await prisma.beneficiary.create({
      data: {
        associationId,
        reference,
        firstName,
        lastName,
        firstNameAr,
        lastNameAr,
        address,
        addressAr,
        phone,
        nationalCardNumber,
        dateOfBirth: new Date(dateOfBirth),
        attribut,
        gender: gender || 'male',
        onBehalfOfName,
        situation,
        situationAr,
        children: children || [],
        caisseId,
        subCategoryId,
      },
    });

    res.status(201).json(beneficiary);
  } catch (error) {
    console.error('Error creating beneficiary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/beneficiaries/:id — get one
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id, associationId },
      include: { caisse: true, loans: true, medicalReferrals: true },
    });

    if (!beneficiary) {
      res.status(404).json({ error: 'Beneficiary not found' });
      return;
    }

    res.json(beneficiary);
  } catch (error) {
    console.error('Error getting beneficiary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/beneficiaries/:id — update
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    // Verify ownership
    const existing = await prisma.beneficiary.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Beneficiary not found' });
      return;
    }

    const {
      reference, firstName, lastName, firstNameAr, lastNameAr,
      address, addressAr, phone, nationalCardNumber, dateOfBirth,
      attribut, onBehalfOfName, situation, situationAr,
      children, caisseId, subCategoryId,
    } = req.body;

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (firstNameAr !== undefined) data.firstNameAr = firstNameAr;
    if (lastNameAr !== undefined) data.lastNameAr = lastNameAr;
    if (address !== undefined) data.address = address;
    if (addressAr !== undefined) data.addressAr = addressAr;
    if (phone !== undefined) data.phone = phone;
    if (nationalCardNumber !== undefined) data.nationalCardNumber = nationalCardNumber;
    if (dateOfBirth !== undefined) data.dateOfBirth = new Date(dateOfBirth);
    if (attribut !== undefined) data.attribut = attribut;
    if (onBehalfOfName !== undefined) data.onBehalfOfName = onBehalfOfName;
    if (situation !== undefined) data.situation = situation;
    if (situationAr !== undefined) data.situationAr = situationAr;
    if (children !== undefined) data.children = children;
    if (caisseId !== undefined) data.caisseId = caisseId;
    if (subCategoryId !== undefined) data.subCategoryId = subCategoryId;

    const beneficiary = await prisma.beneficiary.update({
      where: { id },
      data,
    });

    res.json(beneficiary);
  } catch (error) {
    console.error('Error updating beneficiary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/beneficiaries/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.beneficiary.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Beneficiary not found' });
      return;
    }

    await prisma.beneficiary.delete({ where: { id } });
    res.json({ message: 'Beneficiary deleted successfully' });
  } catch (error) {
    console.error('Error deleting beneficiary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

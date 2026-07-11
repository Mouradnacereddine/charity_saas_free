import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/donors — list with optional search
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { searchTerm, search, firstName, lastName, phone } = req.query;
    const associationId = req.user!.associationId;

    const where: any = { associationId };

    const term = searchTerm || search;
    if (term) {
      const t = String(term);
      where.OR = [
        { firstName: { contains: t, mode: 'insensitive' } },
        { lastName: { contains: t, mode: 'insensitive' } },
        { firstNameAr: { contains: t, mode: 'insensitive' } },
        { lastNameAr: { contains: t, mode: 'insensitive' } },
        { reference: { contains: t, mode: 'insensitive' } },
        { phone: { contains: t, mode: 'insensitive' } },
        { email: { contains: t, mode: 'insensitive' } },
      ];
    } else {
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { firstNameAr: { contains: term, mode: 'insensitive' } },
        { lastNameAr: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    } else {
      if (firstName) where.firstName = { contains: String(firstName), mode: 'insensitive' };
      if (lastName) where.lastName = { contains: String(lastName), mode: 'insensitive' };
      if (phone) where.phone = { contains: String(phone), mode: 'insensitive' };
    }

    const donors = await prisma.donor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(donors);
  } catch (error) {
    console.error('Error listing donors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/donors — create
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      reference: refInput, firstName, lastName, firstNameAr, lastNameAr,
      phone, email, address, gender, totalDonated, notes,
    } = req.body;

    const reference = refInput || `DON-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    if (!firstName || !lastName || !firstNameAr || !lastNameAr || !phone) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const donor = await prisma.donor.create({
      data: {
        associationId,
        reference,
        firstName,
        lastName,
        firstNameAr,
        lastNameAr,
        phone,
        email,
        address,
        gender: gender || 'male',
        totalDonated: totalDonated || 0,
        notes,
      },
    });

    res.status(201).json(donor);
  } catch (error) {
    console.error('Error creating donor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/donors/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const donor = await prisma.donor.findFirst({
      where: { id, associationId },
      include: { donationReceipts: true },
    });

    if (!donor) {
      res.status(404).json({ error: 'Donor not found' });
      return;
    }

    res.json(donor);
  } catch (error) {
    console.error('Error getting donor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/donors/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.donor.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Donor not found' });
      return;
    }

    const {
      reference, firstName, lastName, firstNameAr, lastNameAr,
      phone, email, address, totalDonated, notes,
    } = req.body;

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (firstNameAr !== undefined) data.firstNameAr = firstNameAr;
    if (lastNameAr !== undefined) data.lastNameAr = lastNameAr;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (address !== undefined) data.address = address;
    if (totalDonated !== undefined) data.totalDonated = totalDonated;
    if (notes !== undefined) data.notes = notes;

    const donor = await prisma.donor.update({
      where: { id },
      data,
    });

    res.json(donor);
  } catch (error) {
    console.error('Error updating donor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/donors/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.donor.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Donor not found' });
      return;
    }

    await prisma.donor.delete({ where: { id } });
    res.json({ message: 'Donor deleted successfully' });
  } catch (error) {
    console.error('Error deleting donor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/donors/:id/receipts — get all receipts for a donor
router.get('/:id/receipts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const donor = await prisma.donor.findFirst({
      where: { id, associationId },
    });

    if (!donor) {
      res.status(404).json({ error: 'Donor not found' });
      return;
    }

    const receipts = await prisma.donationReceipt.findMany({
      where: { donorId: id, associationId },
      include: { transaction: true, caisse: true },
      orderBy: { date: 'desc' },
    });

    res.json(receipts);
  } catch (error) {
    console.error('Error getting donor receipts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

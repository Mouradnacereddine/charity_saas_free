import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { config } from '../config';

const router = Router();

router.use(requireAuth);

// Helper to generate reference
function generateRef(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const r = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `DOC-${y}${m}-${r}`;
}

// ========================================================================
// DOCTORS CRUD
// ========================================================================

// GET /api/doctors — list with filters and referral count
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { search, specialtyId } = req.query;

    const where: any = { associationId };
    if (specialtyId) where.specialtyId = String(specialtyId);
    if (search) {
      const term = String(search);
      where.OR = [
        { firstNameAr: { contains: term, mode: 'insensitive' } },
        { lastNameAr: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
      ];
    }

    const doctors = await prisma.doctor.findMany({
      where,
      include: {
        specialty: { select: { id: true, name: true, nameAr: true } },
        _count: { select: { referrals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(doctors);
  } catch (error) {
    console.error('Error listing doctors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/doctors/:id — detail
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const doctor = await prisma.doctor.findFirst({
      where: { id, associationId },
      include: {
        specialty: { select: { id: true, name: true, nameAr: true } },
        _count: { select: { referrals: true } },
      },
    });

    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error getting doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/doctors/:id/stats — patient statistics by period
router.get('/:id/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const doctor = await prisma.doctor.findFirst({
      where: { id, associationId },
    });

    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const totalReferrals = await prisma.medicalReferral.count({
      where: { doctorId: id, associationId },
    });

    const referralsThisMonth = await prisma.medicalReferral.count({
      where: { doctorId: id, associationId, date: { gte: startOfMonth } },
    });

    const referralsThisWeek = await prisma.medicalReferral.count({
      where: { doctorId: id, associationId, date: { gte: startOfWeek } },
    });

    const lastReferral = await prisma.medicalReferral.findFirst({
      where: { doctorId: id, associationId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    // Monthly breakdown (last 12 months)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthlyData = await prisma.medicalReferral.groupBy({
      by: ['date'],
      where: { doctorId: id, associationId, date: { gte: twelveMonthsAgo }, status: { not: 'cancelled' } },
      _count: { id: true },
    });

    // Convert to month buckets
    const monthMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, 0);
    }
    for (const item of monthlyData) {
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap.has(key)) monthMap.set(key, item._count.id);
    }

    const referralsByMonth = Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }));

    res.json({
      totalReferrals,
      referralsThisMonth,
      referralsThisWeek,
      lastReferral: lastReferral?.date || null,
      referralsByMonth,
    });
  } catch (error) {
    console.error('Error getting doctor stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/doctors — create
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { firstName, lastName, firstNameAr, lastNameAr, phone, email, specialtyId, address, notes } = req.body;

    if (!firstNameAr || !lastNameAr || !phone) {
      res.status(400).json({ error: 'الاسم بالعربية ورقم الهاتف مطلوبان' });
      return;
    }

    const doctor = await prisma.doctor.create({
      data: {
        associationId,
        reference: generateRef(),
        firstName: firstName || firstNameAr,
        lastName: lastName || lastNameAr,
        firstNameAr,
        lastNameAr,
        phone,
        email,
        specialtyId: specialtyId || undefined,
        address,
        notes,
      },
      include: { specialty: { select: { id: true, name: true, nameAr: true } } },
    });

    res.status(201).json(doctor);
  } catch (error) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/doctors/:id — update
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.doctor.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    const { firstName, lastName, firstNameAr, lastNameAr, phone, email, specialtyId, address, notes } = req.body;

    const data: any = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (firstNameAr !== undefined) data.firstNameAr = firstNameAr;
    if (lastNameAr !== undefined) data.lastNameAr = lastNameAr;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (specialtyId !== undefined) data.specialtyId = specialtyId;
    if (address !== undefined) data.address = address;
    if (notes !== undefined) data.notes = notes;

    const doctor = await prisma.doctor.update({
      where: { id },
      data,
      include: { specialty: { select: { id: true, name: true, nameAr: true } } },
    });

    res.json(doctor);
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/doctors/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.doctor.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    // Check if doctor has referrals
    const referralCount = await prisma.medicalReferral.count({
      where: { doctorId: id, associationId },
    });

    if (referralCount > 0) {
      res.status(400).json({ error: `لا يمكن حذف الطبيب، لديه ${referralCount} توجيه طبي مرتبط به` });
      return;
    }

    await prisma.doctor.delete({ where: { id } });
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================================================
// DOCTOR SPECIALTIES
// ========================================================================

// GET /api/doctors/specialties — list
router.get('/specialties/list', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const specialties = await prisma.doctorSpecialty.findMany({
      where: { associationId },
      include: { _count: { select: { doctors: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(specialties);
  } catch (error) {
    console.error('Error listing specialties:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/doctors/specialties — create
router.post('/specialties', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { name, nameAr } = req.body;

    if (!name || !nameAr) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const specialty = await prisma.doctorSpecialty.create({
      data: { associationId, name, nameAr },
    });

    res.status(201).json(specialty);
  } catch (error) {
    console.error('Error creating specialty:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/doctors/specialties/:id
router.put('/specialties/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.doctorSpecialty.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Specialty not found' });
      return;
    }

    const { name, nameAr } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (nameAr !== undefined) data.nameAr = nameAr;

    const specialty = await prisma.doctorSpecialty.update({
      where: { id },
      data,
    });

    res.json(specialty);
  } catch (error) {
    console.error('Error updating specialty:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/doctors/specialties/:id
router.delete('/specialties/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.doctorSpecialty.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Specialty not found' });
      return;
    }

    // Check if any doctors use this specialty
    const doctorCount = await prisma.doctor.count({
      where: { specialtyId: id, associationId },
    });

    if (doctorCount > 0) {
      res.status(400).json({ error: 'لا يمكن حذف التخصص، يوجد أطباء مرتبطون به' });
      return;
    }

    await prisma.doctorSpecialty.delete({ where: { id } });
    res.json({ message: 'Specialty deleted successfully' });
  } catch (error) {
    console.error('Error deleting specialty:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

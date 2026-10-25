import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { generateRef } from '../lib/ref';
import { logAudit } from '../lib/audit';
import { roundMoney, moneyNumber } from '../lib/money';
import { relationAutorisee, masquerRelationsListe } from '../lib/tenant';

const router = Router();

router.use(requireAuth);

// GET /api/donors — list with optional search
router.get('/', requirePermission('donors', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { searchTerm, search, caisseId, minDonation, maxDonation, gender } = req.query;
    const associationId = req.user!.associationId;

    const where: any = { associationId };

    const term = searchTerm || search;
    if (term) {
      const t = String(term);
      where.OR = [
        { firstName: { contains: t, mode: 'insensitive' } },
        { lastName: { contains: t, mode: 'insensitive' } },
        { reference: { contains: t, mode: 'insensitive' } },
        { phone: { contains: t, mode: 'insensitive' } },
        { email: { contains: t, mode: 'insensitive' } },
      ];
    }
    if (caisseId) {
      // Find donors who have transactions with this caisse
      const txDonorIds = await prisma.transaction.findMany({
        where: { associationId, caisseId: String(caisseId) },
        select: { donorId: true },
        distinct: ['donorId'],
      });
      where.id = { in: txDonorIds.map((t: any) => t.donorId).filter(Boolean) };
    }
    if (gender) where.gender = String(gender);

    const donors = await prisma.donor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Add receipt count and distribution info for each donor
    const donorIds = donors.map((d: any) => d.id);
    const receipts = await prisma.donationReceipt.findMany({
      where: { donorId: { in: donorIds } },
    });
    // Bénéficiaires pris en charge (liens déclaratifs DonorBeneficiary)
    const sponsorshipRows = donorIds.length
      ? await prisma.donorBeneficiary.findMany({
          where: { donorId: { in: donorIds } },
          select: { donorId: true, beneficiaryId: true },
        })
      : [];
    const sponsoredMap = new Map<string, string[]>();
    for (const row of sponsorshipRows) {
      const arr = sponsoredMap.get(row.donorId) || [];
      arr.push(row.beneficiaryId);
      sponsoredMap.set(row.donorId, arr);
    }
    const countMap = new Map<string, number>();
    const distributionMap = new Map<string, { caisses: { id: string; name: string; subCategories: { id: string; name: string; total: number }[]; total: number }[]; totalAmount: number }>();

    for (const r of receipts) {
      // Increment count
      countMap.set(r.donorId, (countMap.get(r.donorId) || 0) + 1);

      // Track distribution by caisse & sub-category
      if (!distributionMap.has(r.donorId)) {
        distributionMap.set(r.donorId, { caisses: [], totalAmount: 0 });
      }
      const dist = distributionMap.get(r.donorId)!;
      dist.totalAmount += Number(r.amount);

        const rAny = r as any;
      let caisse = dist.caisses.find((c) => c.id === rAny.caisseId);
      if (!caisse) {
        caisse = { id: rAny.caisseId, name: rAny.caisseName || '', subCategories: [], total: 0 };
        dist.caisses.push(caisse);
      }
      caisse.total += Number(rAny.amount);

      if (rAny.subCategoryId) {
        let sub = caisse.subCategories.find((s) => s.id === rAny.subCategoryId);
        if (!sub) {
          sub = { id: rAny.subCategoryId, name: rAny.subCategoryName || '', total: 0 };
          caisse.subCategories.push(sub);
        }
        sub.total += Number(rAny.amount);
      }
    }

    let result = donors.map((d: any) => {
      const dist = distributionMap.get(d.id) || { caisses: [], totalAmount: 0 };
      return {
        ...d,
        totalDonated: roundMoney(Number(dist.totalAmount || d.totalDonated || 0)),
        receiptCount: countMap.get(d.id) || 0,
        sponsoredBeneficiaryIds: sponsoredMap.get(d.id) || [],
        distribution: dist,
      };
    });

    // Apply min/max donation filter on receiptCount (number of donations)
    const minCnt = minDonation !== undefined ? parseInt(String(minDonation), 10) : undefined;
    const maxCnt = maxDonation !== undefined ? parseInt(String(maxDonation), 10) : undefined;
    if (minCnt !== undefined || maxCnt !== undefined) {
      result = result.filter((d: any) => {
        if (minCnt !== undefined && d.receiptCount < minCnt) return false;
        if (maxCnt !== undefined && d.receiptCount > maxCnt) return false;
        return true;
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error listing donors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/donors — create
router.post('/', requirePermission('donors', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      reference: refInput, firstName, lastName,
      phone, email, address, gender, totalDonated, notes,
      sponsoredBeneficiaryIds,
    } = req.body;

    const reference = refInput || generateRef('DON');

    if (!firstName || !lastName || !phone) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const donor = await prisma.donor.create({
      data: {
        associationId,
        reference,
        firstName,
        lastName,
        phone,
        email,
        address,
        gender: gender || 'male',
        totalDonated: moneyNumber(Math.max(0, Number(totalDonated) || 0)),
        notes,
        createdBy: req.user!.userId,
      },
    });

    // Bénéficiaires pris en charge déclarés à la création (mêmes règles que le PUT :
    // seuls les bénéficiaires réels de CETTE association sont retenus).
    if (Array.isArray(sponsoredBeneficiaryIds)) {
      const requested = sponsoredBeneficiaryIds.map(String).filter(Boolean);
      if (requested.length) {
        const valid = await prisma.beneficiary.findMany({
          where: {
            id: { in: requested },
            associationId,
            phone: { not: '__ATTRIBUT_DUMMY__' },
          },
          select: { id: true },
        });
        for (const b of valid) {
          await prisma.donorBeneficiary.create({
            data: { associationId, donorId: donor.id, beneficiaryId: b.id },
          });
        }
      }
    }

    await logAudit(req, {
      action: 'create',
      resource: 'donor',
      resourceId: donor.id,
      description: `Donateur créé : ${firstName} ${lastName}`,
    });

    res.status(201).json(donor);
  } catch (error) {
    console.error('Error creating donor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/donors/:id
router.get('/:id', requirePermission('donors', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Calculate dynamic total from receipts
    const receipts = await prisma.donationReceipt.findMany({
      where: { donorId: id, associationId },
      include: { transaction: true, caisse: true },
      orderBy: { date: 'desc' },
    });

    // `transaction` et `caisse` sont des relations to-one : l'`include` ne peut
    // pas les filtrer, et un reçu hérité (caisseId écrit avant f2d90e4) peut
    // pointer une caisse d'une autre association.
    const receiptsScoped = masquerRelationsListe(receipts as any[], associationId, ['transaction', 'caisse']);

    // Bénéficiaires pris en charge (liens déclaratifs)
    const sponsored = await prisma.donorBeneficiary.findMany({
      where: { donorId: id, associationId },
      include: { beneficiary: true },
      orderBy: { createdAt: 'desc' },
    });

    const dynamicTotal = receiptsScoped.reduce((sum: number, r: any) => Number(sum) + Number(r.amount), 0);

    res.json({
      ...donor,
      totalDonated: roundMoney(dynamicTotal || Number(donor.totalDonated) || 0),
      donationReceipts: receiptsScoped,
      sponsoredBeneficiaries: sponsored
        .map((s: any) => s.beneficiary)
        .filter((b: any) => b && b.associationId === associationId && b.phone !== '__ATTRIBUT_DUMMY__'),
    });
  } catch (error) {
    console.error('Error getting donor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/donors/:id
router.put('/:id', requirePermission('donors', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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
      reference, firstName, lastName,
      phone, email, address, totalDonated, notes, gender,
      sponsoredBeneficiaryIds,
    } = req.body;

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (address !== undefined) data.address = address;
    if (totalDonated !== undefined) data.totalDonated = moneyNumber(totalDonated);
    if (notes !== undefined) data.notes = notes;
    if (gender !== undefined) data.gender = gender;
    data.updatedBy = req.user!.userId;

    const donor = await prisma.donor.update({
      where: { id, associationId },
      data,
    });

    // Mise à jour globale des bénéficiaires pris en charge (diff vs liens existants)
    if (Array.isArray(sponsoredBeneficiaryIds)) {
      const requested = sponsoredBeneficiaryIds.map(String).filter(Boolean);
      // Seuls les bénéficiaires réels de CETTE association sont acceptés :
      // un identifiant étranger ou un dummy est ignoré silencieusement.
      const valid = requested.length
        ? await prisma.beneficiary.findMany({
            where: {
              id: { in: requested },
              associationId,
              phone: { not: '__ATTRIBUT_DUMMY__' },
            },
            select: { id: true },
          })
        : [];
      const target = valid.map((b: any) => b.id);
      const current = await prisma.donorBeneficiary.findMany({
        where: { donorId: id, associationId },
        select: { beneficiaryId: true },
      });
      const currentIds = new Set(current.map((c: any) => c.beneficiaryId));
      const targetSet = new Set(target);

      const toAdd = target.filter(b => !currentIds.has(b));
      const toRemove = [...currentIds].filter(b => !targetSet.has(b));

      if (toRemove.length) {
        await prisma.donorBeneficiary.deleteMany({
          where: { donorId: id, beneficiaryId: { in: toRemove }, associationId },
        });
      }
      for (const b of toAdd) {
        await prisma.donorBeneficiary.create({
          data: { associationId, donorId: id, beneficiaryId: b },
        });
      }
    }

    await logAudit(req, {
      action: 'update',
      resource: 'donor',
      resourceId: donor.id,
      description: `Donateur modifié : ${firstName ?? existing.firstName} ${lastName ?? existing.lastName}`,
    });

    res.json(donor);
  } catch (error) {
    console.error('Error updating donor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/donors/:id
router.delete('/:id', requirePermission('donors', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Un reçu de don référence le donateur sans onDelete : la clé étrangère
    // bloque la suppression. On le signale explicitement (409) au lieu de
    // laisser fuiter un 500 opaque que l'interface affiche telle quelle.
    const receiptCount = await prisma.donationReceipt.count({
      where: { donorId: id, associationId },
    });
    if (receiptCount > 0) {
      res.status(409).json({
        error: 'Donor has donation receipts',
        message: 'Ce donateur a des reçus de don et ne peut pas être supprimé.',
        receiptCount,
      });
      return;
    }

    await prisma.donor.delete({ where: { id, associationId } });

    await logAudit(req, {
      action: 'delete',
      resource: 'donor',
      resourceId: id,
      description: `Donateur supprimé : ${existing.firstName} ${existing.lastName}`,
    });

    res.json({ message: 'Donor deleted successfully' });
  } catch (error) {
    console.error('Error deleting donor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/donors/:id/beneficiaries — list of beneficiaries sponsored by this donor
router.get('/:id/beneficiaries', requirePermission('donors', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const donor = await prisma.donor.findFirst({ where: { id, associationId } });
    if (!donor) {
      res.status(404).json({ error: 'Donor not found' });
      return;
    }

    const links = await prisma.donorBeneficiary.findMany({
      where: { donorId: id, associationId },
      include: { beneficiary: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      links
        .map((l: any) => l.beneficiary)
        // `beneficiary` est une relation to-one non contrainte par l'include :
        // un lien hérité peut désigner une fiche d'une autre association.
        .filter((b: any) => b && b.associationId === associationId && b.phone !== '__ATTRIBUT_DUMMY__')
    );
  } catch (error) {
    console.error('Error listing donor beneficiaries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/donors/:id/beneficiaries — declare a beneficiary as sponsored by this donor
router.post('/:id/beneficiaries', requirePermission('donors', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;
    const { beneficiaryId } = req.body;

    if (!beneficiaryId) {
      res.status(400).json({ error: 'Missing beneficiaryId' });
      return;
    }

    const donor = await prisma.donor.findFirst({ where: { id, associationId } });
    if (!donor) {
      res.status(404).json({ error: 'Donor not found' });
      return;
    }

    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id: String(beneficiaryId), associationId, phone: { not: '__ATTRIBUT_DUMMY__' } },
    });
    if (!beneficiary) {
      res.status(404).json({ error: 'Beneficiary not found' });
      return;
    }

    // Idempotent : un lien existant est renvoyé tel quel (200)
    const existing = await prisma.donorBeneficiary.findFirst({
      where: { donorId: id, beneficiaryId: String(beneficiaryId) },
    });
    if (existing) {
      res.json(existing);
      return;
    }

    const link = await prisma.donorBeneficiary.create({
      data: {
        associationId,
        donorId: id,
        beneficiaryId: String(beneficiaryId),
      },
    });

    await logAudit(req, {
      action: 'create',
      resource: 'donor',
      resourceId: id,
      description: `Prise en charge déclarée : ${donor.firstName} ${donor.lastName} → ${beneficiary.firstName} ${beneficiary.lastName}`,
    });

    res.status(201).json(link);
  } catch (error) {
    console.error('Error adding donor beneficiary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/donors/:id/beneficiaries/:beneficiaryId — remove a sponsorship link
router.delete('/:id/beneficiaries/:beneficiaryId', requirePermission('donors', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, beneficiaryId } = req.params;
    const associationId = req.user!.associationId;

    const donor = await prisma.donor.findFirst({ where: { id, associationId } });
    if (!donor) {
      res.status(404).json({ error: 'Donor not found' });
      return;
    }

    const link = await prisma.donorBeneficiary.findFirst({
      where: { donorId: id, beneficiaryId: String(beneficiaryId), associationId },
    });
    if (!link) {
      res.status(404).json({ error: 'Sponsorship link not found' });
      return;
    }

    await prisma.donorBeneficiary.delete({ where: { id: link.id } });

    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id: String(beneficiaryId), associationId },
      select: { firstName: true, lastName: true },
    });

    await logAudit(req, {
      action: 'delete',
      resource: 'donor',
      resourceId: id,
      description: `Prise en charge retirée : ${donor.firstName} ${donor.lastName} → ${beneficiary?.firstName || ''} ${beneficiary?.lastName || ''}`,
    });

    res.json({ message: 'Sponsorship removed' });
  } catch (error) {
    console.error('Error removing donor beneficiary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/donors/:id/receipts — get all receipts for a donor
router.get('/:id/receipts', requirePermission('donation_receipts', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
      include: {
        transaction: { include: { beneficiary: true } },
        caisse: true,
      },
      orderBy: { date: 'desc' },
    });

    // Trois niveaux de relations to-one non contraintes : le reçu → sa caisse,
    // le reçu → sa transaction, la transaction → son bénéficiaire. Chacune peut
    // désigner une ligne d'une autre association héritée d'avant f2d90e4.
    const scoped = (receipts as any[]).map((r) => {
      const transaction = relationAutorisee(r.transaction, associationId);
      return {
        ...r,
        caisse: relationAutorisee(r.caisse, associationId),
        transaction: transaction
          ? { ...transaction, beneficiary: relationAutorisee((transaction as any).beneficiary, associationId) }
          : null,
      };
    });

    res.json(scoped);
  } catch (error) {
    console.error('Error getting donor receipts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

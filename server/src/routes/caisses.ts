import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { logAudit } from '../lib/audit';
import { moneyNumber } from '../lib/money';
import { soldeDisponible } from '../lib/solde';

const router = Router();

router.use(requireAuth);

// GET /api/caisses — list all caisses
router.get('/', requirePermission('caisses', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const caisses = await prisma.caisse.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
    });

    // `balance` est le solde DÉTENU ; on y joint le disponible (détenu moins
    // les montants déjà promis : dons affectés non versés, débits en attente).
    // L'interface les affiche côte à côte — sans quoi une dépense serait
    // refusée par le serveur sans que l'utilisateur ait pu voir pourquoi.
    const avecDisponible = await Promise.all(
      caisses.map(async (c) => ({
        ...c,
        availableBalance: await soldeDisponible(prisma, associationId, { caisseId: c.id }),
      })),
    );

    res.json(avecDisponible);
  } catch (error) {
    console.error('Error listing caisses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/caisses — create
router.post('/', requirePermission('caisses', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { reference, name, balance, subCategories } = req.body;

    if (!reference || !name) {
      res.status(400).json({ error: 'Missing required fields: reference, name' });
      return;
    }

    const caisse = await prisma.caisse.create({
      data: {
        associationId,
        reference,
        name,
        balance: moneyNumber(balance ?? 0),
        subCategories: subCategories || [],
        createdBy: req.user!.userId,
      },
    });

    await logAudit(req, {
      action: 'create',
      resource: 'caisse',
      resourceId: caisse.id,
      description: `Caisse créée : ${name}`,
    });

    res.status(201).json(caisse);
  } catch (error) {
    console.error('Error creating caisse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/caisses/:id
router.get('/:id', requirePermission('caisses', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
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
router.put('/:id', requirePermission('caisses', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    const { reference, name, balance, subCategories } = req.body;

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (name !== undefined) data.name = name;
    if (balance !== undefined) data.balance = moneyNumber(balance);
    if (subCategories !== undefined) data.subCategories = subCategories;
    data.updatedBy = req.user!.userId;

    const caisse = await prisma.caisse.update({
      where: { id, associationId },
      data,
    });

    await logAudit(req, {
      action: 'update',
      resource: 'caisse',
      resourceId: caisse.id,
      description: `Caisse modifiée : ${name ?? existing.name}`,
    });

    res.json(caisse);
  } catch (error) {
    console.error('Error updating caisse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/caisses/:id
router.delete('/:id', requirePermission('caisses', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Un reçu de don ou une transaction référence la caisse sans onDelete :
    // la clé étrangère bloque la suppression. On le signale explicitement
    // (409) au lieu de laisser fuiter un 500 opaque affiché tel quel.
    const [receiptCount, txCount] = await Promise.all([
      prisma.donationReceipt.count({ where: { caisseId: id, associationId } }),
      prisma.transaction.count({ where: { caisseId: id, associationId } }),
    ]);
    if (receiptCount > 0 || txCount > 0) {
      res.status(409).json({
        error: 'Caisse is in use',
        message: 'Cette caisse a des transactions ou des reçus et ne peut pas être supprimée.',
        transactionCount: txCount,
        receiptCount,
      });
      return;
    }

    // `deleteMany` avec `associationId` plutôt que `delete({ id })` : l'écriture
    // reste bornée au tenant même si le pré-contrôle ci-dessus est un jour
    // déplacé (défense en profondeur, cf. audit d'isolation).
    const deleted = await prisma.caisse.deleteMany({ where: { id, associationId } });
    if (deleted.count === 0) {
      res.status(404).json({ error: 'Caisse not found' });
      return;
    }

    await logAudit(req, {
      action: 'delete',
      resource: 'caisse',
      resourceId: id,
      description: `Caisse supprimée : ${existing.name}`,
    });

    res.json({ message: 'Caisse deleted successfully' });
  } catch (error) {
    console.error('Error deleting caisse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { logAudit } from '../lib/audit';

const router = Router();

router.use(requireAuth);

// GET /api/loans — list
router.get('/', requirePermission('loans', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const { status, beneficiaryId } = req.query;

    const where: any = { associationId };

    if (status) where.status = String(status);
    if (beneficiaryId) where.beneficiaryId = String(beneficiaryId);

    const loans = await prisma.loan.findMany({
      where,
      // `beneficiaryId` n'était pas validé avant le commit f2d90e4 : un prêt
      // hérité peut pointer le bénéficiaire d'une autre association. On charge
      // son associationId pour pouvoir neutraliser la relation ci-dessous.
      include: { beneficiary: { select: { id: true, associationId: true, firstName: true, lastName: true, reference: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Enrichir les items avec les noms, références et catégories d'articles depuis la base
    const allArticles = await prisma.article.findMany({
      where: { associationId },
      select: {
        id: true, name: true, reference: true,
        category: { select: { id: true, name: true } },
      },
    });
    const articleMap = new Map(allArticles.map((a) => [a.id, a]));

    const result = loans.map((l: any) => {
      // Relation neutralisée hors périmètre plutôt que renvoyée telle quelle :
      // sinon A lisait l'état civil complet d'un bénéficiaire de B.
      const { beneficiary, ...reste } = l;
      const bene = beneficiary && beneficiary.associationId === associationId ? beneficiary : null;
      return {
        ...reste,
        beneficiaryId: bene ? bene.id : l.beneficiaryId,
        beneficiary: bene ? { id: bene.id, firstName: bene.firstName, lastName: bene.lastName, reference: bene.reference } : null,
        items: (l.items as any[] || []).map((item: any) => {
          const article = articleMap.get(item.articleId);
          return {
            ...item,
            articleName: article?.name || '',
            articleReference: article?.reference || '',
            categoryName: article?.category?.name || '',
          };
        }),
        beneficiaryName: bene ? `${bene.firstName} ${bene.lastName}` : '',
        beneficiaryReference: bene?.reference || '',
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error listing loans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/loans — create
router.post('/', requirePermission('loans', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;
    const {
      reference, beneficiaryId, items, loanDate,
      expectedReturnDate, notes,
    } = req.body;

    if (!reference || !beneficiaryId || !items || !loanDate) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Verify beneficiary belongs to association
    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, associationId },
    });

    if (!beneficiary) {
      res.status(400).json({ error: 'Beneficiary not found' });
      return;
    }

    // Verify items exist and update available quantities
    // Chaque ligne d'item reçoit un identifiant d'occurrence unique (source de vérité).
    // `...item` laissait passer `returnedQuantity` fourni par le client : un prêt
    // créé déjà « rendu » alors que le stock allait être décrémenté (unités
    // perdues). On ne garde que les champs attendus, et la quantité doit être un
    // entier positif (même règle que PUT /:id et add-item) : une quantité
    // négative passait le test `available < -5` puis *incrémentait* le stock.
    const loanItems: any[] = (items as any[]).map((item: any) => {
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
        throw Object.assign(new Error('INVALID_QUANTITY'), { status: 400, message: 'الكمية غير صالحة' });
      }
      const { returnedQuantity: _ignored, ...rest } = item;
      return { ...rest, quantity: qty, returnedQuantity: 0, itemKey: crypto.randomUUID() };
    });

    // Les `findFirst` ci-dessous sont hors transaction : deux lignes du même
    // article étaient chacune comparées au stock complet. On cumule par article.
    const qtyParArticle = new Map<string, number>();
    for (const item of loanItems) {
      qtyParArticle.set(item.articleId, (qtyParArticle.get(item.articleId) || 0) + item.quantity);
    }

    for (const [articleIdCible, qtyTotale] of qtyParArticle) {
      const article = await prisma.article.findFirst({
        where: { id: articleIdCible, associationId },
      });

      if (!article) {
        res.status(400).json({ error: `Article ${articleIdCible} not found` });
        return;
      }

      if (article.availableQuantity < qtyTotale) {
        res.status(400).json({ error: `Insufficient quantity for article ${article.name}` });
        return;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          associationId,
          reference,
          beneficiaryId,
          items: loanItems,
          loanDate: new Date(loanDate),
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          notes,
          createdBy: req.user!.userId,
        },
      });

      // Decrease available quantities. `updateMany` + `associationId` : les
      // `articleId` viennent du body et n'ont été vérifiés que hors transaction.
      for (const item of loanItems) {
        const decremented = await tx.article.updateMany({
          where: { id: item.articleId, associationId },
          data: { availableQuantity: { decrement: item.quantity } },
        });
        if (decremented.count !== 1) {
          throw new Error('ARTICLE_NOT_IN_ASSOCIATION');
        }
      }

      return loan;
    });

    await logAudit(req, { action: 'create', resource: 'loan', resourceId: result.id, description: 'Prêt créé' });
    res.status(201).json(result);
  } catch (error: any) {
    // Une quantité invalide est une faute du client, pas du serveur.
    if (error?.status === 400) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error creating loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/loans/:id
router.get('/:id', requirePermission('loans', 'read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const loan = await prisma.loan.findFirst({
      where: { id, associationId },
      include: { beneficiary: true },
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    // Prêt hérité : `beneficiaryId` pouvait être écrit sans contrôle avant
    // f2d90e4. On masque la fiche si elle sort de l'association — `...loan`
    // la renvoyait entièrement (adresse, téléphone, CIN, données de santé).
    const beneLie = (loan as any).beneficiary;
    const beneValide = beneLie && beneLie.associationId === associationId ? beneLie : null;

    const articles = await prisma.article.findMany({
      where: { associationId },
      select: { id: true, name: true, reference: true, category: { select: { name: true } } },
    });
    const articleMap = new Map(articles.map((a) => [a.id, a]));

    const result = {
      ...loan,
      beneficiary: beneValide
        ? { id: beneValide.id, firstName: beneValide.firstName, lastName: beneValide.lastName, reference: beneValide.reference }
        : null,
      items: ((loan.items as any[]) || []).map((item: any) => {
        const article = articleMap.get(item.articleId);
        return {
          ...item,
          articleName: article?.name || item.articleName || '',
          articleReference: article?.reference || item.articleReference || '',
          categoryName: article?.category?.name || item.categoryName || '',
        };
      }),
      beneficiaryName: beneValide ? `${beneValide.firstName} ${beneValide.lastName}` : '',
      beneficiaryReference: beneValide?.reference || '',
    };

    res.json(result);
  } catch (error) {
    console.error('Error getting loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/loans/:id — update
router.put('/:id', requirePermission('loans', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    const {
      reference, beneficiaryId, items, status,
      loanDate, expectedReturnDate, actualReturnDate, notes,
    } = req.body;

    // Scoper le bénéficiaire entrant : sans ce contrôle, un prêt pouvait être
    // rattaché au bénéficiaire d'une AUTRE association (l'identifiant était
    // écrit tel quel), et la fiche du voisin affichait un prêt qui ne le
    // concerne pas.
    if (beneficiaryId !== undefined) {
      const benef = await prisma.beneficiary.findFirst({
        where: { id: beneficiaryId, associationId },
        select: { id: true },
      });
      if (!benef) {
        res.status(400).json({ error: 'Beneficiary not found' });
        return;
      }
    }

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (beneficiaryId !== undefined) data.beneficiaryId = beneficiaryId;
    // Les identifiants de ligne entrants (`itemKey`) sont préservés : c'est eux
    // qui rattachent un retour à la bonne occurrence. Les articles visés sont
    // scopés à l'association ci-dessous.
    if (items !== undefined) {
      // Garantir un itemKey sur chaque ligne reçue (protection contre la perte des clés)
      data.items = (items as any[]).map((i: any) => ({
        ...i,
        itemKey: i.itemKey ?? crypto.randomUUID(),
      }));
    }
    if (status !== undefined) {
      const validLoanStatuses = ['en_cours', 'retourne', 'partiellement_retourne', 'definitif'];
      if (!validLoanStatuses.includes(status)) {
        res.status(400).json({ error: 'حالة الإعارة غير صالحة' });
        return;
      }
      data.status = status;
    }
    if (loanDate !== undefined) data.loanDate = new Date(loanDate);
    if (expectedReturnDate !== undefined) data.expectedReturnDate = expectedReturnDate ? new Date(expectedReturnDate) : null;
    if (actualReturnDate !== undefined) data.actualReturnDate = actualReturnDate ? new Date(actualReturnDate) : null;
    if (notes !== undefined) data.notes = notes;

    // Le stock est la conséquence des lignes : une réécriture d'`items` qui
    // change les quantités SANS toucher `availableQuantity` désynchronisait
    // le stock du prêt — la boucle des retours créditait des articles qui
    // n'étaient plus prêtés, et le stock pouvait être gonflé au-delà du réel.
    // On consomme donc le delta ligne à ligne, exactement comme le fait
    // `remove-item` pour une ligne supprimée.
    const newItems: any[] = data.items;
    if (newItems) {
      for (const item of newItems) {
        if (!item || !item.articleId) {
          res.status(400).json({ error: 'Chaque ligne doit porter un articleId' });
          return;
        }
        const qty = Number(item.quantity);
        if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty < 0) {
          res.status(400).json({ error: 'الكمية غير صالحة' });
          return;
        }
        const article = await prisma.article.findFirst({
          where: { id: item.articleId, associationId },
          select: { id: true },
        });
        if (!article) {
          res.status(400).json({ error: `Article ${item.articleId} not found` });
          return;
        }
        const already = Number(item.returnedQuantity || 0);
        if (!Number.isFinite(already) || already < 0 || already > qty) {
          res.status(400).json({ error: 'الكمية المُرجعة غير صالحة' });
          return;
        }
      }
    }

    const loan = await prisma.$transaction(async (tx) => {
      if (newItems) {
        // Quantités prêtées avant / après, par occurrence (itemKey), pour
        // n'ajuster le stock que du delta réel.
        const anciens: any[] = (existing.items as any[]) || [];
        const avantParCle = new Map<string, number>();
        for (const i of anciens) {
          if (!i?.itemKey) continue;
          avantParCle.set(i.itemKey, (avantParCle.get(i.itemKey) || 0) + Number(i.quantity || 0));
        }
        const apresParCle = new Map<string, number>();
        for (const i of newItems) {
          apresParCle.set(i.itemKey, (apresParCle.get(i.itemKey) || 0) + Number(i.quantity || 0));
        }

        const cles = new Set([...avantParCle.keys(), ...apresParCle.keys()]);
        for (const cle of cles) {
          const avant = avantParCle.get(cle) || 0;
          const apres = apresParCle.get(cle) || 0;
          const delta = apres - avant;
          if (delta === 0) continue;
          const articleId = newItems.find((i: any) => i.itemKey === cle)?.articleId
            || anciens.find((i: any) => i.itemKey === cle)?.articleId;
          if (!articleId) continue;
          if (delta > 0) {
            // Prêter davantage sort du stock disponible, conditionnellement :
            // 0 ligne touchée = stock insuffisant, on annule tout.
            const dec = await tx.article.updateMany({
              where: { id: articleId, associationId, availableQuantity: { gte: delta } },
              data: { availableQuantity: { decrement: delta } },
            });
            if (dec.count === 0) {
              throw new Error('INSUFFICIENT_ARTICLE_STOCK');
            }
          } else {
            // Prêter moins rend la différence au stock.
            await tx.article.updateMany({
              where: { id: articleId, associationId },
              data: { availableQuantity: { increment: -delta } },
            });
          }
        }
      }

      return tx.loan.update({
        where: { id, associationId },
        data: { ...data, updatedBy: req.user!.userId },
      });
    });

    await logAudit(req, { action: 'update', resource: 'loan', resourceId: loan.id, description: 'Prêt modifié' });
    res.json(loan);
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_ARTICLE_STOCK') {
      res.status(400).json({ error: 'الكمية المتاحة غير كافية في المخزون' });
      return;
    }
    console.error('Error updating loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/loans/:id
router.delete('/:id', requirePermission('loans', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    // Restore available quantities before deleting — mais seulement ce qui est
    // encore SORTI du stock. Les unités déjà retournées ont été recréditées au
    // moment de leur retour ; les rendre une seconde fois à la suppression du
    // prêt gonflait le stock au-delà du réel (prêt de 5, 5 retournés, puis
    // suppression → +5 fantômes).
    await prisma.$transaction(async (tx) => {
      const items: any[] = (existing.items as any[]) || [];
      for (const item of items) {
        if (!item?.articleId) continue;
        const aRendre = Number(item.quantity || 0) - Number(item.returnedQuantity || 0);
        if (aRendre > 0) {
          await tx.article.updateMany({
            where: { id: item.articleId, associationId },
            data: { availableQuantity: { increment: aRendre } },
          });
        }
      }

      await tx.loan.delete({ where: { id, associationId } });
    });

    await logAudit(req, { action: 'delete', resource: 'loan', resourceId: id, description: 'Prêt supprimé' });
    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('Error deleting loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/loans/:id/return — partial item returns
router.post('/:id/return', requirePermission('loans', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Items array is required' });
      return;
    }

    const loan = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    if (loan.status === 'retourne' || loan.status === 'definitif') {
      res.status(400).json({ error: 'Loan is already closed' });
      return;
    }

    const currentItems: any[] = loan.items as any[];

    const result = await prisma.$transaction(async (tx) => {
      // Process each returned item
      for (const returnItem of items) {
        const { itemKey, articleId, quantity, condition } = returnItem;
        const key = itemKey || articleId;

        // Find the matching item in the loan — par itemKey (occurrence précise),
        // avec fallback articleId pour les prêts legacy sans itemKey.
        const loanItem = key
          ? currentItems.find((i: any) => i.itemKey === key) ||
            currentItems.find((i: any) => !i.itemKey && i.articleId === key)
          : undefined;
        if (!loanItem) {
          throw new Error(`Article ${key} not found in loan`);
        }

        // Update returned quantity
        //
        // Borné des deux côtés. Sans borne haute, un retour de 3 sur un prêt de
        // 5 appelé trois fois créditait 6 unités sur un article qui n'en avait
        // prêté que 5 : le stock gonflait à chaque appel. Sans borne basse, un
        // `quantity: 0` explicite (ou négatif) passait et la ligne se croyait
        // retournée sans rien rendre. Un retour ne peut pas dépasser le reste
        // dû, et une unité de plus que ce qui reste est refusée.
        const dejaRendu = Number(loanItem.returnedQuantity || 0);
        const reste = Number(loanItem.quantity || 0) - dejaRendu;
        const returnedQty = quantity === undefined || quantity === null
          ? reste
          : Number(quantity);
        if (!Number.isFinite(returnedQty) || !Number.isInteger(returnedQty)
            || returnedQty <= 0 || returnedQty > reste) {
          throw new Error(`Quantité de retour invalide pour l'article ${loanItem.articleId} : ${returnedQty} (reste dû : ${reste})`);
        }

        loanItem.returnedQuantity = dejaRendu + returnedQty;
        if (condition) loanItem.conditionOnReturn = condition;

        // Restore available quantity (utilise l'article de la ligne ciblée).
        // `articleId` vient du JSON `items`, écrit sans validation avant le
        // commit f2d90e4 : sur un prêt hérité il peut désigner un article d'une
        // autre association. On borne l'écriture et on refuse plutôt que
        // d'incrémenter le stock du voisin.
        const restored = await tx.article.updateMany({
          where: { id: loanItem.articleId, associationId },
          data: { availableQuantity: { increment: returnedQty } },
        });
        if (restored.count === 0) {
          throw new Error(`ARTICLE_NOT_IN_ASSOCIATION: ${loanItem.articleId}`);
        }
      }

      // Determine new status
      const allReturned = currentItems.every(
        (i: any) => (i.returnedQuantity || 0) >= i.quantity
      );
      const someReturned = currentItems.some(
        (i: any) => (i.returnedQuantity || 0) > 0
      );

      let newStatus = loan.status;
      if (allReturned) {
        newStatus = 'definitif';
      } else if (someReturned) {
        newStatus = 'partiellement_retourne';
      }

      const updatedLoan = await tx.loan.update({
        where: { id, associationId },
        data: {
          items: currentItems,
          status: newStatus,
          actualReturnDate: allReturned ? new Date() : undefined,
        },
      });

      return updatedLoan;
    });

    await logAudit(req, { action: 'update', resource: 'loan', resourceId: req.params.id, description: 'Retour partiel de prêt' });
    res.json(result);
  } catch (error: any) {
    console.error('Error processing loan return:', error);
    if (error.message?.startsWith('Article') || error.message?.startsWith('Quantité')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/loans/:id/add-item — add item to existing loan
router.post('/:id/add-item', requirePermission('loans', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;
    const {
      articleId, quantity,
      articleName, categoryName, conditionOnLoan, returnedQuantity, expectedReturnDate,
    } = req.body;

    if (!articleId || !quantity) {
      res.status(400).json({ error: 'articleId and quantity are required' });
      return;
    }

    // `parseInt` d'une entrée non numérique donne NaN : la comparaison
    // `availableQuantity < NaN` est fausse, donc le contrôle de stock laissait
    // passer, et le `decrement: NaN` faisait échouer Prisma en 500. Un
    // `quantity` négatif était pire encore : il INCRÉMENTAIT le stock
    // (`decrement` d'un négatif = `increment`). On exige un entier positif.
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      res.status(400).json({ error: 'الكمية غير صالحة' });
      return;
    }

    const loan = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    if (loan.status === 'retourne' || loan.status === 'definitif') {
      res.status(400).json({ error: 'Loan is already closed' });
      return;
    }

    // Verify article exists and has enough quantity
    const article = await prisma.article.findFirst({
      where: { id: articleId, associationId },
    });

    if (!article) {
      res.status(400).json({ error: 'Article not found' });
      return;
    }

    if (article.availableQuantity < qty) {
      res.status(400).json({ error: `Insufficient quantity for article ${article.name}` });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentItems: any[] = loan.items as any[];
      const newQty = qty;
      const newDate = expectedReturnDate ? String(expectedReturnDate) : undefined;

      // Philosophie: chaque occurrence d'un article est une ligne distincte.
      // Deux ajouts du MÊME article ne fusionnent que s'ils portent la MÊME
      // date de retour prévue (ou si les deux n'en ont pas). Avec des dates
      // différentes → deux lignes séparées (échéances indépendantes).
      const matchIndex = currentItems.findIndex((i: any) => {
        if (i.articleId !== articleId) return false;
        const itemDate = i.expectedReturnDate ? String(i.expectedReturnDate) : undefined;
        return itemDate === newDate;
      });

      if (matchIndex >= 0) {
        // Fusion sur la même occurrence (même article + même date) : on somme
        // et on rafraîchit les attributs clients sans écraser la date existante.
        currentItems[matchIndex].quantity += newQty;
        if (articleName !== undefined) currentItems[matchIndex].articleName = articleName;
        if (categoryName !== undefined) currentItems[matchIndex].categoryName = categoryName;
        if (conditionOnLoan !== undefined) currentItems[matchIndex].conditionOnLoan = conditionOnLoan;
        // Si l'utilisateur fournit une date sur une ligne sans date, on l'applique ;
        // sinon on garde la date existante (refus d'écraser une échéance).
        if (newDate !== undefined) currentItems[matchIndex].expectedReturnDate = newDate;
      } else {
        // Nouvelle occurrence → nouvel identifiant de ligne unique.
        currentItems.push({
          itemKey: crypto.randomUUID(),
          articleId,
          articleName,
          categoryName,
          quantity: newQty,
          // Une nouvelle ligne ne peut pas être déjà rendue : `returnedQuantity`
          // venait du body sans borne, ce qui créait une ligne « rendue » alors
          // que le stock venait d'être décrémenté (unités perdues, sans sortie).
          returnedQuantity: 0,
          conditionOnLoan,
          expectedReturnDate: newDate,
        });
      }

      // `associationId` dans le WHERE : `articleId` a bien été vérifié plus
      // haut, mais rescoper l'écriture ferme la classe de bug (cf. E1).
      const decremented = await tx.article.updateMany({
        where: { id: articleId, associationId },
        data: { availableQuantity: { decrement: newQty } },
      });
      if (decremented.count !== 1) {
        throw new Error('ARTICLE_NOT_IN_ASSOCIATION');
      }

      const updatedLoan = await tx.loan.update({
        where: { id, associationId },
        data: { items: currentItems },
      });

      return updatedLoan;
    });

    await logAudit(req, { action: 'update', resource: 'loan', resourceId: req.params.id, description: 'Article ajouté au prêt' });
    res.json(result);
  } catch (error) {
    console.error('Error adding item to loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/loans/:id/remove-item/:itemKey — remove one occurrence (line) from loan
router.delete('/:id/remove-item/:itemKey', requirePermission('loans', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, itemKey } = req.params;
    const associationId = req.user!.associationId;

    const loan = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    if (loan.status === 'retourne' || loan.status === 'definitif') {
      res.status(400).json({ error: 'Loan is already closed' });
      return;
    }

    const currentItems: any[] = loan.items as any[];
    // Cible une occurrence précise (itemKey) ; fallback articleId pour prêts legacy.
    const itemIndex = currentItems.findIndex(
      (i: any) => i.itemKey === itemKey || (!i.itemKey && i.articleId === itemKey)
    );

    if (itemIndex < 0) {
      res.status(404).json({ error: 'Item not found in loan' });
      return;
    }

    const removedItem = currentItems[itemIndex];

    const result = await prisma.$transaction(async (tx) => {
      const remainingQuantity = removedItem.quantity - (removedItem.returnedQuantity || 0);
      if (remainingQuantity > 0) {
        // Même raison qu'au retour : `removedItem.articleId` vient du JSON
        // `items` d'un prêt éventuellement antérieur au contrôle d'écriture.
        const restored = await tx.article.updateMany({
          where: { id: removedItem.articleId, associationId },
          data: { availableQuantity: { increment: remainingQuantity } },
        });
        if (restored.count === 0) {
          throw new Error(`ARTICLE_NOT_IN_ASSOCIATION: ${removedItem.articleId}`);
        }
      }

      currentItems.splice(itemIndex, 1);

      const updatedLoan = await tx.loan.update({
        where: { id, associationId },
        data: { items: currentItems },
      });

      return updatedLoan;
    });

    await logAudit(req, { action: 'update', resource: 'loan', resourceId: req.params.id, description: 'Article retiré du prêt' });
    res.json(result);
  } catch (error) {
    console.error('Error removing item from loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/loans/:id/mark-definitive
router.put('/:id/mark-definitive', requirePermission('loans', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const loan = await prisma.loan.findFirst({
      where: { id, associationId },
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    if (loan.status === 'definitif') {
      res.status(400).json({ error: 'Loan is already marked as definitive' });
      return;
    }

    // Marquer « définitif » ferme le prêt sans passage par la case « retour » :
    // sans cette restitution, les unités encore sorties du stock étaient
    // perdues pour toujours — invisibles dans le prêt (fermé) comme dans le
    // stock (jamais recréditées). On rend donc au stock tout ce qui reste dû.
    const items: any[] = (loan.items as any[]) || [];
    const updatedLoan = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (!item?.articleId) continue;
        const aRendre = Number(item.quantity || 0) - Number(item.returnedQuantity || 0);
        if (aRendre > 0) {
          await tx.article.updateMany({
            where: { id: item.articleId, associationId },
            data: { availableQuantity: { increment: aRendre } },
          });
          item.returnedQuantity = Number(item.quantity || 0);
        }
      }

      return tx.loan.update({
        where: { id, associationId },
        data: {
          items,
          status: 'definitif',
          actualReturnDate: new Date(),
        },
      });
    });

    await logAudit(req, { action: 'update', resource: 'loan', resourceId: updatedLoan.id, description: 'Prêt marqué définitif' });
    res.json(updatedLoan);
  } catch (error) {
    console.error('Error marking loan as definitive:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

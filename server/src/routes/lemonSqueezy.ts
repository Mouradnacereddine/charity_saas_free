import { Router, Response, Request } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { z } from 'zod';
import { config } from '../config';
import { requireAuth, AuthRequest } from '../middleware/auth';

/**
 * Tip jar « Faire un don au développeur » — paiement via LemonSqueezy
 * directement sur le compte du développeur (PDG). Aucune persistance
 * interne : le module interne de gestion des dons (Donor/DonationReceipt/
 * Transaction) n'est PAS utilisé.
 */

const router = Router();

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

// Devise du store (vérifiée via API : DZD). custom_price est en centimes.
// Minimum RÉEL vérifié via POST /v1/checkouts (17/08/2026) : LemonSqueezy rejette
// tout custom_price < DZD66.09 (422 « at least DZD66.09 ») → seuil backend = 67
// (entier suivant) pour garantir que la validation passe côté LemonSqueezy.
const CURRENCY = config.lemonSqueezyCurrency.toUpperCase();
const CURRENCY_SYMBOL = CURRENCY === 'DZD' ? 'DZD' : '€';
const MIN_AMOUNT = CURRENCY === 'DZD' ? 67 : 1;
const MAX_AMOUNT = CURRENCY === 'DZD' ? 100000 : 1000;

// Montant dans la devise du store (ex : 10.5). Compris entre le minimum
// (66 DZD / 1 €) et un plafond raisonnable.
const checkoutSchema = z
  .object({
    amount: z.number().positive('Le montant doit être supérieur à 0'),
    email: z.string().email('Email invalide').optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.amount < MIN_AMOUNT) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount'],
        message: `Le montant minimal est de ${MIN_AMOUNT} ${CURRENCY_SYMBOL}`,
      });
    } else if (data.amount > MAX_AMOUNT) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount'],
        message: `Le montant ne peut pas dépasser ${MAX_AMOUNT.toLocaleString('fr-FR')} ${CURRENCY_SYMBOL}`,
      });
    }
  });

router.get('/config', requireAuth, (_req: AuthRequest, res: Response): void => {
  res.json({
    enabled: Boolean(config.lemonSqueezyApiKey),
    currency: CURRENCY,
    minAmount: MIN_AMOUNT,
  });
});

// POST /api/lemon-squeezy/checkout — crée un checkout LemonSqueezy et renvoie son URL
router.post('/checkout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!config.lemonSqueezyApiKey) {
      res.status(503).json({ error: 'LemonSqueezy n’est pas configuré' });
      return;
    }
    if (!config.lemonSqueezyStoreId || !config.lemonSqueezyVariantId) {
      res.status(503).json({ error: 'Le produit de don (store/variant) n’est pas encore configuré' });
      return;
    }

    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Montant invalide' });
      return;
    }
    const { amount, email } = parsed.data;

    const custom: Record<string, string> = { amount: String(amount) };
    if (email) custom.email = email;

    const { data } = await axios.post(
      `${LEMONSQUEEZY_API_URL}/checkouts`,
      {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: { custom },
            product_options: {
              name: 'Don de soutien — SaaS Association Caritative',
              description: 'Soutien au développeur',
            },
            checkout_options: {
              embed: false,
              dark: false,
            },
            custom_price: Math.round(amount * 100),
          },
          relationships: {
            store: { data: { type: 'stores', id: config.lemonSqueezyStoreId } },
            variant: { data: { type: 'variants', id: config.lemonSqueezyVariantId } },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.lemonSqueezyApiKey}`,
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
        },
      }
    );

    const checkoutUrl = data?.data?.attributes?.url;
    if (!checkoutUrl) {
      res.status(502).json({ error: 'LemonSqueezy n’a pas renvoyé d’URL de checkout' });
      return;
    }
    res.json({ checkoutUrl });
  } catch (err: any) {
    const status = err?.response?.status;
    let lsError = err?.response?.data?.errors?.[0]?.detail || err?.response?.data?.error;
    // Carte de lecture : transformer l'erreur brute de LemonSqueezy en message
    // français utile pour l'utilisateur final (affiché tel quel côté frontend).
    if (lsError && /custom price field must be at least/i.test(String(lsError))) {
      const match = String(lsError).match(/at least\s+[A-Za-z]{3}?([\d.]+)/i);
      const min = match?.[1] || String(MIN_AMOUNT);
      lsError = `Le montant minimal accepté par LemonSqueezy est de ${min} ${CURRENCY_SYMBOL}`;
    }
    console.error('❌ [lemon-squeezy] checkout failed:', status || err?.message);
    res.status(status && status >= 400 && status < 500 ? status : 502).json({
      error: lsError || 'Échec de la création du checkout LemonSqueezy',
    });
  }
});

// POST /api/lemon-squeezy/webhook — vérifie la signature HMAC-SHA256 (X-Signature)
// et log l'événement. L'argent part directement sur le store du développeur,
// aucune persistance interne.
router.post('/webhook', (req: Request, res: Response): void => {
  const signature = Array.isArray(req.headers['x-signature'])
    ? req.headers['x-signature'][0]
    : req.headers['x-signature'];

  if (!config.lemonSqueezyWebhookSecret || !signature) {
    res.status(400).json({ error: 'Signature manquante' });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || ''));
  const expected = crypto.createHmac('sha256', config.lemonSqueezyWebhookSecret).update(rawBody).digest('hex');

  // timingSafeEqual exige deux buffers de même longueur : comparer les longueurs
  // d'abord pour éviter un RangeError 500 sur une signature malformée.
  const expectedBuffer = Buffer.from(expected, 'hex');
  const signatureBuffer = Buffer.from(String(signature), 'hex');
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    console.warn('❌ [lemon-squeezy] webhook signature invalide');
    res.status(401).json({ error: 'Signature invalide' });
    return;
  }

  try {
    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventName = payload?.meta?.event_name || payload?.data?.type || 'unknown';
    console.log(`🍋 [lemon-squeezy] webhook reçu : ${eventName}`);
    if (eventName === 'order_created') {
      const order = payload?.data?.attributes;
      console.log(
        `🍋 [lemon-squeezy] order_created — montant: ${order?.total_formatted || order?.total || '?'}, statut: ${order?.status || '?'}`
      );
    }
  } catch (parseErr) {
    console.warn('⚠️ [lemon-squeezy] webhook body non-JSON:', (parseErr as Error).message);
  }

  res.status(200).json({ received: true });
});

export default router;
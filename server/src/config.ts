import dotenv from 'dotenv';
dotenv.config();

// En production, signer avec un secret présent dans le dépôt revient à publier
// la clé de signature : `jwt.verify` accepterait alors tout jeton HS256 forgé
// avec la valeur par défaut, donc n'importe quel `{ userId, associationId, role }`.
// On refuse de démarrer plutôt que de servir une authentification contournable.
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

function resolveSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (!value) {
    if (isProduction) {
      throw new Error(
        `${name} is required in production. Refusing to start with a secret published in the repository.`,
      );
    }
    return devFallback;
  }
  if (isProduction && value.length < 32) {
    throw new Error(`${name} must be at least 32 characters in production.`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: resolveSecret('JWT_SECRET', 'dev-secret-change-in-production'),
  jwtRefreshSecret: resolveSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production-2026'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  bcryptRounds: 10,
  accessTokenExpiry: '15m' as const,
  refreshTokenExpiry: '7d' as const,
  inviteTokenExpiryDays: parseInt(process.env.INVITE_TOKEN_DAYS || '7', 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  lemonSqueezyApiKey: process.env.LEMONSQUEEZY_API_KEY || '',
  lemonSqueezyStoreId: process.env.LEMONSQUEEZY_STORE_ID || '',
  lemonSqueezyVariantId: process.env.LEMONSQUEEZY_VARIANT_ID || '',
  lemonSqueezyWebhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '',
  // Devise du store LemonSqueezy 453836 (vérifiée via API : DZD). Les montants
  // du tip jar (frontend + validation backend) en dépendent.
  lemonSqueezyCurrency: process.env.LEMONSQUEEZY_CURRENCY || 'DZD',
};

// Les avertissements ci-dessous ne concernent plus que le développement :
// en production, `resolveSecret` a déjà levé une exception au chargement.
if (!isProduction && !process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET env var in production.');
}
// force rebuild for GOOGLE_CLIENT_ID


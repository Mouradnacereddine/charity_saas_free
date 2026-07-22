import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production-2026',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  bcryptRounds: 10,
  accessTokenExpiry: '15m' as const,
  refreshTokenExpiry: '7d' as const,
  inviteTokenExpiryDays: parseInt(process.env.INVITE_TOKEN_DAYS || '7', 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
};

// Warn if default secrets are used in production (Vercel)
if (!process.env.VERCEL && !process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET env var in production.');
}
if (process.env.VERCEL && !process.env.JWT_SECRET) {
  console.error('🚨  CRITICAL: JWT_SECRET is not set in Vercel environment variables! Authentication will fail.');
}
if (process.env.VERCEL && !process.env.JWT_REFRESH_SECRET) {
  console.error('🚨  CRITICAL: JWT_REFRESH_SECRET is not set in Vercel environment variables! Token refresh will fail.');
}

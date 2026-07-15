import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  bcryptRounds: 10,
  accessTokenExpiry: '15m' as const,
  refreshTokenExpiry: '7d' as const,
  inviteTokenExpiryDays: parseInt(process.env.INVITE_TOKEN_DAYS || '7', 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
};

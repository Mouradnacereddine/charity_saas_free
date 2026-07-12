import dotenv from 'dotenv';

// Only load .env locally — Vercel uses its own env vars (VERCEL env is set automatically)
if (!process.env.VERCEL) {
  dotenv.config();
}

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Support both DATABASE_URL (standard) and POSTGRES_URL_NON_POOLING (Vercel Neon)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || '';

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

export default prisma;

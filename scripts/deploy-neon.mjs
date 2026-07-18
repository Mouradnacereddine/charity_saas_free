#!/usr/bin/env node
/**
 * Configure Neon DB: push schema + seed data
 * Run: node scripts/deploy-neon.mjs
 */
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const serverDir = resolve(root, 'server');

// Verify .env exists with Neon credentials
const envPath = resolve(serverDir, '.env');
if (!existsSync(envPath)) {
  console.error('❌ server/.env not found — write it first with Neon credentials');
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf-8');
if (!envContent.includes('neondb')) {
  console.error('❌ server/.env does not contain Neon credentials');
  process.exit(1);
}

console.log('☁️  Neon credentials found in server/.env');
console.log('');

// Step 1: Prisma generate
console.log('📦 Step 1/3: Prisma generate...');
execSync('npx prisma generate', { cwd: serverDir, stdio: 'inherit' });

// Step 2: Push schema
console.log('');
console.log('🗄️  Step 2/3: Push schema to Neon...');
execSync('npx prisma db push --accept-data-loss', { cwd: serverDir, stdio: 'inherit' });

// Step 3: Seed data
console.log('');
console.log('🌱 Step 3/3: Seed data...');
execSync('npx ts-node src/seed-data.ts', { cwd: serverDir, stdio: 'inherit' });

console.log('');
console.log('✅ Done! Neon database is ready.');

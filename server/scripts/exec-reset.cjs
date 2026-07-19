#!/usr/bin/env node
// Reset data on remote Neon DB — reads DATABASE_URL from .env.neon
const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.neon');
if (!fs.existsSync(envPath)) {
  console.error('.env.neon not found at ' + envPath);
  process.exit(1);
}
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/DATABASE_URL=(.+)/);
if (!match) {
  console.error('DATABASE_URL not found in .env.neon');
  process.exit(1);
}
const conn = match[1].replace(/^"(.*)"$/, '$1');
const adapter = new PrismaPg({ connectionString: conn });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🗑️  Deleting all data on Neon (preserving accounts)...\n');
  const tables = ['donationReceipt','donationAllocation','transaction','medicalReferral','loan','article','articleCategory','articleStatusType','storageLocation','schoolGrade','doctor','doctorSpecialty','medicalAnalysisType','medicalHospital','beneficiary','donor','caisse','bankAccount','notification'];
  for (const t of tables) {
    try { await prisma[t].deleteMany(); console.log('  ✔ ' + t); } catch(e) { console.log('  ⚠️ ' + t + ': ' + String(e).substring(0,80)); }
  }
  await prisma.caisse.updateMany({ data: { balance: 0 } });
  await prisma.bankAccount.updateMany({ data: { balance: 0 } });
  await prisma.donor.updateMany({ data: { totalDonated: 0 } });
  console.log('\n✅ Done. Accounts preserved.');
}
main().catch(console.error).finally(() => prisma.$disconnect());

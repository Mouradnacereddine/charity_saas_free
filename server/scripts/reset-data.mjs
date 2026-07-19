#!/usr/bin/env node
const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');
dotenv.config();

const conn = process.env.DATABASE_URL;
if (!conn) { console.error('DATABASE_URL not set'); process.exit(1); }

const adapter = new PrismaPg({ connectionString: conn });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🗑️  Deleting all data (preserving accounts)...\n');
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

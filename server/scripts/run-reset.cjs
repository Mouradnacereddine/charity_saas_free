#!/usr/bin/env node
const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const types = ['donationReceipt','donationAllocation','transaction','medicalReferral','loan','article','articleCategory','articleStatusType','storageLocation','schoolGrade','doctor','doctorSpecialty','medicalAnalysisType','medicalHospital','beneficiary','donor','caisse','bankAccount','notification'];
  for (const t of types) {
    try { await prisma[t].deleteMany(); console.log('OK ' + t); } catch(e) { console.log('SKIP ' + t); }
  }
  await prisma.caisse.updateMany({ data: { balance: 0 } });
  await prisma.bankAccount.updateMany({ data: { balance: 0 } });
  await prisma.donor.updateMany({ data: { totalDonated: 0 } });
  console.log('ALL DONE');
}
main().catch(console.error).finally(() => prisma.$disconnect());

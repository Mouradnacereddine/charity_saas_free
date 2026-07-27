/**
 * Migration: corrige les descriptions système en anglais/arabe
 *
 * Les anciennes transactions avaient description en français (ou mélangé).
 * Cette migration met à jour :
 *   - description → Medical referral (anglais)
 *   - descriptionAr → توجيه طبي (arabe)
 */
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mourad:devpwd@localhost:5432/association_charitable';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('\n🔄 Migration des descriptions système...\n');

  // 1) Migrer les Transactions liées aux orientations médicales
  const txToFix = await prisma.transaction.findMany({
    where: {
      description: { contains: 'Orientation médicale' },
    },
  });
  console.log(`📋 Transactions à corriger : ${txToFix.length}`);

  for (const tx of txToFix) {
    const analysisMatch = tx.description.match(/Orientation médicale( confirmée)? - (.+)/);
    const analysis = analysisMatch ? analysisMatch[2] : '';
    const isConfirmed = tx.description.includes('confirmée');

    const newDesc = isConfirmed
      ? `Medical referral confirmed - ${analysis}`
      : `Medical referral - ${analysis}`;

    await prisma.transaction.update({
      where: { id: tx.id },
      data: { description: newDesc },
    });
    console.log(`  ✅ ${tx.id.slice(0, 8)}… → ${newDesc}`);
  }

  // 2) Migrer les Transactions avec descriptionAr incorrecte (contenant du latin)
  const txArToFix = await prisma.transaction.findMany({
    where: {
      descriptionAr: { contains: 'Medical referral' },
    },
  });
  console.log(`\n📋 descriptionAr à corriger : ${txArToFix.length}`);

  for (const tx of txArToFix) {
    const analysisMatch = tx.descriptionAr.match(/Medical referral( confirmed)? - (.+)/);
    const analysis = analysisMatch ? analysisMatch[2] : '';
    const isConfirmed = tx.descriptionAr.includes('confirmed');

    const newDescAr = isConfirmed
      ? `توجيه طبي مؤكد - ${analysis}`
      : `توجيه طبي - ${analysis}`;

    await prisma.transaction.update({
      where: { id: tx.id },
      data: { descriptionAr: newDescAr },
    });
    console.log(`  ✅ ${tx.id.slice(0, 8)}… → ${newDescAr}`);
  }

  // 3) Migrer les MedicalReferral avec description intégrée (champ notes)
  //    Certains références ont le champ `description` dans les transactions
  //    qui doit être cohérent avec le nom du type d'analyse

  console.log('\n✅ Migration terminée !\n');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

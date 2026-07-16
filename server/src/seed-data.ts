import prisma from './lib/prisma';
import bcrypt from 'bcryptjs';
import { config } from './config';

function ref(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const r = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${prefix}-${y}${m}-${r}`;
}

async function main() {
  console.log('🌱 Seeding database...\n');

  // Find existing association by admin email, or create demo
  const adminEmail = 'nacereddinemourad09@gmail.com';
  let existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  let aid: string;

  if (existingUser) {
    aid = existingUser.associationId;
    console.log(`   ✓ Found existing association: ${aid}`);

    // Delete ALL data EXCEPT the User and Association records
    await prisma.donationReceipt.deleteMany({ where: { associationId: aid } });
    await prisma.donationAllocation.deleteMany({ where: { associationId: aid } });
    await prisma.transaction.deleteMany({ where: { associationId: aid } });
    await prisma.medicalReferral.deleteMany({ where: { associationId: aid } });
    await prisma.doctor.deleteMany({ where: { associationId: aid } });
    await prisma.doctorSpecialty.deleteMany({ where: { associationId: aid } });
    await prisma.loan.deleteMany({ where: { associationId: aid } });
    await prisma.article.deleteMany({ where: { associationId: aid } });
    await prisma.beneficiary.deleteMany({ where: { associationId: aid } });
    await prisma.donor.deleteMany({ where: { associationId: aid } });
    await prisma.notification.deleteMany({ where: { associationId: aid } });
    await prisma.inviteToken.deleteMany({ where: { associationId: aid } });
    await prisma.caisse.deleteMany({ where: { associationId: aid } });
    await prisma.bankAccount.deleteMany({ where: { associationId: aid } });
    await prisma.storageLocation.deleteMany({ where: { associationId: aid } });
    await prisma.articleCategory.deleteMany({ where: { associationId: aid } });
    await prisma.medicalAnalysisType.deleteMany({ where: { associationId: aid } });
    await prisma.medicalHospital.deleteMany({ where: { associationId: aid } });
    await prisma.schoolGrade.deleteMany({ where: { associationId: aid } });
    await prisma.articleStatusType.deleteMany({ where: { associationId: aid } });
    console.log('   ✓ Cleaned existing data (kept your account)');
  } else {
    // Create new demo association
    aid = (await prisma.association.create({
      data: { name: 'Association El-Kheir', nameAr: 'جمعية الخير', email: 'demo@association.dz', password: '' },
    })).id;

    await prisma.user.create({
      data: { associationId: aid, email: 'demo@association.dz', password: '', name: 'Admin', nameAr: 'مدير النظام', role: 'admin' },
    });
    console.log('   ✓ Association + admin user created');
  }

  const now = new Date();

  // Article Categories
  const cats = await Promise.all([
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Medical', nameAr: 'طبي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Scolaire', nameAr: 'مدرسي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Alimentaire', nameAr: 'غذائي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Vetement', nameAr: 'ملبس', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Mobilier', nameAr: 'أثاث', createdAt: now } }),
  ]);

  const locs = await Promise.all([
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot A - Rayon 1', nameAr: 'المستودع أ - الرف 1', createdAt: now } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot A - Rayon 2', nameAr: 'المستودع أ - الرف 2', createdAt: now } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot B', nameAr: 'المستودع ب', createdAt: now } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot C', nameAr: 'المستودع ج', createdAt: now } }),
  ]);

  await Promise.all([
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Analyse de sang', nameAr: 'تحليل دم', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Radiographie', nameAr: 'أشعة', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'IRM', nameAr: 'تصوير بالرنين', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Echographie', nameAr: 'فحص القلب', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Scanner', nameAr: 'سكانر', createdAt: now } }),
  ]);

  await Promise.all([
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Mustapha Pacha', nameAr: 'مستشفى مصطفى باشا', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Constantine', nameAr: 'مستشفى قسنطينة', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Clinique Belcourt', nameAr: 'عيادة بلكور', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Hopital Beni Messous', nameAr: 'مستشفى بني مسوس', createdAt: now } }),
  ]);

  const specialities = await Promise.all([
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Generaliste', nameAr: 'طب عام', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Pediatre', nameAr: 'طب أطفال', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Ophtalmologue', nameAr: 'طب العيون', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Cardiologue', nameAr: 'طب القلب', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Chirurgien', nameAr: 'جراح', createdAt: now } }),
  ]);

  const caisses = await Promise.all([
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Sociale', nameAr: 'الصندوق الاجتماعي', subCategories: [{ id: crypto.randomUUID(), name: 'Aide alimentaire', nameAr: 'مساعدة غذائية' }, { id: crypto.randomUUID(), name: 'Aide scolaire', nameAr: 'مساعدة مدرسية' }, { id: crypto.randomUUID(), name: 'Aide loyer', nameAr: 'مساعدة إيجار' }], balance: 85000, createdAt: now, updatedAt: now } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Medicale', nameAr: 'الصندوق الطبي', subCategories: [{ id: crypto.randomUUID(), name: 'Analyses', nameAr: 'تحاليل' }, { id: crypto.randomUUID(), name: 'Ophtalmologie', nameAr: 'طب العيون' }, { id: crypto.randomUUID(), name: 'Medicaments', nameAr: 'أدوية' }], balance: 120000, createdAt: now, updatedAt: now } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Kafala', nameAr: 'صندوق الكفالة', subCategories: [{ id: crypto.randomUUID(), name: 'Kafala orphelin', nameAr: 'كفالة يتيم' }, { id: crypto.randomUUID(), name: 'Kafala veuve', nameAr: 'كفالة أرملة' }], balance: 200000, createdAt: now, updatedAt: now } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Zakat', nameAr: 'صندوق الزكاة', subCategories: [{ id: crypto.randomUUID(), name: 'Zakat Al-Mal', nameAr: 'زكاة المال' }, { id: crypto.randomUUID(), name: 'Zakat Al-Fitr', nameAr: 'زكاة الفطر' }], balance: 350000, createdAt: now, updatedAt: now } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Generale', nameAr: 'الصندوق العام', subCategories: [], balance: 45000, createdAt: now, updatedAt: now } }),
  ]);

  const banks = await Promise.all([
    prisma.bankAccount.create({ data: { associationId: aid, bankName: 'BNA', bankNameAr: 'البنك الوطني', accountNumber: '00212345678901', rib: '02000123456789', iban: 'DZ030020001234567890000101', swift: 'BNAADZAL', balance: 850000, createdAt: now, updatedAt: now } }),
    prisma.bankAccount.create({ data: { associationId: aid, bankName: 'CPA', bankNameAr: 'القرض الشعبي', accountNumber: '00598765432109', rib: '03000287654321', iban: 'DZ050030002876543210000202', swift: 'CPALDZAL', balance: 420000, createdAt: now, updatedAt: now } }),
  ]);

  const bens = await Promise.all([
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Fatima', lastName: 'Zahra', firstNameAr: 'فاطمة', lastNameAr: 'الزهراء', address: '15 Rue des Freres, Alger', addressAr: '15 شارع الإخوة، الجزائر', phone: '0551234567', nationalCardNumber: '123456789012345', dateOfBirth: new Date(now.getTime() - 15000 * 86400000), attribut: 'veuve', gender: 'female', caisseId: caisses[2].id, children: [{ id: crypto.randomUUID(), firstName: 'Mohamed', lastName: 'Ben Fatima', firstNameAr: 'محمد', lastNameAr: 'بن فاطمة', dateOfBirth: '2014-08-22', gender: 'male', healthStatus: 'bonne_sante' }, { id: crypto.randomUUID(), firstName: 'Amina', lastName: 'Ben Fatima', firstNameAr: 'أمينة', lastNameAr: 'بن فاطمة', dateOfBirth: '2018-03-10', gender: 'female', healthStatus: 'bonne_sante' }], createdAt: new Date(now.getTime() - 120 * 86400000), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Khadija', lastName: 'Mansouri', firstNameAr: 'خديجة', lastNameAr: 'منصوري', address: 'Cite 500 Logts, Oran', addressAr: 'حي 500 مسكن، وهران', phone: '0552345678', nationalCardNumber: '987654321098765', dateOfBirth: new Date(now.getTime() - 20000 * 86400000), attribut: 'veuve', gender: 'female', caisseId: caisses[1].id, children: [{ id: crypto.randomUUID(), firstName: 'Karim', lastName: 'Ben Khadija', firstNameAr: 'كريم', lastNameAr: 'بن خديجة', dateOfBirth: '2008-09-14', gender: 'male', healthStatus: 'bonne_sante' }], createdAt: new Date(now.getTime() - 90 * 86400000), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Ahmed', lastName: 'Benali', firstNameAr: 'أحمد', lastNameAr: 'بن علي', address: 'Douar Ouled Sidi, Blida', addressAr: 'دوار أولاد سيدي، البليدة', phone: '0553456789', nationalCardNumber: '456789123456789', dateOfBirth: new Date(now.getTime() - 12000 * 86400000), attribut: 'orphelin', gender: 'male', caisseId: caisses[2].id, children: [], createdAt: new Date(now.getTime() - 60 * 86400000), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Aicha', lastName: 'Boumediene', firstNameAr: 'عائشة', lastNameAr: 'بومدين', address: 'Route de Setif', addressAr: 'طريق سطيف', phone: '0554567890', nationalCardNumber: '654321987654321', dateOfBirth: new Date(now.getTime() - 22000 * 86400000), attribut: 'personne_agee', gender: 'female', caisseId: caisses[0].id, children: [], createdAt: new Date(now.getTime() - 45 * 86400000), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Malika', lastName: 'Djouadi', firstNameAr: 'مالكة', lastNameAr: 'جودي', address: 'Hai Nasr, Constantine', addressAr: 'حي نصر، قسنطينة', phone: '0555678901', nationalCardNumber: '321654987321654', dateOfBirth: new Date(now.getTime() - 10000 * 86400000), attribut: 'famille_demunie', gender: 'female', caisseId: caisses[0].id, children: [{ id: crypto.randomUUID(), firstName: 'Nadia', lastName: 'Ben Malika', firstNameAr: 'نادية', lastNameAr: 'بن مالك', dateOfBirth: '2017-05-12', gender: 'female', healthStatus: 'bonne_sante' }], createdAt: new Date(now.getTime() - 30 * 86400000), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Said', lastName: 'Hadj Ahmed', firstNameAr: 'سعيد', lastNameAr: 'حاج أحمد', address: 'Quartier El Harrach', addressAr: 'حي الحراش', phone: '0556789012', nationalCardNumber: '159357852456', dateOfBirth: new Date(now.getTime() - 8000 * 86400000), attribut: 'handicape', gender: 'male', caisseId: caisses[4].id, children: [], createdAt: new Date(now.getTime() - 20 * 86400000), updatedAt: now } }),
  ]);

  const donors = await Promise.all([
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Abdelkader', lastName: 'Hadj', firstNameAr: 'عبد القادر', lastNameAr: 'حاج', phone: '0661112233', email: 'a.hadj@email.dz', totalDonated: 250000, createdAt: new Date(now.getTime() - 200 * 86400000), updatedAt: now } }),
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Noureddine', lastName: 'Khaldi', firstNameAr: 'نور الدين', lastNameAr: 'خالدي', phone: '0677445566', email: 'n.khaldi@entreprise.dz', totalDonated: 500000, createdAt: new Date(now.getTime() - 180 * 86400000), updatedAt: now } }),
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Samia', lastName: 'Boukhari', firstNameAr: 'سامية', lastNameAr: 'بوقاري', phone: '0557889900', totalDonated: 120000, createdAt: new Date(now.getTime() - 150 * 86400000), updatedAt: now } }),
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Ali', lastName: 'Mammeri', firstNameAr: 'علي', lastNameAr: 'معمري', phone: '0663334455', email: 'ali.mammeri@mail.dz', totalDonated: 80000, createdAt: new Date(now.getTime() - 100 * 86400000), updatedAt: now } }),
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Fatima Zohra', lastName: 'Benkhelifa', firstNameAr: 'فاطمة الزهراء', lastNameAr: 'بن خليفة', phone: '0559988776', totalDonated: 350000, createdAt: new Date(now.getTime() - 60 * 86400000), updatedAt: now } }),
  ]);

  const doctors = await Promise.all([
    prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Amina', lastName: 'Belkacem', firstNameAr: 'أمينة', lastNameAr: 'بلقاسم', phone: '0551987654', email: 'amina.belkacem@med.dz', specialtyId: specialities[0].id, address: 'Clinique El Biar, Alger', notes: 'Disponible les lundis et mercredis', createdAt: new Date(now.getTime() - 120 * 86400000), updatedAt: now } }),
    prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Mourad', lastName: 'Bensebaa', firstNameAr: 'مراد', lastNameAr: 'بن سبع', phone: '0555765432', email: 'm.bensebaa@chu.dz', specialtyId: specialities[3].id, address: 'CHU Mustapha, service cardiologie', notes: 'Professeur, consultations le samedi', createdAt: new Date(now.getTime() - 100 * 86400000), updatedAt: now } }),
    prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Nadia', lastName: 'Amirouche', firstNameAr: 'نادية', lastNameAr: 'عميروش', phone: '0661122334', email: 'n.amirouche@yahoo.fr', specialtyId: specialities[2].id, address: '34 Rue Didouche Mourad, Alger', notes: 'Chirurgie de la cataracte', createdAt: new Date(now.getTime() - 80 * 86400000), updatedAt: now } }),
    prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Rachid', lastName: 'Ouali', firstNameAr: 'رشيد', lastNameAr: 'والي', phone: '0556677889', specialtyId: specialities[1].id, address: 'Polyclinique Bab El Oued', createdAt: new Date(now.getTime() - 60 * 86400000), updatedAt: now } }),
  ]);

  // Medical Referrals
  for (let i = 0; i < 2; i++) {
    await prisma.medicalReferral.create({
      data: {
        associationId: aid, reference: ref('MED'),
        beneficiaryId: bens[i].id,
        caisseId: caisses[1].id,
        doctorId: doctors[i].id,
        analysisType: i === 0 ? 'Bilan sanguin' : 'Echographie',
        analysisTypeAr: i === 0 ? 'تحليل دم شامل' : 'تخطيط صدى القلب',
        hospital: i === 0 ? 'CHU Mustapha Pacha' : undefined,
        hospitalAr: i === 0 ? 'مستشفى مصطفى باشا' : undefined,
        amount: i === 0 ? 4500 : 8000,
        amountInWords: i === 0 ? '4500 DZD' : '8000 DZD',
        amountInWordsAr: i === 0 ? 'أربعة آلاف وخمسمائة دينار' : 'ثمانية آلاف دينار',
        status: i === 0 ? 'completed' : 'pending',
        date: new Date(now.getTime() - (i === 0 ? 25 : 12) * 86400000),
        createdAt: now, updatedAt: now,
      },
    });
  }

  // Update caisse balance for completed referral
  await prisma.caisse.update({ where: { id: caisses[1].id }, data: { balance: { decrement: 4500 } } });

  // Transaction: credit (with receipt)
  const tx1 = await prisma.transaction.create({
    data: { associationId: aid, type: 'credit', amount: 50000, amountInWords: '50000 DZD', amountInWordsAr: '50000 دينار', fundSource: 'caisse_physique', caisseId: caisses[3].id, donorId: donors[0].id, description: 'Don Zakat', descriptionAr: 'تبرع زكاة', receiptNumber: ref('BON'), date: new Date(now.getTime() - 200 * 86400000), createdAt: now, updatedAt: now },
  });
  await prisma.donationReceipt.create({
    data: { associationId: aid, receiptNumber: tx1.receiptNumber!, donorId: donors[0].id, donorName: `${donors[0].firstName} ${donors[0].lastName}`, donorNameAr: `${donors[0].lastNameAr} ${donors[0].firstNameAr}`, transactionId: tx1.id, amount: 50000, amountInWords: '50000 DZD', amountInWordsAr: '50000 دينار', caisseId: caisses[3].id, caisseName: caisses[3].name, caisseNameAr: caisses[3].nameAr, date: tx1.date, createdAt: now },
  });

  // Debit transaction
  await prisma.transaction.create({
    data: { associationId: aid, type: 'debit', amount: 12000, amountInWords: '12000 DZD', amountInWordsAr: '12000 دينار', fundSource: 'caisse_physique', caisseId: caisses[1].id, beneficiaryId: bens[0].id, description: 'Aide medicale', descriptionAr: 'مساعدة طبية', date: new Date(now.getTime() - 30 * 86400000), createdAt: now, updatedAt: now },
  });

  // Update balances
  await prisma.caisse.update({ where: { id: caisses[3].id }, data: { balance: { increment: 50000 } } });
  await prisma.caisse.update({ where: { id: caisses[1].id }, data: { balance: { decrement: 12000 } } });

  // Articles
  await Promise.all([
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Fauteuil roulant adulte', nameAr: 'كرسي متحرك للكبار', categoryId: cats[0].id, quantity: 15, availableQuantity: 10, status: 'disponible', storageLocationId: locs[0].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: now, updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Cartable scolaire', nameAr: 'حقيبة مدرسية', categoryId: cats[1].id, quantity: 50, availableQuantity: 50, status: 'disponible', storageLocationId: locs[2].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: now, updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Colis alimentaire', nameAr: 'سلة غذائية', categoryId: cats[2].id, quantity: 200, availableQuantity: 200, status: 'disponible', storageLocationId: locs[2].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: now, updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Couverture polaire', nameAr: 'بطانية صوفية', categoryId: cats[3].id, quantity: 80, availableQuantity: 75, status: 'disponible', storageLocationId: locs[1].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: now, updatedAt: now } }),
  ]);

  // Loans
  await prisma.loan.create({
    data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[0].id, status: 'en_cours',
      items: [{ articleName: 'Fauteuil roulant adulte', articleNameAr: 'كرسي متحرك للكبار', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' }],
      loanDate: new Date(now.getTime() - 30 * 86400000), expectedReturnDate: new Date(now.getTime() + 30 * 86400000), createdAt: now, updatedAt: now },
  });

  // Notifications
  await prisma.notification.create({ data: { associationId: aid, type: 'info', message: 'Bienvenue', messageAr: 'مرحباً', read: false, createdAt: now } });

  console.log('\n✅ Seed completed successfully!\n');
  console.log(`   📊 Contenu dans votre association :`);
  console.log(`   - 5 categories d'articles`);
  console.log(`   - 4 emplacements de stockage`);
  console.log(`   - 5 types d'analyses medicales`);
  console.log(`   - 4 hopitaux`);
  console.log(`   - 5 specialites medicales`);
  console.log(`   - 5 caisses avec sous-categories`);
  console.log(`   - 2 comptes bancaires`);
  console.log(`   - 6 beneficiaires`);
  console.log(`   - 5 donateurs`);
  console.log(`   - 4 medecins`);
  console.log(`   - 2 orientations medicales`);
  console.log(`   - 2 transactions`);
  console.log(`   - 4 articles`);
  console.log(`   - 1 pret`);
  console.log(`   - 2 notifications`);
  console.log(`\n   👉 Votre compte admin est conserve: ${adminEmail}`);
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

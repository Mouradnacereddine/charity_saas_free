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

  // Clean all tables
  await prisma.donationReceipt.deleteMany();
  await prisma.donationAllocation.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.medicalReferral.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.doctorSpecialty.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.article.deleteMany();
  await prisma.beneficiary.deleteMany();
  await prisma.donor.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.inviteToken.deleteMany();
  await prisma.caisse.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.storageLocation.deleteMany();
  await prisma.articleCategory.deleteMany();
  await prisma.medicalAnalysisType.deleteMany();
  await prisma.medicalHospital.deleteMany();
  await prisma.user.deleteMany();
  await prisma.association.deleteMany();

  console.log('   ✓ Cleaned existing data');

  // Association + Admin user (for Google OAuth — no password)
  const aid = (await prisma.association.create({
    data: { name: 'Association El-Kheir', nameAr: 'جمعية الخير', email: 'demo@association.dz', password: '' },
  })).id;

  await prisma.user.create({
    data: { associationId: aid, email: 'demo@association.dz', password: '', name: 'Admin', nameAr: 'مدير النظام', role: 'admin' },
  });
  console.log('   ✓ Association + admin user created');

  const now = new Date();
  const day = (n: number) => new Date(now.getTime() - n * 86400000);

  // Article Categories
  const cats = await Promise.all([
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Medical', nameAr: 'طبي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Scolaire', nameAr: 'مدرسي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Alimentaire', nameAr: 'غذائي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Vetement', nameAr: 'ملبس', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Mobilier', nameAr: 'أثاث', createdAt: now } }),
  ]);

  // Storage Locations
  const locs = await Promise.all([
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot A - Rayon 1', nameAr: 'المستودع أ - الرف 1', createdAt: now } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot A - Rayon 2', nameAr: 'المستودع أ - الرف 2', createdAt: now } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot B', nameAr: 'المستودع ب', createdAt: now } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot C', nameAr: 'المستودع ج', createdAt: now } }),
  ]);

  // Analysis Types
  await Promise.all([
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Analyse de sang', nameAr: 'تحليل دم', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Radiographie', nameAr: 'أشعة', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'IRM', nameAr: 'تصوير بالرنين', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Echographie', nameAr: 'فحص القلب', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Scanner', nameAr: 'سكانر', createdAt: now } }),
  ]);

  // Hospitals
  await Promise.all([
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Mustapha Pacha', nameAr: 'مستشفى مصطفى باشا', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Constantine', nameAr: 'مستشفى قسنطينة', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Clinique Belcourt', nameAr: 'عيادة بلكور', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Hopital Beni Messous', nameAr: 'مستشفى بني مسوس', createdAt: now } }),
  ]);

  // Doctor Specialties
  const specialities = await Promise.all([
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Generaliste', nameAr: 'طب عام', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Pediatre', nameAr: 'طب أطفال', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Ophtalmologue', nameAr: 'طب العيون', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Cardiologue', nameAr: 'طب القلب', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Chirurgien', nameAr: 'جراح', createdAt: now } }),
  ]);

  // Caisses
  const caisses = await Promise.all([
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Sociale', nameAr: 'الصندوق الاجتماعي', subCategories: [{ id: crypto.randomUUID(), name: 'Aide alimentaire', nameAr: 'مساعدة غذائية' }, { id: crypto.randomUUID(), name: 'Aide scolaire', nameAr: 'مساعدة مدرسية' }, { id: crypto.randomUUID(), name: 'Aide loyer', nameAr: 'مساعدة إيجار' }], balance: 85000, createdAt: now, updatedAt: now } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Medicale', nameAr: 'الصندوق الطبي', subCategories: [{ id: crypto.randomUUID(), name: 'Analyses', nameAr: 'تحاليل' }, { id: crypto.randomUUID(), name: 'Ophtalmologie', nameAr: 'طب العيون' }, { id: crypto.randomUUID(), name: 'Medicaments', nameAr: 'أدوية' }], balance: 120000, createdAt: now, updatedAt: now } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Kafala', nameAr: 'صندوق الكفالة', subCategories: [{ id: crypto.randomUUID(), name: 'Kafala orphelin', nameAr: 'كفالة يتيم' }, { id: crypto.randomUUID(), name: 'Kafala veuve', nameAr: 'كفالة أرملة' }], balance: 200000, createdAt: now, updatedAt: now } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Zakat', nameAr: 'صندوق الزكاة', subCategories: [{ id: crypto.randomUUID(), name: 'Zakat Al-Mal', nameAr: 'زكاة المال' }, { id: crypto.randomUUID(), name: 'Zakat Al-Fitr', nameAr: 'زكاة الفطر' }], balance: 350000, createdAt: now, updatedAt: now } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Generale', nameAr: 'الصندوق العام', subCategories: [], balance: 45000, createdAt: now, updatedAt: now } }),
  ]);

  // Bank Accounts
  const banks = await Promise.all([
    prisma.bankAccount.create({ data: { associationId: aid, bankName: 'BNA', bankNameAr: 'البنك الوطني', accountNumber: '00212345678901', rib: '02000123456789', iban: 'DZ030020001234567890000101', swift: 'BNAADZAL', balance: 850000, createdAt: now, updatedAt: now } }),
    prisma.bankAccount.create({ data: { associationId: aid, bankName: 'CPA', bankNameAr: 'القرض الشعبي', accountNumber: '00598765432109', rib: '03000287654321', iban: 'DZ050030002876543210000202', swift: 'CPALDZAL', balance: 420000, createdAt: now, updatedAt: now } }),
  ]);

  console.log('   ✓ Reference data + caisses + banks created');

  // Beneficiaries
  const bens = await Promise.all([
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Fatima', lastName: 'Zahra', firstNameAr: 'فاطمة', lastNameAr: 'الزهراء', address: '15 Rue des Freres, Alger', addressAr: '15 شارع الإخوة، الجزائر', phone: '0551234567', nationalCardNumber: '123456789012345', dateOfBirth: day(15000), attribut: 'veuve', gender: 'female', caisseId: caisses[2].id, children: [{ id: crypto.randomUUID(), firstName: 'Mohamed', lastName: 'Ben Fatima', firstNameAr: 'محمد', lastNameAr: 'بن فاطمة', dateOfBirth: '2014-08-22', gender: 'male', healthStatus: 'bonne_sante' }, { id: crypto.randomUUID(), firstName: 'Amina', lastName: 'Ben Fatima', firstNameAr: 'أمينة', lastNameAr: 'بن فاطمة', dateOfBirth: '2018-03-10', gender: 'female', healthStatus: 'bonne_sante' }], createdAt: day(120), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Khadija', lastName: 'Mansouri', firstNameAr: 'خديجة', lastNameAr: 'منصوري', address: 'Cite 500 Logts, Oran', addressAr: 'حي 500 مسكن، وهران', phone: '0552345678', nationalCardNumber: '987654321098765', dateOfBirth: day(20000), attribut: 'veuve', gender: 'female', caisseId: caisses[1].id, children: [{ id: crypto.randomUUID(), firstName: 'Karim', lastName: 'Ben Khadija', firstNameAr: 'كريم', lastNameAr: 'بن خديجة', dateOfBirth: '2008-09-14', gender: 'male', healthStatus: 'bonne_sante' }], createdAt: day(90), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Ahmed', lastName: 'Benali', firstNameAr: 'أحمد', lastNameAr: 'بن علي', address: 'Douar Ouled Sidi, Blida', addressAr: 'دوار أولاد سيدي، البليدة', phone: '0553456789', nationalCardNumber: '456789123456789', dateOfBirth: day(12000), attribut: 'orphelin', gender: 'male', caisseId: caisses[2].id, children: [], createdAt: day(60), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Aicha', lastName: 'Boumediene', firstNameAr: 'عائشة', lastNameAr: 'بومدين', address: 'Route de Setif', addressAr: 'طريق سطيف', phone: '0554567890', nationalCardNumber: '654321987654321', dateOfBirth: day(22000), attribut: 'personne_agee', gender: 'female', caisseId: caisses[0].id, children: [], createdAt: day(45), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Malika', lastName: 'Djouadi', firstNameAr: 'مالكة', lastNameAr: 'جودي', address: 'Hai Nasr, Constantine', addressAr: 'حي نصر، قسنطينة', phone: '0555678901', nationalCardNumber: '321654987321654', dateOfBirth: day(10000), attribut: 'famille_demunie', gender: 'female', caisseId: caisses[0].id, children: [{ id: crypto.randomUUID(), firstName: 'Nadia', lastName: 'Ben Malika', firstNameAr: 'نادية', lastNameAr: 'بن مالك', dateOfBirth: '2017-05-12', gender: 'female', healthStatus: 'bonne_sante' }], createdAt: day(30), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Said', lastName: 'Hadj Ahmed', firstNameAr: 'سعيد', lastNameAr: 'حاج أحمد', address: 'Quartier El Harrach', addressAr: 'حي الحراش', phone: '0556789012', nationalCardNumber: '159357852456', dateOfBirth: day(8000), attribut: 'handicape', gender: 'male', caisseId: caisses[4].id, children: [], createdAt: day(20), updatedAt: now } }),
  ]);
  console.log(`   ✓ ${bens.length} beneficiaries created`);

  // Donors
  const donors = await Promise.all([
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Abdelkader', lastName: 'Hadj', firstNameAr: 'عبد القادر', lastNameAr: 'حاج', phone: '0661112233', email: 'a.hadj@email.dz', totalDonated: 250000, createdAt: day(200), updatedAt: now } }),
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Noureddine', lastName: 'Khaldi', firstNameAr: 'نور الدين', lastNameAr: 'خالدي', phone: '0677445566', email: 'n.khaldi@entreprise.dz', totalDonated: 500000, createdAt: day(180), updatedAt: now } }),
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Samia', lastName: 'Boukhari', firstNameAr: 'سامية', lastNameAr: 'بوقاري', phone: '0557889900', totalDonated: 120000, createdAt: day(150), updatedAt: now } }),
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Ali', lastName: 'Mammeri', firstNameAr: 'علي', lastNameAr: 'معمري', phone: '0663334455', email: 'ali.mammeri@mail.dz', totalDonated: 80000, createdAt: day(100), updatedAt: now } }),
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Fatima Zohra', lastName: 'Benkhelifa', firstNameAr: 'فاطمة الزهراء', lastNameAr: 'بن خليفة', phone: '0559988776', totalDonated: 350000, createdAt: day(60), updatedAt: now } }),
  ]);
  console.log(`   ✓ ${donors.length} donors created`);

  // Doctors with specialties
  const doctors = await Promise.all([
    prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Amina', lastName: 'Belkacem', firstNameAr: 'أمينة', lastNameAr: 'بلقاسم', phone: '0551987654', email: 'amina.belkacem@med.dz', specialtyId: specialities[0].id, address: 'Clinique El Biar, Alger', notes: 'Disponible les lundis et mercredis', createdAt: day(120), updatedAt: now } }),
    prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Mourad', lastName: 'Bensebaa', firstNameAr: 'مراد', lastNameAr: 'بن سبع', phone: '0555765432', email: 'm.bensebaa@chu.dz', specialtyId: specialities[3].id, address: 'CHU Mustapha, service cardiologie', notes: 'Professeur, consultations le samedi', createdAt: day(100), updatedAt: now } }),
    prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Nadia', lastName: 'Amirouche', firstNameAr: 'نادية', lastNameAr: 'عميروش', phone: '0661122334', email: 'n.amirouche@yahoo.fr', specialtyId: specialities[2].id, address: '34 Rue Didouche Mourad, Alger', notes: 'Chirurgie de la cataracte', createdAt: day(80), updatedAt: now } }),
    prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Rachid', lastName: 'Ouali', firstNameAr: 'رشيد', lastNameAr: 'والي', phone: '0556677889', specialtyId: specialities[1].id, address: 'Polyclinique Bab El Oued', createdAt: day(60), updatedAt: now } }),
  ]);
  console.log(`   ✓ ${doctors.length} doctors created`);

  // Transactions + Receipts + Allocations
  const txs: any[] = [];
  const txData = [
    { type: 'credit' as const, amount: 50000, fs: 'banque' as const, ci: 3, bi: 0, di: 0, desc: 'تبرع زكاة', descFr: 'Don Zakat' },
    { type: 'credit' as const, amount: 30000, fs: 'caisse_physique' as const, ci: 0, di: 1, desc: 'تبرع غذائي', descFr: 'Don alimentaire' },
    { type: 'debit' as const, amount: 12000, fs: 'caisse_physique' as const, ci: 1, bi: 1, di: 2, desc: 'مساعدة طبية', descFr: 'Aide médicale' },
    { type: 'credit' as const, amount: 100000, fs: 'banque' as const, ci: 3, bi: 1, di: 2, desc: 'تبرع زكاة الفطر', descFr: 'Don Zakat El Fitr' },
    { type: 'debit' as const, amount: 5000, fs: 'caisse_physique' as const, ci: 0, di: 3, desc: 'مساعدة غذائية', descFr: 'Aide alimentaire' },
    { type: 'credit' as const, amount: 75000, fs: 'caisse_physique' as const, ci: 4, di: 3, desc: 'تبرع عام', descFr: 'Don général' },
    { type: 'credit' as const, amount: 20000, fs: 'caisse_physique' as const, ci: 1, di: 0, desc: 'تبرع كفالة', descFr: 'Don Kafala' },
    { type: 'debit' as const, amount: 8000, fs: 'caisse_physique' as const, ci: 1, di: 1, desc: 'مساعدة أدوية', descFr: 'Aide médicaments' },
  ];

  for (let i = 0; i < txData.length; i++) {
    const t = txData[i];
    const isCredit = t.type === 'credit';
    const tx = await prisma.transaction.create({
      data: {
        associationId: aid, type: t.type, amount: t.amount,
        amountInWords: `${t.amount} DZD`, amountInWordsAr: `${t.amount} دينار`,
        fundSource: t.fs, caisseId: caisses[t.ci].id,
        bankAccountId: t.fs === 'banque' ? banks[t.bi || 0]?.id : undefined,
        donorId: isCredit ? donors[t.di]?.id : undefined,
        beneficiaryId: !isCredit ? bens[i % bens.length]?.id : undefined,
        description: t.descFr, descriptionAr: t.desc,
        receiptNumber: isCredit ? ref('BON') : undefined,
        date: day(i * 5), createdAt: day(i * 5), updatedAt: now,
      },
    });
    txs.push(tx);

    if (isCredit) {
      await prisma.donationReceipt.create({
        data: {
          associationId: aid, receiptNumber: tx.receiptNumber!,
          donorId: donors[t.di].id, donorName: `${donors[t.di].firstName} ${donors[t.di].lastName}`,
          donorNameAr: `${donors[t.di].firstNameAr} ${donors[t.di].lastNameAr}`,
          transactionId: tx.id, amount: t.amount, amountInWords: tx.amountInWords, amountInWordsAr: tx.amountInWordsAr,
          caisseId: caisses[t.ci].id, caisseName: caisses[t.ci].name, caisseNameAr: caisses[t.ci].nameAr,
          date: tx.date, createdAt: tx.createdAt,
        },
      });
    }

    // Create allocations for credited donations
    if (isCredit && i % 2 === 0) {
      await prisma.donationAllocation.create({
        data: {
          associationId: aid,
          donorId: donors[t.di].id,
          beneficiaryId: bens[i % bens.length].id,
          creditTransactionId: tx.id,
          amount: Math.floor(t.amount / 2),
          remainingAmount: Math.floor(t.amount / 2),
          notes: `تبرع مخصص من ${donors[t.di].lastNameAr} ${donors[t.di].firstNameAr}`,
          createdAt: tx.createdAt,
          updatedAt: now,
        },
      });
    }
  }
  console.log(`   ✓ ${txs.length} transactions + receipts + allocations created`);

  // Articles
  const arts = await Promise.all([
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Fauteuil roulant adulte', nameAr: 'كرسي متحرك للكبار', description: 'Fauteuil roulant standard pour adulte', descriptionAr: 'كرسي متحرك قياسي للكبار', categoryId: cats[0].id, quantity: 15, availableQuantity: 10, status: 'disponible', storageLocationId: locs[0].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: day(100), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Lit medicalise', nameAr: 'سرير طبي', categoryId: cats[0].id, quantity: 8, availableQuantity: 5, status: 'disponible', storageLocationId: locs[3].id, condition: 'Bon', conditionAr: 'جيد', isPermanent: false, createdAt: day(95), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Bequilles (paire)', nameAr: 'عكازات (زوج)', categoryId: cats[0].id, quantity: 25, availableQuantity: 22, status: 'disponible', storageLocationId: locs[0].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: day(90), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Cartable scolaire', nameAr: 'حقيبة مدرسية', categoryId: cats[1].id, quantity: 50, availableQuantity: 50, status: 'disponible', storageLocationId: locs[2].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: day(80), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Colis alimentaire', nameAr: 'سلة غذائية', categoryId: cats[2].id, quantity: 200, availableQuantity: 200, status: 'disponible', storageLocationId: locs[2].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, notes: 'Colis de base: semoule, huile, sucre, lait', createdAt: day(70), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Couverture polaire', nameAr: 'بطانية صوفية', categoryId: cats[3].id, quantity: 80, availableQuantity: 75, status: 'disponible', storageLocationId: locs[1].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(65), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Table pliante', nameAr: 'طاولة قابلة للطي', categoryId: cats[4].id, quantity: 10, availableQuantity: 10, status: 'disponible', storageLocationId: locs[3].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(50), updatedAt: now } }),
  ]);
  console.log(`   ✓ ${arts.length} articles created`);

  // Loans
  await prisma.loan.create({
    data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[0].id, status: 'en_cours',
      items: [
        { articleId: arts[0].id, articleName: arts[0].name, articleNameAr: arts[0].nameAr, quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' },
        { articleId: arts[2].id, articleName: arts[2].name, articleNameAr: arts[2].nameAr, quantity: 2, returnedQuantity: 0, conditionOnLoan: 'Neuf' },
      ], loanDate: day(30), expectedReturnDate: day(-60), createdAt: day(30), updatedAt: now },
  });

  await prisma.loan.create({
    data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[2].id, status: 'partiellement_retourne',
      items: [
        { articleId: arts[0].id, articleName: arts[0].name, articleNameAr: arts[0].nameAr, quantity: 1, returnedQuantity: 1, conditionOnLoan: 'Bon', conditionOnReturn: 'Bon (x1)' },
        { articleId: arts[3].id, articleName: arts[3].name, articleNameAr: arts[3].nameAr, quantity: 2, returnedQuantity: 0, conditionOnLoan: 'Neuf' },
      ], loanDate: day(15), expectedReturnDate: day(-75), notes: 'Besoin urgent pour la rentree scolaire', createdAt: day(15), updatedAt: now },
  });

  console.log('   ✓ 2 loans created');

  // Medical Referrals (with real doctorIds)
  await prisma.medicalReferral.create({
    data: { associationId: aid, reference: ref('MED'), beneficiaryId: bens[0].id, caisseId: caisses[1].id,
      doctorId: doctors[0].id,
      analysisType: 'Bilan sanguin', analysisTypeAr: 'تحليل دم شامل',
      hospital: 'CHU Mustapha Pacha', hospitalAr: 'مستشفى مصطفى باشا',
      amount: 4500, amountInWords: '4500 DZD', amountInWordsAr: 'أربعة آلاف وخمسمائة دينار',
      status: 'completed', date: day(25), notes: 'Faire le bilan a jeun', children: bens[0].children as any[],
      createdAt: day(25), updatedAt: now,
    },
  });

  await prisma.medicalReferral.create({
    data: { associationId: aid, reference: ref('MED'), beneficiaryId: bens[1].id, caisseId: caisses[1].id,
      doctorId: doctors[1].id,
      analysisType: 'Echographie', analysisTypeAr: 'تخطيط صدى القلب',
      hospital: 'Clinique Belcourt', hospitalAr: 'عيادة بلكور',
      amount: 8000, amountInWords: '8000 DZD', amountInWordsAr: 'ثمانية آلاف دينار',
      status: 'pending', date: day(12),
      createdAt: day(12), updatedAt: now,
    },
  });

  await prisma.medicalReferral.create({
    data: { associationId: aid, reference: ref('MED'), beneficiaryId: bens[3].id, caisseId: caisses[1].id,
      doctorId: doctors[2].id,
      analysisType: 'Consultation ophtalmologique', analysisTypeAr: 'استشارة طب العيون',
      hospital: 'Clinique Belcourt', hospitalAr: 'عيادة بلكور',
      amount: 0, status: 'pending', date: day(5),
      notes: 'Patient age, besoin d un accompagnateur',
      createdAt: day(5), updatedAt: now,
    },
  });

  await prisma.medicalReferral.create({
    data: { associationId: aid, reference: ref('MED'), beneficiaryId: bens[4].id, caisseId: caisses[2].id,
      doctorId: doctors[3].id,
      amount: 0, status: 'pending', date: day(2),
      createdAt: day(2), updatedAt: now,
    },
  });

  console.log('   ✓ 4 medical referrals created');

  // Invite tokens (pending invite for demo)
  await prisma.inviteToken.create({
    data: {
      associationId: aid, email: 'benevole@demo.com', role: 'user',
      token: crypto.randomUUID(), name: 'Benevole', nameAr: 'متطوع',
      expiresAt: new Date(now.getTime() + 7 * 86400000),
      createdAt: now,
    },
  });
  console.log('   ✓ 1 invite token created');

  // Notifications
  await prisma.notification.create({
    data: { associationId: aid, type: 'info', message: 'Bienvenue dans le systeme de gestion', messageAr: 'مرحباً بكم في نظام الإدارة', read: false, createdAt: day(1) },
  });
  await prisma.notification.create({
    data: { associationId: aid, type: 'success', message: 'New donation received: 50000 DZD', messageAr: 'تم استلام تبرع جديد: 50000 دج', read: false, createdAt: day(3) },
  });

  console.log('   ✓ 2 notifications created');

  console.log('\n✅ Seed completed successfully!\n');
  console.log('   Connect with:');
  console.log('   👉 Utilisez Google OAuth pour vous connecter');
  console.log('   👉 Email demo: demo@association.dz');
  console.log('\n   📊 Contenu :');
  console.log(`   - ${bens.length} beneficiaires`);
  console.log(`   - ${donors.length} donateurs`);
  console.log(`   - ${doctors.length} medecins`);
  console.log(`   - ${specialities.length} specialites`);
  console.log(`   - ${txs.length} transactions`);
  console.log(`   - ${arts.length} articles`);
  console.log(`   - 2 prets`);
  console.log(`   - 4 orientations medicales`);
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

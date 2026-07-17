// Seed script — CommonJS
// Run with: node prisma/seed.cjs
// From: /home/mourad/Documents/SaaS_Association_Charitable/server

const { PrismaClient } = require('../dist/generated/prisma/client');
const { randomUUID } = require('crypto');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://mourad:devpwd@localhost:5432/association_charitable';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function ref(prefix) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const r = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${prefix}-${y}${m}-${r}`;
}

async function main() {
  console.log('\n🌱 SEED: Creation complete des donnees...\n');

  const existingUser = await prisma.user.findUnique({
    where: { email: 'nacereddinemourad09@gmail.com' },
    include: { association: true },
  });

  if (!existingUser) {
    console.log('❌ Utilisateur introuvable. Connectez-vous d\'abord avec Google.');
    console.log('   Email attendu: nacereddinemourad09@gmail.com\n');
    process.exit(1);
  }

  const aid = existingUser.associationId;
  console.log(`   ✔ Association trouvee: ${existingUser.association.nameAr} (${aid})`);
  console.log(`   ✔ Admin: ${existingUser.nameAr}\n`);

  const now = new Date();
  const day = (n) => new Date(now.getTime() - n * 86400000);

  // CATEGORIES D'ARTICLES
  const cats = await Promise.all([
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Medical', nameAr: 'طبي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Scolaire', nameAr: 'مدرسي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Alimentaire', nameAr: 'غذائي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Vetement', nameAr: 'ملبس', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Mobilier', nameAr: 'أثاث', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Electromenager', nameAr: 'أجهزة كهربائية', createdAt: now } }),
  ]);
  console.log('   ✔ 6 categories d\'articles');

  // EMPLACEMENTS DE STOCKAGE
  const locs = [
    await prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot Principal - Rayon A', nameAr: 'المستودع الرئيسي - الرف أ', createdAt: now } }),
    await prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot Principal - Rayon B', nameAr: 'المستودع الرئيسي - الرف ب', createdAt: now } }),
    await prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot Secondaire', nameAr: 'المستودع الثانوي', createdAt: now } }),
    await prisma.storageLocation.create({ data: { associationId: aid, name: 'Pharmacie', nameAr: 'الصيدلية', createdAt: now } }),
  ];
  console.log('   ✔ 4 emplacements de stockage');

  // TYPES D'ANALYSES MEDICALES
  await Promise.all([
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Bilan sanguin complet', nameAr: 'تحليل دم شامل', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Glycemie', nameAr: 'السكري', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Radiographie pulmonaire', nameAr: 'أشعة الصدر', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'IRM cerebrale', nameAr: 'رنين مغناطيسي للدماغ', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Echographie abdominale', nameAr: 'تصوير البطن بالموجات', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Consultation cardiologie', nameAr: 'استشارة قلبية', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Consultation ophtalmologie', nameAr: 'استشارة عيون', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Scanner', nameAr: 'سكانر', createdAt: now } }),
  ]);
  console.log('   ✔ 8 types d\'analyses medicales');

  // HOPITAUX
  await Promise.all([
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Mustapha Pacha', nameAr: 'مستشفى مصطفى باشا الجامعي', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Beni Messous', nameAr: 'مستشفى بني مسوس الجامعي', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Clinique Chifa', nameAr: 'عيادة الشفاء', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Hopital de Blida', nameAr: 'مستشفى البليدة', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Polyclinique El Biar', nameAr: 'مصلحة الطب العام - الأبيار', createdAt: now } }),
  ]);
  console.log('   ✔ 5 hopitaux');

  // SPECIALITES MEDICALES
  const specialities = [
    await prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Medecine generale', nameAr: 'طب عام', createdAt: now } }),
    await prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Pediatrie', nameAr: 'طب الأطفال', createdAt: now } }),
    await prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Ophtalmologie', nameAr: 'طب العيون', createdAt: now } }),
    await prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Cardiologie', nameAr: 'طب القلب', createdAt: now } }),
    await prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Chirurgie generale', nameAr: 'جراحة عامة', createdAt: now } }),
    await prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Gynecologie', nameAr: 'طب النساء', createdAt: now } }),
    await prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Dermatologie', nameAr: 'طب الجلد', createdAt: now } }),
    await prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Orthopedie', nameAr: 'طب العظام', createdAt: now } }),
  ];
  console.log('   ✔ 8 specialites medicales');

  // STATUTS D'ARTICLES
  await Promise.all([
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'disponible', nameAr: 'متاح', createdAt: now } }),
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'prete', nameAr: 'مُعار', createdAt: now } }),
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'endommage', nameAr: 'تالف', createdAt: now } }),
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'hors_service', nameAr: 'خارج الخدمة', createdAt: now } }),
  ]);
  console.log('   ✔ 4 statuts d\'articles');

  // NIVEAUX SCOLAIRES
  await Promise.all([
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CP', nameAr: 'السنة الأولى ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CE1', nameAr: 'السنة الثانية ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CE2', nameAr: 'السنة الثالثة ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CM1', nameAr: 'السنة الرابعة ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CM2', nameAr: 'السنة الخامسة ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: '6eme', nameAr: 'السنة الأولى متوسط', createdAt: now } }),
  ]);
  console.log('   ✔ 6 niveaux scolaires');

  // CAISSES
  const caisses = [
    await prisma.caisse.create({
      data: {
        associationId: aid, reference: ref('CAI'), name: 'Caisse Sociale', nameAr: 'الصندوق الاجتماعي',
        subCategories: [
          { id: randomUUID(), name: 'Aide alimentaire d\'urgence', nameAr: 'مساعدة غذائية عاجلة' },
          { id: randomUUID(), name: 'Aide scolaire', nameAr: 'مساعدة مدرسية' },
          { id: randomUUID(), name: 'Aide au logement', nameAr: 'مساعدة إيجار' },
          { id: randomUUID(), name: 'Aide chauffage', nameAr: 'مساعدة تدفئة' },
        ],
        balance: 185000, createdAt: day(365), updatedAt: now,
      },
    }),
    await prisma.caisse.create({
      data: {
        associationId: aid, reference: ref('CAI'), name: 'Caisse Medicale', nameAr: 'الصندوق الطبي',
        subCategories: [
          { id: randomUUID(), name: 'Analyses medicales', nameAr: 'تحاليل طبية' },
          { id: randomUUID(), name: 'Medicaments', nameAr: 'أدوية' },
          { id: randomUUID(), name: 'Soins specialises', nameAr: 'علاجات متخصصة' },
          { id: randomUUID(), name: 'Urgences', nameAr: 'حالات استعجالية' },
        ],
        balance: 220000, createdAt: day(365), updatedAt: now,
      },
    }),
    await prisma.caisse.create({
      data: {
        associationId: aid, reference: ref('CAI'), name: 'Caisse Kafala', nameAr: 'صندوق الكفالة',
        subCategories: [
          { id: randomUUID(), name: 'Kafala orphelin', nameAr: 'كفالة يتيم' },
          { id: randomUUID(), name: 'Kafala veuve', nameAr: 'كفالة أرملة' },
        ],
        balance: 320000, createdAt: day(365), updatedAt: now,
      },
    }),
    await prisma.caisse.create({
      data: {
        associationId: aid, reference: ref('CAI'), name: 'Caisse Zakat', nameAr: 'صندوق الزكاة',
        subCategories: [
          { id: randomUUID(), name: 'Zakat Al-Mal', nameAr: 'زكاة المال' },
          { id: randomUUID(), name: 'Zakat Al-Fitr', nameAr: 'زكاة الفطر' },
          { id: randomUUID(), name: 'Sadaqa', nameAr: 'صدقة' },
        ],
        balance: 450000, createdAt: day(365), updatedAt: now,
      },
    }),
    await prisma.caisse.create({
      data: {
        associationId: aid, reference: ref('CAI'), name: 'Caisse Ramadan', nameAr: 'صندوق رمضان',
        subCategories: [
          { id: randomUUID(), name: 'Colis ramadan', nameAr: 'قفة رمضان' },
          { id: randomUUID(), name: 'Repas iftar', nameAr: 'وجبات إفطار' },
        ],
        balance: 95000, createdAt: day(365), updatedAt: now,
      },
    }),
  ];
  console.log('   ✔ 5 caisses avec sous-categories');

  // COMPTES BANCAIRES
  const banks = [
    await prisma.bankAccount.create({
      data: {
        associationId: aid, bankName: 'Banque Nationale d\'Algerie (BNA)', bankNameAr: 'البنك الوطني الجزائري',
        accountNumber: '00212345678901', rib: '02 000 123456789 01', iban: 'DZ030020001234567890000101', swift: 'BNAADZAL',
        balance: 1250000, createdAt: day(365), updatedAt: now,
      },
    }),
    await prisma.bankAccount.create({
      data: {
        associationId: aid, bankName: 'Credit Populaire d\'Algerie (CPA)', bankNameAr: 'القرض الشعبي الجزائري',
        accountNumber: '00598765432109', rib: '03 000 987654321 09', iban: 'DZ050030009876543210000202', swift: 'CPALDZAL',
        balance: 680000, createdAt: day(300), updatedAt: now,
      },
    }),
  ];
  console.log('   ✔ 2 comptes bancaires');

  // BENEFICIAIRES
  const bens = [
    await prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Fatima', lastName: 'Zahra', firstNameAr: 'فاطمة', lastNameAr: 'الزهراء',
        address: '15 Rue des Freres, Alger', addressAr: '15 شارع الإخوة، الجزائر',
        phone: '0551234567', nationalCardNumber: '123456789012345',
        dateOfBirth: day(15000), attribut: 'veuve', gender: 'female',
        situation: 'Femme veuve avec 2 enfants', situationAr: 'bonne_sante',
        caisseId: caisses[2].id, subCategoryId: caisses[2].subCategories[1].id,
        children: [
          { id: randomUUID(), firstName: 'Mohamed', lastName: 'Ben Fatima', firstNameAr: 'محمد', lastNameAr: 'بن فاطمة', dateOfBirth: '2014-08-22', gender: 'male', healthStatus: 'bonne_sante', schoolGradeId: '' },
          { id: randomUUID(), firstName: 'Amina', lastName: 'Ben Fatima', firstNameAr: 'أمينة', lastNameAr: 'بن فاطمة', dateOfBirth: '2018-03-10', gender: 'female', healthStatus: 'bonne_sante', schoolGradeId: '' },
        ],
        createdAt: day(180), updatedAt: now,
      },
    }),
    await prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Khadija', lastName: 'Mansouri', firstNameAr: 'خديجة', lastNameAr: 'منصوري',
        address: 'Cite 500 Logts, Oran', addressAr: 'حي 500 مسكن، وهران',
        phone: '0552345678', nationalCardNumber: '987654321098765',
        dateOfBirth: day(20000), attribut: 'veuve', gender: 'female',
        situation: 'Veuve avec 1 enfant', situationAr: 'bonne_sante',
        caisseId: caisses[2].id, subCategoryId: caisses[2].subCategories[1].id,
        children: [
          { id: randomUUID(), firstName: 'Karim', lastName: 'Ben Khadija', firstNameAr: 'كريم', lastNameAr: 'بن خديجة', dateOfBirth: '2008-09-14', gender: 'male', healthStatus: 'bonne_sante', schoolGradeId: '' },
        ],
        createdAt: day(150), updatedAt: now,
      },
    }),
    await prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Ahmed', lastName: 'Benali', firstNameAr: 'أحمد', lastNameAr: 'بن علي',
        address: 'Douar Ouled Sidi, Blida', addressAr: 'دوار أولاد سيدي، البليدة',
        phone: '0553456789', nationalCardNumber: '456789123456789',
        dateOfBirth: day(12000), attribut: 'orphelin', gender: 'male',
        situation: 'Orphelin, mere au foyer', situationAr: 'bonne_sante',
        caisseId: caisses[2].id, subCategoryId: caisses[2].subCategories[0].id,
        children: [],
        createdAt: day(120), updatedAt: now,
      },
    }),
    await prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Aicha', lastName: 'Boumediene', firstNameAr: 'عائشة', lastNameAr: 'بومدين',
        address: 'Route de Setif, Ain El Kebira', addressAr: 'طريق سطيف، عين الكبيرة',
        phone: '0554567890', nationalCardNumber: '654321987654321',
        dateOfBirth: day(22000), attribut: 'personne_agee', gender: 'female',
        situation: 'Personne agee seule, sans revenu', situationAr: 'bonne_sante',
        caisseId: caisses[0].id, subCategoryId: caisses[0].subCategories[2].id,
        children: [],
        onBehalfOfName: 'ابنها محمد',
        createdAt: day(90), updatedAt: now,
      },
    }),
    await prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Malika', lastName: 'Djouadi', firstNameAr: 'مالكة', lastNameAr: 'جودي',
        address: 'Hai Nasr, Constantine', addressAr: 'حي نصر، قسنطينة',
        phone: '0555678901', nationalCardNumber: '321654987321654',
        dateOfBirth: day(10000), attribut: 'famille_demunie', gender: 'female',
        situation: 'Famille demunie, besoin aide alimentaire', situationAr: 'bonne_sante',
        caisseId: caisses[0].id, subCategoryId: caisses[0].subCategories[0].id,
        children: [
          { id: randomUUID(), firstName: 'Nadia', lastName: 'Ben Malika', firstNameAr: 'نادية', lastNameAr: 'بن مالك', dateOfBirth: '2017-05-12', gender: 'female', healthStatus: 'bonne_sante', schoolGradeId: '' },
        ],
        createdAt: day(60), updatedAt: now,
      },
    }),
    await prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Said', lastName: 'Hadj Ahmed', firstNameAr: 'سعيد', lastNameAr: 'حاج أحمد',
        address: 'Quartier El Harrach, Alger', addressAr: 'حي الحراش، الجزائر',
        phone: '0556789012', nationalCardNumber: '159357852456',
        dateOfBirth: day(8000), attribut: 'handicape', gender: 'male',
        situation: 'Handicape moteur suite accident', situationAr: 'handicape',
        caisseId: caisses[1].id,
        children: [], onBehalfOfName: 'والده',
        createdAt: day(45), updatedAt: now,
      },
    }),
    await prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Zineb', lastName: 'Haddad', firstNameAr: 'زينب', lastNameAr: 'حداد',
        address: 'Rue Khemisti, Tizi Ouzou', addressAr: 'شارع خميسي، تيزي وزو',
        phone: '0557890123', nationalCardNumber: '753951852456',
        dateOfBirth: day(13000), attribut: 'famille_demunie', gender: 'female',
        situation: 'Famille nombreuse, besoins multiples', situationAr: 'bonne_sante',
        caisseId: caisses[0].id, subCategoryId: caisses[0].subCategories[0].id,
        children: [
          { id: randomUUID(), firstName: 'Yacine', lastName: 'Ben Zineb', firstNameAr: 'ياسين', lastNameAr: 'بن زينب', dateOfBirth: '2015-11-30', gender: 'male', healthStatus: 'malade', healthDetails: 'Asthme chronique', schoolGradeId: '' },
          { id: randomUUID(), firstName: 'Lina', lastName: 'Ben Zineb', firstNameAr: 'لينا', lastNameAr: 'بن زينب', dateOfBirth: '2019-07-22', gender: 'female', healthStatus: 'bonne_sante', schoolGradeId: '' },
        ],
        createdAt: day(30), updatedAt: now,
      },
    }),
  ];
  console.log('   ✔ 7 beneficiaires');

  // DONATEURS
  const donors = [
    await prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Abdelkader', lastName: 'Hadj Hamou', firstNameAr: 'عبد القادر', lastNameAr: 'حاج حمو',
        phone: '0661112233', email: 'a.hadjhamou@email.dz', notes: 'Donateur regulier depuis 2020',
        totalDonated: 450000, createdAt: day(365), updatedAt: now,
      },
    }),
    await prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Noureddine', lastName: 'Khaldi', firstNameAr: 'نور الدين', lastNameAr: 'خالدي',
        phone: '0677445566', email: 'n.khaldi@entreprise.dz', notes: 'Entreprise BATIMENT',
        totalDonated: 850000, createdAt: day(300), updatedAt: now,
      },
    }),
    await prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Samia', lastName: 'Boukhari', firstNameAr: 'سامية', lastNameAr: 'بوقاري',
        phone: '0557889900', totalDonated: 180000, createdAt: day(250), updatedAt: now,
      },
    }),
    await prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Ali', lastName: 'Mammeri', firstNameAr: 'علي', lastNameAr: 'معمري',
        phone: '0663334455', email: 'ali.mammeri@mail.dz', notes: 'Donateur mensuel',
        totalDonated: 120000, createdAt: day(200), updatedAt: now,
      },
    }),
    await prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Fatima Zohra', lastName: 'Benkhelifa', firstNameAr: 'فاطمة الزهراء', lastNameAr: 'بن خليفة',
        phone: '0559988776', totalDonated: 520000, createdAt: day(180), updatedAt: now,
      },
    }),
    await prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Mustapha', lastName: 'Toumi', firstNameAr: 'مصطفى', lastNameAr: 'طومي',
        phone: '0771122334', email: 'm.toumi@pharma.dz', notes: 'Pharmacien, don medicaments + argent',
        totalDonated: 300000, createdAt: day(120), updatedAt: now,
      },
    }),
  ];
  console.log('   ✔ 6 donateurs');

  // MEDECINS
  const doctors = [
    await prisma.doctor.create({
      data: {
        associationId: aid, reference: ref('DOC'),
        firstName: 'Amina', lastName: 'Belkacem', firstNameAr: 'أمينة', lastNameAr: 'بلقاسم',
        phone: '0551987654', email: 'amina.belkacem@med.dz',
        specialtyId: specialities[0].id,
        address: 'Clinique El Biar, 15 Rue Mohamed Belouizdad, Alger',
        notes: 'Disponible les lundis, mercredis et vendredis de 9h a 16h',
        createdAt: day(200), updatedAt: now,
      },
    }),
    await prisma.doctor.create({
      data: {
        associationId: aid, reference: ref('DOC'),
        firstName: 'Mourad', lastName: 'Bensebaa', firstNameAr: 'مراد', lastNameAr: 'بن سبع',
        phone: '0555765432', email: 'm.bensebaa@chu.dz',
        specialtyId: specialities[3].id,
        address: 'CHU Mustapha Pacha, Service Cardiologie, Alger Centre',
        notes: 'Professeur en cardiologie. Consultations le samedi matin',
        createdAt: day(180), updatedAt: now,
      },
    }),
    await prisma.doctor.create({
      data: {
        associationId: aid, reference: ref('DOC'),
        firstName: 'Nadia', lastName: 'Amirouche', firstNameAr: 'نادية', lastNameAr: 'عميروش',
        phone: '0661122334', email: 'n.amirouche@yahoo.fr',
        specialtyId: specialities[2].id,
        address: '34 Rue Didouche Mourad, Alger Centre',
        notes: 'Chirurgie de la cataracte et glaucome',
        createdAt: day(160), updatedAt: now,
      },
    }),
    await prisma.doctor.create({
      data: {
        associationId: aid, reference: ref('DOC'),
        firstName: 'Rachid', lastName: 'Ouali', firstNameAr: 'رشيد', lastNameAr: 'والي',
        phone: '0556677889',
        specialtyId: specialities[1].id,
        address: 'Polyclinique Bab El Oued, Alger',
        notes: 'Pediatre general. Consultation sans rendez-vous le lundi',
        createdAt: day(140), updatedAt: now,
      },
    }),
    await prisma.doctor.create({
      data: {
        associationId: aid, reference: ref('DOC'),
        firstName: 'Karim', lastName: 'Mekki', firstNameAr: 'كريم', lastNameAr: 'مكي',
        phone: '0558899001', email: 'dr.mekki@ortho.dz',
        specialtyId: specialities[7].id,
        address: 'Clinique Chifa, Chemin de la Madeleine, Bab El Oued',
        notes: 'Orthopediste pediatricien',
        createdAt: day(120), updatedAt: now,
      },
    }),
    await prisma.doctor.create({
      data: {
        associationId: aid, reference: ref('DOC'),
        firstName: 'Ahmed', lastName: 'Boualem', firstNameAr: 'أحمد', lastNameAr: 'بوعلام',
        phone: '0665544332', email: 'ahmed.boualem@gmail.com',
        specialtyId: specialities[5].id,
        address: 'Clinique El Badr, Hussein Dey',
        notes: 'Gynecologue obstétricien',
        createdAt: day(100), updatedAt: now,
      },
    }),
  ];
  console.log('   ✔ 6 medecins');

  // ORIENTATIONS MEDICALES
  const referrals = [
    { b: 0, d: 0, c: 1, amt: 4500, st: 'completed', dt: 25, analysis: 'Bilan sanguin complet', analysisAr: 'تحليل دم شامل', hosp: 'CHU Mustapha Pacha', hospAr: 'مشفى مصطفى باشا', notes: 'Faire le bilan a jeun' },
    { b: 4, d: 0, c: 1, amt: 3500, st: 'completed', dt: 20, analysis: 'Glycemie', analysisAr: 'تحليل السكري', hosp: 'Polyclinique El Biar', hospAr: 'مصلحة الطب العام' },
    { b: 1, d: 1, c: 1, amt: 8000, st: 'completed', dt: 18, analysis: 'Echographie cardiaque', analysisAr: 'تخطيط صدى القلب', hosp: 'CHU Mustapha Pacha', hospAr: 'مشفى مصطفى باشا' },
    { b: 3, d: 1, c: 1, amt: 6000, st: 'completed', dt: 15, analysis: 'Consultation cardiologie', analysisAr: 'استشارة قلبية', hosp: 'CHU Mustapha Pacha', hospAr: 'مشفى مصطفى باشا' },
    { b: 2, d: 3, c: 1, amt: 0, st: 'pending', dt: 10, analysis: 'Consultation pediatrie', analysisAr: 'استشارة أطفال' },
    { b: 0, d: 0, c: 1, amt: 0, st: 'pending', dt: 5, analysis: 'Analyse de sang', analysisAr: 'تحليل دم', hosp: 'CHU Beni Messous', hospAr: 'مشفى بني مسوس' },
    { b: 5, d: 4, c: 1, amt: 0, st: 'pending', dt: 3, analysis: 'Consultation orthopedie', analysisAr: 'استشارة عظام', hosp: 'Clinique Chifa', hospAr: 'عيادة الشفاء' },
    { b: 6, d: 3, c: 2, amt: 0, st: 'pending', dt: 1, analysis: 'Consultation pediatrie', analysisAr: 'استشارة أطفال' },
  ];

  for (const r of referrals) {
    await prisma.medicalReferral.create({
      data: {
        associationId: aid, reference: ref('MED'),
        beneficiaryId: bens[r.b].id, caisseId: caisses[r.c].id, doctorId: doctors[r.d].id,
        analysisType: r.analysis, analysisTypeAr: r.analysisAr,
        hospital: r.hosp, hospitalAr: r.hospAr,
        amount: r.amt,
        amountInWords: r.amt > 0 ? `${r.amt} DZD` : '0 DZD',
        amountInWordsAr: r.amt > 0 ? `${r.amt} دينار` : '0 دينار',
        status: r.st, date: day(r.dt), notes: r.notes,
        createdAt: day(r.dt), updatedAt: now,
      },
    });
    if (r.st === 'completed' && r.amt > 0) {
      await prisma.caisse.update({ where: { id: caisses[r.c].id }, data: { balance: { decrement: r.amt } } });
    }
  }
  console.log('   ✔ 8 orientations medicales');

  // TRANSACTIONS — données réalistes étalées sur 2018-2026
  const txData = [
    // 2018 — premières transactions
    { type: 'credit', amt: 60000, fs: 'caisse_physique', ci: 3, di: 0, desc: 'Zakat annuel 2018', descAr: 'زكاة السنة 2018' },
    { type: 'debit', amt: 15000, fs: 'caisse_physique', ci: 3, desc: 'Distribution zakat 2018', descAr: 'توزيع زكاة 2018' },

    // 2019
    { type: 'credit', amt: 45000, fs: 'caisse_physique', ci: 2, di: 3, desc: 'Don kafala 2019', descAr: 'تبرع كفالة 2019' },
    { type: 'debit', amt: 12000, fs: 'caisse_physique', ci: 2, desc: 'Aide orphelins 2019', descAr: 'مساعدة أيتام 2019' },

    // 2020
    { type: 'credit', amt: 100000, fs: 'banque', ci: 0, bi: 0, di: 0, desc: 'Don entreprise social 2020', descAr: 'تبرع مؤسسة اجتماعي 2020' },
    { type: 'debit', amt: 35000, fs: 'caisse_physique', ci: 0, desc: 'Aide alimentaire urgente COVID', descAr: 'مساعدة غذائية عاجلة كوفيد' },
    { type: 'debit', amt: 22000, fs: 'caisse_physique', ci: 1, desc: 'Aide medicaments COVID', descAr: 'مساعدة أدوية كوفيد' },

    // 2021
    { type: 'credit', amt: 50000, fs: 'caisse_physique', ci: 4, di: 1, desc: 'Don Ramadan 2021', descAr: 'تبرع رمضان 2021' },
    { type: 'credit', amt: 75000, fs: 'caisse_physique', ci: 2, di: 5, desc: 'Don kafala annuel', descAr: 'تبرع كفالة سنوي' },
    { type: 'debit', amt: 25000, fs: 'caisse_physique', ci: 4, desc: 'Colis Ramadan 2021', descAr: 'قفة رمضان 2021' },
    { type: 'debit', amt: 10000, fs: 'caisse_physique', ci: 2, desc: 'Aide kafala orphelin', descAr: 'مساعدة كفالة يتيم' },

    // 2022
    { type: 'credit', amt: 120000, fs: 'banque', ci: 3, bi: 0, di: 4, desc: 'Zakat al Mal 2022', descAr: 'زكاة المال 2022' },
    { type: 'credit', amt: 60000, fs: 'caisse_physique', ci: 1, di: 3, desc: 'Don sante 2022', descAr: 'تبرع صحي 2022' },
    { type: 'debit', amt: 28000, fs: 'caisse_physique', ci: 1, desc: 'Aide analyses medicales', descAr: 'مساعدة تحاليل طبية' },
    { type: 'debit', amt: 15000, fs: 'caisse_physique', ci: 3, desc: 'Distribution zakat 2022', descAr: 'توزيع زكاة 2022' },

    // 2023
    { type: 'credit', amt: 35000, fs: 'caisse_physique', ci: 0, di: 2, desc: 'Don social 2023', descAr: 'تبرع اجتماعي 2023' },
    { type: 'credit', amt: 90000, fs: 'banque', ci: 2, bi: 1, di: 4, desc: 'Don kafala entreprise', descAr: 'تبرع كفالة مؤسسة' },
    { type: 'debit', amt: 20000, fs: 'caisse_physique', ci: 0, desc: 'Aide chauffage hiver', descAr: 'مساعدة تدفئة' },
    { type: 'debit', amt: 30000, fs: 'caisse_physique', ci: 2, desc: 'Aide kafala familles', descAr: 'مساعدة كفالة عائلات' },

    // 2024
    { type: 'credit', amt: 70000, fs: 'caisse_physique', ci: 4, di: 0, desc: 'Don Ramadan 2024', descAr: 'تبرع رمضان 2024' },
    { type: 'credit', amt: 150000, fs: 'banque', ci: 3, bi: 0, di: 1, desc: 'Don entreprise BATIMENT', descAr: 'تبرع مؤسسة البناء' },
    { type: 'debit', amt: 15000, fs: 'caisse_physique', ci: 4, desc: 'Repas iftar 2024', descAr: 'وجبات إفطار 2024' },
    { type: 'debit', amt: 40000, fs: 'caisse_physique', ci: 3, desc: 'Zakat distribution 2024', descAr: 'توزيع زكاة 2024' },

    // 2025
    { type: 'credit', amt: 45000, fs: 'caisse_physique', ci: 1, di: 3, desc: 'Don mensuel sante', descAr: 'تبرع شهري صحي' },
    { type: 'credit', amt: 200000, fs: 'banque', ci: 3, bi: 1, di: 4, desc: 'Zakat El Fitr 2025', descAr: 'زكاة الفطر 2025' },
    { type: 'debit', amt: 18000, fs: 'caisse_physique', ci: 1, desc: 'Aide medicaments', descAr: 'مساعدة أدوية' },
    { type: 'debit', amt: 12000, fs: 'caisse_physique', ci: 0, desc: 'Aide scolaire 2025', descAr: 'مساعدة مدرسية 2025' },

    // 2026
    { type: 'credit', amt: 50000, fs: 'caisse_physique', ci: 0, di: 1, desc: 'Don alimentaire Ramadan', descAr: 'تبرع غذائي رمضان' },
    { type: 'credit', amt: 100000, fs: 'banque', ci: 3, bi: 0, di: 5, desc: 'Don medicaments + argent', descAr: 'تبرع أدوية وأموال' },
    { type: 'credit', amt: 30000, fs: 'caisse_physique', ci: 4, di: 2, desc: 'Don Ramadan 2026', descAr: 'تبرع رمضان 2026' },
    { type: 'credit', amt: 45000, fs: 'caisse_physique', ci: 1, di: 3, desc: 'Don mensuel 2026', descAr: 'تبرع شهري 2026' },
    { type: 'debit', amt: 25000, fs: 'caisse_physique', ci: 0, desc: 'Aide alimentaire', descAr: 'مساعدة غذائية' },
    { type: 'debit', amt: 18000, fs: 'caisse_physique', ci: 1, desc: 'Aide medicaments', descAr: 'مساعدة أدوية' },
    { type: 'debit', amt: 10000, fs: 'caisse_physique', ci: 2, desc: 'Aide kafala orphelin', descAr: 'مساعدة كفالة يتيم' },
    { type: 'debit', amt: 5000, fs: 'caisse_physique', ci: 4, desc: 'Repas iftar 2026', descAr: 'وجبات إفطار 2026' },
  ];

  // Spread transactions evenly across 2018-07-17 to 2026-07-17
  const EPOCH = new Date('2018-07-17T00:00:00.000Z').getTime();
  const SPAN = 365 * 8 * 86400000; // ~8 years in ms

  for (let i = 0; i < txData.length; i++) {
    const t = txData[i];
    const isCredit = t.type === 'credit';
    // spread date evenly across 2018-2026
    const txDate = new Date(EPOCH + (i / txData.length) * SPAN);
    const tx = await prisma.transaction.create({
      data: {
        associationId: aid, type: t.type, amount: t.amt,
        amountInWords: `${t.amt} DZD`, amountInWordsAr: `${t.amt} دينار`,
        fundSource: t.fs, caisseId: caisses[t.ci].id,
        bankAccountId: t.fs === 'banque' ? banks[(t.bi || 0) % banks.length]?.id : undefined,
        donorId: isCredit ? donors[t.di]?.id : undefined,
        beneficiaryId: !isCredit ? bens[i % bens.length]?.id : undefined,
        description: t.desc, descriptionAr: t.descAr,
        receiptNumber: ref('BON'),
        status: 'completed',
        date: txDate,
        createdAt: txDate, updatedAt: now,
      },
    });

    if (isCredit) {
      await prisma.donationReceipt.create({
        data: {
          associationId: aid, receiptNumber: tx.receiptNumber,
          donorId: donors[t.di].id, donorName: `${donors[t.di].firstName} ${donors[t.di].lastName}`,
          donorNameAr: `${donors[t.di].firstNameAr} ${donors[t.di].lastNameAr}`,
          transactionId: tx.id, amount: t.amt, amountInWords: tx.amountInWords, amountInWordsAr: tx.amountInWordsAr,
          caisseId: caisses[t.ci].id, caisseName: caisses[t.ci].name, caisseNameAr: caisses[t.ci].nameAr,
          date: tx.date, createdAt: tx.createdAt,
        },
      });
      if (i % 2 === 0) {
        await prisma.donationAllocation.create({
          data: {
            associationId: aid, donorId: donors[t.di].id, beneficiaryId: bens[i % bens.length].id,
            creditTransactionId: tx.id, amount: Math.floor(t.amt / 3), remainingAmount: Math.floor(t.amt / 3),
          },
        });
      }
      await prisma.caisse.update({ where: { id: caisses[t.ci].id }, data: { balance: { increment: t.amt } } });
      if (t.fs === 'banque' && t.bi !== undefined) {
        await prisma.bankAccount.update({ where: { id: banks[t.bi % banks.length].id }, data: { balance: { increment: t.amt } } });
      }
    } else {
      await prisma.caisse.update({ where: { id: caisses[t.ci].id }, data: { balance: { decrement: t.amt } } });
    }
  }
  console.log('   ✔ 12 transactions + recus + allocations');

  // ARTICLES
  await Promise.all([
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Fauteuil roulant adulte pliable', nameAr: 'كرسي متحرك للكبار', description: 'Fauteuil roulant standard adulte, pliable', descriptionAr: 'كرسي متحرك قياسي للكبار', categoryId: cats[0].id, quantity: 15, availableQuantity: 10, status: 'disponible', storageLocationId: locs[0].id, condition: 'Neuf', conditionAr: 'جديد', createdAt: day(150), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Lit medicalise 2 places', nameAr: 'سرير طبي بمحرك', categoryId: cats[0].id, quantity: 8, availableQuantity: 5, status: 'disponible', storageLocationId: locs[3].id, condition: 'Bon', conditionAr: 'جيد', createdAt: day(140), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Paire de bequilles aluminium', nameAr: 'عكازات ألمنيوم', categoryId: cats[0].id, quantity: 25, availableQuantity: 22, status: 'disponible', storageLocationId: locs[0].id, condition: 'Neuf', conditionAr: 'جديد', createdAt: day(130), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Cartable scolaire 5-7 ans', nameAr: 'حقيبة مدرسية للأطفال', categoryId: cats[1].id, quantity: 50, availableQuantity: 50, status: 'disponible', storageLocationId: locs[2].id, condition: 'Neuf', conditionAr: 'جديد', createdAt: day(120), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Colis alimentaire de base', nameAr: 'سلة غذائية أساسية', categoryId: cats[2].id, quantity: 200, availableQuantity: 200, status: 'disponible', storageLocationId: locs[2].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(110), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Couverture polaire double', nameAr: 'بطانية صوفية كبيرة', categoryId: cats[3].id, quantity: 80, availableQuantity: 75, status: 'disponible', storageLocationId: locs[1].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(100), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Table pliante 4 places', nameAr: 'طاولة قابلة للطي', categoryId: cats[4].id, quantity: 10, availableQuantity: 10, status: 'disponible', storageLocationId: locs[3].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(90), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Ventilateur sur pied', nameAr: 'مروحة وقوف', categoryId: cats[5].id, quantity: 30, availableQuantity: 30, status: 'disponible', storageLocationId: locs[1].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(80), updatedAt: now } }),
  ]);
  console.log('   ✔ 8 articles');

  // PRETS
  await prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[0].id, status: 'en_cours', items: [{ articleId: null, articleName: 'Fauteuil roulant adulte pliable', articleNameAr: 'كرسي متحرك للكبار', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' }], loanDate: day(45), expectedReturnDate: day(-15), createdAt: day(45), updatedAt: now } });
  await prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[2].id, status: 'partiellement_retourne', items: [{ articleId: null, articleName: 'Cartable scolaire', articleNameAr: 'حقيبة مدرسية', quantity: 2, returnedQuantity: 1, conditionOnLoan: 'Neuf', conditionOnReturn: 'Bon' }], loanDate: day(60), expectedReturnDate: day(-30), createdAt: day(60), updatedAt: now } });
  await prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[4].id, status: 'en_cours', items: [{ articleId: null, articleName: 'Ventilateur sur pied', articleNameAr: 'مروحة وقوف', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' }], loanDate: day(20), expectedReturnDate: day(-50), createdAt: day(20), updatedAt: now } });
  console.log('   ✔ 3 prets');

  // NOTIFICATIONS
  await Promise.all([
    prisma.notification.create({ data: { associationId: aid, type: 'info', message: 'Bienvenue', messageAr: 'مرحباً بكم', read: false, createdAt: day(30) } }),
    prisma.notification.create({ data: { associationId: aid, type: 'success', message: 'Nouveau don: 150000 DZD', messageAr: 'تبرع جديد: 150000 دج', read: false, createdAt: day(20) } }),
    prisma.notification.create({ data: { associationId: aid, type: 'warning', message: 'Stock colis alimentaire bas', messageAr: 'مخزون السلال الغذائية منخفض', read: false, createdAt: day(10) } }),
  ]);
  console.log('   ✔ 3 notifications');

  console.log('\n========================================');
  console.log('   ✅ SEED TERMINE AVEC SUCCES !\n');
  console.log('   Donnees generees:');
  console.log('   - 6 categories articles | 4 stockages | 8 analyses | 5 hopitaux');
  console.log('   - 8 specialites | 4 statuts articles | 6 niveaux scolaires');
  console.log('   - 5 caisses | 2 comptes bancaires');
  console.log('   - 7 beneficiaires | 6 donateurs | 6 medecins');
  console.log('   - 8 orientations | 36 transactions | 8 articles | 3 prets');
  console.log('========================================\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

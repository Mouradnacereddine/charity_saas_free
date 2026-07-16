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
  console.log('🌱 Seed: creation complete des donnees de test...\n');

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
  await prisma.articleStatusType.deleteMany();
  await prisma.schoolGrade.deleteMany();
  await prisma.user.deleteMany();
  await prisma.association.deleteMany();

  console.log('   ✔ Base nettoyee');

  const now = new Date();
  const day = (n: number) => new Date(now.getTime() - n * 86400000);
  const month = (m: number) => new Date(now.getFullYear(), now.getMonth() - m, 1);

  // =====================================================================
  // ASSOCIATION + ADMIN (Google OAuth)
  // =====================================================================
  const aid = (await prisma.association.create({
    data: {
      name: 'Association El-Baraka',
      nameAr: 'جمعية البركة الخيرية',
      email: 'contact@baraka.dz',
      password: '',
    },
  })).id;

  await prisma.user.create({
    data: {
      associationId: aid,
      email: 'nacereddinemourad09@gmail.com',
      password: '',
      name: 'Mourad Nacereddine',
      nameAr: 'مراد نصر الدين',
      role: 'admin',
    },
  });

  await prisma.user.create({
    data: {
      associationId: aid,
      email: 'faycel@test.dz',
      password: '',
      name: 'Faycel',
      nameAr: 'فيصل',
      role: 'user',
    },
  });

  await prisma.user.create({
    data: {
      associationId: aid,
      email: 'amina@test.dz',
      password: '',
      name: 'Amina Treasurer',
      nameAr: 'أمينة',
      role: 'treasurer',
    },
  });

  console.log('   ✔ Association + 3 utilisateurs crees');
  console.log('     - nacereddinemourad09@gmail.com (admin)');
  console.log('     - faycel@test.dz (volontaire)');
  console.log('     - amina@test.dz (tresorier)');

  // =====================================================================
  // CATEGORIES D'ARTICLES
  // =====================================================================
  const cats = await Promise.all([
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Medical', nameAr: 'طبي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Scolaire', nameAr: 'مدرسي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Alimentaire', nameAr: 'غذائي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Vetement', nameAr: 'ملبس', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Mobilier', nameAr: 'أثاث', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Electromenager', nameAr: 'أجهزة كهربائية', createdAt: now } }),
  ]);

  // =====================================================================
  // EMPLACEMENTS DE STOCKAGE
  // =====================================================================
  const locs = await Promise.all([
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot Principal - Rayon A', nameAr: 'المستودع الرئيسي - الرف أ', createdAt: now } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot Principal - Rayon B', nameAr: 'المستودع الرئيسي - الرف ب', createdAt: now } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot Secondaire', nameAr: 'المستودع الثانوي', createdAt: now } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Pharmacie', nameAr: 'الصيدلية', createdAt: now } }),
  ]);

  // =====================================================================
  // TYPES D'ANALYSES MEDICALES
  // =====================================================================
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

  // =====================================================================
  // HOPITAUX
  // =====================================================================
  await Promise.all([
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Mustapha Pacha', nameAr: 'مستشفى مصطفى باشا الجامعي', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Beni Messous', nameAr: 'مستشفى بني مسوس الجامعي', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Clinique Chifa', nameAr: 'عيادة الشفاء', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Hopital de Blida', nameAr: 'مستشفى البليدة', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Polyclinique El Biar', nameAr: 'مصلحة الطب العام - الأبيار', createdAt: now } }),
  ]);

  // =====================================================================
  // SPECIALITES MEDICALES
  // =====================================================================
  const specialities = await Promise.all([
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Medecine generale', nameAr: 'طب عام', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Pediatrie', nameAr: 'طب الأطفال', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Ophtalmologie', nameAr: 'طب العيون', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Cardiologie', nameAr: 'طب القلب', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Chirurgie generale', nameAr: 'جراحة عامة', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Gynecologie', nameAr: 'طب النساء', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Dermatologie', nameAr: 'طب الجلد', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Orthopedie', nameAr: 'طب العظام', createdAt: now } }),
  ]);

  // =====================================================================
  // CAISSES
  // =====================================================================
  const caisses = await Promise.all([
    prisma.caisse.create({
      data: {
        associationId: aid, reference: ref('CAI'), name: 'Caisse Sociale', nameAr: 'الصندوق الاجتماعي',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Aide alimentaire d\'urgence', nameAr: 'مساعدة غذائية عاجلة' },
          { id: crypto.randomUUID(), name: 'Aide scolaire', nameAr: 'مساعدة مدرسية' },
          { id: crypto.randomUUID(), name: 'Aide au logement', nameAr: 'مساعدة إيجار' },
          { id: crypto.randomUUID(), name: 'Aide chauffage', nameAr: 'مساعدة تدفئة' },
        ],
        balance: 185000, createdAt: day(365), updatedAt: now,
      },
    }),
    prisma.caisse.create({
      data: {
        associationId: aid, reference: ref('CAI'), name: 'Caisse Medicale', nameAr: 'الصندوق الطبي',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Analyses medicales', nameAr: 'تحاليل طبية' },
          { id: crypto.randomUUID(), name: 'Medicaments', nameAr: 'أدوية' },
          { id: crypto.randomUUID(), name: 'Soins specialises', nameAr: 'علاجات متخصصة' },
          { id: crypto.randomUUID(), name: 'Urgences', nameAr: 'حالات استعجالية' },
        ],
        balance: 220000, createdAt: day(365), updatedAt: now,
      },
    }),
    prisma.caisse.create({
      data: {
        associationId: aid, reference: ref('CAI'), name: 'Caisse Kafala', nameAr: 'صندوق الكفالة',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Kafala orphelin', nameAr: 'كفالة يتيم' },
          { id: crypto.randomUUID(), name: 'Kafala veuve', nameAr: 'كفالة أرملة' },
        ],
        balance: 320000, createdAt: day(365), updatedAt: now,
      },
    }),
    prisma.caisse.create({
      data: {
        associationId: aid, reference: ref('CAI'), name: 'Caisse Zakat', nameAr: 'صندوق الزكاة',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Zakat Al-Mal', nameAr: 'زكاة المال' },
          { id: crypto.randomUUID(), name: 'Zakat Al-Fitr', nameAr: 'زكاة الفطر' },
          { id: crypto.randomUUID(), name: 'Sadaqa', nameAr: 'صدقة' },
        ],
        balance: 450000, createdAt: day(365), updatedAt: now,
      },
    }),
    prisma.caisse.create({
      data: {
        associationId: aid, reference: ref('CAI'), name: 'Caisse Ramadan', nameAr: 'صندوق رمضان',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Colis ramadan', nameAr: 'قفة رمضان' },
          { id: crypto.randomUUID(), name: 'Repas iftar', nameAr: 'وجبات إفطار' },
        ],
        balance: 95000, createdAt: day(365), updatedAt: now,
      },
    }),
  ]);

  // =====================================================================
  // COMPTES BANCAIRES
  // =====================================================================
  const banks = await Promise.all([
    prisma.bankAccount.create({
      data: {
        associationId: aid, bankName: 'Banque Nationale d\'Algerie (BNA)', bankNameAr: 'البنك الوطني الجزائري',
        accountNumber: '00212345678901', rib: '02 000 123456789 01', iban: 'DZ030020001234567890000101', swift: 'BNAADZAL',
        balance: 1250000, createdAt: day(365), updatedAt: now,
      },
    }),
    prisma.bankAccount.create({
      data: {
        associationId: aid, bankName: 'Credit Populaire d\'Algerie (CPA)', bankNameAr: 'القرض الشعبي الجزائري',
        accountNumber: '00598765432109', rib: '03 000 987654321 09', iban: 'DZ050030009876543210000202', swift: 'CPALDZAL',
        balance: 680000, createdAt: day(300), updatedAt: now,
      },
    }),
  ]);

  console.log('   ✔ 5 caisses + 2 comptes bancaires crees');

  // =====================================================================
  // BENEFICIAIRES
  // =====================================================================
  const bens = await Promise.all([
    prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Fatima', lastName: 'Zahra', firstNameAr: 'فاطمة', lastNameAr: 'الزهراء',
        address: '15 Rue des Freres, Alger', addressAr: '15 شارع الإخوة، الجزائر',
        phone: '0551234567', nationalCardNumber: '123456789012345',
        dateOfBirth: day(15000), attribut: 'veuve', gender: 'female',
        caisseId: caisses[2].id, subCategoryId: (caisses[2].subCategories as any[])[1].id,
        children: [
          { id: crypto.randomUUID(), firstName: 'Mohamed', lastName: 'Ben Fatima', firstNameAr: 'محمد', lastNameAr: 'بن فاطمة', dateOfBirth: '2014-08-22', gender: 'male', healthStatus: 'bonne_sante', schoolGradeId: '' },
          { id: crypto.randomUUID(), firstName: 'Amina', lastName: 'Ben Fatima', firstNameAr: 'أمينة', lastNameAr: 'بن فاطمة', dateOfBirth: '2018-03-10', gender: 'female', healthStatus: 'bonne_sante', schoolGradeId: '' },
        ],
        createdAt: day(180), updatedAt: now,
      },
    }),
    prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Khadija', lastName: 'Mansouri', firstNameAr: 'خديجة', lastNameAr: 'منصوري',
        address: 'Cite 500 Logts, Oran', addressAr: 'حي 500 مسكن، وهران',
        phone: '0552345678', nationalCardNumber: '987654321098765',
        dateOfBirth: day(20000), attribut: 'veuve', gender: 'female',
        caisseId: caisses[2].id, subCategoryId: (caisses[2].subCategories as any[])[1].id,
        children: [
          { id: crypto.randomUUID(), firstName: 'Karim', lastName: 'Ben Khadija', firstNameAr: 'كريم', lastNameAr: 'بن خديجة', dateOfBirth: '2008-09-14', gender: 'male', healthStatus: 'bonne_sante', schoolGradeId: '' },
        ],
        createdAt: day(150), updatedAt: now,
      },
    }),
    prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Ahmed', lastName: 'Benali', firstNameAr: 'أحمد', lastNameAr: 'بن علي',
        address: 'Douar Ouled Sidi, Blida', addressAr: 'دوار أولاد سيدي، البليدة',
        phone: '0553456789', nationalCardNumber: '456789123456789',
        dateOfBirth: day(12000), attribut: 'orphelin', gender: 'male',
        caisseId: caisses[2].id, subCategoryId: (caisses[2].subCategories as any[])[0].id,
        children: [],
        situation: 'Pere decede, mere au foyer', situationAr: 'الأب متوفي، الأم ربة بيت',
        createdAt: day(120), updatedAt: now,
      },
    }),
    prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Aicha', lastName: 'Boumediene', firstNameAr: 'عائشة', lastNameAr: 'بومدين',
        address: 'Route de Setif, Ain El Kebira', addressAr: 'طريق سطيف، عين الكبيرة',
        phone: '0554567890', nationalCardNumber: '654321987654321',
        dateOfBirth: day(22000), attribut: 'personne_agee', gender: 'female',
        caisseId: caisses[0].id, subCategoryId: (caisses[0].subCategories as any[])[2].id,
        children: [],
        onBehalfOfName: 'ابنها محمد', situation: 'Femme agee seule, sans revenu', situationAr: 'امرأة مسنة وحيدة، دون دخل',
        createdAt: day(90), updatedAt: now,
      },
    }),
    prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Malika', lastName: 'Djouadi', firstNameAr: 'مالكة', lastNameAr: 'جودي',
        address: 'Hai Nasr, Constantine', addressAr: 'حي نصر، قسنطينة',
        phone: '0555678901', nationalCardNumber: '321654987321654',
        dateOfBirth: day(10000), attribut: 'famille_demunie', gender: 'female',
        caisseId: caisses[0].id, subCategoryId: (caisses[0].subCategories as any[])[0].id,
        children: [
          { id: crypto.randomUUID(), firstName: 'Nadia', lastName: 'Ben Malika', firstNameAr: 'نادية', lastNameAr: 'بن مالك', dateOfBirth: '2017-05-12', gender: 'female', healthStatus: 'bonne_sante', schoolGradeId: '' },
        ],
        createdAt: day(60), updatedAt: now,
      },
    }),
    prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Said', lastName: 'Hadj Ahmed', firstNameAr: 'سعيد', lastNameAr: 'حاج أحمد',
        address: 'Quartier El Harrach, Alger', addressAr: 'حي الحراش، الجزائر',
        phone: '0556789012', nationalCardNumber: '159357852456',
        dateOfBirth: day(8000), attribut: 'handicape', gender: 'male',
        caisseId: caisses[1].id,
        children: [], onBehalfOfName: 'والده',
        situation: 'Handicape moteur suite accident, fauteuil roulant', situationAr: 'إعاقة حركية بعد حادث',
        createdAt: day(45), updatedAt: now,
      },
    }),
    prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: 'Zineb', lastName: 'Haddad', firstNameAr: 'زينب', lastNameAr: 'حداد',
        address: 'Rue Khemisti, Tizi Ouzou', addressAr: 'شارع خميسي، تيزي وزو',
        phone: '0557890123', nationalCardNumber: '753951852456',
        dateOfBirth: day(13000), attribut: 'famille_demunie', gender: 'female',
        caisseId: caisses[0].id, subCategoryId: (caisses[0].subCategories as any[])[0].id,
        children: [
          { id: crypto.randomUUID(), firstName: 'Yacine', lastName: 'Ben Zineb', firstNameAr: 'ياسين', lastNameAr: 'بن زينب', dateOfBirth: '2015-11-30', gender: 'male', healthStatus: 'malade', healthDetails: 'Asthme chronique', schoolGradeId: '' },
          { id: crypto.randomUUID(), firstName: 'Lina', lastName: 'Ben Zineb', firstNameAr: 'لينا', lastNameAr: 'بن زينب', dateOfBirth: '2019-07-22', gender: 'female', healthStatus: 'bonne_sante', schoolGradeId: '' },
        ],
        createdAt: day(30), updatedAt: now,
      },
    }),
  ]);
  console.log(`   ✔ ${bens.length} beneficiaires crees`);

  // =====================================================================
  // DONATEURS
  // =====================================================================
  const donors = await Promise.all([
    prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Abdelkader', lastName: 'Hadj Hamou', firstNameAr: 'عبد القادر', lastNameAr: 'حاج حمو',
        phone: '0661112233', email: 'a.hadjhamou@email.dz', notes: 'Donateur regulier depuis 2020',
        totalDonated: 450000, createdAt: day(365), updatedAt: now,
      },
    }),
    prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Noureddine', lastName: 'Khaldi', firstNameAr: 'نور الدين', lastNameAr: 'خالدي',
        phone: '0677445566', email: 'n.khaldi@entreprise.dz', notes: 'Entreprise BATIMENT',
        totalDonated: 850000, createdAt: day(300), updatedAt: now,
      },
    }),
    prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Samia', lastName: 'Boukhari', firstNameAr: 'سامية', lastNameAr: 'بوقاري',
        phone: '0557889900', totalDonated: 180000, createdAt: day(250), updatedAt: now,
      },
    }),
    prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Ali', lastName: 'Mammeri', firstNameAr: 'علي', lastNameAr: 'معمري',
        phone: '0663334455', email: 'ali.mammeri@mail.dz', notes: 'Donateur mensuel',
        totalDonated: 120000, createdAt: day(200), updatedAt: now,
      },
    }),
    prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Fatima Zohra', lastName: 'Benkhelifa', firstNameAr: 'فاطمة الزهراء', lastNameAr: 'بن خليفة',
        phone: '0559988776', totalDonated: 520000, createdAt: day(180), updatedAt: now,
      },
    }),
    prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: 'Mustapha', lastName: 'Toumi', firstNameAr: 'مصطفى', lastNameAr: 'طومي',
        phone: '0771122334', email: 'm.toumi@pharma.dz', notes: 'Pharmacien, don medicaments + argent',
        totalDonated: 300000, createdAt: day(120), updatedAt: now,
      },
    }),
  ]);
  console.log(`   ✔ ${donors.length} donateurs crees`);

  // =====================================================================
  // MEDECINS
  // =====================================================================
  const doctors = await Promise.all([
    prisma.doctor.create({
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
    prisma.doctor.create({
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
    prisma.doctor.create({
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
    prisma.doctor.create({
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
    prisma.doctor.create({
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
    prisma.doctor.create({
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
  ]);
  console.log(`   ✔ ${doctors.length} medecins crees`);

  // =====================================================================
  // ORIENTATIONS MEDICALES
  // =====================================================================
  const referrals = [
    { b: 0, d: 0, c: 1, amt: 4500, st: 'completed', dt: 25, analysis: 'Bilan sanguin complet', analysisAr: 'تحليل دم شامل', hosp: 'CHU Mustapha Pacha', hospAr: 'مستشفى مصطفى باشا الجامعي', notes: 'Faire le bilan a jeun, matin a jeun depuis 12h' },
    { b: 4, d: 0, c: 1, amt: 3500, st: 'completed', dt: 20, analysis: 'Glycemie', analysisAr: 'تحليل السكري', hosp: 'Polyclinique El Biar', hospAr: 'مصلحة الطب العام - الأبيار' },
    { b: 1, d: 1, c: 1, amt: 8000, st: 'completed', dt: 18, analysis: 'Echographie cardiaque', analysisAr: 'تخطيط صدى القلب', hosp: 'CHU Mustapha Pacha', hospAr: 'مستشفى مصطفى باشا الجامعي', notes: 'Patient souffle au coeur detection' },
    { b: 3, d: 1, c: 1, amt: 6000, st: 'completed', dt: 15, analysis: 'Consultation cardiologie', analysisAr: 'استشارة قلبية', hosp: 'CHU Mustapha Pacha', hospAr: 'مستشفى مصطفى باشا الجامعي' },
    { b: 2, d: 3, c: 1, amt: 0, st: 'pending', dt: 10, analysis: 'Consultation pediatrie', analysisAr: 'استشارة أطفال', notes: 'Orphelin, suivi croissance' },
    { b: 0, d: 0, c: 1, amt: 0, st: 'pending', dt: 5, analysis: 'Analyse de sang', analysisAr: 'تحليل دم', hosp: 'CHU Beni Messous', hospAr: 'مستشفى بني مسوس الجامعي' },
    { b: 5, d: 4, c: 1, amt: 0, st: 'pending', dt: 3, analysis: 'Consultation orthopedie', analysisAr: 'استشارة عظام', hosp: 'Clinique Chifa', hospAr: 'عيادة الشفاء', notes: 'Fauteuil roulant, besoin de reeducation' },
    { b: 6, d: 3, c: 2, amt: 0, st: 'pending', dt: 1, analysis: 'Consultation pediatrie', analysisAr: 'استشارة أطفال', notes: 'Enfant asthmatique, suivi regulier' },
  ];

  for (const r of referrals) {
    await prisma.medicalReferral.create({
      data: {
        associationId: aid, reference: ref('MED'),
        beneficiaryId: bens[r.b].id,
        caisseId: caisses[r.c].id,
        doctorId: doctors[r.d].id,
        analysisType: r.analysis, analysisTypeAr: r.analysisAr,
        hospital: r.hosp, hospitalAr: r.hospAr,
        amount: r.amt,
        amountInWords: r.amt > 0 ? `${r.amt} DZD` : '0 DZD',
        amountInWordsAr: r.amt > 0 ? `${r.amt} دينار` : '0 دينار',
        status: r.st,
        date: day(r.dt),
        notes: r.notes,
        children: r.b === 0 ? (bens[0].children as any[]) : undefined,
        createdAt: day(r.dt), updatedAt: now,
      },
    });
  }
  console.log(`   ✔ ${referrals.length} orientations medicales crees`);

  // Update caisse balances for completed referrals
  for (const r of referrals) {
    if (r.st === 'completed' && r.amt > 0) {
      await prisma.caisse.update({ where: { id: caisses[r.c].id }, data: { balance: { decrement: r.amt } } });
    }
  }

  // =====================================================================
  // TRANSACTIONS + RECUES + ALLOCATIONS
  // =====================================================================
  const txData = [
    { type: 'credit' as const, amt: 80000, fs: 'caisse_physique' as const, ci: 3, di: 0, desc: 'Don Zakat annuel', descAr: 'زكاة المال السنوية' },
    { type: 'credit' as const, amt: 50000, fs: 'caisse_physique' as const, ci: 0, di: 1, desc: 'Don alimentaire Ramadan', descAr: 'تبرع غذائي رمضان' },
    { type: 'credit' as const, amt: 150000, fs: 'banque' as const, ci: 3, bi: 0, di: 1, desc: 'Don entreprise BATIMENT', descAr: 'تبرع مؤسسة البناء' },
    { type: 'credit' as const, amt: 30000, fs: 'caisse_physique' as const, ci: 4, di: 2, desc: 'Don Ramadan', descAr: 'تبرع رمضان' },
    { type: 'credit' as const, amt: 200000, fs: 'banque' as const, ci: 3, bi: 1, di: 4, desc: 'Don Zakat El Fitr', descAr: 'زكاة الفطر' },
    { type: 'credit' as const, amt: 45000, fs: 'caisse_physique' as const, ci: 1, di: 3, desc: 'Don mensuel', descAr: 'تبرع شهري' },
    { type: 'credit' as const, amt: 100000, fs: 'banque' as const, ci: 3, bi: 0, di: 5, desc: 'Don medicaments + argent', descAr: 'تبرع أدوية وأموال' },
    { type: 'debit' as const, amt: 25000, fs: 'caisse_physique' as const, ci: 0, bi: 1, di: 0, desc: 'Aide alimentaire famille demunie', descAr: 'مساعدة غذائية' },
    { type: 'debit' as const, amt: 18000, fs: 'caisse_physique' as const, ci: 1, di: 0, desc: 'Aide medicaments urgents', descAr: 'مساعدة أدوية استعجالية' },
    { type: 'debit' as const, amt: 10000, fs: 'caisse_physique' as const, ci: 2, di: 2, desc: 'Aide kafala orphelin', descAr: 'مساعدة كفالة يتيم' },
    { type: 'debit' as const, amt: 12000, fs: 'caisse_physique' as const, ci: 0, di: 3, desc: 'Aide chauffage hiver', descAr: 'مساعدة تدفئة شتوية' },
    { type: 'debit' as const, amt: 5000, fs: 'caisse_physique' as const, ci: 4, di: 0, desc: 'Repas iftar', descAr: 'وجبات إفطار' },
  ];

  for (let i = 0; i < txData.length; i++) {
    const t = txData[i];
    const isCredit = t.type === 'credit';

    const tx = await prisma.transaction.create({
      data: {
        associationId: aid, type: t.type, amount: t.amt,
        amountInWords: `${t.amt} DZD`, amountInWordsAr: `${t.amt} دينار`,
        fundSource: t.fs, caisseId: caisses[t.ci].id,
        bankAccountId: t.fs === 'banque' ? banks[(t.bi || 0) % banks.length]?.id : undefined,
        donorId: isCredit ? donors[t.di]?.id : undefined,
        beneficiaryId: !isCredit ? bens[i % bens.length]?.id : undefined,
        description: t.desc, descriptionAr: t.descAr,
        receiptNumber: isCredit ? ref('BON') : undefined,
        status: 'completed',
        date: day(i * 15 + 5),
        createdAt: day(i * 15 + 5), updatedAt: now,
      },
    });

    if (isCredit) {
      await prisma.donationReceipt.create({
        data: {
          associationId: aid, receiptNumber: tx.receiptNumber!,
          donorId: donors[t.di].id, donorName: `${donors[t.di].firstName} ${donors[t.di].lastName}`,
          donorNameAr: `${donors[t.di].firstNameAr} ${donors[t.di].lastNameAr}`,
          transactionId: tx.id, amount: t.amt, amountInWords: tx.amountInWords, amountInWordsAr: tx.amountInWordsAr,
          caisseId: caisses[t.ci].id, caisseName: caisses[t.ci].name, caisseNameAr: caisses[t.ci].nameAr,
          subCategoryId: t.ci === 4 ? (caisses[4].subCategories as any[])[1]?.id : undefined,
          subCategoryName: t.ci === 4 ? 'Repas iftar' : undefined,
          subCategoryNameAr: t.ci === 4 ? 'وجبات إفطار' : undefined,
          date: tx.date, createdAt: tx.createdAt,
        },
      });

      // Some allocations
      if (i % 2 === 0) {
        await prisma.donationAllocation.create({
          data: {
            associationId: aid,
            donorId: donors[t.di].id,
            beneficiaryId: bens[i % bens.length].id,
            creditTransactionId: tx.id,
            amount: Math.floor(t.amt / 3),
            remainingAmount: Math.floor(t.amt / 3),
            notes: `تبرع مخصص من ${donors[t.di].firstNameAr} ${donors[t.di].lastNameAr} إلى ${bens[i % bens.length].firstNameAr} ${bens[i % bens.length].lastNameAr}`,
            createdAt: tx.createdAt, updatedAt: now,
          },
        });
      }

      // Update caisse balance
      await prisma.caisse.update({ where: { id: caisses[t.ci].id }, data: { balance: { increment: t.amt } } });
    } else {
      await prisma.caisse.update({ where: { id: caisses[t.ci].id }, data: { balance: { decrement: t.amt } } });
    }
  }
  console.log(`   ✔ ${txData.length} transactions + recus + allocations crees`);

  // =====================================================================
  // ARTICLES
  // =====================================================================
  await Promise.all([
    prisma.article.create({
      data: { associationId: aid, reference: ref('ART'), name: 'Fauteuil roulant adulte pliable', nameAr: 'كرسي متحرك للكبار قابل للطي', description: 'Fauteuil roulant standard adulte, pliable, poids max 120kg', descriptionAr: 'كرسي متحرك قياسي للكبار، قابل للطي، أقصى وزن 120 كغ', categoryId: cats[0].id, quantity: 15, availableQuantity: 10, status: 'disponible', storageLocationId: locs[0].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: day(150), updatedAt: now },
    }),
    prisma.article.create({
      data: { associationId: aid, reference: ref('ART'), name: 'Lit medicalise 2 places', nameAr: 'سرير طبي بمحرك', description: 'Lit medicalise electrique avec matelas anti-escarres', descriptionAr: 'سرير طبي كهربائي مع فراش مضاد للقرحة', categoryId: cats[0].id, quantity: 8, availableQuantity: 5, status: 'disponible', storageLocationId: locs[3].id, condition: 'Bon', conditionAr: 'جيد', isPermanent: false, createdAt: day(140), updatedAt: now },
    }),
    prisma.article.create({
      data: { associationId: aid, reference: ref('ART'), name: 'Paire de bequilles aluminium', nameAr: 'عكازات ألمنيوم (زوج)', categoryId: cats[0].id, quantity: 25, availableQuantity: 22, status: 'disponible', storageLocationId: locs[0].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: day(130), updatedAt: now },
    }),
    prisma.article.create({
      data: { associationId: aid, reference: ref('ART'), name: 'Cartable scolaire 5-7 ans', nameAr: 'حقيبة مدرسية للأطفال', description: 'Cartable ergonomique pour enfant 5-7 ans, avec fournitures', descriptionAr: 'حقيبة مدرسية مريحة للأطفال من 5 إلى 7 سنوات مع القرطاسية', categoryId: cats[1].id, quantity: 50, availableQuantity: 50, status: 'disponible', storageLocationId: locs[2].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: day(120), updatedAt: now },
    }),
    prisma.article.create({
      data: { associationId: aid, reference: ref('ART'), name: 'Colis alimentaire de base', nameAr: 'سلة غذائية أساسية', description: 'Semoule 5kg, huile 5L, sucre 5kg, lait 6L, legumes secs', descriptionAr: 'سميد 5 كغ، زيت 5 لتر، سكر 5 كغ، حليب 6 لتر، بقول جافة', categoryId: cats[2].id, quantity: 200, availableQuantity: 200, status: 'disponible', storageLocationId: locs[2].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, notes: 'Colis distribue pendant le Ramadan', createdAt: day(110), updatedAt: now },
    }),
    prisma.article.create({
      data: { associationId: aid, reference: ref('ART'), name: 'Couverture polaire double', nameAr: 'بطانية صوفية كبيرة', description: 'Couverture polaire double, 200x220cm', descriptionAr: 'بطانية صوفية كبيرة، 200x220 سم', categoryId: cats[3].id, quantity: 80, availableQuantity: 75, status: 'disponible', storageLocationId: locs[1].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(100), updatedAt: now },
    }),
    prisma.article.create({
      data: { associationId: aid, reference: ref('ART'), name: 'Table pliante 4 places', nameAr: 'طاولة قابلة للطي 4 مقاعد', categoryId: cats[4].id, quantity: 10, availableQuantity: 10, status: 'disponible', storageLocationId: locs[3].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(90), updatedAt: now },
    }),
    prisma.article.create({
      data: { associationId: aid, reference: ref('ART'), name: 'Ventilateur sur pied', nameAr: 'مروحة وقوف', categoryId: cats[5].id, quantity: 30, availableQuantity: 30, status: 'disponible', storageLocationId: locs[1].id, condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(80), updatedAt: now },
    }),
  ]);
  console.log('   ✔ 8 articles crees');

  // =====================================================================
  // PRETS
  // =====================================================================
  await prisma.loan.create({
    data: {
      associationId: aid, reference: ref('PRT'), beneficiaryId: bens[0].id, status: 'en_cours',
      items: [
        { articleId: null, articleName: 'Fauteuil roulant adulte pliable', articleNameAr: 'كرسي متحرك للكبار', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' },
        { articleId: null, articleName: 'Paire de bequilles aluminium', articleNameAr: 'عكازات ألمنيوم', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' },
      ],
      loanDate: day(45), expectedReturnDate: day(-15), notes: 'Mobilite reduite temporaire',
      createdAt: day(45), updatedAt: now,
    },
  });

  await prisma.loan.create({
    data: {
      associationId: aid, reference: ref('PRT'), beneficiaryId: bens[2].id, status: 'partiellement_retourne',
      items: [
        { articleId: null, articleName: 'Cartable scolaire 5-7 ans', articleNameAr: 'حقيبة مدرسية للأطفال', quantity: 2, returnedQuantity: 1, conditionOnLoan: 'Neuf', conditionOnReturn: 'Bon (1 retourne)' },
      ],
      loanDate: day(60), expectedReturnDate: day(-30), notes: 'Rentree scolaire 2025/2026',
      createdAt: day(60), updatedAt: now,
    },
  });

  await prisma.loan.create({
    data: {
      associationId: aid, reference: ref('PRT'), beneficiaryId: bens[4].id, status: 'en_cours',
      items: [
        { articleId: null, articleName: 'Ventilateur sur pied', articleNameAr: 'مروحة وقوف', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' },
      ],
      loanDate: day(20), expectedReturnDate: day(-50),
      createdAt: day(20), updatedAt: now,
    },
  });
  console.log('   ✔ 3 prets crees');

  // =====================================================================
  // INVITATION
  // =====================================================================
  await prisma.inviteToken.create({
    data: {
      associationId: aid, email: 'nouveau.benevole@test.dz', role: 'user',
      name: 'Nouveau Benevole', nameAr: 'متطوع جديد',
      token: crypto.randomUUID(),
      expiresAt: new Date(now.getTime() + 7 * 86400000),
      createdAt: now,
    },
  });
  console.log('   ✔ 1 invitation creee');

  // =====================================================================
  // NOTIFICATIONS
  // =====================================================================
  await Promise.all([
    prisma.notification.create({ data: { associationId: aid, type: 'info', message: 'Bienvenue dans le systeme de gestion El-Baraka', messageAr: 'مرحباً بكم في نظام إدارة جمعية البركة', read: false, createdAt: day(30) } }),
    prisma.notification.create({ data: { associationId: aid, type: 'success', message: 'Nouveau don recu: 150000 DZD de Khaldi Entreprise', messageAr: 'تم استلام تبرع جديد: 150000 دج من خالدي المؤسسة', read: false, createdAt: day(20) } }),
    prisma.notification.create({ data: { associationId: aid, type: 'warning', message: 'Stock colis alimentaire: plus que 50 unites', messageAr: 'تنبيه: مخزون السلال الغذائية أقل من 50 وحدة', read: false, createdAt: day(10) } }),
  ]);
  console.log('   ✔ 3 notifications crees');

  // =====================================================================
  // ECOLES / GRADES (pour Beneficiaires)
  // =====================================================================
  await Promise.all([
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CP', nameAr: 'السنة الأولى ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CE1', nameAr: 'السنة الثانية ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CE2', nameAr: 'السنة الثالثة ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CM1', nameAr: 'السنة الرابعة ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CM2', nameAr: 'السنة الخامسة ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: '6eme', nameAr: 'السنة الأولى متوسط', createdAt: now } }),
  ]);

  // =====================================================================
  // RESULTATS
  // =====================================================================
  console.log('\n========================================');
  console.log('   ✅ SEED TERMINE AVEC SUCCES !\n');
  console.log('   Association: جمعية البركة الخيرية\n');
  console.log('   Connexion:');
  console.log('   📧 nacereddinemourad09@gmail.com (Admin - vous)');
  console.log('   📧 faycel@test.dz (Volontaire)');
  console.log('   📧 amina@test.dz (Tresorier)\n');
  console.log('   👉 Connectez-vous avec Google - compte pre-existant !\n');
  console.log('   Donnees generees:');
  console.log(`   - ${bens.length} beneficiaires`);
  console.log(`   - ${donors.length} donateurs`);
  console.log(`   - ${doctors.length} medecins`);
  console.log(`   - 8 specialites`);
  console.log(`   - 5 caisses`);
  console.log(`   - ${referrals.length} orientations medicales`);
  console.log(`   - ${txData.length} transactions`);
  console.log(`   - 8 articles`);
  console.log(`   - 3 prets`);
  console.log('========================================\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

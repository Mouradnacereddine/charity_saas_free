import { PrismaClient } from '../src/generated/prisma/client';
import { randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { generateRef } from '../src/lib/ref';

const connectionString = process.env.DATABASE_URL || 'postgresql://mourad:devpwd@localhost:5432/association_charitable';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ref = generateRef;

async function main() {
  console.log('\n🌱 SEED: Creation complete des donnees...\n');

  const existingUser = await prisma.user.findUnique({
    where: { email: 'nacereddinemourad09@gmail.com' },
    include: { association: true },
  });

  if (!existingUser) {
    console.log('❌ Utilisateur introuvable. Connectez-vous d\'abord avec Google.\n');
    process.exit(1);
  }

  const aid = existingUser.associationId;
  console.log(`   ✔ Association: ${existingUser.association.nameAr} (${aid})`);
  console.log(`   ✔ Admin: ${existingUser.nameAr}\n`);

  const now = new Date();
  const day = (n: number) => new Date(now.getTime() - n * 86400000);

  const cats = await Promise.all([
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Medical', nameAr: 'طبي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Scolaire', nameAr: 'مدرسي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Alimentaire', nameAr: 'غذائي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Vetement', nameAr: 'ملبس', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Mobilier', nameAr: 'أثاث', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Electromenager', nameAr: 'أجهزة كهربائية', createdAt: now } }),
  ]);
  console.log('   ✔ 6 categories d\'articles');

  const locs = [
    await prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot Principal - Rayon A', nameAr: 'المستودع الرئيسي - الرف أ', createdAt: now } }),
    await prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot Principal - Rayon B', nameAr: 'المستودع الرئيسي - الرف ب', createdAt: now } }),
    await prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot Secondaire', nameAr: 'المستودع الثانوي', createdAt: now } }),
    await prisma.storageLocation.create({ data: { associationId: aid, name: 'Pharmacie', nameAr: 'الصيدلية', createdAt: now } }),
  ];
  console.log('   ✔ 4 emplacements');

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
  console.log('   ✔ 8 analyses medicales');

  await Promise.all([
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Mustapha Pacha', nameAr: 'مستشفى مصطفى باشا الجامعي', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Beni Messous', nameAr: 'مستشفى بني مسوس الجامعي', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Clinique Chifa', nameAr: 'عيادة الشفاء', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Hopital de Blida', nameAr: 'مستشفى البليدة', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Polyclinique El Biar', nameAr: 'مصلحة الطب العام - الأبيار', createdAt: now } }),
  ]);
  console.log('   ✔ 5 hopitaux');

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
  console.log('   ✔ 8 specialites');

  await Promise.all([
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'disponible', nameAr: 'متاح', createdAt: now } }),
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'prete', nameAr: 'مُعار', createdAt: now } }),
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'endommage', nameAr: 'تالف', createdAt: now } }),
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'hors_service', nameAr: 'خارج الخدمة', createdAt: now } }),
  ]);
  console.log('   ✔ 4 statuts articles');

  await Promise.all([
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CP', nameAr: 'السنة الأولى ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CE1', nameAr: 'السنة الثانية ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CE2', nameAr: 'السنة الثالثة ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CM1', nameAr: 'السنة الرابعة ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CM2', nameAr: 'السنة الخامسة ابتدائي', createdAt: now } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: '6eme', nameAr: 'السنة الأولى متوسط', createdAt: now } }),
  ]);
  console.log('   ✔ 6 niveaux scolaires');

  const caisses = [
    await prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Sociale', nameAr: 'الصندوق الاجتماعي', subCategories: [{ id: randomUUID(), name: 'Aide alimentaire', nameAr: 'مساعدة غذائية' }, { id: randomUUID(), name: 'Aide scolaire', nameAr: 'مساعدة مدرسية' }, { id: randomUUID(), name: 'Aide logement', nameAr: 'مساعدة إيجار' }, { id: randomUUID(), name: 'Aide chauffage', nameAr: 'مساعدة تدفئة' }], balance: 185000, createdAt: day(365), updatedAt: now } }),
    await prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Medicale', nameAr: 'الصندوق الطبي', subCategories: [{ id: randomUUID(), name: 'Analyses', nameAr: 'تحاليل' }, { id: randomUUID(), name: 'Medicaments', nameAr: 'أدوية' }, { id: randomUUID(), name: 'Soins', nameAr: 'علاجات' }, { id: randomUUID(), name: 'Urgences', nameAr: 'استعجالي' }], balance: 220000, createdAt: day(365), updatedAt: now } }),
    await prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Kafala', nameAr: 'صندوق الكفالة', subCategories: [{ id: randomUUID(), name: 'Orphelin', nameAr: 'كفالة يتيم' }, { id: randomUUID(), name: 'Veuve', nameAr: 'كفالة أرملة' }], balance: 320000, createdAt: day(365), updatedAt: now } }),
    await prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Zakat', nameAr: 'صندوق الزكاة', subCategories: [{ id: randomUUID(), name: 'Zakat Al-Mal', nameAr: 'زكاة المال' }, { id: randomUUID(), name: 'Zakat Fitr', nameAr: 'زكاة الفطر' }, { id: randomUUID(), name: 'Sadaqa', nameAr: 'صدقة' }], balance: 450000, createdAt: day(365), updatedAt: now } }),
    await prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Ramadan', nameAr: 'صندوق رمضان', subCategories: [{ id: randomUUID(), name: 'Colis', nameAr: 'قفة رمضان' }, { id: randomUUID(), name: 'Iftar', nameAr: 'إفطار' }], balance: 95000, createdAt: day(365), updatedAt: now } }),
  ];
  console.log('   ✔ 5 caisses');

  const banks = [
    await prisma.bankAccount.create({ data: { associationId: aid, bankName: 'BNA', bankNameAr: 'البنك الوطني الجزائري', accountNumber: '00212345678901', rib: '02 000 123456789 01', iban: 'DZ030020001234567890000101', swift: 'BNAADZAL', balance: 1250000, createdAt: day(365), updatedAt: now } }),
    await prisma.bankAccount.create({ data: { associationId: aid, bankName: 'CPA', bankNameAr: 'القرض الشعبي الجزائري', accountNumber: '00598765432109', rib: '03 000 987654321 09', iban: 'DZ050030009876543210000202', swift: 'CPALDZAL', balance: 680000, createdAt: day(300), updatedAt: now } }),
  ];
  console.log('   ✔ 2 comptes bancaires');

  const bens = [
    await prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Fatima', lastName: 'Zahra', firstNameAr: 'فاطمة', lastNameAr: 'الزهراء', address: '15 Rue des Freres, Alger', addressAr: '15 شارع الإخوة، الجزائر', phone: '0551234567', nationalCardNumber: '123456789012345', dateOfBirth: day(15000), attribut: 'veuve', gender: 'female', situation: 'Veuve 2 enfants', situationAr: 'bonne_sante', caisseId: caisses[2].id, subCategoryId: caisses[2].subCategories[1].id, children: [{ id: randomUUID(), firstName: 'Mohamed', lastName: 'Ben Fatima', firstNameAr: 'محمد', lastNameAr: 'بن فاطمة', dateOfBirth: '2014-08-22', gender: 'male', healthStatus: 'bonne_sante', schoolGradeId: '' }, { id: randomUUID(), firstName: 'Amina', lastName: 'Ben Fatima', firstNameAr: 'أمينة', lastNameAr: 'بن فاطمة', dateOfBirth: '2018-03-10', gender: 'female', healthStatus: 'bonne_sante', schoolGradeId: '' }], createdAt: day(180), updatedAt: now } }),
    await prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Khadija', lastName: 'Mansouri', firstNameAr: 'خديجة', lastNameAr: 'منصوري', address: 'Cite 500 Logts, Oran', addressAr: 'حي 500 مسكن، وهران', phone: '0552345678', nationalCardNumber: '987654321098765', dateOfBirth: day(20000), attribut: 'veuve', gender: 'female', situation: 'Veuve 1 enfant', situationAr: 'bonne_sante', caisseId: caisses[2].id, subCategoryId: caisses[2].subCategories[1].id, children: [{ id: randomUUID(), firstName: 'Karim', lastName: 'Ben Khadija', firstNameAr: 'كريم', lastNameAr: 'بن خديجة', dateOfBirth: '2008-09-14', gender: 'male', healthStatus: 'bonne_sante', schoolGradeId: '' }], createdAt: day(150), updatedAt: now } }),
    await prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Ahmed', lastName: 'Benali', firstNameAr: 'أحمد', lastNameAr: 'بن علي', address: 'Douar Ouled Sidi, Blida', addressAr: 'دوار أولاد سيدي، البليدة', phone: '0553456789', nationalCardNumber: '456789123456789', dateOfBirth: day(12000), attribut: 'orphelin', gender: 'male', situation: 'Orphelin', situationAr: 'bonne_sante', caisseId: caisses[2].id, subCategoryId: caisses[2].subCategories[0].id, children: [], createdAt: day(120), updatedAt: now } }),
    await prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Aicha', lastName: 'Boumediene', firstNameAr: 'عائشة', lastNameAr: 'بومدين', address: 'Route de Setif, Ain El Kebira', addressAr: 'طريق سطيف، عين الكبيرة', phone: '0554567890', nationalCardNumber: '654321987654321', dateOfBirth: day(22000), attribut: 'personne_agee', gender: 'female', situation: 'Agee seule', situationAr: 'bonne_sante', caisseId: caisses[0].id, subCategoryId: caisses[0].subCategories[2].id, children: [], onBehalfOfName: 'ابنها محمد', createdAt: day(90), updatedAt: now } }),
    await prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Malika', lastName: 'Djouadi', firstNameAr: 'مالكة', lastNameAr: 'جودي', address: 'Hai Nasr, Constantine', addressAr: 'حي نصر، قسنطينة', phone: '0555678901', nationalCardNumber: '321654987321654', dateOfBirth: day(10000), attribut: 'famille_demunie', gender: 'female', situation: 'Famille demunie', situationAr: 'bonne_sante', caisseId: caisses[0].id, subCategoryId: caisses[0].subCategories[0].id, children: [{ id: randomUUID(), firstName: 'Nadia', lastName: 'Ben Malika', firstNameAr: 'نادية', lastNameAr: 'بن مالك', dateOfBirth: '2017-05-12', gender: 'female', healthStatus: 'bonne_sante', schoolGradeId: '' }], createdAt: day(60), updatedAt: now } }),
    await prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Said', lastName: 'Hadj Ahmed', firstNameAr: 'سعيد', lastNameAr: 'حاج أحمد', address: 'Quartier El Harrach, Alger', addressAr: 'حي الحراش، الجزائر', phone: '0556789012', nationalCardNumber: '159357852456', dateOfBirth: day(8000), attribut: 'handicape', gender: 'male', situation: 'Handicape moteur', situationAr: 'handicape', caisseId: caisses[1].id, children: [], onBehalfOfName: 'والده', createdAt: day(45), updatedAt: now } }),
    await prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Zineb', lastName: 'Haddad', firstNameAr: 'زينب', lastNameAr: 'حداد', address: 'Rue Khemisti, Tizi Ouzou', addressAr: 'شارع خميسي، تيزي وزو', phone: '0557890123', nationalCardNumber: '753951852456', dateOfBirth: day(13000), attribut: 'famille_demunie', gender: 'female', situation: 'Famille nombreuse', situationAr: 'bonne_sante', caisseId: caisses[0].id, subCategoryId: caisses[0].subCategories[0].id, children: [{ id: randomUUID(), firstName: 'Yacine', lastName: 'Ben Zineb', firstNameAr: 'ياسين', lastNameAr: 'بن زينب', dateOfBirth: '2015-11-30', gender: 'male', healthStatus: 'malade', healthDetails: 'Asthme', schoolGradeId: '' }, { id: randomUUID(), firstName: 'Lina', lastName: 'Ben Zineb', firstNameAr: 'لينا', lastNameAr: 'بن زينب', dateOfBirth: '2019-07-22', gender: 'female', healthStatus: 'bonne_sante', schoolGradeId: '' }], createdAt: day(30), updatedAt: now } }),
  ];
  console.log('   ✔ 7 beneficiaires');

  const donors = [
    await prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Abdelkader', lastName: 'Hadj Hamou', firstNameAr: 'عبد القادر', lastNameAr: 'حاج حمو', phone: '0661112233', email: 'a.hadjhamou@email.dz', totalDonated: 450000, createdAt: day(365), updatedAt: now } }),
    await prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Noureddine', lastName: 'Khaldi', firstNameAr: 'نور الدين', lastNameAr: 'خالدي', phone: '0677445566', email: 'n.khaldi@entreprise.dz', totalDonated: 850000, createdAt: day(300), updatedAt: now } }),
    await prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Samia', lastName: 'Boukhari', firstNameAr: 'سامية', lastNameAr: 'بوقاري', phone: '0557889900', totalDonated: 180000, createdAt: day(250), updatedAt: now } }),
    await prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Ali', lastName: 'Mammeri', firstNameAr: 'علي', lastNameAr: 'معمري', phone: '0663334455', email: 'ali.mammeri@mail.dz', totalDonated: 120000, createdAt: day(200), updatedAt: now } }),
    await prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Fatima Zohra', lastName: 'Benkhelifa', firstNameAr: 'فاطمة الزهراء', lastNameAr: 'بن خليفة', phone: '0559988776', totalDonated: 520000, createdAt: day(180), updatedAt: now } }),
    await prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Mustapha', lastName: 'Toumi', firstNameAr: 'مصطفى', lastNameAr: 'طومي', phone: '0771122334', email: 'm.toumi@pharma.dz', totalDonated: 300000, createdAt: day(120), updatedAt: now } }),
  ];
  console.log('   ✔ 6 donateurs');

  const doctors = [
    await prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Amina', lastName: 'Belkacem', firstNameAr: 'أمينة', lastNameAr: 'بلقاسم', phone: '0551987654', specialtyId: specialities[0].id, createdAt: day(200), updatedAt: now } }),
    await prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Mourad', lastName: 'Bensebaa', firstNameAr: 'مراد', lastNameAr: 'بن سبع', phone: '0555765432', specialtyId: specialities[3].id, createdAt: day(180), updatedAt: now } }),
    await prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Nadia', lastName: 'Amirouche', firstNameAr: 'نادية', lastNameAr: 'عميروش', phone: '0661122334', specialtyId: specialities[2].id, createdAt: day(160), updatedAt: now } }),
    await prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Rachid', lastName: 'Ouali', firstNameAr: 'رشيد', lastNameAr: 'والي', phone: '0556677889', specialtyId: specialities[1].id, createdAt: day(140), updatedAt: now } }),
    await prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Karim', lastName: 'Mekki', firstNameAr: 'كريم', lastNameAr: 'مكي', phone: '0558899001', specialtyId: specialities[7].id, createdAt: day(120), updatedAt: now } }),
    await prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Ahmed', lastName: 'Boualem', firstNameAr: 'أحمد', lastNameAr: 'بوعلام', phone: '0665544332', specialtyId: specialities[5].id, createdAt: day(100), updatedAt: now } }),
  ];
  console.log('   ✔ 6 medecins');

  const referrals = [
    { b: 0, d: 0, c: 1, amt: 4500, st: 'completed', dt: 25, a: 'Bilan sanguin', aAr: 'تحليل دم' },
    { b: 4, d: 0, c: 1, amt: 3500, st: 'completed', dt: 20, a: 'Glycemie', aAr: 'السكري' },
    { b: 1, d: 1, c: 1, amt: 8000, st: 'completed', dt: 18, a: 'Echographie', aAr: 'صدى القلب' },
    { b: 3, d: 1, c: 1, amt: 6000, st: 'completed', dt: 15, a: 'Cardiologie', aAr: 'استشارة قلب' },
    { b: 2, d: 3, c: 1, amt: 0, st: 'pending', dt: 10, a: 'Pediatrie', aAr: 'استشارة أطفال' },
    { b: 0, d: 0, c: 1, amt: 0, st: 'pending', dt: 5, a: 'Analyse sang', aAr: 'تحليل دم' },
    { b: 5, d: 4, c: 1, amt: 0, st: 'pending', dt: 3, a: 'Orthopedie', aAr: 'استشارة عظام' },
    { b: 6, d: 3, c: 2, amt: 0, st: 'pending', dt: 1, a: 'Pediatrie', aAr: 'استشارة أطفال' },
  ];
  for (const r of referrals) {
    await prisma.medicalReferral.create({ data: { associationId: aid, reference: ref('MED'), beneficiaryId: bens[r.b].id, caisseId: caisses[r.c].id, doctorId: doctors[r.d].id, analysisType: r.a, analysisTypeAr: r.aAr, amount: r.amt, amountInWords: r.amt > 0 ? `${r.amt} DZD` : '0 DZD', amountInWordsAr: r.amt > 0 ? `${r.amt} دينار` : '0 دينار', status: r.st, date: day(r.dt), createdAt: day(r.dt), updatedAt: now } });
    if (r.st === 'completed' && r.amt > 0) await prisma.caisse.update({ where: { id: caisses[r.c].id }, data: { balance: { decrement: r.amt } } });
  }
  console.log('   ✔ 8 orientations medicales');

  const txs = [
    { t: 'credit', a: 80000, f: 'caisse_physique', c: 3, d: 0, ds: 'Don Zakat', dsAr: 'زكاة المال' },
    { t: 'credit', a: 50000, f: 'caisse_physique', c: 0, d: 1, ds: 'Don Ramadan', dsAr: 'تبرع رمضاني' },
    { t: 'credit', a: 150000, f: 'banque', c: 3, k: 0, d: 1, ds: 'Don entreprise', dsAr: 'تبرع مؤسسة' },
    { t: 'credit', a: 30000, f: 'caisse_physique', c: 4, d: 2, ds: 'Don Ramadan', dsAr: 'تبرع رمضان' },
    { t: 'credit', a: 200000, f: 'banque', c: 3, k: 1, d: 4, ds: 'Zakat Fitr', dsAr: 'زكاة الفطر' },
    { t: 'credit', a: 45000, f: 'caisse_physique', c: 1, d: 3, ds: 'Don mensuel', dsAr: 'تبرع شهري' },
    { t: 'credit', a: 100000, f: 'banque', c: 3, k: 0, d: 5, ds: 'Don pharmacie', dsAr: 'تبرع أدوية' },
    { t: 'debit', a: 25000, f: 'caisse_physique', c: 0, ds: 'Aide alimentaire', dsAr: 'مساعدة غذائية' },
    { t: 'debit', a: 18000, f: 'caisse_physique', c: 1, ds: 'Aide medicaments', dsAr: 'مساعدة أدوية' },
    { t: 'debit', a: 10000, f: 'caisse_physique', c: 2, ds: 'Aide orphelin', dsAr: 'مساعدة يتيم' },
    { t: 'debit', a: 12000, f: 'caisse_physique', c: 0, ds: 'Aide chauffage', dsAr: 'مساعدة تدفئة' },
    { t: 'debit', a: 5000, f: 'caisse_physique', c: 4, ds: 'Repas iftar', dsAr: 'وجبات إفطار' },
  ];
  for (let i = 0; i < txs.length; i++) {
    const x = txs[i];
    const cr = x.t === 'credit';
    const tx = await prisma.transaction.create({ data: { associationId: aid, type: x.t, amount: x.a, amountInWords: `${x.a} DZD`, amountInWordsAr: `${x.a} دينار`, fundSource: x.f, caisseId: caisses[x.c].id, bankAccountId: x.f === 'banque' ? banks[(x.k || 0) % banks.length]?.id : undefined, donorId: cr ? donors[x.d]?.id : undefined, beneficiaryId: !cr ? bens[i % bens.length]?.id : undefined, description: x.ds, descriptionAr: x.dsAr, receiptNumber: cr ? ref('BON') : undefined, status: 'completed', date: day(i * 15 + 5), createdAt: day(i * 15 + 5), updatedAt: now } });
    if (cr) {
      await prisma.donationReceipt.create({ data: { associationId: aid, receiptNumber: tx.receiptNumber!, donorId: donors[x.d].id, donorName: `${donors[x.d].firstName} ${donors[x.d].lastName}`, donorNameAr: `${donors[x.d].firstNameAr} ${donors[x.d].lastNameAr}`, transactionId: tx.id, amount: x.a, amountInWords: tx.amountInWords, amountInWordsAr: tx.amountInWordsAr, caisseId: caisses[x.c].id, caisseName: caisses[x.c].name, caisseNameAr: caisses[x.c].nameAr, date: tx.date, createdAt: tx.createdAt } });
      if (i % 2 === 0) await prisma.donationAllocation.create({ data: { associationId: aid, donorId: donors[x.d].id, beneficiaryId: bens[i % bens.length].id, creditTransactionId: tx.id, amount: Math.floor(x.a / 3), remainingAmount: Math.floor(x.a / 3) } });
      await prisma.caisse.update({ where: { id: caisses[x.c].id }, data: { balance: { increment: x.a } } });
      if (x.f === 'banque' && x.k !== undefined) await prisma.bankAccount.update({ where: { id: banks[x.k % banks.length].id }, data: { balance: { increment: x.a } } });
    } else { await prisma.caisse.update({ where: { id: caisses[x.c].id }, data: { balance: { decrement: x.a } } }); }
  }
  console.log('   ✔ 12 transactions + recus + allocations');

  const [art] = cats;
  await Promise.all([
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Fauteuil roulant', nameAr: 'كرسي متحرك', categoryId: art.id, quantity: 15, availableQuantity: 10, status: 'disponible', condition: 'Neuf', conditionAr: 'جديد', createdAt: day(150), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Lit medicalise', nameAr: 'سرير طبي', categoryId: art.id, quantity: 8, availableQuantity: 5, status: 'disponible', condition: 'Bon', conditionAr: 'جيد', createdAt: day(140), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Bequilles aluminium', nameAr: 'عكازات', categoryId: art.id, quantity: 25, availableQuantity: 22, status: 'disponible', condition: 'Neuf', conditionAr: 'جديد', createdAt: day(130), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Cartable 5-7 ans', nameAr: 'حقيبة مدرسية', categoryId: cats[1].id, quantity: 50, availableQuantity: 50, status: 'disponible', condition: 'Neuf', conditionAr: 'جديد', createdAt: day(120), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Colis alimentaire', nameAr: 'سلة غذائية', categoryId: cats[2].id, quantity: 200, availableQuantity: 200, status: 'disponible', condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(110), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Couverture polaire', nameAr: 'بطانية', categoryId: cats[3].id, quantity: 80, availableQuantity: 75, status: 'disponible', condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(100), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Table pliante', nameAr: 'طاولة', categoryId: cats[4].id, quantity: 10, availableQuantity: 10, status: 'disponible', condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(90), updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Ventilateur', nameAr: 'مروحة', categoryId: cats[5].id, quantity: 30, availableQuantity: 30, status: 'disponible', condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: day(80), updatedAt: now } }),
  ]);
  console.log('   ✔ 8 articles');

  await prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[0].id, status: 'en_cours', items: [{ articleId: null, articleName: 'Fauteuil roulant', articleNameAr: 'كرسي متحرك', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' }], loanDate: day(45), createdAt: day(45), updatedAt: now } });
  await prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[2].id, status: 'partiellement_retourne', items: [{ articleId: null, articleName: 'Cartable', articleNameAr: 'حقيبة', quantity: 2, returnedQuantity: 1, conditionOnLoan: 'Neuf' }], loanDate: day(60), createdAt: day(60), updatedAt: now } });
  await prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[4].id, status: 'en_cours', items: [{ articleId: null, articleName: 'Ventilateur', articleNameAr: 'مروحة', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' }], loanDate: day(20), createdAt: day(20), updatedAt: now } });
  console.log('   ✔ 3 prets');

  await Promise.all([
    prisma.notification.create({ data: { associationId: aid, type: 'info', message: 'Bienvenue', messageAr: 'مرحباً', read: false, createdAt: day(30) } }),
    prisma.notification.create({ data: { associationId: aid, type: 'success', message: 'Don: 150000 DZD', messageAr: 'تبرع جديد', read: false, createdAt: day(20) } }),
    prisma.notification.create({ data: { associationId: aid, type: 'warning', message: 'Stock bas', messageAr: 'المخزون منخفض', read: false, createdAt: day(10) } }),
  ]);
  console.log('   ✔ 3 notifications');

  console.log('\n========================================');
  console.log('   ✅ SEED TERMINE AVEC SUCCES !\n');
  console.log('   7 beneficiaires | 6 donateurs | 6 medecins');
  console.log('   5 caisses | 2 banques | 8 articles | 3 prets');
  console.log('   8 orientations | 12 transactions');
  console.log('   Categories: articles/stockage/analyses/hopitaux/specialites/statuts/niveaux');
  console.log('========================================\n');
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1); }).finally(() => prisma.$disconnect());

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
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const orderNum = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${y}${mo}${d}-${h}${mi}${s}-${ms}-${orderNum}`;
}

// Helper: build a date in the past based on days offset from now
function daysAgo(n) {
  return new Date(Date.now() - n * 86400000);
}

// Arabic number to words (simplified, compatible with CommonJS)
function arabicWords(amount) {
  const num = Math.floor(amount);
  if (num === 0) return 'صفر دينار';
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  function convertHundreds(n) {
    if (n === 0) return '';
    const h = Math.floor(n / 100);
    const r = n % 100;
    const t = Math.floor(r / 10);
    const o = r % 10;
    const parts = [];
    if (h > 0) parts.push(hundreds[h]);
    if (r === 0) {}
    else if (r < 10) parts.push(ones[o]);
    else if (r === 10) parts.push('عشرة');
    else if (r === 11) parts.push('أحد عشر');
    else if (r === 12) parts.push('اثنا عشر');
    else if (r < 20) parts.push(ones[o] + ' عشر');
    else if (o === 0) parts.push(tens[t]);
    else parts.push(ones[o] + ' و ' + tens[t]);
    return parts.join(' و ');
  }
  const parts = [];
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else parts.push(convertHundreds(millions) + ' ملايين');
  }
  const afterMillions = num % 1000000;
  if (afterMillions >= 1000) {
    const thousands = Math.floor(afterMillions / 1000);
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else parts.push(convertHundreds(thousands) + ' ألف');
  }
  const afterThousands = afterMillions % 1000;
  if (afterThousands > 0) parts.push(convertHundreds(afterThousands));
  return parts.join(' و ') + ' دينار';
}

const n2words = require('n2words');

async function main() {
  console.log('\n🌱 SEED: Génération complète des données réelles...\n');

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
  console.log(`   ✔ Association: ${existingUser.association.nameAr} (${aid})`);
  console.log(`   ✔ Admin: ${existingUser.nameAr}\n`);

  // ============================================================
  // 1. CATÉGORIES D'ARTICLES
  // ============================================================
  const cats = await Promise.all([
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Équipement médical', nameAr: 'معدات طبية' } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Fournitures scolaires', nameAr: 'لوازم مدرسية' } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Aide alimentaire', nameAr: 'مساعدات غذائية' } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Vêtements', nameAr: 'ملابس' } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Mobilier', nameAr: 'أثاث' } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Électroménager', nameAr: 'أجهزة كهربائية' } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Couvertures et literie', nameAr: 'أغطية وفراش' } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Produits d\'hygiène', nameAr: 'مواد نظافة' } }),
  ]);
  console.log('   ✔ 8 catégories d\'articles');

  // ============================================================
  // 2. EMPLACEMENTS DE STOCKAGE
  // ============================================================
  const locs = await Promise.all([
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Entrepôt principal - Section A', nameAr: 'المستودع الرئيسي - القسم أ' } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Entrepôt principal - Section B', nameAr: 'المستودع الرئيسي - القسم ب' } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Entrepôt secondaire', nameAr: 'المستودع الثانوي' } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Local médical', nameAr: 'المخزن الطبي' } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Réserve alimentaire', nameAr: 'مخزن المواد الغذائية' } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Bureau administratif', nameAr: 'المكتب الإداري' } }),
  ]);
  console.log('   ✔ 6 emplacements de stockage');

  // ============================================================
  // 3. TYPES D'ANALYSES MÉDICALES
  // ============================================================
  await Promise.all([
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Bilan sanguin complet', nameAr: 'تحليل دم شامل' } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Glycémie', nameAr: 'تحليل السكري' } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Radiographie pulmonaire', nameAr: 'أشعة الصدر' } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'IRM cérébrale', nameAr: 'رنين مغناطيسي للدماغ' } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Échographie abdominale', nameAr: 'تصوير البطن بالموجات' } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Consultation cardiologie', nameAr: 'استشارة قلبية' } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Consultation ophtalmologie', nameAr: 'استشارة عيون' } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Scanner', nameAr: 'سكانر' } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Électrocardiogramme', nameAr: 'تخطيط القلب' } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Analyses hormonales', nameAr: 'تحاليل هرمونية' } }),
  ]);
  console.log('   ✔ 10 types d\'analyses médicales');

  // ============================================================
  // 4. HÔPITAUX
  // ============================================================
  await Promise.all([
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Mustapha Pacha', nameAr: 'مستشفى مصطفى باشا الجامعي' } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Beni Messous', nameAr: 'مستشفى بني مسوس الجامعي' } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Clinique El Chifa', nameAr: 'عيادة الشفاء' } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Hôpital de Blida', nameAr: 'مستشفى البليدة' } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Polyclinique El Biar', nameAr: 'مصلحة الطب العام - الأبيار' } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'EPH Kouba', nameAr: 'المؤسسة الاستشفائية العمومية - كوبا' } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Clinique Ibn Sina', nameAr: 'عيادة ابن سينا' } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Tizi Ouzou', nameAr: 'المستشفى الجامعي - تيزي وزو' } }),
  ]);
  console.log('   ✔ 8 hôpitaux');

  // ============================================================
  // 5. SPÉCIALITÉS MÉDICALES
  // ============================================================
  const specialities = await Promise.all([
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Médecine générale', nameAr: 'طب عام' } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Pédiatrie', nameAr: 'طب الأطفال' } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Ophtalmologie', nameAr: 'طب العيون' } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Cardiologie', nameAr: 'طب القلب' } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Chirurgie générale', nameAr: 'جراحة عامة' } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Gynécologie', nameAr: 'طب النساء' } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Dermatologie', nameAr: 'طب الجلد' } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Orthopédie', nameAr: 'طب العظام' } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Neurologie', nameAr: 'طب الأعصاب' } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'ORL', nameAr: 'أنف وأذن وحنجرة' } }),
  ]);
  console.log('   ✔ 10 spécialités médicales');

  // ============================================================
  // 6. STATUTS D'ARTICLES
  // ============================================================
  await Promise.all([
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'disponible', nameAr: 'متاح' } }),
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'prete', nameAr: 'مُعار' } }),
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'endommage', nameAr: 'تالف' } }),
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'hors_service', nameAr: 'خارج الخدمة' } }),
    prisma.articleStatusType.create({ data: { associationId: aid, name: 'en_maintenance', nameAr: 'قيد الصيانة' } }),
  ]);
  console.log('   ✔ 5 statuts d\'articles');

  // ============================================================
  // 7. NIVEAUX SCOLAIRES
  // ============================================================
  await Promise.all([
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CP', nameAr: 'السنة الأولى ابتدائي' } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CE1', nameAr: 'السنة الثانية ابتدائي' } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CE2', nameAr: 'السنة الثالثة ابتدائي' } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CM1', nameAr: 'السنة الرابعة ابتدائي' } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'CM2', nameAr: 'السنة الخامسة ابتدائي' } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: '6ème', nameAr: 'السنة الأولى متوسط' } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: '5ème', nameAr: 'السنة الثانية متوسط' } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: '4ème', nameAr: 'السنة الثالثة متوسط' } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: '3ème', nameAr: 'السنة الرابعة متوسط' } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: '2nde', nameAr: 'السنة الأولى ثانوي' } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: '1ère', nameAr: 'السنة الثانية ثانوي' } }),
    prisma.schoolGrade.create({ data: { associationId: aid, name: 'Terminal', nameAr: 'السنة الثالثة ثانوي' } }),
  ]);
  console.log('   ✔ 12 niveaux scolaires');

  // ============================================================
  // 8. CAISSES
  // ============================================================
  const caisses = await Promise.all([
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Sociale', nameAr: 'الصندوق الاجتماعي', subCategories: [
      { id: randomUUID(), name: 'Aide alimentaire d\'urgence', nameAr: 'مساعدة غذائية عاجلة' },
      { id: randomUUID(), name: 'Aide scolaire', nameAr: 'مساعدة مدرسية' },
      { id: randomUUID(), name: 'Aide au logement', nameAr: 'مساعدة إيجار' },
      { id: randomUUID(), name: 'Aide chauffage hiver', nameAr: 'مساعدة تدفئة' },
      { id: randomUUID(), name: 'Aide vêture', nameAr: 'مساعدة ملابس' },
    ], balance: 245000 } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Médicale', nameAr: 'الصندوق الطبي', subCategories: [
      { id: randomUUID(), name: 'Analyses médicales', nameAr: 'تحاليل طبية' },
      { id: randomUUID(), name: 'Médicaments', nameAr: 'أدوية' },
      { id: randomUUID(), name: 'Soins spécialisés', nameAr: 'علاجات متخصصة' },
      { id: randomUUID(), name: 'Urgences médicales', nameAr: 'حالات استعجالية' },
      { id: randomUUID(), name: 'Consultations spécialisées', nameAr: 'استشارات متخصصة' },
    ], balance: 380000 } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Kafala (Parrainage)', nameAr: 'صندوق الكفالة', subCategories: [
      { id: randomUUID(), name: 'Kafala orphelin', nameAr: 'كفالة يتيم' },
      { id: randomUUID(), name: 'Kafala veuve', nameAr: 'كفالة أرملة' },
      { id: randomUUID(), name: 'Kafala personne âgée', nameAr: 'كفالة مسن' },
    ], balance: 425000 } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Zakat', nameAr: 'صندوق الزكاة', subCategories: [
      { id: randomUUID(), name: 'Zakat Al-Mal', nameAr: 'زكاة المال' },
      { id: randomUUID(), name: 'Zakat Al-Fitr', nameAr: 'زكاة الفطر' },
      { id: randomUUID(), name: 'Sadaqa Jariya', nameAr: 'صدقة جارية' },
    ], balance: 580000 } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Ramadan', nameAr: 'صندوق رمضان', subCategories: [
      { id: randomUUID(), name: 'Colis ramadan', nameAr: 'قفة رمضان' },
      { id: randomUUID(), name: 'Repas iftar', nameAr: 'وجبات إفطار' },
      { id: randomUUID(), name: 'Habitation Ramadan', nameAr: 'كسوة العيد' },
    ], balance: 145000 } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Projets spéciaux', nameAr: 'صندوق المشاريع الخاصة', subCategories: [
      { id: randomUUID(), name: 'Construction puits', nameAr: 'حفر الآبار' },
      { id: randomUUID(), name: 'Scolarisation enfants', nameAr: 'تمدرس الأطفال' },
      { id: randomUUID(), name: 'Formation professionnelle', nameAr: 'تكوين مهني' },
    ], balance: 320000 } }),
  ]);
  console.log('   ✔ 6 caisses');

  // ============================================================
  // 9. COMPTES BANCAIRES
  // ============================================================
  const banks = await Promise.all([
    prisma.bankAccount.create({ data: { associationId: aid, bankName: 'Banque Nationale d\'Algérie (BNA)', bankNameAr: 'البنك الوطني الجزائري', accountNumber: '00212345678901', rib: '02 000 123456789 01', iban: 'DZ030020001234567890000101', swift: 'BNAADZAL', balance: 1850000 } }),
    prisma.bankAccount.create({ data: { associationId: aid, bankName: 'Crédit Populaire d\'Algérie (CPA)', bankNameAr: 'القرض الشعبي الجزائري', accountNumber: '00598765432109', rib: '03 000 987654321 09', iban: 'DZ050030009876543210000202', swift: 'CPALDZAL', balance: 920000 } }),
    prisma.bankAccount.create({ data: { associationId: aid, bankName: 'Banque Extérieure d\'Algérie (BEA)', bankNameAr: 'البنك الخارجي الجزائري', accountNumber: '002001190300008912', rib: '02 000 119030000 12', iban: 'DZ030020011903000089120000103', swift: 'BEADZDAL', balance: 540000 } }),
  ]);
  console.log('   ✔ 3 comptes bancaires');

  // ============================================================
  // 10. BÉNÉFICIAIRES
  // ============================================================
  const bens = [];
  const beneficiariesData = [
    { f: 'Fatima', l: 'Zahra', fa: 'فاطمة', la: 'الزهراء', a: '15 Rue des Frères, Alger', aa: '15 شارع الإخوة، الجزائر', ph: '0551234567', cn: '123456789012345', age: 15000, attr: 'veuve', gen: 'female', sit: 'Femme veuve avec 2 enfants à charge', sitAr: 'أرملة مع طفلين', ci: 2, sc: 0, ch: 2 },
    { f: 'Khadija', l: 'Mansouri', fa: 'خديجة', la: 'منصوري', a: 'Cité 500 Logts, Oran', aa: 'حي 500 مسكن، وهران', ph: '0552345678', cn: '987654321098765', age: 20000, attr: 'veuve', gen: 'female', sit: 'Veuve avec 1 enfant', sitAr: 'أرملة مع طفل واحد', ci: 2, sc: 1, ch: 1 },
    { f: 'Ahmed', l: 'Benali', fa: 'أحمد', la: 'بن علي', a: 'Douar Ouled Sidi, Blida', aa: 'دوار أولاد سيدي، البليدة', ph: '0553456789', cn: '456789123456789', age: 12000, attr: 'orphelin', gen: 'male', sit: 'Orphelin mère au foyer', sitAr: 'يتيم الأم ربة منزل', ci: 2, sc: 0, ch: 0 },
    { f: 'Aïcha', l: 'Boumediene', fa: 'عائشة', la: 'بومدين', a: 'Route de Sétif, Ain El Kebira', aa: 'طريق سطيف، عين الكبيرة', ph: '0554567890', cn: '654321987654321', age: 22000, attr: 'personne_agee', gen: 'female', sit: 'Personne âgée seule, sans revenu', sitAr: 'مسنة وحيدة بدون دخل', ci: 0, sc: 2, ch: 0 },
    { f: 'Malika', l: 'Djouadi', fa: 'مالكة', la: 'جودي', a: 'Hai Nasr, Constantine', aa: 'حي نصر، قسنطينة', ph: '0555678901', cn: '321654987321654', age: 10000, attr: 'famille_demunie', gen: 'female', sit: 'Famille démunie, besoin aide alimentaire', sitAr: 'عائلة معوزة بحاجة إلى مساعدة غذائية', ci: 0, sc: 0, ch: 1 },
    { f: 'Said', l: 'Hadj Ahmed', fa: 'سعيد', la: 'حاج أحمد', a: 'Quartier El Harrach, Alger', aa: 'حي الحراش، الجزائر', ph: '0556789012', cn: '159357852456', age: 8000, attr: 'handicape', gen: 'male', sit: 'Handicapé moteur suite accident', sitAr: 'إعاقة حركية بسبب حادث', ci: 1, sc: 0, ch: 0 },
    { f: 'Zineb', l: 'Haddad', fa: 'زينب', la: 'حداد', a: 'Rue Khemisti, Tizi Ouzou', aa: 'شارع خميسي، تيزي وزو', ph: '0557890123', cn: '753951852456', age: 13000, attr: 'famille_demunie', gen: 'female', sit: 'Famille nombreuse, besoins multiples', sitAr: 'عائلة كبيرة، احتياجات متعددة', ci: 0, sc: 0, ch: 2 },
    { f: 'Mohamed', l: 'Bouchama', fa: 'محمد', la: 'بوشامة', a: 'Cité Boudouaou, Boumerdes', aa: 'حي بودواو، بومرداس', ph: '0558901234', cn: '852963741852963', age: 8500, attr: 'orphelin', gen: 'male', sit: 'Orphelin de père', sitAr: 'يتيم الأب', ci: 2, sc: 0, ch: 0 },
    { f: 'Fatima', l: 'Cherif', fa: 'فاطمة', la: 'شريف', a: 'Rue Didouche Mourad, Constantine', aa: 'شارع ديدوش مراد، قسنطينة', ph: '0559012345', cn: '963852741963852', age: 25000, attr: 'personne_agee', gen: 'female', sit: 'Personne âgée malade chronique', sitAr: 'مسنة مريضة مزمنة', ci: 1, sc: 3, ch: 0 },
    { f: 'Hocine', l: 'Belkacem', fa: 'حسين', la: 'بلقاسم', a: 'Village Tala Hamza, Sétif', aa: 'قرية تالة حمزة، سطيف', ph: '0560123456', cn: '147258369147258', age: 18000, attr: 'handicape', gen: 'male', sit: 'Handicap visuel', sitAr: 'إعاقة بصرية', ci: 1, sc: 2, ch: 0 },
    { f: 'Yasmina', l: 'Oumeziane', fa: 'ياسمينا', la: 'أومزيان', a: 'Quartier des Tagarins, Blida', aa: 'حي التقرين، البليدة', ph: '0561234567', cn: '258369147258369', age: 9000, attr: 'veuve', gen: 'female', sit: 'Veuve avec 3 enfants', sitAr: 'أرملة مع 3 أطفال', ci: 0, sc: 1, ch: 3 },
    { f: 'Karim', l: 'Saadi', fa: 'كريم', la: 'سعدي', a: 'Cité 1080 Logts, Alger', aa: 'حي 1080 مسكن، الجزائر', ph: '0562345678', cn: '369147258369147', age: 6000, attr: 'orphelin', gen: 'male', sit: 'Orphelin vit chez grand-père', sitAr: 'يتيم يعيش مع جده', ci: 2, sc: 0, ch: 0 },
  ];

  for (const b of beneficiariesData) {
    const ben = await prisma.beneficiary.create({
      data: {
        associationId: aid, reference: ref('BEN'),
        firstName: b.f, lastName: b.l, firstNameAr: b.fa, lastNameAr: b.la,
        address: b.a, addressAr: b.aa, phone: b.ph, nationalCardNumber: b.cn,
        dateOfBirth: daysAgo(b.age), attribut: b.attr, gender: b.gen,
        situation: b.sit, situationAr: b.sitAr,
        caisseId: caisses[b.ci].id, subCategoryId: caisses[b.ci].subCategories[b.sc].id,
        children: b.ch > 0 ? Array.from({ length: b.ch }, (_, i) => ({
          id: randomUUID(),
          firstNameAr: i % 2 === 0 ? 'محمد' : 'مريم',
          lastNameAr: `بن ${b.la}`,
          firstName: i % 2 === 0 ? 'Mohamed' : 'Maria',
          lastName: `Ben ${b.l}`,
          dateOfBirth: new Date(Date.now() - (3 + i * 4) * 365 * 86400000).toISOString().split('T')[0],
          gender: i % 2 === 0 ? 'male' : 'female',
          healthStatus: 'bonne_sante',
          schoolGradeId: '',
        })) : [],
        createdAt: daysAgo(180),
      },
    });
    bens.push(ben);
  }
  console.log('   ✔ 12 bénéficiaires');

  // ============================================================
  // 11. DONATEURS
  // ============================================================
  const donors = [];
  const donorsData = [
    { f: 'Abdelkader', l: 'Hadj Hamou', fa: 'عبد القادر', la: 'حاج حمو', ph: '0661112233', em: 'a.hadjhamou@email.dz', nt: 'Donateur régulier depuis 2020', tot: 450000 },
    { f: 'Noureddine', l: 'Khaldi', fa: 'نور الدين', la: 'خالدي', ph: '0677445566', em: 'n.khaldi@entreprise.dz', nt: 'Entreprise BTP', tot: 850000 },
    { f: 'Samia', l: 'Boukhari', fa: 'سامية', la: 'بوقاري', ph: '0557889900', em: '', nt: '', tot: 180000 },
    { f: 'Ali', l: 'Mammeri', fa: 'علي', la: 'معمري', ph: '0663334455', em: 'ali.mammeri@mail.dz', nt: 'Donateur mensuel', tot: 120000 },
    { f: 'Fatima Zohra', l: 'Benkhelifa', fa: 'فاطمة الزهراء', la: 'بن خليفة', ph: '0559988776', em: '', nt: '', tot: 520000 },
    { f: 'Mustapha', l: 'Toumi', fa: 'مصطفى', la: 'طومي', ph: '0771122334', em: 'm.toumi@pharma.dz', nt: 'Pharmacien, don médicaments + argent', tot: 300000 },
    { f: 'Hicham', l: 'Benabdallah', fa: 'هشام', la: 'بن عبد الله', ph: '0554433221', em: 'h.benabdallah@gmail.com', nt: 'Membre actif du bureau', tot: 250000 },
    { f: 'Soraya', l: 'Meziane', fa: 'ثريا', la: 'مزيان', ph: '0556677889', em: 's.meziane@yahoo.fr', nt: 'Mécénat annuel', tot: 680000 },
    { f: 'Mohamed Amine', l: 'Saïdouni', fa: 'محمد أمين', la: 'سعيدوني', ph: '0667788990', em: '', nt: '', tot: 95000 },
    { f: 'Lamia', l: 'Boudiaf', fa: 'لمياء', la: 'بوضياف', ph: '0559988001', em: 'l.boudiaf@hotmail.com', nt: 'Enseignante retraitée', tot: 175000 },
  ];
  for (const d of donorsData) {
    const donor = await prisma.donor.create({
      data: {
        associationId: aid, reference: ref('DON'),
        firstName: d.f, lastName: d.l, firstNameAr: d.fa, lastNameAr: d.la,
        phone: d.ph, email: d.em || null, notes: d.nt || null,
        totalDonated: d.tot,
      },
    });
    donors.push(donor);
  }
  console.log('   ✔ 10 donateurs');

  // ============================================================
  // 12. MÉDECINS
  // ============================================================
  const doctors = [];
  const doctorsData = [
    { f: 'Amina', l: 'Belkacem', fa: 'أمينة', la: 'بلقاسم', ph: '0551987654', em: 'amina.belkacem@med.dz', sp: 0, addr: 'Clinique El Biar, 15 Rue Belouizdad, Alger', nt: 'Disponible les lundis, mercredis et vendredis 9h-16h' },
    { f: 'Mourad', l: 'Bensebaa', fa: 'مراد', la: 'بن سبع', ph: '0555765432', em: 'm.bensebaa@chu.dz', sp: 3, addr: 'CHU Mustapha Pacha, Service Cardiologie, Alger', nt: 'Professeur en cardiologie' },
    { f: 'Nadia', l: 'Amirouche', fa: 'نادية', la: 'عميروش', ph: '0661122334', em: 'n.amirouche@yahoo.fr', sp: 2, addr: '34 Rue Didouche Mourad, Alger Centre', nt: 'Chirurgie cataracte et glaucome' },
    { f: 'Rachid', l: 'Ouali', fa: 'رشيد', la: 'والي', ph: '0556677889', em: '', sp: 1, addr: 'Polyclinique Bab El Oued, Alger', nt: 'Pédiatre général' },
    { f: 'Karim', l: 'Mekki', fa: 'كريم', la: 'مكي', ph: '0558899001', em: 'dr.mekki@ortho.dz', sp: 7, addr: 'Clinique El Chifa, Bab El Oued', nt: 'Orthopédiste pédiatrique' },
    { f: 'Ahmed', l: 'Boualem', fa: 'أحمد', la: 'بوعلام', ph: '0665544332', em: 'ahmed.boualem@gmail.com', sp: 5, addr: 'Clinique El Badr, Hussein Dey', nt: 'Gynécologue obstétricien' },
    { f: 'Yasmine', l: 'Kaci', fa: 'ياسمين', la: 'قاصي', ph: '0551122334', em: 'y.kaci@chu.dz', sp: 8, addr: 'CHU Beni Messous, Service Neurologie', nt: 'Neurologue' },
    { f: 'Sofiane', l: 'Rahmani', fa: 'سفيان', la: 'رحماتي', ph: '0553344556', em: 's.rahmani@orl.dz', sp: 9, addr: 'EPH Kouba, Service ORL', nt: 'ORL sur rendez-vous' },
  ];
  for (const d of doctorsData) {
    const doctor = await prisma.doctor.create({
      data: {
        associationId: aid, reference: ref('DOC'),
        firstName: d.f, lastName: d.l, firstNameAr: d.fa, lastNameAr: d.la,
        phone: d.ph, email: d.em || null, specialtyId: specialities[d.sp].id,
        address: d.addr, notes: d.nt,
      },
    });
    doctors.push(doctor);
  }
  console.log('   ✔ 8 médecins');

  // ============================================================
  // 13. ORIENTATIONS MÉDICALES
  // ============================================================
  const referralsData = [
    { b: 0, d: 0, c: 1, amt: 4500, st: 'completed', ana: 'Bilan sanguin complet', anaAr: 'تحليل دم شامل', hosp: 'CHU Mustapha Pacha', hospAr: 'مشفى مصطفى باشا', nt: 'Faire le bilan à jeun' },
    { b: 4, d: 0, c: 1, amt: 3500, st: 'completed', ana: 'Glycémie', anaAr: 'تحليل السكري', hosp: 'Polyclinique El Biar', hospAr: 'مصلحة الطب العام' },
    { b: 1, d: 1, c: 1, amt: 8000, st: 'completed', ana: 'Échographie cardiaque', anaAr: 'تخطيط صدى القلب', hosp: 'CHU Mustapha Pacha', hospAr: 'مشفى مصطفى باشا' },
    { b: 3, d: 1, c: 1, amt: 6000, st: 'completed', ana: 'Consultation cardiologie', anaAr: 'استشارة قلبية', hosp: 'CHU Mustapha Pacha', hospAr: 'مشفى مصطفى باشا' },
    { b: 2, d: 3, c: 1, amt: 0, st: 'pending', ana: 'Consultation pédiatrie', anaAr: 'استشارة أطفال' },
    { b: 0, d: 0, c: 1, amt: 0, st: 'pending', ana: 'Analyse de sang', anaAr: 'تحليل دم', hosp: 'CHU Beni Messous', hospAr: 'مشفى بني مسوس' },
    { b: 5, d: 4, c: 1, amt: 0, st: 'pending', ana: 'Consultation orthopédie', anaAr: 'استشارة عظام', hosp: 'Clinique El Chifa', hospAr: 'عيادة الشفاء' },
    { b: 6, d: 3, c: 1, amt: 0, st: 'pending', ana: 'Consultation pédiatrie', anaAr: 'استشارة أطفال' },
    { b: 8, d: 6, c: 1, amt: 12000, st: 'completed', ana: 'IRM cérébrale', anaAr: 'رنين مغناطيسي للدماغ', hosp: 'CHU Mustapha Pacha', hospAr: 'مشفى مصطفى باشا', nt: 'Suivi neurologique' },
    { b: 9, d: 2, c: 1, amt: 7500, st: 'completed', ana: 'Consultation ophtalmologie', anaAr: 'استشارة عيون', hosp: 'Clinique Ibn Sina', hospAr: 'عيادة ابن سينا' },
  ];
  for (const r of referralsData) {
    await prisma.medicalReferral.create({
      data: {
        associationId: aid, reference: ref('MED'),
        beneficiaryId: bens[r.b].id, caisseId: caisses[r.c].id, doctorId: doctors[r.d].id,
        analysisType: r.ana, analysisTypeAr: r.anaAr,
        hospital: r.hosp, hospitalAr: r.hospAr,
        amount: r.amt,
        amountInWords: r.amt > 0 ? n2words(r.amt, { lang: 'fr' }) + ' dinars' : '0 DZD',
        amountInWordsAr: r.amt > 0 ? arabicWords(r.amt) : '0 دينار',
        status: r.st, notes: r.nt || null,
        date: daysAgo(20 + Math.floor(Math.random() * 60)),
      },
    });
    if (r.st === 'completed' && r.amt > 0) {
      await prisma.caisse.update({ where: { id: caisses[r.c].id }, data: { balance: { decrement: r.amt } } });
    }
  }
  console.log('   ✔ 10 orientations médicales');

  // ============================================================
  // 14. TRANSACTIONS
  // ============================================================
  const txData = [
    { type: 'credit', amt: 60000, fs: 'caisse_physique', ci: 3, di: 0, desc: 'Zakat annuel 2018', descAr: 'زكاة المال السنوية 2018' },
    { type: 'debit', amt: 15000, fs: 'caisse_physique', ci: 3, desc: 'Distribution zakat aux nécessiteux', descAr: 'توزيع الزكاة على المحتاجين' },
    { type: 'credit', amt: 30000, fs: 'caisse_physique', ci: 0, di: 3, desc: 'Don social aide scolaire', descAr: 'تبرع اجتماعي - مساعدة مدرسية' },
    { type: 'debit', amt: 10000, fs: 'caisse_physique', ci: 0, desc: 'Aide loyer famille', descAr: 'مساعدة إيجار عائلة' },
    { type: 'credit', amt: 45000, fs: 'caisse_physique', ci: 2, di: 0, desc: 'Don kafala 2019', descAr: 'تبرع كفالة 2019' },
    { type: 'credit', amt: 25000, fs: 'caisse_physique', ci: 1, di: 1, desc: 'Don médical 2019', descAr: 'تبرع طبي 2019' },
    { type: 'debit', amt: 12000, fs: 'caisse_physique', ci: 2, desc: 'Aide orphelins 2019', descAr: 'مساعدة الأيتام 2019' },
    { type: 'debit', amt: 8000, fs: 'caisse_physique', ci: 1, desc: 'Aide analyses médicales', descAr: 'مساعدة تحاليل طبية' },
    { type: 'credit', amt: 100000, fs: 'banque', ci: 0, bi: 0, di: 7, desc: 'Don entreprise mécénat 2020', descAr: 'تبرع مؤسسة رعاية 2020' },
    { type: 'debit', amt: 35000, fs: 'caisse_physique', ci: 0, desc: 'Aide alimentaire urgente COVID', descAr: 'مساعدة غذائية عاجلة كوفيد' },
    { type: 'debit', amt: 22000, fs: 'caisse_physique', ci: 1, desc: 'Aide médicaments COVID', descAr: 'مساعدة أدوية كوفيد' },
    { type: 'credit', amt: 40000, fs: 'caisse_physique', ci: 3, di: 2, desc: 'Zakat 2020', descAr: 'زكاة 2020' },
    { type: 'credit', amt: 50000, fs: 'caisse_physique', ci: 4, di: 5, desc: 'Don Ramadan 2021', descAr: 'تبرع رمضان 2021' },
    { type: 'credit', amt: 75000, fs: 'caisse_physique', ci: 2, di: 6, desc: 'Don kafala annuel', descAr: 'تبرع كفالة سنوي' },
    { type: 'debit', amt: 25000, fs: 'caisse_physique', ci: 4, desc: 'Colis Ramadan 2021', descAr: 'قفة رمضان 2021' },
    { type: 'debit', amt: 10000, fs: 'caisse_physique', ci: 2, desc: 'Aide kafala orphelin', descAr: 'مساعدة كفالة يتيم' },
    { type: 'credit', amt: 120000, fs: 'banque', ci: 3, bi: 1, di: 4, desc: 'Zakat al Mal 2022', descAr: 'زكاة المال 2022' },
    { type: 'credit', amt: 60000, fs: 'caisse_physique', ci: 1, di: 0, desc: 'Don santé 2022', descAr: 'تبرع صحي 2022' },
    { type: 'debit', amt: 28000, fs: 'caisse_physique', ci: 1, desc: 'Aide analyses médicales', descAr: 'مساعدة تحاليل طبية' },
    { type: 'debit', amt: 15000, fs: 'caisse_physique', ci: 3, desc: 'Distribution zakat 2022', descAr: 'توزيع الزكاة 2022' },
    { type: 'credit', amt: 35000, fs: 'caisse_physique', ci: 0, di: 3, desc: 'Don social 2023', descAr: 'تبرع اجتماعي 2023' },
    { type: 'credit', amt: 90000, fs: 'banque', ci: 2, bi: 2, di: 1, desc: 'Don kafala entreprise 2023', descAr: 'تبرع كفالة مؤسسة 2023' },
    { type: 'debit', amt: 20000, fs: 'caisse_physique', ci: 0, desc: 'Aide chauffage hiver', descAr: 'مساعدة تدفئة' },
    { type: 'debit', amt: 30000, fs: 'caisse_physique', ci: 2, desc: 'Aide kafala familles', descAr: 'مساعدة كفالة عائلات' },
    { type: 'credit', amt: 70000, fs: 'caisse_physique', ci: 4, di: 0, desc: 'Don Ramadan 2024', descAr: 'تبرع رمضان 2024' },
    { type: 'credit', amt: 150000, fs: 'banque', ci: 3, bi: 0, di: 1, desc: 'Don entreprise BTP 2024', descAr: 'تبرع مؤسسة البناء 2024' },
    { type: 'debit', amt: 15000, fs: 'caisse_physique', ci: 4, desc: 'Repas iftar 2024', descAr: 'وجبات إفطار 2024' },
    { type: 'debit', amt: 40000, fs: 'caisse_physique', ci: 3, desc: 'Zakat distribution 2024', descAr: 'توزيع زكاة 2024' },
    { type: 'credit', amt: 45000, fs: 'caisse_physique', ci: 1, di: 5, desc: 'Don mensuel santé 2025', descAr: 'تبرع شهري صحي 2025' },
    { type: 'credit', amt: 200000, fs: 'banque', ci: 3, bi: 1, di: 7, desc: 'Zakat El Fitr 2025', descAr: 'زكاة الفطر 2025' },
    { type: 'debit', amt: 18000, fs: 'caisse_physique', ci: 1, desc: 'Aide médicaments', descAr: 'مساعدة أدوية' },
    { type: 'debit', amt: 12000, fs: 'caisse_physique', ci: 0, desc: 'Aide scolaire rentrée 2025', descAr: 'مساعدة مدرسية 2025' },
    { type: 'credit', amt: 50000, fs: 'caisse_physique', ci: 0, di: 1, desc: 'Don alimentaire Ramadan 2026', descAr: 'تبرع غذائي رمضان 2026' },
    { type: 'credit', amt: 100000, fs: 'banque', ci: 3, bi: 0, di: 5, desc: 'Don médicaments + argent', descAr: 'تبرع أدوية وأموال' },
    { type: 'credit', amt: 30000, fs: 'caisse_physique', ci: 4, di: 2, desc: 'Don Ramadan 2026', descAr: 'تبرع رمضان 2026' },
    { type: 'credit', amt: 45000, fs: 'caisse_physique', ci: 1, di: 3, desc: 'Don mensuel 2026', descAr: 'تبرع شهري 2026' },
    { type: 'debit', amt: 25000, fs: 'caisse_physique', ci: 0, desc: 'Aide alimentaire familles', descAr: 'مساعدة غذائية عائلات' },
    { type: 'debit', amt: 18000, fs: 'caisse_physique', ci: 1, desc: 'Aide médicaments chroniques', descAr: 'مساعدة أدوية مزمنة' },
    { type: 'debit', amt: 10000, fs: 'caisse_physique', ci: 2, desc: 'Aide kafala orphelin', descAr: 'مساعدة كفالة يتيم' },
    { type: 'debit', amt: 5000, fs: 'caisse_physique', ci: 4, desc: 'Repas iftar 2026', descAr: 'وجبات إفطار 2026' },
  ];

  const TX_EPOCH = new Date('2018-08-01T00:00:00.000Z').getTime();
  const TX_SPAN = (new Date('2026-07-01T00:00:00.000Z').getTime() - TX_EPOCH);

  for (let i = 0; i < txData.length; i++) {
    const t = txData[i];
    const isCredit = t.type === 'credit';
    const txDate = new Date(TX_EPOCH + (i / txData.length) * TX_SPAN);
    const amountNum = t.amt;
    const tx = await prisma.transaction.create({
      data: {
        associationId: aid, type: t.type, amount: amountNum,
        amountInWords: n2words(amountNum, { lang: 'fr' }) + ' dinars',
        amountInWordsAr: arabicWords(amountNum),
        fundSource: t.fs, caisseId: caisses[t.ci].id,
        bankAccountId: t.fs === 'banque' && t.bi !== undefined ? banks[t.bi % banks.length].id : undefined,
        donorId: isCredit ? donors[t.di].id : undefined,
        beneficiaryId: !isCredit ? bens[i % bens.length].id : undefined,
        description: t.desc, descriptionAr: t.descAr,
        receiptNumber: ref('BON'),
        status: 'completed',
        date: txDate,
      },
    });

    if (isCredit) {
      await prisma.donationReceipt.create({
        data: {
          associationId: aid, receiptNumber: tx.receiptNumber,
          donorId: donors[t.di].id, donorName: `${donors[t.di].firstName} ${donors[t.di].lastName}`,
          donorNameAr: `${donors[t.di].firstNameAr} ${donors[t.di].lastNameAr}`,
          transactionId: tx.id, amount: amountNum,
          amountInWords: tx.amountInWords, amountInWordsAr: tx.amountInWordsAr,
          caisseId: caisses[t.ci].id, caisseName: caisses[t.ci].name, caisseNameAr: caisses[t.ci].nameAr,
          subCategoryId: caisses[t.ci].subCategories[0]?.id, subCategoryName: caisses[t.ci].subCategories[0]?.name, subCategoryNameAr: caisses[t.ci].subCategories[0]?.nameAr,
          date: tx.date,
        },
      });
      const allocAmount = Math.floor(amountNum / 2);
      await prisma.donationAllocation.create({
        data: {
          associationId: aid, donorId: donors[t.di].id, beneficiaryId: bens[i % bens.length].id,
          creditTransactionId: tx.id, amount: allocAmount, remainingAmount: allocAmount,
        },
      });
      await prisma.caisse.update({ where: { id: caisses[t.ci].id }, data: { balance: { increment: amountNum } } });
      if (t.fs === 'banque' && t.bi !== undefined) {
        await prisma.bankAccount.update({ where: { id: banks[t.bi % banks.length].id }, data: { balance: { increment: amountNum } } });
      }
      await prisma.donor.update({ where: { id: donors[t.di].id }, data: { totalDonated: { increment: amountNum } } });
    } else {
      await prisma.caisse.update({ where: { id: caisses[t.ci].id }, data: { balance: { decrement: amountNum } } });
    }
  }
  console.log(`   ✔ ${txData.length} transactions + reçus en lettres arabes/françaises`);

  // ============================================================
  // 15. ARTICLES
  // ============================================================
  const articleStatusAvail = await prisma.articleStatusType.findFirst({ where: { name: 'disponible', associationId: aid } });
  const articleStatusDamaged = await prisma.articleStatusType.findFirst({ where: { name: 'endommage', associationId: aid } });
  const articleStatusMaint = await prisma.articleStatusType.findFirst({ where: { name: 'en_maintenance', associationId: aid } });

  const articlesData = [
    { name: 'Fauteuil roulant adulte pliable', nameAr: 'كرسي متحرك للكبار قابل للطي', cat: 0, qty: 15, avail: 10, loc: 0, cond: 'Neuf' },
    { name: 'Lit médicalisé 2 places', nameAr: 'سرير طبي بمحرك', cat: 0, qty: 8, avail: 5, loc: 3, cond: 'Bon' },
    { name: 'Paire de béquilles aluminium', nameAr: 'عكازات ألمنيوم', cat: 0, qty: 25, avail: 22, loc: 0, cond: 'Neuf' },
    { name: 'Cartable scolaire 5-7 ans', nameAr: 'حقيبة مدرسية للأطفال', cat: 1, qty: 50, avail: 45, loc: 2, cond: 'Neuf' },
    { name: 'Fournitures scolaires complètes', nameAr: 'طقم لوازم مدرسية كامل', cat: 1, qty: 100, avail: 80, loc: 2, cond: 'Neuf' },
    { name: 'Colis alimentaire de base', nameAr: 'سلة غذائية أساسية', cat: 2, qty: 200, avail: 180, loc: 4, cond: 'Neuf', perm: true },
    { name: 'Couverture polaire double', nameAr: 'بطانية صوفية كبيرة', cat: 6, qty: 80, avail: 75, loc: 1, cond: 'Neuf', perm: true },
    { name: 'Table pliante 4 places', nameAr: 'طاولة قابلة للطي', cat: 4, qty: 10, avail: 10, loc: 3, cond: 'Neuf', perm: true },
    { name: 'Ventilateur sur pied', nameAr: 'مروحة وقوف', cat: 5, qty: 30, avail: 30, loc: 1, cond: 'Neuf', perm: true },
    { name: 'Vêtements homme hiver', nameAr: 'ملابس شتوية للرجال', cat: 3, qty: 60, avail: 50, loc: 2, cond: 'Bon' },
    { name: 'Vêtements femme hijab', nameAr: 'ملابس نسائية مع حجاب', cat: 3, qty: 60, avail: 55, loc: 2, cond: 'Neuf' },
    { name: 'Kit produits d\'hygiène', nameAr: 'طقم مواد النظافة', cat: 7, qty: 150, avail: 130, loc: 4, cond: 'Neuf', perm: true },
  ];
  for (const a of articlesData) {
    await prisma.article.create({
      data: {
        associationId: aid, reference: ref('ART'), name: a.name, nameAr: a.nameAr,
        categoryId: cats[a.cat].id, quantity: a.qty, availableQuantity: a.avail,
        status: 'disponible', statusId: articleStatusAvail?.id,
        storageLocationId: locs[a.loc].id, condition: a.cond, conditionAr: a.cond,
        isPermanent: a.perm || false,
      },
    });
  }
  console.log('   ✔ 12 articles');

  // ============================================================
  // 16. PRÊTS
  // ============================================================
  await Promise.all([
    prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[0].id, status: 'en_cours', items: [{ articleId: null, articleName: 'Fauteuil roulant adulte pliable', articleNameAr: 'كرسي متحرك للكبار', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' }], loanDate: daysAgo(45), expectedReturnDate: daysAgo(-15) } }),
    prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[2].id, status: 'partiellement_retourne', items: [{ articleId: null, articleName: 'Cartable scolaire', articleNameAr: 'حقيبة مدرسية', quantity: 2, returnedQuantity: 1, conditionOnLoan: 'Neuf', conditionOnReturn: 'Bon' }], loanDate: daysAgo(60), expectedReturnDate: daysAgo(-30) } }),
    prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[4].id, status: 'en_cours', items: [{ articleId: null, articleName: 'Ventilateur sur pied', articleNameAr: 'مروحة وقوف', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' }], loanDate: daysAgo(20), expectedReturnDate: daysAgo(-50) } }),
    prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[5].id, status: 'retourne', items: [{ articleId: null, articleName: 'Lit médicalisé', articleNameAr: 'سرير طبي', quantity: 1, returnedQuantity: 1, conditionOnLoan: 'Bon', conditionOnReturn: 'Bon' }], loanDate: daysAgo(180), expectedReturnDate: daysAgo(60), actualReturnDate: daysAgo(30) } }),
    prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[7].id, status: 'definitif', items: [{ articleId: null, articleName: 'Béquilles aluminium', articleNameAr: 'عكازات ألمنيوم', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' }], loanDate: daysAgo(365), notes: 'Don définitif - handicap permanent' } }),
  ]);
  console.log('   ✔ 5 prêts');

  // ============================================================
  // 17. NOTIFICATIONS
  // ============================================================
  await Promise.all([
    prisma.notification.create({ data: { associationId: aid, type: 'info', message: 'Bienvenue sur la plateforme NCE', messageAr: 'مرحباً بكم في منصة NCE', read: true } }),
    prisma.notification.create({ data: { associationId: aid, type: 'success', message: 'Nouveau don: 100000 DZD', messageAr: 'تبرع جديد: 100000 دج', read: false } }),
    prisma.notification.create({ data: { associationId: aid, type: 'warning', message: 'Stock colis alimentaire bas', messageAr: 'مخزون السلال الغذائية منخفض', read: false } }),
    prisma.notification.create({ data: { associationId: aid, type: 'warning', message: '5 prêts en retard de retour', messageAr: '5 إعارات متأخرة', read: false } }),
    prisma.notification.create({ data: { associationId: aid, type: 'info', message: 'Rapport financier mensuel disponible', messageAr: 'التقرير المالي الشهري متاح', read: false } }),
    prisma.notification.create({ data: { associationId: aid, type: 'success', message: 'Orientation médicale confirmée', messageAr: 'توجيه طبي مؤكد', read: false } }),
  ]);
  console.log('   ✔ 6 notifications');

  console.log('\n========================================');
  console.log('   ✅ SEED TERMINE AVEC SUCCÈS !\n');
  console.log(`   - 48 transactions avec montants en lettres arabes/françaises`);
  console.log('========================================\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

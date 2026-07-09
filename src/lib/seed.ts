import { db } from './db';
import { generateId, generateBeneficiaryReference, generateDonorReference, generateArticleReference, generateLoanReference, generateMedicalReferralReference, generateReceiptNumber, numberToArabicWords, numberToFrenchWords } from '../utils/helpers';
import type { Beneficiary, Donor, Transaction, BankAccount, Article, Loan, MedicalReferral } from '../types';

export async function seedRealisticData() {
  const count = await db.caisses.count();
  if (count > 0) {
    // Clear all tables
    await db.beneficiaries.clear();
    await db.donors.clear();
    await db.transactions.clear();
    await db.caisses.clear();
    await db.bankAccounts.clear();
    await db.articles.clear();
    await db.loans.clear();
    await db.medicalReferrals.clear();
    await db.donationReceipts.clear();
  }

  const now = new Date();

  // ── CAISSES ───────────────────────────────────────────────
  const caisses = [
    {
      id: generateId(), reference: 'CAI-SEED-001', name: 'Caisse Sociale', nameAr: 'الصندوق الاجتماعي',
      subCategories: [
        { id: generateId(), name: 'Aide alimentaire', nameAr: 'مساعدة غذائية' },
        { id: generateId(), name: 'Aide vestimentaire', nameAr: 'مساعدة ملبسية' },
        { id: generateId(), name: 'Aide scolaire', nameAr: 'مساعدة مدرسية' },
        { id: generateId(), name: 'Aide loyer', nameAr: 'مساعدة إيجار' },
      ], balance: 85000, createdAt: now, updatedAt: now,
    },
    {
      id: generateId(), reference: 'CAI-SEED-002', name: 'Caisse Médicale', nameAr: 'الصندوق الطبي',
      subCategories: [
        { id: generateId(), name: 'Analyses', nameAr: 'تحاليل' },
        { id: generateId(), name: 'Ophtalmologie', nameAr: 'طب العيون' },
        { id: generateId(), name: 'Optique', nameAr: 'بصريات' },
        { id: generateId(), name: 'Chirurgie', nameAr: 'جراحة' },
        { id: generateId(), name: 'Médicaments', nameAr: 'أدوية' },
        { id: generateId(), name: 'Soins dentaires', nameAr: 'علاج الأسنان' },
      ], balance: 120000, createdAt: now, updatedAt: now,
    },
    {
      id: generateId(), reference: 'CAI-SEED-003', name: 'Caisse Kafala', nameAr: 'صندوق الكفالة',
      subCategories: [
        { id: generateId(), name: 'Kafala orphelin', nameAr: 'كفالة يتيم' },
        { id: generateId(), name: 'Kafala veuve', nameAr: 'كفالة أرملة' },
        { id: generateId(), name: 'Parrainage étudiant', nameAr: 'رعاية طالب' },
      ], balance: 200000, createdAt: now, updatedAt: now,
    },
    {
      id: generateId(), reference: 'CAI-SEED-004', name: 'Caisse Zakat', nameAr: 'صندوق الزكاة',
      subCategories: [
        { id: generateId(), name: 'Zakat Al-Mal', nameAr: 'زكاة المال' },
        { id: generateId(), name: 'Zakat Al-Fitr', nameAr: 'زكاة الفطر' },
        { id: generateId(), name: 'Zakat Or', nameAr: 'زكاة الذهب' },
      ], balance: 350000, createdAt: now, updatedAt: now,
    },
    {
      id: generateId(), reference: 'CAI-SEED-005', name: 'Caisse Générale', nameAr: 'الصندوق العام',
      subCategories: [
        { id: generateId(), name: 'Frais fonctionnement', nameAr: 'مصاريف تشغيل' },
        { id: generateId(), name: 'Projets', nameAr: 'مشاريع' },
      ], balance: 45000, createdAt: now, updatedAt: now,
    },
    {
      id: generateId(), reference: 'CAI-SEED-006', name: 'Caisse Urgences', nameAr: 'صندوق الطوارئ',
      subCategories: [
        { id: generateId(), name: 'Catastrophes naturelles', nameAr: 'كوارث طبيعية' },
        { id: generateId(), name: 'Secours urgent', nameAr: 'إغاثة عاجلة' },
      ], balance: 65000, createdAt: now, updatedAt: now,
    },
  ];
  await db.caisses.bulkAdd(caisses);

  // ── BANK ACCOUNTS ─────────────────────────────────────────
  const bankAccounts: BankAccount[] = [
    {
      id: generateId(),
      bankName: 'Banque Nationale d\'Algérie (BNA)', bankNameAr: 'البنك الوطني الجزائري',
      accountNumber: '002 12345 6789012345 56', rib: '020 001 23456789 01',
      iban: 'DZ03 0020 0012 3456 7890 0001 01', swift: 'BNAADZAL',
      balance: 850000, createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      bankName: 'Crédit Populaire d\'Algérie (CPA)', bankNameAr: 'القرض الشعبي الجزائري',
      accountNumber: '005 98765 4321098765 78', rib: '030 002 87654321 02',
      iban: 'DZ05 0030 0028 7654 3210 0002 02', swift: 'CPALDZAL',
      balance: 420000, createdAt: now, updatedAt: now,
    },
  ];
  await db.bankAccounts.bulkAdd(bankAccounts);

  // ── BENEFICIARIES ─────────────────────────────────────────
  const nowYear = now.getFullYear();
  const beneficiaries: Beneficiary[] = [
    {
      id: generateId(), reference: generateBeneficiaryReference(),
      firstName: 'Fatima', lastName: 'Zahra', firstNameAr: 'فاطمة', lastNameAr: 'الزهراء',
      address: '15 Rue des Frères, Alger', addressAr: '15 شارع الإخوة، الجزائر',
      phone: '0551 23 45 67', nationalCardNumber: '123456789012345',
      dateOfBirth: `${nowYear - 42}-03-15`, attribut: 'veuve', situation: 'Cancer du sein - sous traitement', situationAr: 'سرطان الثدي - تحت العلاج',
      caisseId: caisses[2].id, subCategoryId: caisses[2].subCategories[1].id,
      children: [
        { id: generateId(), firstName: 'Mohamed', lastName: 'Ben Fatima', firstNameAr: 'محمد', lastNameAr: 'بن فاطمة', dateOfBirth: `${nowYear - 12}-08-22`, healthStatus: 'bonne_sante' },
        { id: generateId(), firstName: 'Amina', lastName: 'Ben Fatima', firstNameAr: 'أمينة', lastNameAr: 'بن فاطمة', dateOfBirth: `${nowYear - 8}-03-10`, healthStatus: 'bonne_sante' },
        { id: generateId(), firstName: 'Youssef', lastName: 'Ben Fatima', firstNameAr: 'يوسف', lastNameAr: 'بن فاطمة', dateOfBirth: `${nowYear - 5}-11-05`, healthStatus: 'malade', healthDetails: 'Asthme chronique' },
        { id: generateId(), firstName: 'Salima', lastName: 'Ben Fatima', firstNameAr: 'سليمة', lastNameAr: 'بن فاطمة', dateOfBirth: `${nowYear - 2}-06-18`, healthStatus: 'bonne_sante' },
      ],
      createdAt: new Date(now.getTime() - 86400000 * 120), updatedAt: now,
    },
    {
      id: generateId(), reference: generateBeneficiaryReference(),
      firstName: 'Khadija', lastName: 'Mansouri', firstNameAr: 'خديجة', lastNameAr: 'منصوري',
      address: 'Cité 500 Logts, Bloc B, Oran', addressAr: 'حي 500 مسكن، بناية ب، وهران',
      phone: '0552 34 56 78', nationalCardNumber: '987654321098765',
      dateOfBirth: `${nowYear - 55}-07-20`, attribut: 'veuve', situation: 'Maladie cardiaque', situationAr: 'مرض القلب',
      caisseId: caisses[1].id,
      children: [
        { id: generateId(), firstName: 'Karim', lastName: 'Ben Khadija', firstNameAr: 'كريم', lastNameAr: 'بن خديجة', dateOfBirth: `${nowYear - 18}-09-14`, healthStatus: 'bonne_sante' },
        { id: generateId(), firstName: 'Houria', lastName: 'Ben Khadija', firstNameAr: 'حورية', lastNameAr: 'بن خديجة', dateOfBirth: `${nowYear - 15}-12-30`, healthStatus: 'handicape', healthDetails: 'Infirmité motrice cérébrale (IMC)' },
        { id: generateId(), firstName: 'Samir', lastName: 'Ben Khadija', firstNameAr: 'سمير', lastNameAr: 'بن خديجة', dateOfBirth: `${nowYear - 10}-04-25`, healthStatus: 'bonne_sante' },
      ],
      createdAt: new Date(now.getTime() - 86400000 * 90), updatedAt: now,
    },
    {
      id: generateId(), reference: generateBeneficiaryReference(),
      firstName: 'Ahmed', lastName: 'Benali', firstNameAr: 'أحمد', lastNameAr: 'بن علي',
      address: 'Douar Ouled Sidi, Blida', addressAr: 'دوار أولاد سيدي، البليدة',
      phone: '0553 45 67 89', nationalCardNumber: '456789123456789',
      dateOfBirth: `${nowYear - 35}-01-10`, attribut: 'orphelin', situation: 'Revenu modeste', onBehalfOfName: 'عائلة المرحوم علي',
      caisseId: caisses[2].id, subCategoryId: caisses[2].subCategories[0].id,
      children: [
        { id: generateId(), firstName: 'Farida', lastName: 'Ben Ahmed', firstNameAr: 'فريدة', lastNameAr: 'بن أحمد', dateOfBirth: `${nowYear - 6}-07-08`, healthStatus: 'bonne_sante' },
      ],
      createdAt: new Date(now.getTime() - 86400000 * 60), updatedAt: now,
    },
    {
      id: generateId(), reference: generateBeneficiaryReference(),
      firstName: 'Aicha', lastName: 'Boumediene', firstNameAr: 'عائشة', lastNameAr: 'بومدين',
      address: 'Route de Sétif, Bordj Bou Arreridj', addressAr: 'طريق سطيف، برج بوعريريج',
      phone: '0554 56 78 90', nationalCardNumber: '654321987654321',
      dateOfBirth: `${nowYear - 65}-11-02`, attribut: 'personne_agee',
      caisseId: caisses[0].id, subCategoryId: caisses[0].subCategories[0].id,
      children: [],
      createdAt: new Date(now.getTime() - 86400000 * 45), updatedAt: now,
    },
    {
      id: generateId(), reference: generateBeneficiaryReference(),
      firstName: 'Malika', lastName: 'Djouadi', firstNameAr: 'مالكة', lastNameAr: 'جودي',
      address: 'Haï Nasr, Constantine', addressAr: 'حي نصر، قسنطينة',
      phone: '0555 67 89 01', nationalCardNumber: '321654987321654',
      dateOfBirth: `${nowYear - 28}-06-22`, attribut: 'famille_demunie', situation: 'Veuve - 4 enfants - logement insalubre', situationAr: 'أرملة - 4 أطفال - سكن غير لائق',
      caisseId: caisses[0].id, subCategoryId: caisses[0].subCategories[3].id,
      children: [
        { id: generateId(), firstName: 'Nadia', lastName: 'Ben Malika', firstNameAr: 'نادية', lastNameAr: 'بن مالك', dateOfBirth: `${nowYear - 9}-05-12`, healthStatus: 'bonne_sante' },
        { id: generateId(), firstName: 'Rachid', lastName: 'Ben Malika', firstNameAr: 'رشيد', lastNameAr: 'بن مالك', dateOfBirth: `${nowYear - 7}-01-20`, healthStatus: 'malade', healthDetails: 'Drépanocytose' },
        { id: generateId(), firstName: 'Nabila', lastName: 'Ben Malika', firstNameAr: 'نبيلة', lastNameAr: 'بن مالك', dateOfBirth: `${nowYear - 4}-09-15`, healthStatus: 'bonne_sante' },
        { id: generateId(), firstName: 'Sofiane', lastName: 'Ben Malika', firstNameAr: 'سفيان', lastNameAr: 'بن مالك', dateOfBirth: `${nowYear - 1}-03-30`, healthStatus: 'bonne_sante' },
      ],
      createdAt: new Date(now.getTime() - 86400000 * 30), updatedAt: now,
    },
    {
      id: generateId(), reference: generateBeneficiaryReference(),
      firstName: 'Said', lastName: 'Meziane', firstNameAr: 'سعيد', lastNameAr: 'مزيان',
      address: 'Village Tizi, Tizi Ouzou', addressAr: 'قرية تيزي، تيزي وزو',
      phone: '0556 78 90 12', nationalCardNumber: '159357852456951',
      dateOfBirth: `${nowYear - 48}-12-01`, attribut: 'handicape', situation: 'Paraplégique suite accident travail', situationAr: 'شلل نصفي بعد حادث عمل',
      caisseId: caisses[5].id, subCategoryId: caisses[5].subCategories[1].id,
      children: [],
      createdAt: new Date(now.getTime() - 86400000 * 20), updatedAt: now,
    },
  ];
  await db.beneficiaries.bulkAdd(beneficiaries);

  // ── DONORS ────────────────────────────────────────────────
  const donors: Donor[] = [
    { id: generateId(), reference: generateDonorReference(), firstName: 'Abdelkader', lastName: 'Hadj', firstNameAr: 'عبد القادر', lastNameAr: 'حاج', phone: '0661 11 22 33', email: 'abdelkader.hadj@email.dz', totalDonated: 250000, createdAt: new Date(now.getTime() - 86400000 * 200), updatedAt: now },
    { id: generateId(), reference: generateDonorReference(), firstName: 'Noureddine', lastName: 'Khaldi', firstNameAr: 'نور الدين', lastNameAr: 'خالدي', phone: '0677 44 55 66', email: 'n.khaldi@entreprise.dz', totalDonated: 500000, createdAt: new Date(now.getTime() - 86400000 * 180), updatedAt: now },
    { id: generateId(), reference: generateDonorReference(), firstName: 'Samia', lastName: 'Boukhari', firstNameAr: 'سامية', lastNameAr: 'بوقاري', phone: '0557 88 99 00', totalDonated: 120000, createdAt: new Date(now.getTime() - 86400000 * 150), updatedAt: now },
    { id: generateId(), reference: generateDonorReference(), firstName: 'Ali', lastName: 'Mammeri', firstNameAr: 'علي', lastNameAr: 'معمري', phone: '0663 33 44 55', totalDonated: 80000, createdAt: new Date(now.getTime() - 86400000 * 100), updatedAt: now },
    { id: generateId(), reference: generateDonorReference(), firstName: 'Fatiha', lastName: 'Lounici', firstNameAr: 'فتيحة', lastNameAr: 'لونيسي', phone: '0779 22 33 44', email: 'lounici.fatiha@yahoo.fr', totalDonated: 300000, createdAt: new Date(now.getTime() - 86400000 * 90), updatedAt: now },
  ];
  await db.donors.bulkAdd(donors);

  // ── TRANSACTIONS ──────────────────────────────────────────
  const transactions: Transaction[] = [];
  const amounts = [50000, 30000, 20000, 100000, 75000, 15000, 45000, 60000, 25000, 80000, 12000, 35000, 5000, 18000, 90000];

  // Some donations (credits)
  for (let i = 0; i < 8; i++) {
    const donor = donors[i % donors.length];
    const caisse = caisses[i % caisses.length];
    const amt = amounts[i % amounts.length];
    const txnDate = new Date(now.getTime() - 86400000 * (150 - i * 20));
    transactions.push({
      id: generateId(), type: 'credit', amount: amt,
      amountInWords: numberToFrenchWords(amt), amountInWordsAr: numberToArabicWords(amt),
      fundSource: i % 3 === 0 ? 'banque' : 'caisse_physique',
      caisseId: caisse.id, donorId: donor.id,
      bankAccountId: i % 3 === 0 ? bankAccounts[i % bankAccounts.length].id : undefined,
      description: 'تبرع ', descriptionAr: 'تبرع ',
      receiptNumber: generateReceiptNumber(),
      date: txnDate.toISOString().split('T')[0], createdAt: txnDate, updatedAt: txnDate,
    });
  }

  // Some debits (withdrawals)
  for (let i = 0; i < 6; i++) {
    const beneficiary = beneficiaries[i % beneficiaries.length];
    const caisse = caisses[i % caisses.length];
    const amt = [5000, 12000, 8000, 15000, 3000, 10000][i % 6];
    const txnDate = new Date(now.getTime() - 86400000 * (130 - i * 25));
    transactions.push({
      id: generateId(), type: 'debit', amount: amt,
      amountInWords: numberToFrenchWords(amt), amountInWordsAr: numberToArabicWords(amt),
      fundSource: i % 2 === 0 ? 'caisse_physique' : 'banque',
      caisseId: caisse.id, beneficiaryId: beneficiary.id,
      bankAccountId: i % 2 === 0 ? undefined : bankAccounts[0].id,
      description: 'مساعدة', descriptionAr: 'مساعدة',
      date: txnDate.toISOString().split('T')[0], createdAt: txnDate, updatedAt: txnDate,
    });
  }

  // Sort by date
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  await db.transactions.bulkAdd(transactions);

  // Also add donation receipts
  for (const t of transactions.filter(t => t.type === 'credit' && t.donorId)) {
    const donor = donors.find(d => d.id === t.donorId)!;
    const caisse = caisses.find(c => c.id === t.caisseId)!;
    await db.donationReceipts.add({
      id: generateId(), receiptNumber: t.receiptNumber!,
      donorId: t.donorId!, donorName: `${donor.firstName} ${donor.lastName}`,
      donorNameAr: `${donor.firstNameAr} ${donor.lastNameAr}`,
      transactionId: t.id,
      amount: t.amount, amountInWords: t.amountInWords, amountInWordsAr: t.amountInWordsAr,
      caisseId: t.caisseId, caisseName: caisse.name, caisseNameAr: caisse.nameAr,
      date: t.date, createdAt: t.createdAt,
    });
  }

  // ── ARTICLES ──────────────────────────────────────────────
  const articles: Article[] = [
    { id: generateId(), reference: generateArticleReference(), name: 'Fauteuil roulant adulte', nameAr: 'كرسي متحرك للكبار', category: 'Médical', categoryAr: 'طبي', quantity: 15, availableQuantity: 10, status: 'disponible', storageLocation: 'Dépôt A - Étagère 1', storageLocationAr: 'المستودع أ - الرف 1', condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: new Date(now.getTime() - 86400000 * 100), updatedAt: now },
    { id: generateId(), reference: generateArticleReference(), name: 'Lit médicalisé', nameAr: 'سرير طبي', category: 'Médical', categoryAr: 'طبي', quantity: 8, availableQuantity: 5, status: 'disponible', storageLocation: 'Dépôt A - Grand équipement', storageLocationAr: 'المستودع أ - معدات كبيرة', condition: 'Bon', conditionAr: 'جيد', isPermanent: false, createdAt: new Date(now.getTime() - 86400000 * 95), updatedAt: now },
    { id: generateId(), reference: generateArticleReference(), name: 'Béquilles (paire)', nameAr: 'عكازات (زوج)', category: 'Médical', categoryAr: 'طبي', quantity: 25, availableQuantity: 22, status: 'disponible', storageLocation: 'Dépôt A - Étagère 2', storageLocationAr: 'المستودع أ - الرف 2', condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: new Date(now.getTime() - 86400000 * 90), updatedAt: now },
    { id: generateId(), reference: generateArticleReference(), name: 'Déambulateur', nameAr: 'مشاية', category: 'Médical', categoryAr: 'طبي', quantity: 10, availableQuantity: 7, status: 'disponible', storageLocation: 'Dépôt A - Étagère 2', storageLocationAr: 'المستودع أ - الرف 2', condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: new Date(now.getTime() - 86400000 * 85), updatedAt: now },
    { id: generateId(), reference: generateArticleReference(), name: 'Cartable scolaire', nameAr: 'حقيبة مدرسية', category: 'Scolaire', categoryAr: 'مدرسي', quantity: 50, availableQuantity: 50, status: 'disponible', storageLocation: 'Dépôt B - Étagère 3', storageLocationAr: 'المستودع ب - الرف 3', condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: new Date(now.getTime() - 86400000 * 80), updatedAt: now },
    { id: generateId(), reference: generateArticleReference(), name: 'Fournitures scolaires (kit)', nameAr: 'حقيبة أدوات مدرسية', category: 'Scolaire', categoryAr: 'مدرسي', quantity: 100, availableQuantity: 100, status: 'disponible', storageLocation: 'Dépôt B - Étagère 3', storageLocationAr: 'المستودع ب - الرف 3', condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: new Date(now.getTime() - 86400000 * 75), updatedAt: now },
    { id: generateId(), reference: generateArticleReference(), name: 'Colis alimentaire (Ramadan)', nameAr: 'سلة غذائية (رمضان)', category: 'Alimentaire', categoryAr: 'غذائي', quantity: 200, availableQuantity: 200, status: 'disponible', storageLocation: 'Dépôt B - Palettes', storageLocationAr: 'المستودع ب - منصات', condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: new Date(now.getTime() - 86400000 * 70), updatedAt: now },
    { id: generateId(), reference: generateArticleReference(), name: 'Couverture polaire', nameAr: 'بطانية صوفية', category: 'Vêtement', categoryAr: 'ملبس', quantity: 80, availableQuantity: 75, status: 'disponible', storageLocation: 'Dépôt B - Étagère 1', storageLocationAr: 'المستودع ب - الرف 1', condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: new Date(now.getTime() - 86400000 * 65), updatedAt: now },
    { id: generateId(), reference: generateArticleReference(), name: 'Vêtements enfants (lot)', nameAr: 'ملابس أطفال (مجموعة)', category: 'Vêtement', categoryAr: 'ملبس', quantity: 60, availableQuantity: 60, status: 'disponible', storageLocation: 'Dépôt B - Étagère 2', storageLocationAr: 'المستودع ب - الرف 2', condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: new Date(now.getTime() - 86400000 * 60), updatedAt: now },
    { id: generateId(), reference: generateArticleReference(), name: 'Matelas orthopédique', nameAr: 'فراش طبي', category: 'Mobilier', categoryAr: 'أثاث', quantity: 5, availableQuantity: 3, status: 'disponible', storageLocation: 'Dépôt A - Grand équipement', storageLocationAr: 'المستودع أ - معدات كبيرة', condition: 'Bon', conditionAr: 'جيد', isPermanent: false, createdAt: new Date(now.getTime() - 86400000 * 55), updatedAt: now },
  ];
  await db.articles.bulkAdd(articles);

  // ── LOANS ──────────────────────────────────────────────────
  const loans: Loan[] = [
    {
      id: generateId(), reference: generateLoanReference(),
      beneficiaryId: beneficiaries[0].id,
      beneficiaryName: `${beneficiaries[0].firstName} ${beneficiaries[0].lastName}`,
      beneficiaryNameAr: `${beneficiaries[0].firstNameAr} ${beneficiaries[0].lastNameAr}`,
      status: 'partiellement_retourne',
      items: [
        { articleId: articles[0].id, articleName: articles[0].name, articleNameAr: articles[0].nameAr, quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Neuf' },
        { articleId: articles[2].id, articleName: articles[2].name, articleNameAr: articles[2].nameAr, quantity: 2, returnedQuantity: 2, conditionOnLoan: 'Neuf', conditionOnReturn: 'Bon (الكمية: 2)' },
      ],
      loanDate: (new Date(now.getTime() - 86400000 * 30)).toISOString().split('T')[0],
      expectedReturnDate: (new Date(now.getTime() + 86400000 * 60)).toISOString().split('T')[0],
      createdAt: new Date(now.getTime() - 86400000 * 30), updatedAt: now,
    },
    {
      id: generateId(), reference: generateLoanReference(),
      beneficiaryId: beneficiaries[2].id,
      beneficiaryName: `${beneficiaries[2].firstName} ${beneficiaries[2].lastName}`,
      beneficiaryNameAr: `${beneficiaries[2].firstNameAr} ${beneficiaries[2].lastNameAr}`,
      status: 'en_cours',
      items: [
        { articleId: articles[1].id, articleName: articles[1].name, articleNameAr: articles[1].nameAr, quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Bon état' },
      ],
      loanDate: (new Date(now.getTime() - 86400000 * 15)).toISOString().split('T')[0],
      expectedReturnDate: (new Date(now.getTime() + 86400000 * 75)).toISOString().split('T')[0],
      createdAt: new Date(now.getTime() - 86400000 * 15), updatedAt: now,
    },
    {
      id: generateId(), reference: generateLoanReference(),
      beneficiaryId: beneficiaries[4].id,
      beneficiaryName: `${beneficiaries[4].firstName} ${beneficiaries[4].lastName}`,
      beneficiaryNameAr: `${beneficiaries[4].firstNameAr} ${beneficiaries[4].lastNameAr}`,
      status: 'retourne',
      items: [
        { articleId: articles[3].id, articleName: articles[3].name, articleNameAr: articles[3].nameAr, quantity: 1, returnedQuantity: 1, conditionOnLoan: 'Neuf', conditionOnReturn: 'Bon (الكمية: 1)' },
        { articleId: articles[9].id, articleName: articles[9].name, articleNameAr: articles[9].nameAr, quantity: 1, returnedQuantity: 1, conditionOnLoan: 'Bon', conditionOnReturn: 'Abîmé (الكمية: 1)' },
      ],
      loanDate: (new Date(now.getTime() - 86400000 * 90)).toISOString().split('T')[0],
      actualReturnDate: (new Date(now.getTime() - 86400000 * 10)).toISOString().split('T')[0],
      createdAt: new Date(now.getTime() - 86400000 * 90), updatedAt: now,
    },
  ];
  await db.loans.bulkAdd(loans);

  // Update article availability based on loans
  for (const loan of loans) {
    if (loan.status === 'en_cours' || loan.status === 'partiellement_retourne') {
      for (const item of loan.items) {
        const article = articles.find(a => a.id === item.articleId);
        if (article) {
          const stillOut = item.quantity - item.returnedQuantity;
          await db.articles.update(item.articleId, {
            availableQuantity: article.availableQuantity - stillOut,
            status: article.availableQuantity - stillOut <= 0 ? 'prete' : 'disponible',
          });
        }
      }
    }
  }

  // ── MEDICAL REFERRALS ─────────────────────────────────────
  const referrals: MedicalReferral[] = [
    {
      id: generateId(), reference: generateMedicalReferralReference(),
      beneficiaryId: beneficiaries[0].id, beneficiaryName: `${beneficiaries[0].firstName} ${beneficiaries[0].lastName}`,
      beneficiaryNameAr: `${beneficiaries[0].firstNameAr} ${beneficiaries[0].lastNameAr}`,
      caisseId: caisses[1].id, subCategoryId: caisses[1].subCategories[0].id,
      doctorName: 'Dr. Amina Belkacem', doctorNameAr: 'د. أمينة بلقاسم',
      analysisType: 'Bilan sanguin complet', analysisTypeAr: 'تحليل دم شامل',
      hospital: 'CHU Mustapha Pacha', hospitalAr: 'مستشفى مصطفى باشا الجامعي',
      amount: 4500, amountInWords: numberToFrenchWords(4500), amountInWordsAr: numberToArabicWords(4500),
      date: (new Date(now.getTime() - 86400000 * 25)).toISOString().split('T')[0],
      notes: 'Urgent - suspicion anémie', createdAt: new Date(now.getTime() - 86400000 * 25), updatedAt: now,
    },
    {
      id: generateId(), reference: generateMedicalReferralReference(),
      beneficiaryId: beneficiaries[1].id, beneficiaryName: `${beneficiaries[1].firstName} ${beneficiaries[1].lastName}`,
      beneficiaryNameAr: `${beneficiaries[1].firstNameAr} ${beneficiaries[1].lastNameAr}`,
      caisseId: caisses[1].id, subCategoryId: caisses[1].subCategories[1].id,
      doctorName: 'Pr. Mourad Bensebaa', doctorNameAr: 'أ.د. مراد بن سبع',
      analysisType: 'Consultation ophtalmologique + lunettes', analysisTypeAr: 'استشارة عيون + نظارات',
      hospital: 'Clinique Ophtalmologique Belcourt', hospitalAr: 'عيادة طب العيون بلكور',
      amount: 12000, amountInWords: numberToFrenchWords(12000), amountInWordsAr: numberToArabicWords(12000),
      date: (new Date(now.getTime() - 86400000 * 12)).toISOString().split('T')[0],
      createdAt: new Date(now.getTime() - 86400000 * 12), updatedAt: now,
    },
    {
      id: generateId(), reference: generateMedicalReferralReference(),
      beneficiaryId: beneficiaries[4].id, beneficiaryName: `${beneficiaries[4].firstName} ${beneficiaries[4].lastName}`,
      beneficiaryNameAr: `${beneficiaries[4].firstNameAr} ${beneficiaries[4].lastNameAr}`,
      caisseId: caisses[1].id, subCategoryId: caisses[1].subCategories[3].id,
      doctorName: 'Dr. Samir Hocine', doctorNameAr: 'د. سمير حسين',
      analysisType: 'Échographie cardiaque', analysisTypeAr: 'تخطيط صدى القلب',
      hospital: 'CHU Constantine', hospitalAr: 'مستشفى قسنطينة الجامعي',
      amount: 8000, amountInWords: numberToFrenchWords(8000), amountInWordsAr: numberToArabicWords(8000),
      date: (new Date(now.getTime() - 86400000 * 5)).toISOString().split('T')[0],
      createdAt: new Date(now.getTime() - 86400000 * 5), updatedAt: now,
    },
  ];
  await db.medicalReferrals.bulkAdd(referrals);

  console.log('✅ Seed completed successfully:');
  console.log(`   ${caisses.length} caisses`);
  console.log(`   ${bankAccounts.length} comptes bancaires`);
  console.log(`   ${beneficiaries.length} bénéficiaires`);
  console.log(`   ${donors.length} donateurs`);
  console.log(`   ${transactions.length} transactions`);
  console.log(`   ${articles.length} articles`);
  console.log(`   ${loans.length} prêts`);
  console.log(`   ${referrals.length} orientations médicales`);
}

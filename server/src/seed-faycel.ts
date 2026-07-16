import prisma from './lib/prisma';

function ref(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const r = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${prefix}-${y}${m}-${r}`;
}

async function main() {
  const email = 'faycelyouga@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('Utilisateur faycelyouga@gmail.com introuvable. Connectez-vous d abord avec Google.');
    process.exit(1);
  }
  const aid = user.associationId;
  const now = new Date();
  const day = (n: number) => new Date(now.getTime() - n * 86400000);

  // Update association name
  await prisma.association.update({ where: { id: aid }, data: { name: 'Association Al-Faycel', nameAr: 'جمعية الفيصل الخيرية' } });
  console.log('✔ Association creee: جمعية الفيصل الخيرية');

  // Article Categories
  await Promise.all([
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Medical', nameAr: 'طبي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Scolaire', nameAr: 'مدرسي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Alimentaire', nameAr: 'غذائي', createdAt: now } }),
    prisma.articleCategory.create({ data: { associationId: aid, name: 'Vetement', nameAr: 'ملبس', createdAt: now } }),
  ]);

  // Storage Locations
  await Promise.all([
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot Principal', nameAr: 'المستودع الرئيسي', createdAt: now } }),
    prisma.storageLocation.create({ data: { associationId: aid, name: 'Depot Medical', nameAr: 'المستودع الطبي', createdAt: now } }),
  ]);

  // Analysis Types
  await Promise.all([
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Analyse de sang', nameAr: 'تحليل دم', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Radiographie', nameAr: 'أشعة', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Echographie', nameAr: 'فحص بالموجات', createdAt: now } }),
    prisma.medicalAnalysisType.create({ data: { associationId: aid, name: 'Scanner', nameAr: 'سكانر', createdAt: now } }),
  ]);

  // Hospitals
  await Promise.all([
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'CHU Oran', nameAr: 'مستشفى وهران الجامعي', createdAt: now } }),
    prisma.medicalHospital.create({ data: { associationId: aid, name: 'Clinique Ibn Rochd', nameAr: 'عيادة ابن رشد', createdAt: now } }),
  ]);

  // Specialties
  const specs = await Promise.all([
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Generaliste', nameAr: 'طب عام', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Pediatre', nameAr: 'طب أطفال', createdAt: now } }),
    prisma.doctorSpecialty.create({ data: { associationId: aid, name: 'Cardiologue', nameAr: 'طب القلب', createdAt: now } }),
  ]);

  // Caisses
  const caisses = await Promise.all([
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Sociale', nameAr: 'الصندوق الاجتماعي', subCategories: [{ id: crypto.randomUUID(), name: 'Aide alimentaire', nameAr: 'مساعدة غذائية' }, { id: crypto.randomUUID(), name: 'Aide scolaire', nameAr: 'مساعدة مدرسية' }], balance: 65000, createdAt: now, updatedAt: now } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Medicale', nameAr: 'الصندوق الطبي', subCategories: [{ id: crypto.randomUUID(), name: 'Analyses', nameAr: 'تحاليل' }, { id: crypto.randomUUID(), name: 'Medicaments', nameAr: 'أدوية' }, { id: crypto.randomUUID(), name: 'Soins', nameAr: 'علاجات' }], balance: 95000, createdAt: now, updatedAt: now } }),
    prisma.caisse.create({ data: { associationId: aid, reference: ref('CAI'), name: 'Caisse Kafala', nameAr: 'صندوق الكفالة', subCategories: [{ id: crypto.randomUUID(), name: 'Kafala orphelin', nameAr: 'كفالة يتيم' }, { id: crypto.randomUUID(), name: 'Kafala veuve', nameAr: 'كفالة أرملة' }], balance: 150000, createdAt: now, updatedAt: now } }),
  ]);

  // Bank
  await prisma.bankAccount.create({ data: { associationId: aid, bankName: 'CPA', bankNameAr: 'القرض الشعبي', accountNumber: '005111223344', rib: '03000111223344', iban: 'DZ050030001112233440000101', swift: 'CPALDZAL', balance: 300000, createdAt: now, updatedAt: now } });

  // Beneficiaries
  const bens = await Promise.all([
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Mariam', lastName: 'Boukhelifa', firstNameAr: 'مريم', lastNameAr: 'بوخليفة', address: '25 Rue Larbi Ben Mhidi, Oran', addressAr: '25 شارع العربي بن مهيدي، وهران', phone: '0551234567', nationalCardNumber: '111222333444555', dateOfBirth: day(16000), attribut: 'veuve', gender: 'female', caisseId: caisses[2].id, children: [{ id: crypto.randomUUID(), firstName: 'Amine', lastName: 'Ben Mariam', firstNameAr: 'أمين', lastNameAr: 'بن مريم', dateOfBirth: '2015-06-14', gender: 'male', healthStatus: 'bonne_sante' }], createdAt: day(120), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Youssef', lastName: 'Belaid', firstNameAr: 'يوسف', lastNameAr: 'بلعيد', address: 'Cite des Freres, Oran', addressAr: 'حي الإخوة، وهران', phone: '0552345678', nationalCardNumber: '222333444555666', dateOfBirth: day(10000), attribut: 'orphelin', gender: 'male', caisseId: caisses[2].id, children: [], createdAt: day(90), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Zahia', lastName: 'Mammeri', firstNameAr: 'زاهية', lastNameAr: 'معمري', address: 'Route de Canastel, Oran', addressAr: 'طريق كانستال، وهران', phone: '0553456789', nationalCardNumber: '333444555666777', dateOfBirth: day(23000), attribut: 'personne_agee', gender: 'female', caisseId: caisses[0].id, children: [], onBehalfOfName: 'ابنها كريم', createdAt: day(60), updatedAt: now } }),
    prisma.beneficiary.create({ data: { associationId: aid, reference: ref('BEN'), firstName: 'Nabila', lastName: 'Slimani', firstNameAr: 'نبيلة', lastNameAr: 'سليماني', address: 'Hai El Badr, Oran', addressAr: 'حي البدر، وهران', phone: '0554567890', nationalCardNumber: '444555666777888', dateOfBirth: day(11000), attribut: 'famille_demunie', gender: 'female', caisseId: caisses[0].id, children: [{ id: crypto.randomUUID(), firstName: 'Rayan', lastName: 'Ben Nabila', firstNameAr: 'ريان', lastNameAr: 'بن نبيلة', dateOfBirth: '2020-02-18', gender: 'male', healthStatus: 'bonne_sante' }], createdAt: day(40), updatedAt: now } }),
  ]);
  console.log(`✔ ${bens.length} beneficiaires crees`);

  // Donors
  const donors = await Promise.all([
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Hacene', lastName: 'Mekhloufi', firstNameAr: 'حسن', lastNameAr: 'مخلوفي', phone: '0661234567', email: 'h.mekhloufi@email.dz', totalDonated: 180000, createdAt: day(200), updatedAt: now } }),
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Wassila', lastName: 'Benyahia', firstNameAr: 'وسيلة', lastNameAr: 'بن يحيى', phone: '0559876543', totalDonated: 75000, createdAt: day(100), updatedAt: now } }),
    prisma.donor.create({ data: { associationId: aid, reference: ref('DON'), firstName: 'Tahar', lastName: 'Djelouah', firstNameAr: 'طاهر', lastNameAr: 'جلواه', phone: '0665477889', totalDonated: 250000, createdAt: day(80), updatedAt: now } }),
  ]);
  console.log(`✔ ${donors.length} donateurs crees`);

  // Doctors
  const docs = await Promise.all([
    prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Samira', lastName: 'Zerrouki', firstNameAr: 'سميرة', lastNameAr: 'زروقي', phone: '0557654321', email: 's.zerrouki@med.dz', specialtyId: specs[0].id, address: 'Polyclinique El Mohgoun, Oran', notes: 'Disponible dimanche-jeudi 9h-16h', createdAt: day(120), updatedAt: now } }),
    prisma.doctor.create({ data: { associationId: aid, reference: ref('DOC'), firstName: 'Abdelhamid', lastName: 'Boudiaf', firstNameAr: 'عبد الحميد', lastNameAr: 'بودياف', phone: '0555556666', specialtyId: specs[2].id, address: 'CHU Oran, Service Cardiologie', notes: 'Consultations lundi et mercredi', createdAt: day(90), updatedAt: now } }),
  ]);
  console.log(`✔ ${docs.length} medecins crees`);

  // Referrals
  for (let i = 0; i < 3; i++) {
    await prisma.medicalReferral.create({
      data: { associationId: aid, reference: ref('MED'), beneficiaryId: bens[i % bens.length].id, caisseId: caisses[1].id, doctorId: docs[i % docs.length].id, analysisType: i === 0 ? 'Analyse de sang' : i === 1 ? 'Consultation cardiologie' : 'Radiographie', analysisTypeAr: i === 0 ? 'تحليل دم' : i === 1 ? 'استشارة قلبية' : 'أشعة', amount: i === 0 ? 3000 : i === 1 ? 5000 : 0, amountInWords: i === 0 ? '3000 DZD' : i === 1 ? '5000 DZD' : '0 DZD', amountInWordsAr: i === 0 ? '3000 دينار' : i === 1 ? '5000 دينار' : '0 دينار', status: i < 2 ? 'completed' : 'pending', date: day(i * 10 + 5), createdAt: day(i * 10 + 5), updatedAt: now },
    });
  }
  for (const c of caisses) await prisma.caisse.update({ where: { id: c.id }, data: { balance: { decrement: c.id === caisses[1].id ? 8000 : 0 } } });

  // Transactions
  for (let i = 0; i < 4; i++) {
    const isCredit = i % 2 === 0;
    const tx = await prisma.transaction.create({
      data: { associationId: aid, type: isCredit ? 'credit' : 'debit', amount: isCredit ? 40000 : 8000, amountInWords: isCredit ? '40000 DZD' : '8000 DZD', amountInWordsAr: isCredit ? '40000 دينار' : '8000 دينار', fundSource: 'caisse_physique', caisseId: caisses[i % caisses.length].id, donorId: isCredit ? donors[i % donors.length].id : undefined, beneficiaryId: !isCredit ? bens[i % bens.length].id : undefined, description: isCredit ? 'Don' : 'Aide', descriptionAr: isCredit ? 'تبرع' : 'مساعدة', receiptNumber: isCredit ? ref('BON') : undefined, status: 'completed', date: day(i * 20), createdAt: day(i * 20), updatedAt: now },
    });
    if (isCredit) {
      await prisma.donationReceipt.create({ data: { associationId: aid, receiptNumber: tx.receiptNumber!, donorId: donors[i % donors.length].id, donorName: `${donors[i % donors.length].firstName} ${donors[i % donors.length].lastName}`, donorNameAr: `${donors[i % donors.length].firstNameAr} ${donors[i % donors.length].lastNameAr}`, transactionId: tx.id, amount: 40000, amountInWords: '40000 DZD', amountInWordsAr: '40000 دينار', caisseId: caisses[i % caisses.length].id, caisseName: caisses[i % caisses.length].name, caisseNameAr: caisses[i % caisses.length].nameAr, date: tx.date, createdAt: tx.createdAt } });
      await prisma.caisse.update({ where: { id: caisses[i % caisses.length].id }, data: { balance: { increment: 40000 } } });
    } else {
      await prisma.caisse.update({ where: { id: caisses[i % caisses.length].id }, data: { balance: { decrement: 8000 } } });
    }
  }
  console.log('✔ Transactions + recus crees');

  // Articles
  await Promise.all([
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Lit medicalise', nameAr: 'سرير طبي', categoryId: (await prisma.articleCategory.findFirst({ where: { associationId: aid, nameAr: 'طبي' } }))!.id, quantity: 5, availableQuantity: 3, status: 'disponible', storageLocationId: (await prisma.storageLocation.findFirst({ where: { associationId: aid, nameAr: 'المستودع الطبي' } }))!.id, condition: 'Bon', conditionAr: 'جيد', isPermanent: false, createdAt: now, updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Colis alimentaire', nameAr: 'سلة غذائية', categoryId: (await prisma.articleCategory.findFirst({ where: { associationId: aid, nameAr: 'غذائي' } }))!.id, quantity: 80, availableQuantity: 80, status: 'disponible', condition: 'Neuf', conditionAr: 'جديد', isPermanent: true, createdAt: now, updatedAt: now } }),
    prisma.article.create({ data: { associationId: aid, reference: ref('ART'), name: 'Cartable scolaire', nameAr: 'حقيبة مدرسية', categoryId: (await prisma.articleCategory.findFirst({ where: { associationId: aid, nameAr: 'مدرسي' } }))!.id, quantity: 30, availableQuantity: 30, status: 'disponible', condition: 'Neuf', conditionAr: 'جديد', isPermanent: false, createdAt: now, updatedAt: now } }),
  ]);
  console.log('✔ 3 articles crees');

  // Loan
  await prisma.loan.create({ data: { associationId: aid, reference: ref('PRT'), beneficiaryId: bens[0].id, status: 'en_cours', items: [{ articleName: 'Lit medicalise', articleNameAr: 'سرير طبي', quantity: 1, returnedQuantity: 0, conditionOnLoan: 'Bon' }], loanDate: day(30), expectedReturnDate: day(-60), createdAt: day(30), updatedAt: now } });

  // Notifications
  await prisma.notification.create({ data: { associationId: aid, type: 'success', message: 'Bienvenue sur votre association Al-Faycel', messageAr: 'مرحباً بكم في جمعية الفيصل', read: false, createdAt: now } });

  console.log('\n✅ Donnees de Faycel creees avec succes !');
  console.log(`📧 ${email}`);
  console.log(`🏢 جمعية الفيصل الخيرية`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

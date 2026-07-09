import Dexie, { type Table } from 'dexie';
import type {
  Beneficiary,
  Donor,
  Transaction,
  Caisse,
  BankAccount,
  Article,
  ArticleCategory,
  StorageLocation,
  BeneficiaryAttribut,
  Loan,
  MedicalReferral,
  DonationReceipt,
} from '../types';

class AssociationDB extends Dexie {
  beneficiaries!: Table<Beneficiary>;
  donors!: Table<Donor>;
  transactions!: Table<Transaction>;
  caisses!: Table<Caisse>;
  bankAccounts!: Table<BankAccount>;
  articles!: Table<Article>;
  articleCategories!: Table<ArticleCategory>;
  storageLocations!: Table<StorageLocation>;
  beneficiaryAttributs!: Table<BeneficiaryAttribut>;
  loans!: Table<Loan>;
  medicalReferrals!: Table<MedicalReferral>;
  donationReceipts!: Table<DonationReceipt>;

  constructor() {
    super('AssociationCharitableDB');
    this.version(4).stores({
      beneficiaries:
        'id, reference, firstName, lastName, firstNameAr, lastNameAr, phone, nationalCardNumber, attribut, caisseId, subCategoryId, dateOfBirth, createdAt',
      donors:
        'id, reference, firstName, lastName, firstNameAr, lastNameAr, phone, totalDonated, createdAt',
      transactions:
        'id, type, fundSource, caisseId, subCategoryId, bankAccountId, donorId, beneficiaryId, date, amount, createdAt',
      caisses: 'id, name, nameAr, createdAt',
      bankAccounts: 'id, bankName, accountNumber, rib, createdAt',
      articles:
        'id, reference, name, nameAr, category, status, storageLocation, isPermanent, createdAt',
      articleCategories: 'id, name, nameAr, createdAt',
      storageLocations: 'id, name, nameAr, createdAt',
      beneficiaryAttributs: 'id, name, nameAr, createdAt',
      loans:
        'id, reference, beneficiaryId, status, loanDate, expectedReturnDate, createdAt',
      medicalReferrals:
        'id, reference, beneficiaryId, caisseId, doctorName, date, createdAt',
      donationReceipts:
        'id, receiptNumber, donorId, transactionId, date, createdAt',
    });
  }
}

export const db = new AssociationDB();

export async function seedDefaultData() {
  // Seed default attributs
  const attrCount = await db.beneficiaryAttributs.count();
  if (attrCount === 0) {
    const now = new Date();
    await db.beneficiaryAttributs.bulkAdd([
      { id: crypto.randomUUID(), name: 'veuve', nameAr: 'أرملة', createdAt: now },
      { id: crypto.randomUUID(), name: 'orphelin', nameAr: 'يتيم', createdAt: now },
      { id: crypto.randomUUID(), name: 'personne_agee', nameAr: 'شخص مسن', createdAt: now },
      { id: crypto.randomUUID(), name: 'handicape', nameAr: 'معاق', createdAt: now },
      { id: crypto.randomUUID(), name: 'famille_demunie', nameAr: 'عائلة معوزة', createdAt: now },
      { id: crypto.randomUUID(), name: 'autre', nameAr: 'أخرى', createdAt: now },
    ]);
  }

  // Seed default categories
  const catCount = await db.articleCategories.count();
  if (catCount === 0) {
    const now = new Date();
    await db.articleCategories.bulkAdd([
      { id: crypto.randomUUID(), name: 'Medical', nameAr: 'طبي', createdAt: now },
      { id: crypto.randomUUID(), name: 'Scolaire', nameAr: 'مدرسي', createdAt: now },
      { id: crypto.randomUUID(), name: 'Alimentaire', nameAr: 'غذائي', createdAt: now },
      { id: crypto.randomUUID(), name: 'Vêtement', nameAr: 'ملبس', createdAt: now },
      { id: crypto.randomUUID(), name: 'Mobilier', nameAr: 'أثاث', createdAt: now },
      { id: crypto.randomUUID(), name: 'Équipement', nameAr: 'معدات', createdAt: now },
    ]);
  }

  // Seed default storage locations
  const locCount = await db.storageLocations.count();
  if (locCount === 0) {
    const now = new Date();
    await db.storageLocations.bulkAdd([
      { id: crypto.randomUUID(), name: 'Dépôt A - Rayon 1', nameAr: 'المستودع أ - الرف 1', createdAt: now },
      { id: crypto.randomUUID(), name: 'Dépôt A - Rayon 2', nameAr: 'المستودع أ - الرف 2', createdAt: now },
      { id: crypto.randomUUID(), name: 'Dépôt B - Rayon 1', nameAr: 'المستودع ب - الرف 1', createdAt: now },
      { id: crypto.randomUUID(), name: 'Dépôt B - Rayon 2', nameAr: 'المستودع ب - الرف 2', createdAt: now },
      { id: crypto.randomUUID(), name: 'Dépôt C - Grands équipements', nameAr: 'المستودع ج - معدات كبيرة', createdAt: now },
    ]);
  }

  const caisseCount = await db.caisses.count();
  if (caisseCount === 0) {
    const now = new Date();
    await db.caisses.bulkAdd([
      { id: crypto.randomUUID(), reference: 'CAI-DEFAULT-001', name: 'Caisse Sociale', nameAr: 'الصندوق الاجتماعي',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Aide alimentaire', nameAr: 'مساعدة غذائية' },
          { id: crypto.randomUUID(), name: 'Aide vestimentaire', nameAr: 'مساعدة ملبسية' },
          { id: crypto.randomUUID(), name: 'Aide scolaire', nameAr: 'مساعدة مدرسية' },
        ],
        balance: 0, createdAt: now, updatedAt: now,
      },
      { id: crypto.randomUUID(), reference: 'CAI-DEFAULT-002', name: 'Caisse Médicale', nameAr: 'الصندوق الطبي',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Analyses', nameAr: 'تحاليل' },
          { id: crypto.randomUUID(), name: 'Ophtalmologie', nameAr: 'طب العيون' },
          { id: crypto.randomUUID(), name: 'Optique', nameAr: 'بصريات' },
          { id: crypto.randomUUID(), name: 'Chirurgie', nameAr: 'جراحة' },
          { id: crypto.randomUUID(), name: 'Médicaments', nameAr: 'أدوية' },
        ],
        balance: 0, createdAt: now, updatedAt: now,
      },
      { id: crypto.randomUUID(), reference: 'CAI-DEFAULT-003', name: 'Caisse Kafala', nameAr: 'صندوق الكفالة',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Kafala orphelin', nameAr: 'كفالة يتيم' },
          { id: crypto.randomUUID(), name: 'Kafala veuve', nameAr: 'كفالة أرملة' },
        ],
        balance: 0, createdAt: now, updatedAt: now,
      },
      { id: crypto.randomUUID(), reference: 'CAI-DEFAULT-004', name: 'Caisse Zakat', nameAr: 'صندوق الزكاة',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Zakat Al-Mal', nameAr: 'زكاة المال' },
          { id: crypto.randomUUID(), name: 'Zakat Al-Fitr', nameAr: 'زكاة الفطر' },
        ],
        balance: 0, createdAt: now, updatedAt: now,
      },
      { id: crypto.randomUUID(), reference: 'CAI-DEFAULT-005', name: 'Caisse Générale', nameAr: 'الصندوق العام',
        subCategories: [], balance: 0, createdAt: now, updatedAt: now,
      },
    ]);
  }

  const bankCount = await db.bankAccounts.count();
  if (bankCount === 0) {
    const now = new Date();
    await db.bankAccounts.add({
      id: crypto.randomUUID(), bankName: 'Compte Principal', bankNameAr: 'الحساب الرئيسي',
      accountNumber: '', rib: '', iban: '', swift: '', balance: 0,
      createdAt: now, updatedAt: now,
    });
  }
}

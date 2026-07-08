import Dexie, { type Table } from 'dexie';
import type {
  Beneficiary,
  Donor,
  Transaction,
  Caisse,
  BankAccount,
  Article,
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
  loans!: Table<Loan>;
  medicalReferrals!: Table<MedicalReferral>;
  donationReceipts!: Table<DonationReceipt>;

  constructor() {
    super('AssociationCharitableDB');
    this.version(2).stores({
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

// Seed default caisses if empty
export async function seedDefaultData() {
  const count = await db.caisses.count();
  if (count === 0) {
    const now = new Date();
    await db.caisses.bulkAdd([
      {
        id: crypto.randomUUID(),
        name: 'Caisse Sociale',
        nameAr: 'الصندوق الاجتماعي',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Aide alimentaire', nameAr: 'مساعدة غذائية' },
          { id: crypto.randomUUID(), name: 'Aide vestimentaire', nameAr: 'مساعدة ملبسية' },
          { id: crypto.randomUUID(), name: 'Aide scolaire', nameAr: 'مساعدة مدرسية' },
        ],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: 'Caisse Médicale',
        nameAr: 'الصندوق الطبي',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Analyses', nameAr: 'تحاليل' },
          { id: crypto.randomUUID(), name: 'Ophtalmologie', nameAr: 'طب العيون' },
          { id: crypto.randomUUID(), name: 'Optique', nameAr: 'بصريات' },
          { id: crypto.randomUUID(), name: 'Chirurgie', nameAr: 'جراحة' },
          { id: crypto.randomUUID(), name: 'Médicaments', nameAr: 'أدوية' },
        ],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: 'Caisse Kafala',
        nameAr: 'صندوق الكفالة',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Kafala orphelin', nameAr: 'كفالة يتيم' },
          { id: crypto.randomUUID(), name: 'Kafala veuve', nameAr: 'كفالة أرملة' },
        ],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: 'Caisse Zakat',
        nameAr: 'صندوق الزكاة',
        subCategories: [
          { id: crypto.randomUUID(), name: 'Zakat Al-Mal', nameAr: 'زكاة المال' },
          { id: crypto.randomUUID(), name: 'Zakat Al-Fitr', nameAr: 'زكاة الفطر' },
        ],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: 'Caisse Générale',
        nameAr: 'الصندوق العام',
        subCategories: [],
        balance: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  const bankCount = await db.bankAccounts.count();
  if (bankCount === 0) {
    const now = new Date();
    await db.bankAccounts.add({
      id: crypto.randomUUID(),
      bankName: 'Compte Principal',
      bankNameAr: 'الحساب الرئيسي',
      accountNumber: '',
      rib: '',
      iban: '',
      swift: '',
      balance: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// ============================================
// TYPES — SaaS Association Charitable
// ============================================
//
// Note Architecture : la langue active de l'association est stockée dans
// `Association.locale` ("ar" | "fr" | "en"). Chaque entité métier possède
// désormais UN seul champ textuel par attribut (ex: `name`), saisi dans la
// langue de l'association. Aucune version suffixée `Ar` n'existe plus.
// Le rendu utilise les helpers de `src/utils/localized.ts`.

// ---- Enums & Constants ----

export type AttributType = 'veuve' | 'orphelin' | 'personne_agee' | 'handicape' | 'famille_demunie' | 'autre';
export type TransactionType = 'credit' | 'debit';
export type FundSource = 'banque' | 'caisse_physique';
export type ArticleStatusEnum = string;
export type LoanStatus = 'en_cours' | 'partiellement_retourne' | 'retourne' | 'definitif';
export type ChildHealthStatus = 'bonne_sante' | 'malade' | 'handicape' | 'autre';
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';
export type Role = 'admin' | 'treasurer' | 'user';
export type Locale = 'ar' | 'fr' | 'en';

// ---- Association ----

export interface Association {
  id: string;
  name: string;
  locale: Locale;
  email: string;
  logoUrl?: string;
  createdAt: string;
}

export interface User {
  id: string;
  associationId: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  association?: Association;
  createdAt: string;
}

export interface InviteToken {
  id: string;
  role: Role;
  name: string | null;
  token: string;
  inviteLink: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  isExpired: boolean;
}

// ---- Beneficiary Attribut (الصفة) ----

export interface BeneficiaryAttribut {
  id: string;
  name: string;
  createdAt: Date;
}

// ---- Article Category ----

export interface ArticleCategory {
  id: string;
  name: string;
  createdAt: Date;
}

// ---- Article Status ----

export interface MedicalAnalysisType {
  id: string;
  name: string;
  createdAt: Date;
}

export interface MedicalHospital {
  id: string;
  name: string;
  createdAt: Date;
}

export interface DoctorSpecialty {
  id: string;
  name: string;
  _count?: { doctors: number };
}

export interface Doctor {
  id: string;
  reference: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  specialtyId?: string;
  specialty?: DoctorSpecialty;
  address?: string;
  notes?: string;
  _count?: { referrals: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorStats {
  totalReferrals: number;
  referralsThisMonth: number;
  referralsThisWeek: number;
  lastReferral: string | null;
  referralsByMonth: { month: string; count: number }[];
  referralsByWeek: { week: string; count: number }[];
  referralsByDay: { day: string; count: number }[];
  referralBeneficiaries: {
    id: string;
    date: string;
    status: string;
    beneficiary: { id: string; name: string; reference: string } | null;
  }[];
}

export interface SchoolGrade {
  id: string;
  name: string;
  createdAt: Date;
}

export interface ArticleStatus {
  id: string;
  name: string;
  isPermanent: boolean;
  description?: string;
  createdAt: Date;
}

// ---- Storage Location ----

export interface StorageLocation {
  id: string;
  name: string;
  createdAt: Date;
}

// ---- Caisse (Fund/Cash Box) ----

export interface SubCategory {
  id: string;
  name: string;
}

export interface Caisse {
  id: string;
  reference: string;
  name: string;
  subCategories: SubCategory[];
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Bank Account ----

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  rib: string;
  iban: string;
  swift: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Child (of beneficiary) ----

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string
  gender?: string;
  healthStatus: ChildHealthStatus;
  healthDetails?: string;
  schoolGradeId?: string;
}

// ---- Beneficiary ----

export interface Beneficiary {
  id: string;
  reference: string;
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  nationalCardNumber: string;
  dateOfBirth: string; // ISO date string
  attribut: AttributType;
  gender?: string;
  onBehalfOf?: string; // ID of another beneficiary (e.g., child presenting on behalf of widow)
  onBehalfOfName?: string;
  situation?: string;
  children: Child[];
  caisseId?: string;
  subCategoryId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Donor ----

export interface Donor {
  id: string;
  reference: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  gender?: string;
  totalDonated: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Transaction ----

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  amountInWords: string;
  fundSource: FundSource;
  caisseId: string;
  subCategoryId?: string;
  bankAccountId?: string;
  donorId?: string;
  beneficiaryId?: string;
  description: string;
  receiptNumber?: string;
  date: string; // ISO date string
  createdAt: Date;
  updatedAt: Date;
}

// ---- Article (Inventory Item) ----

export interface Article {
  id: string;
  reference: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  availableQuantity: number;
  status: ArticleStatusEnum;
  statusId?: string;
  statusModel?: ArticleStatus;
  storageLocation: string;
  isPermanent: boolean; // definitif = not returnable
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Loan Item (individual item in a loan) ----

export interface LoanItem {
  articleId: string;
  articleName: string;
  categoryName?: string;
  quantity: number;
  returnedQuantity: number;
  conditionOnLoan: string;
  conditionOnReturn?: string;
  expectedReturnDate?: string;
}

// ---- Loan ----

export interface Loan {
  id: string;
  reference: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryReference?: string;
  items: LoanItem[];
  status: LoanStatus;
  loanDate: string; // ISO date string
  expectedReturnDate?: string;
  actualReturnDate?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Stock Take (Inventaire / جرد المخزون) ----

export type StockTakeStatus = 'in_progress' | 'completed' | 'cancelled';

export interface StockTakeItem {
  articleId: string;
  articleReference?: string;
  articleName: string;
  categoryId?: string | null;
  categoryName?: string;
  storageLocationId?: string | null;
  storageName?: string;
  theoretical: number; // snapshot de availableQuantity au moment de l'ouverture
  counted: number | null;
  diff: number | null; // counted - theoretical
  status?: string; // statut d'article au moment du snapshot
}

export interface StockTake {
  id: string;
  reference: string;
  status: StockTakeStatus;
  items: StockTakeItem[];
  notes?: string;
  startedAt: string; // ISO date string
  completedAt?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
  // Remplis seulement dans la liste (GET /stock-takes)
  itemCount?: number;
  diffCount?: number;
}

// ---- Medical Referral ----

export interface MedicalReferral {
  id: string;
  reference: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryReference?: string;
  caisseId: string;
  subCategoryId?: string;
  doctorId: string;
  doctor?: Doctor;
  doctorName?: string;
  doctorSpecialty?: string;
  analysisType?: string;
  hospital?: string;
  amount: number;
  amountInWords: string;
  status?: string;
  date: string;
  notes?: string;
  children?: { id: string; name: string; age: string; gender?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

// ---- Donation Receipt (Bon) ----

export interface DonationReceipt {
  id: string;
  receiptNumber: string;
  donorId: string;
  donorName: string;
  transactionId: string;
  amount: number;
  amountInWords: string;
  caisseId: string;
  caisseName: string;
  subCategoryId?: string;
  subCategoryName?: string;
  date: string;
  createdAt: Date;
}

export interface DonationAllocation {
  id: string;
  donorId: string;
  beneficiaryId: string;
  creditTransactionId: string;
  debitTransactionId?: string;
  amount: number;
  remainingAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  donor: { id: string; firstName: string; lastName: string; reference: string };
  beneficiary: { id: string; firstName: string; lastName: string; reference: string };
  creditTransaction: { id: string; date: string; receiptNumber?: string; caisseId: string; status: TransactionStatus };
  debitTransaction?: { id: string; date: string; receiptNumber?: string };
}

// ---- Dashboard Stats ----

export interface DashboardStats {
  totalBankBalance: number;
  totalCashBalance: number;
  totalBeneficiaries: number;
  totalDonors: number;
  totalArticles: number;
  totalLoans: number;
  recentTransactions: Transaction[];
  caisseBalances: { caisse: Caisse; balance: number }[];
}

// ---- Search Filters ----

export interface BeneficiaryFilter {
  attribut?: AttributType;
  caisseId?: string;
  minChildren?: number;
  maxChildAge?: number;
  situation?: string;
  searchTerm?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
}

export interface DonorFilter {
  caisseId?: string;
  minDonation?: number;
  maxDonation?: number;
  searchTerm?: string;
}

export interface TransactionFilter {
  type?: TransactionType;
  status?: TransactionStatus;
  fundSource?: FundSource;
  caisseId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
}

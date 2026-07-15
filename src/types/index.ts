// ============================================
// TYPES — SaaS Association Charitable
// ============================================

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

export interface InviteToken {
  id: string;
  email: string;
  role: Role;
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
  nameAr: string;
  createdAt: Date;
}

// ---- Article Category ----

export interface ArticleCategory {
  id: string;
  name: string;
  nameAr: string;
  createdAt: Date;
}

// ---- Article Status ----

export interface MedicalAnalysisType {
  id: string;
  name: string;
  nameAr: string;
  createdAt: Date;
}

export interface MedicalHospital {
  id: string;
  name: string;
  nameAr: string;
  createdAt: Date;
}

export interface SchoolGrade {
  id: string;
  name: string;
  nameAr: string;
  createdAt: Date;
}

export interface ArticleStatus {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  createdAt: Date;
}

// ---- Storage Location ----

export interface StorageLocation {
  id: string;
  name: string;
  nameAr: string;
  createdAt: Date;
}

// ---- Caisse (Fund/Cash Box) ----

export interface SubCategory {
  id: string;
  name: string;
  nameAr: string;
}

export interface Caisse {
  id: string;
  reference: string;
  name: string;
  nameAr: string;
  subCategories: SubCategory[];
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Bank Account ----

export interface BankAccount {
  id: string;
  bankName: string;
  bankNameAr: string;
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
  firstNameAr: string;
  lastNameAr: string;
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
  firstNameAr: string;
  lastNameAr: string;
  address: string;
  addressAr: string;
  phone: string;
  nationalCardNumber: string;
  dateOfBirth: string; // ISO date string
  attribut: AttributType;
  gender?: string;
  onBehalfOf?: string; // ID of another beneficiary (e.g., child presenting on behalf of widow)
  onBehalfOfName?: string;
  situation?: string;
  situationAr?: string;
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
  firstNameAr: string;
  lastNameAr: string;
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
  amountInWordsAr: string;
  fundSource: FundSource;
  caisseId: string;
  subCategoryId?: string;
  bankAccountId?: string;
  donorId?: string;
  beneficiaryId?: string;
  description: string;
  descriptionAr: string;
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
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  category: string;
  categoryAr: string;
  quantity: number;
  availableQuantity: number;
  status: ArticleStatusEnum;
  storageLocation: string;
  storageLocationAr: string;
  condition: string;
  conditionAr: string;
  isPermanent: boolean; // definitif = not returnable
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Loan Item (individual item in a loan) ----

export interface LoanItem {
  articleId: string;
  articleName: string;
  articleNameAr: string;
  quantity: number;
  returnedQuantity: number;
  conditionOnLoan: string;
  conditionOnReturn?: string;
}

// ---- Loan ----

export interface Loan {
  id: string;
  reference: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryNameAr: string;
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

// ---- Medical Referral ----

export interface MedicalReferral {
  id: string;
  reference: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryNameAr: string;
  beneficiaryReference?: string;
  caisseId: string;
  subCategoryId?: string;
  doctorName: string;
  doctorNameAr: string;
  analysisType?: string;
  analysisTypeAr?: string;
  hospital?: string;
  hospitalAr?: string;
  amount: number;
  amountInWords: string;
  amountInWordsAr: string;
  status?: string;
  date: string;
  notes?: string;
  children?: { id: string; nameAr: string; name: string; age: string; gender?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

// ---- Donation Receipt (Bon) ----

export interface DonationReceipt {
  id: string;
  receiptNumber: string;
  donorId: string;
  donorName: string;
  donorNameAr: string;
  transactionId: string;
  amount: number;
  amountInWords: string;
  amountInWordsAr: string;
  caisseId: string;
  caisseName: string;
  caisseNameAr: string;
  subCategoryId?: string;
  subCategoryName?: string;
  subCategoryNameAr?: string;
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
  donor: { id: string; firstName: string; lastName: string; firstNameAr: string; lastNameAr: string; reference: string };
  beneficiary: { id: string; firstName: string; lastName: string; firstNameAr: string; lastNameAr: string; reference: string };
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

-- ============================================
-- Reset Neon via DELETE (le plus compatible)
-- ============================================
-- Supprime toutes les lignes de toutes les tables métier.
-- À exécuter depuis l'SQL Editor de Neon.

BEGIN;

-- Tables de référence (pas de dépendances)
DELETE FROM "ArticleStatusType";
DELETE FROM "ArticleCategory";
DELETE FROM "StorageLocation";
DELETE FROM "DoctorSpecialty";
DELETE FROM "MedicalAnalysisType";
DELETE FROM "MedicalHospital";
DELETE FROM "SchoolGrade";

-- Tables feuilles / transactionnelles
DELETE FROM "DonationAllocation";
DELETE FROM "DonationReceipt";
DELETE FROM "MedicalReferral";
DELETE FROM "Loan";
DELETE FROM "Transaction";
DELETE FROM "Notification";

-- Tables métier principales
DELETE FROM "Beneficiary";
DELETE FROM "Donor";
DELETE FROM "Doctor";
DELETE FROM "Article";
DELETE FROM "BankAccount";
DELETE FROM "Caisse";

-- Auth (à supprimer après les enfants)
DELETE FROM "InviteToken";
DELETE FROM "User";

-- Parent multi-tenant
DELETE FROM "Association";

COMMIT;

-- Vérification : tout doit afficher 0
SELECT 'Association' AS t, COUNT(*) FROM "Association"
UNION ALL SELECT 'User',         COUNT(*) FROM "User"
UNION ALL SELECT 'Beneficiary',  COUNT(*) FROM "Beneficiary"
UNION ALL SELECT 'Donor',        COUNT(*) FROM "Donor"
UNION ALL SELECT 'Doctor',       COUNT(*) FROM "Doctor"
UNION ALL SELECT 'Article',      COUNT(*) FROM "Article"
UNION ALL SELECT 'Caisse',       COUNT(*) FROM "Caisse"
UNION ALL SELECT 'BankAccount',  COUNT(*) FROM "BankAccount"
UNION ALL SELECT 'Transaction',  COUNT(*) FROM "Transaction"
UNION ALL SELECT 'DonationReceipt', COUNT(*) FROM "DonationReceipt"
UNION ALL SELECT 'Loan',         COUNT(*) FROM "Loan"
UNION ALL SELECT 'MedicalReferral', COUNT(*) FROM "MedicalReferral"
UNION ALL SELECT 'Notification', COUNT(*) FROM "Notification";

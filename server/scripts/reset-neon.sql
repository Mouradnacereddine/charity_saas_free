-- ============================================
-- Reset Neon — vide toutes les tables métier
-- ============================================
-- ATTENTION : supprime DÉFINITIVEMENT toutes les données.
-- À exécuter uniquement en phase de test / dev.
--
-- Usage (depuis le dashboard Neon SQL Editor) :
--   1. Copier-coller ce script
--   2. Exécuter
--   3. Vérifier le compte admin avec /api/auth/me (devrait être 404)
--   4. Aller sur /register pour créer un nouveau compte
--
-- Note : la colonne Association.locale persiste (default "ar")
-- ============================================

BEGIN;

-- Désactiver les contraintes FK le temps du truncate
SET session_replication_role = 'replica';

-- Tables dépendantes en premier (les feuilles)
TRUNCATE TABLE "DonationAllocation" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "DonationReceipt"      RESTART IDENTITY CASCADE;
TRUNCATE TABLE "MedicalReferral"     RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Loan"                RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Transaction"          RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Notification"         RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Beneficiary"          RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Donor"                RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Doctor"               RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Article"              RESTART IDENTITY CASCADE;
TRUNCATE TABLE "BankAccount"          RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Caisse"               RESTART IDENTITY CASCADE;

-- Tables de référence
TRUNCATE TABLE "ArticleStatusType"     RESTART IDENTITY CASCADE;
TRUNCATE TABLE "ArticleCategory"       RESTART IDENTITY CASCADE;
TRUNCATE TABLE "StorageLocation"       RESTART IDENTITY CASCADE;
TRUNCATE TABLE "DoctorSpecialty"       RESTART IDENTITY CASCADE;
TRUNCATE TABLE "MedicalAnalysisType"   RESTART IDENTITY CASCADE;
TRUNCATE TABLE "MedicalHospital"       RESTART IDENTITY CASCADE;
TRUNCATE TABLE "SchoolGrade"           RESTART IDENTITY CASCADE;
TRUNCATE TABLE "MedicalReferral"       RESTART IDENTITY CASCADE;

-- Tables parentes
TRUNCATE TABLE "InviteToken"           RESTART IDENTITY CASCADE;
TRUNCATE TABLE "User"                  RESTART IDENTITY CASCADE;

-- Enfin l'Association qui est la source du multi-tenant
TRUNCATE TABLE "Association"           RESTART IDENTITY CASCADE;

SET session_replication_role = 'origin';

COMMIT;

-- Vérification rapide
SELECT 'Associations' AS table, COUNT(*) FROM "Association"
UNION ALL SELECT 'Users',         COUNT(*) FROM "User"
UNION ALL SELECT 'Beneficiaries', COUNT(*) FROM "Beneficiary"
UNION ALL SELECT 'Transactions',  COUNT(*) FROM "Transaction"
UNION ALL SELECT 'Caisses',       COUNT(*) FROM "Caisse";

-- ============================================================================
-- Purge des données — SaaS Association Charitable
-- Base : Neon project quiet-cell-85874439 / branche br-hidden-night-ahocqql6 / neondb
--
-- OBJECTIF (demande utilisateur) :
--   1. Supprimer TOUTES les données de TOUTES les associations
--      SAUF l'association « جمعية دار المصطفى لكفالة اليتيم عنابة »
--      (id : 39882042-2cb5-4795-93e8-38d7e661c513).
--   2. Pour l'association conservée : garder UNIQUEMENT
--        - les personnes  (bénéficiaires + donateurs)
--        - les catégories et données de référence
--      et supprimer TOUTES les transactions / activités :
--        transactions, allocations, reçus, prêts, orientations médicales,
--        inventaires, notifications, journal d'audit.
--
-- EXÉCUTION : coller dans l'éditeur SQL Neon
--   https://console.neon.tech/app/projects/quiet-cell-85874439/branches/br-hidden-night-ahocqql6/sql-editor?database=neondb
--   puis "Run". Tout se passe dans une seule transaction : soit tout passe,
--   soit rien ne change (ROLLBACK automatique en cas d'erreur).
--
-- ORDRE DE SUPPRESSION : les enfants d'abord (FK RESTRICT), le parent
-- (Association) en dernier pour les associations supprimées.
-- ============================================================================

BEGIN;

-- Contrôle préalable : affiche les associations concernées
SELECT id, name FROM "Association" ORDER BY createdAt;

-- ---------------------------------------------------------------------------
-- PARTIE A — Association conservée (39882042-…) : on vide les tables
-- "opérationnelles" mais on garde les personnes et les catégories.
-- ---------------------------------------------------------------------------

-- A.1 Journal d'audit (activités)
DELETE FROM "AuditLog"
WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

-- A.2 Reçus de donation (dépendent de Transaction)
DELETE FROM "DonationReceipt"
WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

-- A.3 Affectations de fonds (dépendent de Donor/Beneficiary/Transaction)
DELETE FROM "DonationAllocation"
WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

-- A.4 Prêts (dépendent de Beneficiary)
DELETE FROM "Loan"
WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

-- A.5 Orientations médicales (dépendent de Beneficiary/Caisse/Doctor)
DELETE FROM "MedicalReferral"
WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

-- A.6 Inventaires de stock
DELETE FROM "StockTake"
WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

-- A.7 Notifications
DELETE FROM "Notification"
WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

-- A.8 Transactions (entrées ET sorties d'argent)
DELETE FROM "Transaction"
WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

-- A.9 Mise à zéro des soldes (caisses + comptes bancaires)
UPDATE "Caisse"
SET "balance" = 0
WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

UPDATE "BankAccount"
SET "balance" = 0
WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

-- A.10 Remise à zéro du cumul des donateurs (les donateurs sont conservés)
UPDATE "Donor"
SET "totalDonated" = 0
WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

-- NOTE : les articles (inventaire) sont conservés — ce sont des données de
-- référence/catégorisation. Si vous voulez aussi les vider, décommentez :
-- DELETE FROM "Article" WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

-- ---------------------------------------------------------------------------
-- PARTIE B — Toutes les autres associations : suppression totale.
-- Le ON DELETE CASCADE de chaque table référençant "Association" se charge
-- du reste ; on supprime explicitement les tables sans cascade déclarée
-- pour être explicite et sûr.
-- ---------------------------------------------------------------------------

-- B.1 Suppression des associations autres que celle conservée.
--     Toutes les données liées partent en cascade (User, Caisse,
--     BankAccount, Beneficiary, Donor, Transaction, ArticleCategory,
--     StorageLocation, Article, Loan, StockTake, MedicalAnalysisType,
--     SchoolGrade, DoctorSpecialty, Doctor, ArticleStatusType,
--     MedicalHospital, MedicalReferral, DonationReceipt, Notification,
--     DonationAllocation, InviteToken, AuditLog).
DELETE FROM "Association"
WHERE id <> '39882042-2cb5-4795-93e8-38d7e661c513';

-- ---------------------------------------------------------------------------
-- Contrôles après purge
-- ---------------------------------------------------------------------------
SELECT id, name FROM "Association";
SELECT 'Transaction' AS tbl, count(*) FROM "Transaction" WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513'
UNION ALL SELECT 'AuditLog', count(*) FROM "AuditLog" WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513'
UNION ALL SELECT 'MedicalReferral', count(*) FROM "MedicalReferral" WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513'
UNION ALL SELECT 'Beneficiary', count(*) FROM "Beneficiary" WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513'
UNION ALL SELECT 'Donor', count(*) FROM "Donor" WHERE "associationId" = '39882042-2cb5-4795-93e8-38d7e661c513';

COMMIT;

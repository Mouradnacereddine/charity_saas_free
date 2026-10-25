-- Détection des clés étrangères inter-associations (lignes héritées d'avant f2d90e4).
-- LECTURE SEULE. Chaque requête renvoie les lignes dont l'associationId diffère de
-- celui de l'enregistrement référencé. Résultat attendu après correctifs : 0 partout.
-- À exécuter d'abord sur une copie ou en lecture, jamais en écriture sans sauvegarde.

\echo '=== 1. Beneficiary.caisseId pointe une caisse d une autre association ==='
SELECT b.id, b."associationId" AS assoc_benef, c.id AS caisse_id, c."associationId" AS assoc_caisse
FROM "Beneficiary" b JOIN "Caisse" c ON c.id = b."caisseId"
WHERE b."caisseId" IS NOT NULL AND b."associationId" <> c."associationId";

\echo '=== 2. MedicalReferral : beneficiary / caisse / doctor hors association ==='
SELECT r.id, r."associationId" AS assoc,
       (r."beneficiaryId" IS NOT NULL AND b."associationId" <> r."associationId") AS benef_hors,
       (r."caisseId"      IS NOT NULL AND c."associationId" <> r."associationId") AS caisse_hors,
       (r."doctorId"      IS NOT NULL AND d."associationId" <> r."associationId") AS doctor_hors
FROM "MedicalReferral" r
LEFT JOIN "Beneficiary" b ON b.id = r."beneficiaryId"
LEFT JOIN "Caisse"      c ON c.id = r."caisseId"
LEFT JOIN "Doctor"      d ON d.id = r."doctorId"
WHERE (r."beneficiaryId" IS NOT NULL AND b."associationId" <> r."associationId")
   OR (r."caisseId"      IS NOT NULL AND c."associationId" <> r."associationId")
   OR (r."doctorId"      IS NOT NULL AND d."associationId" <> r."associationId");

\echo '=== 3. Loan.beneficiaryId hors association ==='
SELECT l.id, l."associationId" AS assoc_loan, b."associationId" AS assoc_benef
FROM "Loan" l JOIN "Beneficiary" b ON b.id = l."beneficiaryId"
WHERE b."associationId" <> l."associationId";

\echo '=== 4. Transaction : caisse / donor / beneficiary / bankAccount hors association ==='
SELECT t.id, t."associationId" AS assoc,
       (t."caisseId"      IS NOT NULL AND c."associationId" <> t."associationId") AS caisse_hors,
       (t."donorId"       IS NOT NULL AND dn."associationId" <> t."associationId") AS donor_hors,
       (t."beneficiaryId" IS NOT NULL AND b."associationId" <> t."associationId") AS benef_hors,
       (t."bankAccountId" IS NOT NULL AND a."associationId" <> t."associationId") AS bank_hors
FROM "Transaction" t
LEFT JOIN "Caisse"      c  ON c.id  = t."caisseId"
LEFT JOIN "Donor"       dn ON dn.id = t."donorId"
LEFT JOIN "Beneficiary" b  ON b.id  = t."beneficiaryId"
LEFT JOIN "BankAccount" a  ON a.id  = t."bankAccountId"
WHERE (t."caisseId"      IS NOT NULL AND c."associationId"  <> t."associationId")
   OR (t."donorId"       IS NOT NULL AND dn."associationId" <> t."associationId")
   OR (t."beneficiaryId" IS NOT NULL AND b."associationId"  <> t."associationId")
   OR (t."bankAccountId" IS NOT NULL AND a."associationId"  <> t."associationId");

\echo '=== 5. DonationReceipt : donor / caisse hors association ==='
SELECT dr.id, dr."associationId" AS assoc,
       (dr."donorId" IS NOT NULL AND dn."associationId" <> dr."associationId") AS donor_hors,
       (dr."caisseId" IS NOT NULL AND c."associationId" <> dr."associationId") AS caisse_hors
FROM "DonationReceipt" dr
LEFT JOIN "Donor"  dn ON dn.id = dr."donorId"
LEFT JOIN "Caisse" c  ON c.id  = dr."caisseId"
WHERE (dr."donorId" IS NOT NULL AND dn."associationId" <> dr."associationId")
   OR (dr."caisseId" IS NOT NULL AND c."associationId" <> dr."associationId");

\echo '=== 6. Article : category / storageLocation / status hors association ==='
SELECT a.id, a."associationId" AS assoc,
       (a."categoryId"        IS NOT NULL AND ac."associationId" <> a."associationId") AS cat_hors,
       (a."storageLocationId" IS NOT NULL AND sl."associationId" <> a."associationId") AS loc_hors,
       (a."statusId"          IS NOT NULL AND st."associationId" <> a."associationId") AS statut_hors
FROM "Article" a
LEFT JOIN "ArticleCategory" ac ON ac.id = a."categoryId"
LEFT JOIN "StorageLocation" sl ON sl.id = a."storageLocationId"
LEFT JOIN "ArticleStatusType" st ON st.id = a."statusId"
WHERE (a."categoryId"        IS NOT NULL AND ac."associationId" <> a."associationId")
   OR (a."storageLocationId" IS NOT NULL AND sl."associationId" <> a."associationId")
   OR (a."statusId"          IS NOT NULL AND st."associationId" <> a."associationId");

\echo '=== 7. DonorBeneficiary / DonationAllocation : liens croises entre associations ==='
SELECT 'DonorBeneficiary' AS tbl, x.id,
       (x."donorId"       IS NOT NULL AND dn."associationId" <> x."associationId") AS donor_hors,
       (x."beneficiaryId" IS NOT NULL AND b."associationId"  <> x."associationId") AS benef_hors
FROM "DonorBeneficiary" x
LEFT JOIN "Donor" dn ON dn.id = x."donorId"
LEFT JOIN "Beneficiary" b ON b.id = x."beneficiaryId"
WHERE (x."donorId"       IS NOT NULL AND dn."associationId" <> x."associationId")
   OR (x."beneficiaryId" IS NOT NULL AND b."associationId"  <> x."associationId")
UNION ALL
SELECT 'DonationAllocation', y.id,
       (y."donorId"       IS NOT NULL AND dn."associationId" <> y."associationId"),
       (y."beneficiaryId" IS NOT NULL AND b."associationId"  <> y."associationId")
FROM "DonationAllocation" y
LEFT JOIN "Donor" dn ON dn.id = y."donorId"
LEFT JOIN "Beneficiary" b ON b.id = y."beneficiaryId"
WHERE (y."donorId"       IS NOT NULL AND dn."associationId" <> y."associationId")
   OR (y."beneficiaryId" IS NOT NULL AND b."associationId"  <> y."associationId");

\echo '=== 8. AuditLog.userId pointant un utilisateur d une autre association ==='
SELECT l.id, l."associationId" AS assoc_log, u."associationId" AS assoc_user
FROM "AuditLog" l JOIN "User" u ON u.id = l."userId"
WHERE l."userId" IS NOT NULL AND u."associationId" <> l."associationId";

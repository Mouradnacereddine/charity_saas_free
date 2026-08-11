// ============================================
// Générateur du document Word des rôles
// ============================================
// Usage : node scripts/generate-roles-doc.mjs
// Produit : docs/ROLES_ET_PERMISSIONS.docx
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from 'docx';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'docs');
const outPath = join(outDir, 'ROLES_ET_PERMISSIONS.docx');

// ---- Helpers de style ----
const PRIMARY = '1E6B52'; // vert associatif
const DARK = '1F2937';
const MUTED = '6B7280';
const BORDER = 'D1D5DB';

const heading = (text, level) => new Paragraph({
  heading: level,
  children: [new TextRun({ text, bold: true, color: level === HeadingLevel.HEADING_1 ? PRIMARY : DARK })],
  spacing: { before: level === HeadingLevel.HEADING_1 ? 300 : 200, after: 120 },
});

const title = () => new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: '🎭 Rôles et Permissions', bold: true, size: 40, color: PRIMARY })],
  spacing: { after: 100 },
});

const subtitle = () => new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'SaaS Association Caritative — Système de gestion associatif', size: 22, color: MUTED })],
  spacing: { after: 300 },
});

const text = (content, opts = {}) => new Paragraph({
  children: [new TextRun({ text: content, size: 22, color: DARK, ...opts })],
  spacing: { after: 80 },
  indent: opts.indent ? { left: 400 } : undefined,
});

const bullet = (content, boldPrefix) => new Paragraph({
  children: [
    new TextRun({ text: boldPrefix ? `${boldPrefix} ` : '• ', size: 22, color: DARK, bold: !!boldPrefix }),
    new TextRun({ text: content, size: 22, color: DARK }),
  ],
  spacing: { after: 60 },
  indent: { left: 400 },
});

const makeTable = (header, rows, widths) => {
  const headerRow = new TableRow({
    tableHeader: true,
    children: header.map((h) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: 'FFFFFF' })] })],
      shading: { type: ShadingType.SOLID, color: PRIMARY },
      verticalAlign: 'center',
    })),
  });

  const bodyRows = rows.map((r) => new TableRow({
    children: r.map((cell) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 20, color: DARK })] })],
    })),
  }));

  return new Table({
    rows: [headerRow, ...bodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
      left: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
      right: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
    },
  });
};

// ---- Contenu du document ----
const children = [];

children.push(title());
children.push(subtitle());

// Section 1 : architecture
children.push(heading('1. 🏗️ Architecture des rôles', HeadingLevel.HEADING_1));
children.push(text('Le système repose sur 6 rôles, chacun lié à un domaine fonctionnel précis de l’association :'));
children.push(makeTable(
  ['Rôle', 'Code', 'Domaine', 'Personne type'],
  [
    ['Super Administrateur', 'super_admin', 'Tous les domaines', 'Fondateur / Président'],
    ['Administrateur', 'admin', 'Administration + lecture', 'Bureau de l’association'],
    ['Trésorier', 'treasurer', 'Finance', 'Trésorier élu'],
    ['Magasinier', 'stock_manager', 'Stock / articles / prêts', 'Responsable du dépôt'],
    ['Assistant social', 'social_worker', 'Bénéficiaires / médical', 'Assistant(e) social(e)'],
    ['Bénévole', 'volunteer', 'Lecture + saisie limitée', 'Bénévole'],
  ]
));

// Section 2 : détail des rôles
children.push(heading('2. 👥 Détail des rôles et leurs tâches', HeadingLevel.HEADING_1));

children.push(heading('2.1 Super Administrateur (super_admin)', HeadingLevel.HEADING_2));
children.push(text('C’est le fondateur de l’association — celui qui a créé le compte en premier. Attribué automatiquement à la création, identifié par le badge « Fondateur ».'));
children.push(bullet('Tous les privilèges sans exception'));
children.push(bullet('Peut promouvoir n’importe qui en admin (le seul autorisé)'));
children.push(bullet('Peut supprimer / rétrograder un autre admin'));
children.push(bullet('Gère utilisateurs, finance, stock, social, médical, paramètres'));
children.push(bullet('Limite : ne peut pas se supprimer soi-même ni changer son propre rôle', '🚫'));
children.push(text('Il y a un seul super_admin par association. Ce rôle ne peut jamais être attribué manuellement — il se transmet uniquement via la création de l’association.'));

children.push(heading('2.2 Administrateur (admin)', HeadingLevel.HEADING_2));
children.push(bullet('Gérer les utilisateurs : créer, promouvoir, approuver/rejeter, supprimer (rôles inférieurs)'));
children.push(bullet('Gérer les paramètres de l’association (nom, langue, logo)'));
children.push(bullet('Lire les données de tous les modules pour le suivi'));
children.push(bullet('Voir le dashboard complet et les analyses financières'));
children.push(bullet('Ne peut PAS : supprimer/rétrograder un autre admin, modifier le super_admin, promouvoir en admin, manipuler l’argent', '🚫'));

children.push(heading('2.3 Trésorier (treasurer)', HeadingLevel.HEADING_2));
children.push(bullet('Transactions : enregistrer crédits (dons) et débits (aides)'));
children.push(bullet('Comptes bancaires : gérer comptes et soldes'));
children.push(bullet('Caisses : créer et gérer les caisses'));
children.push(bullet('Donateurs : gérer donateurs et dons'));
children.push(bullet('Reçus de don : générer et imprimer'));
children.push(bullet('Allocations : suivre l’affectation des dons'));
children.push(bullet('Voir le dashboard financier et les analyses'));
children.push(bullet('Ne peut PAS : gérer articles/stock, bénéficiaires, médical', '🚫'));

children.push(heading('2.4 Magasinier (stock_manager)', HeadingLevel.HEADING_2));
children.push(bullet('Articles : créer, modifier, supprimer'));
children.push(bullet('Catégories, emplacements, statuts d’articles'));
children.push(bullet('Niveaux scolaires (fournitures)'));
children.push(bullet('Inventaires (جرد) : créer et compléter'));
children.push(bullet('Prêts d’articles aux bénéficiaires et retours'));
children.push(bullet('Ne peut PAS : gérer la finance, les bénéficiaires, le médical', '🚫'));

children.push(heading('2.5 Assistant social (social_worker)', HeadingLevel.HEADING_2));
children.push(bullet('Bénéficiaires : gestion complète (veuves, orphelins, personnes âgées…)'));
children.push(bullet('Enfants : santé, scolarité'));
children.push(bullet('Orientations médicales vers médecins/hôpitaux'));
children.push(bullet('Types d’analyses, hôpitaux, docteurs et spécialités'));
children.push(bullet('Prêts d’articles pour les bénéficiaires (sans suppression)'));
children.push(bullet('Donateurs : consultation'));
children.push(bullet('Ne peut PAS : gérer l’argent, les articles/stock', '🚫'));

children.push(heading('2.6 Bénévole (volunteer)', HeadingLevel.HEADING_2));
children.push(bullet('Bénéficiaires : créer et modifier (pas de suppression)'));
children.push(bullet('Reçus de don : saisir'));
children.push(bullet('Consulter : articles, prêts, orientations, docteurs, hôpitaux'));
children.push(bullet('Dashboard : statistiques basiques'));
children.push(bullet('Notifications : consulter et marquer comme lues'));
children.push(bullet('Ne peut PAS : manipuler l’argent, les articles, les donateurs, supprimer des bénéficiaires', '🚫'));

// Section 3 : matrice
// Symboles textuels universels (compatibles toutes polices) :
//   [CRUD] = créer, lire, modifier, supprimer · [CRU] = créer, lire, modifier (pas de suppression)
//   [LECT] = lecture seule · [—] = aucun accès · [!] = partiel
children.push(heading('3. Matrice des permissions', HeadingLevel.HEADING_1));
children.push(text('Légende : [CRUD] = créer, lire, modifier, supprimer · [CRU] = créer, lire, modifier (pas de suppression) · [LECT] = lecture seule · [—] = aucun accès'));
children.push(makeTable(
  ['Module', 'Super Admin', 'Admin', 'Trésorier', 'Magasinier', 'Assist. Social', 'Bénévole'],
  [
    ['Gestion utilisateurs', '[CRUD]', '[CRUD]¹', '[—]', '[—]', '[—]', '[—]'],
    ['Paramètres association', '[CRUD]', '[CRUD]', '[—]', '[—]', '[—]', '[—]'],
    ['Transactions', '[CRUD]', '[LECT]', '[CRUD]', '[—]', '[—]', '[—]'],
    ['Comptes bancaires', '[CRUD]', '[LECT]', '[CRUD]', '[—]', '[—]', '[—]'],
    ['Caisses', '[CRUD]', '[LECT]', '[CRUD]', '[—]', '[—]', '[—]'],
    ['Donateurs', '[CRUD]', '[LECT]', '[CRUD]', '[—]', '[LECT]', '[—]'],
    ['Reçus de don', '[CRUD]', '[LECT]', '[CRUD]', '[—]', '[CRU]', '[CRU]'],
    ['Allocations', '[CRUD]', '[LECT]', '[CRUD]', '[—]', '[LECT]', '[—]'],
    ['Articles', '[CRUD]', '[LECT]', '[—]', '[CRUD]', '[LECT]', '[LECT]'],
    ['Catégories', '[CRUD]', '[LECT]', '[—]', '[CRUD]', '[LECT]', '[LECT]'],
    ['Emplacements stockage', '[CRUD]', '[—]', '[—]', '[CRUD]', '[—]', '[—]'],
    ['Inventaires (جرد)', '[CRUD]', '[LECT]', '[—]', '[CRUD]', '[—]', '[—]'],
    ['Prêts', '[CRUD]', '[LECT]', '[—]', '[CRUD]', '[CRU]', '[LECT]'],
    ['Bénéficiaires', '[CRUD]', '[LECT]', '[—]', '[—]', '[CRUD]', '[CRU]'],
    ['Attributs bénéficiaire', '[CRUD]', '[CRUD]', '[—]', '[—]', '[LECT]', '[LECT]'],
    ['Enfants', '[CRUD]', '[LECT]', '[—]', '[—]', '[CRUD]', '[CRU]'],
    ['Orientations médicales', '[CRUD]', '[—]', '[—]', '[—]', '[CRUD]', '[LECT]'],
    ['Types d’analyses', '[CRUD]', '[—]', '[—]', '[—]', '[CRUD]', '[—]'],
    ['Hôpitaux', '[CRUD]', '[—]', '[—]', '[—]', '[CRUD]', '[LECT]'],
    ['Docteurs', '[CRUD]', '[—]', '[—]', '[—]', '[CRUD]', '[LECT]'],
    ['Spécialités', '[CRUD]', '[—]', '[—]', '[—]', '[CRUD]', '[—]'],
    ['Dashboard', '[CRUD]', '[CRUD]', '[!] Finance', '[!] Stock', '[!] Social', '[!] Basique'],
    ['Analyses', '[CRUD]', '[CRUD]', '[CRUD]', '[—]', '[—]', '[—]'],
    ['Notifications', '[CRUD]', '[CRUD]', '[!]', '[!]', '[!]', '[!]'],
  ]
));
children.push(text('¹ Admin : gestion des rôles inférieurs uniquement (jamais les admins ni super_admin).', { italics: true }));

// Section 4 : protection
children.push(heading('4. 🔒 Règles de protection des administrateurs', HeadingLevel.HEADING_1));
children.push(text('Ces protections sont appliquées côté serveur et ne peuvent être contournées du frontend :'));
children.push(bullet('Un admin ne peut pas supprimer un autre admin → refus (403)'));
children.push(bullet('Un admin ne peut pas rétrograder un autre admin → refus (403)'));
children.push(bullet('Personne ne peut modifier le super_admin (sauf le super_admin)'));
children.push(bullet('Seul le super_admin peut promouvoir quelqu’un en admin'));
children.push(bullet('Personne ne peut être promu super_admin (rôle réservé au fondateur)'));
children.push(bullet('Un administrateur ne peut pas changer son propre rôle'));
children.push(bullet('Un utilisateur ne peut pas se supprimer lui-même'));

// Section 5 : invitation
children.push(heading('5. 🗣️ Rôles et actions d’invitation', HeadingLevel.HEADING_1));
children.push(makeTable(
  ['Inviteur', 'Rôles invitable', 'Rôles attribuables'],
  [
    ['super_admin', 'admin, trésorier, magasinier, assistant social, bénévole', 'idem'],
    ['admin', 'trésorier, magasinier, assistant social, bénévole', 'idem'],
    ['Autres rôles', 'aucun', 'aucun'],
  ]
));

// Section 6 : migration
children.push(heading('6. 🔄 Migration des rôles précédents', HeadingLevel.HEADING_1));
children.push(makeTable(
  ['Ancien rôle', 'Nouveau rôle', 'Règle'],
  [
    ['admin (premier par association)', 'super_admin', 'Le fondateur, isFounder: true'],
    ['admin (les autres)', 'admin', 'Inchangé'],
    ['treasurer', 'treasurer', 'Inchangé'],
    ['user', 'volunteer', 'Renommé automatiquement'],
  ]
));

// Section 7 : technique
children.push(heading('7. 🔑 Détails techniques', HeadingLevel.HEADING_1));
children.push(bullet('Backend : server/src/lib/permissions.ts — matrice ROLE_PERMISSIONS'));
children.push(bullet('Middleware : server/src/middleware/auth.ts — requirePermission, requireUserManagement'));
children.push(bullet('Frontend : src/hooks/usePermissions.ts — hook usePermissions()'));
children.push(bullet('Schéma : server/prisma/schema.prisma — enum Role (6 valeurs) + User.isFounder'));

// Section 8 : recommandations
children.push(heading('8. 💡 Recommandations d’organisation', HeadingLevel.HEADING_1));
children.push(bullet('1 super_admin : le président / fondateur'));
children.push(bullet('1-2 admins : membres du bureau'));
children.push(bullet('1 trésorier : le trésorier élu (seul à manipuler l’argent)'));
children.push(bullet('1 magasinier : le responsable du dépôt'));
children.push(bullet('1-3 assistants sociaux : selon le volume de bénéficiaires'));
children.push(bullet('Bénévoles : l’équipe terrain'));
children.push(text('Principe de séparation : l’argent (trésorier), les biens (magasinier) et les bénéficiaires (assistant social) sont gérés par des personnes différentes — bonne pratique de contrôle interne contre les malversations.', { italics: true }));

// ---- Génération ----
const doc = new Document({
  creator: 'NCE — SaaS Association Caritative',
  title: 'Rôles et Permissions',
  description: 'Documentation du système de rôles et permissions',
  sections: [{ properties: {}, children }],
});

mkdirSync(outDir, { recursive: true });
const buffer = await Packer.toBuffer(doc);
writeFileSync(outPath, buffer);
console.log(`✅ Document Word généré : ${outPath}`);

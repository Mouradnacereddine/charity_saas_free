#!/usr/bin/env node
/**
 * Generates 3 professional Word documents (.docx) for the NCE SaaS:
 *   - DOCUMENTATION_UTILISATEUR_FR.docx  (French)
 *   - USER_MANUAL_EN.docx               (English)
 *   - دليل_المستخدم_AR.docx            (Arabic)
 *
 * Usage: node scripts/generate-docs.js
 * Output: /home/mourad/Documents/
 */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, PageBreak,
  Header, Footer, ImageRun, ShadingType, TabStopPosition, TabStopType,
  TableOfContents, LevelFormat, convertInchesToTwip,
} = require('docx');

// ── Colour palette ──────────────────────────────────────────────
const C = {
  primary:    '1B3A5C',   // deep navy
  accent:     '2E7D32',   // green
  accent2:    'E65100',   // orange accent
  lightBg:    'F5F7FA',   // light grey-blue
  tableHead:  '1B3A5C',
  white:      'FFFFFF',
  text:       '212121',
  muted:      '616161',
  border:     'BDBDBD',
  warning:    'E65100',
  success:    '2E7D32',
};

// ── Reusable helpers ────────────────────────────────────────────
function heading(text, level = HeadingLevel.HEADING_1, color = C.primary, rtl = false) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 36 : level === HeadingLevel.HEADING_2 ? 30 : 26, color, font: rtl ? 'Arial' : 'Calibri' })],
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 400 : 280, after: 200 },
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  });
}

function para(text, opts = {}) {
  const { bold, color, size, rtl, spacing } = opts;
  return new Paragraph({
    children: [new TextRun({
      text,
      bold: bold || false,
      size: size || 22,
      color: color || C.text,
      font: rtl ? 'Arial' : 'Calibri',
    })],
    spacing: { after: spacing || 120, before: 60, ...(opts.line ? { line: opts.line } : {}) },
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
    ...(opts.indent ? { indent: { left: convertInchesToTwip(0.3) } } : {}),
  });
}

function bullet(text, rtl = false) {
  return new Paragraph({
    children: [new TextRun({ text: `•  ${text}`, size: 22, color: C.text, font: rtl ? 'Arial' : 'Calibri' })],
    spacing: { after: 60 },
    indent: { left: convertInchesToTwip(0.4) },
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  });
}

function bulletBold(label, desc, rtl = false) {
  return new Paragraph({
    children: [
      new TextRun({ text: `•  ${label}`, bold: true, size: 22, color: C.text, font: rtl ? 'Arial' : 'Calibri' }),
      new TextRun({ text: desc, size: 22, color: C.muted, font: rtl ? 'Arial' : 'Calibri' }),
    ],
    spacing: { after: 60 },
    indent: { left: convertInchesToTwip(0.4) },
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  });
}

function numbered(n, text, rtl = false) {
  return new Paragraph({
    children: [new TextRun({ text: `${n}.  ${text}`, size: 22, color: C.text, font: rtl ? 'Arial' : 'Calibri' })],
    spacing: { after: 60 },
    indent: { left: convertInchesToTwip(0.5) },
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  });
}

function subheading(text, rtl = false) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: C.accent, font: rtl ? 'Arial' : 'Calibri' })],
    spacing: { before: 200, after: 120 },
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  });
}

function infoRow(label, value, rtl = false) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label} : `, bold: true, size: 22, color: C.text, font: rtl ? 'Arial' : 'Calibri' }),
      new TextRun({ text: value, size: 22, color: C.muted, font: rtl ? 'Arial' : 'Calibri' }),
    ],
    spacing: { after: 40 },
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  });
}

function spacer(size = 60) {
  return new Paragraph({ spacing: { after: size }, children: [] });
}

function line(color = C.border) {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { color, size: 6, style: BorderStyle.SINGLE, space: 1 } },
    children: [],
  });
}

function noteBox(text, rtl = false) {
  return new Paragraph({
    children: [
      new TextRun({ text: `💡  ${text}`, size: 20, color: C.accent2, font: rtl ? 'Arial' : 'Calibri', italics: true }),
    ],
    spacing: { before: 80, after: 80 },
    indent: { left: convertInchesToTwip(0.3) },
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  });
}

function warningBox(text, rtl = false) {
  return new Paragraph({
    children: [
      new TextRun({ text: `⚠️  ${text}`, size: 20, color: C.warning, font: rtl ? 'Arial' : 'Calibri', bold: true }),
    ],
    spacing: { before: 80, after: 80 },
    indent: { left: convertInchesToTwip(0.3) },
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  });
}

// ── Table helper ────────────────────────────────────────────────
function makeTable(headers, rows, rtl = false) {
  const hdrRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, color: C.white, size: 20, font: rtl ? 'Arial' : 'Calibri' })],
        alignment: AlignmentType.CENTER,
      })],
      shading: { type: ShadingType.SOLID, color: C.tableHead },
    })),
  });

  const dataRows = rows.map((row, i) => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: cell, size: 20, color: C.text, font: rtl ? 'Arial' : 'Calibri' })],
        alignment: rtl && headers.indexOf(cell) === headers.length - 1 ? AlignmentType.RIGHT : AlignmentType.LEFT,
      })],
      shading: i % 2 === 0 ? { type: ShadingType.SOLID, color: C.lightBg } : undefined,
    })),
  }));

  return new Table({
    rows: [hdrRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ── Section builder for each module ──
// Each returns an array of Paragraphs / Tables

function frCoverPage() {
  return [
    spacer(600),
    new Paragraph({
      children: [new TextRun({ text: 'NEXUS CONSEIL & EXCELLENCE', bold: true, size: 56, color: C.primary, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '(NCE)', bold: true, size: 40, color: C.accent, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    line(),
    new Paragraph({
      children: [new TextRun({ text: 'GUIDE UTILISATEUR', bold: true, size: 44, color: C.primary, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Plateforme de Gestion Associative', size: 32, color: C.muted, font: 'Calibri', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Version 1.0 — Juillet 2026', size: 24, color: C.muted, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Dirigé par Mr BAGUENANE', size: 24, color: C.text, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({ children: [], spacing: { after: 0 } },),
    new PageBreak(),
  ];
}

function frGeneralIntro() {
  return [
    heading('Introduction Générale', HeadingLevel.HEADING_1),
    para('NCE est une plateforme de gestion complète conçue spécialement pour les associations caritatives. Elle vous permet de gérer l\'intégralité de vos activités au sein d\'un même outil, en toute simplicité et sécurité.'),
    para('Ce guide vous accompagne pas à pas dans la prise en main de chaque module fonctionnel de l\'application.'),
    spacer(),
    heading('Structure de l\'Application', HeadingLevel.HEADING_2),
    para('L\'application est organisée en modules accessibles depuis le menu latéral :'),
    bullet('Tableau de bord — Vue d\'ensemble des indicateurs clés'),
    bullet('Analyses & Rapports — Statistiques et graphiques financiers'),
    bullet('Finances — Transactions, comptes bancaires, allocations'),
    bullet('Caisses — Gestion des fonds et sous-catégories'),
    bullet('Bénéficiaires — Gestion des personnes aidées'),
    bullet('Donateurs — Gestion des donateurs et reçus'),
    bullet('Stock & Prêts — Articles, inventaire et gestion des prêts'),
    bullet('Orientation Médicale — Orientations vers les médecins et hôpitaux'),
    bullet('Médecins — Annuaire des médecins partenaires'),
    bullet('Gestion des Utilisateurs — Administration des comptes (admin)'),
    line(),
  ];
}

function frAuthModule() {
  return [
    heading('1. Premiers Pas — Authentification et Configuration', HeadingLevel.HEADING_1),
    subheading('1.1 Créer votre association'),
    numbered(1, 'Rendez-vous sur l\'application et connectez-vous avec votre compte Google.'),
    numbered(2, 'Si vous êtes le premier utilisateur, saisissez le nom de votre association (en arabe et en français/anglais).'),
    numbered(3, 'Vous devenez automatiquement administrateur de l\'association.'),
    spacer(),
    subheading('1.2 Inviter des collaborateurs'),
    numbered(1, 'Depuis le menu Gestion des utilisateurs, cliquez sur "Inviter un utilisateur".'),
    numbered(2, 'Choisissez son rôle : Administrateur, Trésorier ou Bénévole.'),
    numbered(3, 'Copiez le lien d\'invitation généré et partagez-le avec la personne concernée.'),
    numbered(4, 'Le lien expire automatiquement après la période définie.'),
    warningBox('Seul un administrateur peut inviter, modifier les rôles ou supprimer des utilisateurs.'),
    spacer(),
    subheading('1.3 Connexion par email/mot de passe'),
    para('Vous pouvez également créer un compte avec email et mot de passe via la page d\'inscription. L\'authentification Google reste disponible comme alternative.'),
    spacer(),
    subheading('1.4 Changer la langue'),
    bullet('Cliquez sur votre avatar en bas de la barre latérale.'),
    bullet('Sélectionnez العربية (Arabe), English (Anglais) ou Français.'),
    bullet('La langue choisie est sauvegardée pour vos prochaines visites.'),
    noteBox('L\'interface complète est disponible en arabe (RTL), français et anglais. Le sens de saisie dans les formulaires s\'adapte automatiquement à la langue choisie.'),
    spacer(),
    subheading('1.5 Paramètres de l\'association'),
    para('Depuis le menu utilisateur > Paramètres de l\'association, vous pouvez modifier :'),
    bullet('Le nom de l\'association'),
    bullet('La langue par défaut (arabe/français/anglais)'),
    bullet('Le logo de l\'association'),
    line(),
  ];
}

function frDashboardModule() {
  return [
    heading('2. Tableau de Bord', HeadingLevel.HEADING_1),
    para('Le tableau de bord est la page d\'accueil de l\'application. Il vous offre une vue d\'ensemble instantanée de l\'activité de votre association.'),
    spacer(),
    subheading('2.1 Indicateurs clés'),
    bullet('Solde bancaire total — Somme des soldes de tous les comptes bancaires'),
    bullet('Encaisse totale — Somme des soldes de toutes les caisses'),
    bullet('Nombre total de bénéficiaires enregistrés'),
    bullet('Nombre total de donateurs'),
    bullet('Nombre total d\'articles en stock'),
    bullet('Prêts actifs en cours'),
    spacer(),
    subheading('2.2 Soldes par caisse'),
    para('Un tableau présente le solde détaillé de chaque caisse (fonds) de l\'association.'),
    spacer(),
    subheading('2.3 Transactions récentes'),
    para('Les 10 dernières transactions sont affichées avec leur type (dépôt/retrait), statut (complété/en attente/annulé), montant, donateur et bénéficiaire associés.'),
    line(),
  ];
}

function frBeneficiariesModule() {
  return [
    heading('3. Gestion des Bénéficiaires', HeadingLevel.HEADING_1),
    para('Le module bénéficiaires est le cœur du système. Chaque personne aidée par votre association est enregistrée comme bénéficiaire.'),
    spacer(),
    subheading('3.1 Ajouter un bénéficiaire'),
    numbered(1, 'Cliquez sur l\'onglet Bénéficiaires dans le menu latéral.'),
    numbered(2, 'Cliquez sur le bouton "Ajouter un bénéficiaire".'),
    numbered(3, 'Remplissez les informations :'),
    bullet('Identité : nom en arabe et en latin, date de naissance, genre'),
    bullet('Contact : adresse, téléphone, numéro de carte d\'identité nationale'),
    bullet('Classification : attribut (veuve, orphelin, personne âgée, handicapé, famille démunie, autre)'),
    bullet('Caisse : associez le bénéficiaire à un fonds et une sous-catégorie'),
    numbered(4, 'Validez pour enregistrer.'),
    spacer(),
    subheading('3.2 Ajouter des enfants'),
    numbered(1, 'Dans le formulaire d\'ajout/modification, cliquez sur "Ajouter un enfant".'),
    numbered(2, 'Saisissez pour chaque enfant : nom, prénom, date de naissance, genre, état de santé, niveau scolaire.'),
    numbered(3, 'Les enfants sont automatiquement liés au bénéficiaire.'),
    spacer(),
    subheading('3.3 Rechercher un bénéficiaire'),
    bullet('Utilisez la barre de recherche rapide (nom, carte d\'identité ou téléphone).'),
    bullet('Cliquez sur "Recherche avancée" pour filtrer par attribut, caisse, âge, nombre d\'enfants, situation, tranche d\'âge, niveau scolaire des enfants.'),
    bullet('Le bouton "Veuve avec plus d\'enfants" permet de trouver rapidement les familles nombreuses.'),
    spacer(),
    subheading('3.4 Consulter le détail et imprimer'),
    bullet('Cliquez sur un bénéficiaire dans le tableau pour ouvrir sa fiche détaillée.'),
    bullet('Vous y verrez : informations personnelles, enfants, dons reçus, montants décaissés, orientations médicales.'),
    bullet('Depuis cette fiche, vous pouvez imprimer sa carte ou son dossier complet.'),
    noteBox('La carte bénéficiaire imprimable inclut les informations essentielles et peut être plastifiée pour usage terrain.'),
    spacer(),
    subheading('3.5 Attributs personnalisés'),
    para('Vous pouvez créer, modifier et supprimer des attributs de classification depuis le gestionnaire d\'attributs. Chaque attribut peut être associé à plusieurs bénéficiaires. La modification du nom d\'un attribut migre automatiquement tous les bénéficiaires concernés.'),
    line(),
  ];
}

function frFinanceModule() {
  return [
    heading('4. Gestion Financière', HeadingLevel.HEADING_1),
    para('Le module financier couvre l\'ensemble des opérations comptables : transactions, comptes bancaires, allocations de dons.'),
    spacer(),
    subheading('4.1 Les caisses (fonds)'),
    numbered(1, 'Rendez-vous dans l\'onglet Caisses (menu latéral).'),
    numbered(2, 'Créez une caisse (ex: "Caisse Sociale", "Caisse Médicale", "Caisse Zakat").'),
    numbered(3, 'Ajoutez des sous-catégories pour affiner le suivi (ex: "Aide alimentaire" dans "Caisse Sociale").'),
    spacer(),
    subheading('4.2 Les comptes bancaires'),
    bullet('Dans l\'onglet Finances, gérez vos comptes bancaires (nom de la banque, numéro de compte, RIB, IBAN, SWIFT).'),
    bullet('Les soldes sont automatiquement mis à jour lors des transactions.'),
    spacer(),
    subheading('4.3 Créer une transaction'),
    numbered(1, 'Choisissez le type : Dépôt (Crédit) pour enregistrer un don ou un versement, Retrait (Débit) pour une dépense ou un décaissement.'),
    numbered(2, 'Sélectionnez la source : Banque ou Caisse physique.'),
    numbered(3, 'Sélectionnez la caisse (fonds) et la sous-catégorie.'),
    numbered(4, 'Saisissez le montant — il sera automatiquement converti en lettres (arabe et français).'),
    numbered(5, 'Associez éventuellement un donateur (pour les crédits) ou un bénéficiaire.'),
    numbered(6, 'Renseignez une description.'),
    numbered(7, 'Validez.'),
    spacer(),
    subheading('4.4 Transaction en attente (promesse de don)'),
    bullet('Cette case à cocher apparaît uniquement lorsqu\'un donateur fait un don à un bénéficiaire spécifique (crédit avec donateur + bénéficiaire).'),
    bullet('Une transaction en attente enregistre l\'argent dans la caisse mais peut être confirmée ou annulée ultérieurement.'),
    bullet('La confirmation d\'une transaction en attente avec bénéficiaire crée automatiquement une transaction de débit au bénéfice du bénéficiaire.'),
    spacer(),
    subheading('4.5 Allocation et distribution des dons'),
    bullet('Lorsqu\'un don est attribué à un bénéficiaire, une allocation est créée automatiquement.'),
    bullet('Vous pouvez suivre le montant restant à distribuer et effectuer des décaissements partiels en plusieurs fois.'),
    bullet('Le tableau des allocations permet de filtrer par donateur, bénéficiaire, caisse, montant, statut de la donation originale.'),
    spacer(),
    subheading('4.6 Journal des transactions'),
    bullet('Consultez l\'historique complet avec filtres : type, source, caisse, statut, plage de dates, plage de montants, recherche textuelle.'),
    bullet('Les statuts affichés : Complété, En attente (Lié à une promesse), Annulé, Partiellement distribué, Intégralement distribué.'),
    bullet('Pour chaque transaction : imprimez un reçu (reçu de don pour les crédits, bon de sortie pour les débite).'),
    spacer(),
    subheading('4.7 Confirmer ou annuler une transaction en attente'),
    bullet('Depuis la fenêtre de détail d\'une transaction, utilisez les boutons Confirmer ou Annuler.'),
    bullet('La confirmation d\'un crédit en attente crée un reçu de don et, si un bénéficiaire est associé, génère automatiquement le débit correspondant.'),
    bullet('L\'annulation d\'un crédit en attente reverse les fonds de la caisse.'),
    line(),
  ];
}

function frInventoryModule() {
  return [
    heading('5. Gestion du Stock et des Prêts', HeadingLevel.HEADING_1),
    subheading('5.1 Les articles'),
    numbered(1, 'Dans l\'onglet Stock, gérez vos articles (médicaments, fournitures scolaires, denrées alimentaires, etc.).'),
    numbered(2, 'Chaque article possède : un nom, une catégorie, un emplacement de stockage, une quantité, une quantité disponible, un statut.'),
    numbered(3, 'Créez des catégories et des emplacements depuis l\'onglet "Gestion des catégories".'),
    numbered(4, 'Les statuts d\'article disponibles : Disponible, En prêt, Endommagé, Hors service.'),
    bullet('Les statuts personnalisés peuvent être créés avec un indicateur "permanent" ou "temporaire".'),
    spacer(),
    subheading('5.2 Les prêts aux bénéficiaires'),
    bullet('Un prêt permet de confier temporairement des articles à un bénéficiaire.'),
    bullet('Créez un prêt en sélectionnant le bénéficiaire et les articles (avec quantités).'),
    bullet('Suivez le statut : En cours, Partiellement retourné, Retourné, Définitif.'),
    bullet('Gérez les retours partiels : chaque article peut être restitué en plusieurs fois, avec suivi de l\'état (condition) au moment du prêt et au retour.'),
    bullet('Transformez un prêt en don définitif si nécessaire (les articles ne seront pas rendus).'),
    spacer(),
    subheading('5.3 Gestion des catégories et emplacements'),
    bullet('Créez, modifiez et supprimez des catégories d\'articles.'),
    bullet('Gérez les emplacements de stockage (étagère, armoire, dépôt, etc.).'),
    bullet('Gérez les niveaux scolaires utilisés pour les enfants des bénéficiaires.'),
    line(),
  ];
}

function frMedicalModule() {
  return [
    heading('6. Orientation Médicale', HeadingLevel.HEADING_1),
    subheading('6.1 Créer une orientation'),
    numbered(1, 'Allez dans l\'onglet Orientation Médicale.'),
    numbered(2, 'Cliquez sur "Ajouter une orientation médicale".'),
    numbered(3, 'Remplissez :'),
    bullet('Bénéficiaire concerné'),
    bullet('Médecin traitant (choisi parmi ceux enregistrés)'),
    bullet('Type d\'analyse ou d\'examen médical'),
    bullet('Hôpital ou clinique'),
    bullet('Caisse et sous-catégorie'),
    bullet('Montant (ou laissez à zéro si le médecin déterminera le tarif)'),
    numbered(4, 'Imprimez l\'orientation — elle comporte une mention légale et les emplacements pour le cachet et la signature.'),
    spacer(),
    subheading('6.2 Confirmation et suivi'),
    bullet('Une orientation peut être confirmée avec un montant définitif. La confirmation déclenche la déduction automatique du montant depuis la caisse sélectionnée.'),
    bullet('Une orientation peut être annulée si elle n\'est plus valide.'),
    spacer(),
    subheading('6.3 Gestion des analyses et hôpitaux'),
    bullet('Depuis l\'onglet Paramètres ou le module médical, ajoutez les types d\'analyses médicales.'),
    bullet('Ajoutez les hôpitaux et cliniques partenaires.'),
    line(),
  ];
}

function frDoctorsModule() {
  return [
    heading('7. Gestion des Médecins', HeadingLevel.HEADING_1),
    subheading('7.1 Enregistrer un médecin'),
    numbered(1, 'Accédez à l\'onglet Médecins.'),
    numbered(2, 'Cliquez sur "Ajouter un médecin".'),
    numbered(3, 'Renseignez : nom, prénom, téléphone, email, adresse, spécialité médicale.'),
    spacer(),
    subheading('7.2 Spécialités médicales'),
    numbered(1, 'Depuis le module Médecins, gérez les spécialités (généraliste, pédiatre, ophtalmologue, etc.).'),
    numbered(2, 'Chaque médecin peut être associé à une spécialité.'),
    spacer(),
    subheading('7.3 Statistiques par médecin'),
    para('Pour chaque médecin, consultez :'),
    bullet('Nombre total d\'orientations reçues'),
    bullet('Orientations ce mois-ci, cette semaine, aujourd\'hui'),
    bullet('Date de la dernière orientation'),
    bullet('50 derniers bénéficiaires orientés vers ce médecin'),
    line(),
  ];
}

function frDonorsModule() {
  return [
    heading('8. Gestion des Donateurs', HeadingLevel.HEADING_1),
    subheading('8.1 Enregistrer un donateur'),
    numbered(1, 'Accédez à l\'onglet Donateurs.'),
    numbered(2, 'Cliquez sur "Ajouter un donateur".'),
    numbered(3, 'Renseignez : nom, prénom, téléphone, email, adresse, genre.'),
    numbered(4, 'Le code de référence est généré automatiquement.'),
    spacer(),
    subheading('8.2 Suivi des dons'),
    bullet('Consultez l\'historique complet des dons pour chaque donateur.'),
    bullet('Le montant total donné est calculé dynamiquement à partir des reçus de don.'),
    spacer(),
    subheading('8.3 Reçus de don'),
    bullet('Imprimez des reçus de don personnalisés avec montant en lettres (arabe et français).'),
    bullet('Chaque reçu inclut : numéro de reçu, donateur, montant, caisse, sous-catégorie, description, signatures.'),
    line(),
  ];
}

function frAnalyticsModule() {
  return [
    heading('9. Analyses et Rapports', HeadingLevel.HEADING_1),
    subheading('9.1 Filtres périodiques'),
    bullet('Consultez les données par : mois en cours, 3 derniers mois, année en cours, ou période personnalisée.'),
    spacer(),
    subheading('9.2 Indicateurs clés'),
    bullet('Revenus totaux (total des crédits sur la période)'),
    bullet('Dépenses totales (total des débits sur la période)'),
    bullet('Situation financière nette (revenus - dépenses)'),
    bullet('Ratio dépenses/revenus (critique > 85%, moyen 60-85%, excellent < 60%)'),
    spacer(),
    subheading('9.3 Graphiques et visualisations'),
    bullet('Évolution mensuelle des revenus et dépenses (graphique en bâtons)'),
    bullet('Comparaison des sources de financement (banque vs caisse physique)'),
    bullet('Répartition des flux de trésorerie (graphique en secteurs)'),
    spacer(),
    subheading('9.4 Analyses intelligentes et recommandations'),
    para('Le système génère automatiquement des alertes et recommandations :'),
    bullet('Alerte de dépenses excessives si le ratio dépenses/revenus dépasse 85%'),
    bullet('Alerte de déficit si une caisse spécifique est en situation critique'),
    bullet('Alerte de concentration des dons si un donateur représente plus de 50% des revenus'),
    bullet('Indice de vélocité des transactions'),
    bullet('Marge de sécurité financière'),
    spacer(),
    subheading('9.5 Rapport imprimable'),
    para('Générez un rapport A4 professionnel incluant tous les indicateurs, graphiques, et le journal des transactions détaillé de la période sélectionnée.'),
    line(),
  ];
}

function frUsersModule() {
  return [
    heading('10. Gestion des Utilisateurs', HeadingLevel.HEADING_1),
    warningBox('Ce module est accessible uniquement aux administrateurs.'),
    subheading('10.1 Onglets'),
    bullet('Utilisateurs — Liste de tous les utilisateurs avec nom, email, rôle, statut.'),
    bullet('Invitations en attente — Liste des invitations envoyées avec lien, date d\'expiration, statut.'),
    spacer(),
    subheading('10.2 Actions disponibles'),
    bullet('Inviter un utilisateur avec choix du rôle (Administrateur, Trésorier, Bénévole)'),
    bullet('Créer un utilisateur directement (sans invitation)'),
    bullet('Copier le lien d\'invitation'),
    bullet('Accepter ou rejeter un utilisateur en attente'),
    bullet('Promouvoir ou rétrograder le rôle d\'un utilisateur'),
    bullet('Supprimer un utilisateur ou une invitation'),
    line(),
  ];
}

function frSettingsModule() {
  return [
    heading('11. Paramètres de l\'Association', HeadingLevel.HEADING_1),
    para('Depuis le menu utilisateur > Paramètres, vous pouvez gérer :'),
    bullet('Nom de l\'association'),
    bullet('Langue par défaut (arabe, français, anglais) — affecte la direction de saisie des formulaires'),
    bullet('Logo de l\'association (URL)'),
    line(),
  ];
}

function frNotificationsModule() {
  return [
    heading('12. Notifications', HeadingLevel.HEADING_1),
    para('Le système de notifications intégré vous alerte en temps réel sur les événements importants :'),
    bullet('Notifications de transactions'),
    bullet('Alertes de stock et de prêts'),
    bullet('Mises à jour des orientations médicales'),
    bullet('Notifications systèmes'),
    para('Les notifications non lues sont affichées avec un compteur dans l\'interface.'),
    line(),
  ];
}

function frTechnicalModule() {
  return [
    heading('13. Informations Techniques', HeadingLevel.HEADING_1),
    subheading('13.1 Synchronisation en temps réel'),
    para('Les données sont synchronisées en temps réel via Socket.IO (en environnement local) ou via un polling automatique toutes les 15 secondes (sur Vercel). Toutes les pages et listes se mettent à jour automatiquement.'),
    spacer(),
    subheading('13.2 Mode hors-ligne'),
    para('L\'application utilise une base de données locale (IndexedDB) via Dexie.js. Les données sont accessibles même hors connexion, et la synchronisation s\'effectue automatiquement au retour de la connexion.'),
    spacer(),
    subheading('13.3 Sécurité'),
    bullet('Authentification sécurisée via JWT avec refresh token automatique'),
    bullet('Données isolées par association (multi-tenant)'),
    bullet('Contrôle d\'accès basé sur les rôles (admin, trésorier, utilisateur)'),
    bullet('Validation côté serveur pour toutes les opérations financières'),
    line(),
  ];
}

function frFaqModule() {
  return [
    heading('14. Foire Aux Questions (FAQ)', HeadingLevel.HEADING_1),
    subheading('Comment réinitialiser le mot de passe ?'),
    para('Contactez l\'administrateur de votre association pour la création d\'un nouveau lien d\'invitation.'),
    spacer(),
    subheading('Les données sont-elles sauvegardées ?'),
    para('Oui, toutes les données sont stockées en base de données PostgreSQL (Neon) et synchronisées en temps réel.'),
    spacer(),
    subheading('Puis-je utiliser l\'application en arabe ?'),
    para('Oui, l\'interface complète est disponible en arabe, français et anglais avec support RTL complet.'),
    spacer(),
    subheading('Comment imprimer un reçu ou une carte ?'),
    para('Chaque module propose des boutons d\'impression dédiés :'),
    bullet('Finances → Reçus de don et bons de sortie'),
    bullet('Bénéficiaires → Carte bénéficiaire et dossier complet'),
    bullet('Orientation médicale → Orientation imprimable'),
    bullet('Analyses → Rapport A4 complet'),
    spacer(),
    subheading('Comment exporter les données ?'),
    para('Utilisez le module Analyses > Rapport imprimable pour générer un document A4 complet avec tous les indicateurs.'),
    spacer(),
    subheading('Puis-je annuler une transaction ?'),
    para('Oui, une transaction en attente peut être confirmée ou annulée. Une transaction complétée ne peut pas être annulée.'),
    spacer(),
    line(),
    spacer(200),
    new Paragraph({
      children: [new TextRun({ text: 'NEXUS CONSEIL & EXCELLENCE (NCE)', bold: true, size: 24, color: C.primary, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Dirigé par Mr BAGUENANE', size: 20, color: C.muted, font: 'Calibri', italics: true })],
      alignment: AlignmentType.CENTER,
    }),
  ];
}

// ────────────────────────────────────────────────────────────────
// ENGLISH VERSION
// ────────────────────────────────────────────────────────────────

function enCoverPage() {
  return [
    spacer(600),
    new Paragraph({
      children: [new TextRun({ text: 'NEXUS CONSEIL & EXCELLENCE', bold: true, size: 56, color: C.primary, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '(NCE)', bold: true, size: 40, color: C.accent, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    line(),
    new Paragraph({
      children: [new TextRun({ text: 'USER MANUAL', bold: true, size: 44, color: C.primary, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Charitable Association Management Platform', size: 32, color: C.muted, font: 'Calibri', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Version 1.0 — July 2026', size: 24, color: C.muted, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Directed by Mr BAGUENANE', size: 24, color: C.text, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new PageBreak(),
  ];
}

function enGeneralIntro() {
  return [
    heading('General Introduction', HeadingLevel.HEADING_1),
    para('NCE is a comprehensive management platform designed specifically for charitable associations. It allows you to manage all your activities within a single tool, simply and securely.'),
    para('This manual guides you step by step through every functional module of the application.'),
    spacer(),
    heading('Application Structure', HeadingLevel.HEADING_2),
    para('The application is organized into modules accessible from the sidebar menu:'),
    bullet('Dashboard — Overview of key performance indicators'),
    bullet('Analytics & Reports — Statistics and financial charts'),
    bullet('Finance — Transactions, bank accounts, allocations'),
    bullet('Funds (Caisses) — Fund management with sub-categories'),
    bullet('Beneficiaries — People being helped'),
    bullet('Donors — Donor management and receipts'),
    bullet('Stock & Loans — Articles, inventory and loan management'),
    bullet('Medical Referral — Referrals to doctors and hospitals'),
    bullet('Doctors — Partner doctor directory'),
    bullet('User Management — Account administration (admin only)'),
    line(),
  ];
}

function enAuthModule() {
  return [
    heading('1. Getting Started — Authentication & Setup', HeadingLevel.HEADING_1),
    subheading('1.1 Create your association'),
    numbered(1, 'Go to the application and sign in with your Google account.'),
    numbered(2, 'If you are the first user, enter your association name (Arabic and Latin).'),
    numbered(3, 'You automatically become administrator of the association.'),
    spacer(),
    subheading('1.2 Invite team members'),
    numbered(1, 'From the User Management menu, click "Invite User".'),
    numbered(2, 'Choose their role: Administrator, Treasurer or Volunteer.'),
    numbered(3, 'Copy the generated invitation link and share it.'),
    numbered(4, 'The link expires after the set period.'),
    warningBox('Only administrators can invite, change roles, or delete users.'),
    spacer(),
    subheading('1.3 Email/password login'),
    para('You can also create an account with email and password via the registration page. Google authentication remains available as an alternative.'),
    spacer(),
    subheading('1.4 Change language'),
    bullet('Click your avatar at the bottom of the sidebar.'),
    bullet('Select العربية (Arabic), English, or Français (French).'),
    bullet('Your choice is saved for future visits.'),
    noteBox('The full interface is available in Arabic (RTL), French, and English. Form input direction automatically adapts to the selected language.'),
    spacer(),
    subheading('1.5 Association settings'),
    para('From the user menu > Association Settings, you can modify:'),
    bullet('Association name'),
    bullet('Default language (Arabic/French/English)'),
    bullet('Association logo'),
    line(),
  ];
}

function enDashboardModule() {
  return [
    heading('2. Dashboard', HeadingLevel.HEADING_1),
    para('The dashboard is the home page of the application. It provides an instant overview of your association\'s activity.'),
    spacer(),
    subheading('2.1 Key indicators'),
    bullet('Total bank balance — Sum of all bank account balances'),
    bullet('Total cash balance — Sum of all fund (caisse) balances'),
    bullet('Total registered beneficiaries'),
    bullet('Total donors'),
    bullet('Total articles in stock'),
    bullet('Active loans'),
    spacer(),
    subheading('2.2 Fund balances'),
    para('A table displays the detailed balance of each fund (caisse).'),
    spacer(),
    subheading('2.3 Recent transactions'),
    para('The last 10 transactions are displayed with type (deposit/withdrawal), status (completed/pending/cancelled), amount, donor and beneficiary.'),
    line(),
  ];
}

function enBeneficiariesModule() {
  return [
    heading('3. Managing Beneficiaries', HeadingLevel.HEADING_1),
    para('The beneficiary module is the heart of the system. Every person helped by your association is registered as a beneficiary.'),
    spacer(),
    subheading('3.1 Add a beneficiary'),
    numbered(1, 'Click the Beneficiaries tab in the sidebar.'),
    numbered(2, 'Click "Add Beneficiary".'),
    numbered(3, 'Fill in the information:'),
    bullet('Identity: name in Arabic and Latin, date of birth, gender'),
    bullet('Contact: address, phone, national ID card number'),
    bullet('Classification: attribute (widow, orphan, elderly, disabled, needy family, other)'),
    bullet('Fund: link the beneficiary to a fund and sub-category'),
    numbered(4, 'Submit to save.'),
    spacer(),
    subheading('3.2 Add children'),
    numbered(1, 'In the add/edit form, click "Add Child".'),
    numbered(2, 'Enter for each child: first name, last name, date of birth, gender, health status, school grade.'),
    numbered(3, 'Children are automatically linked to the beneficiary.'),
    spacer(),
    subheading('3.3 Search for a beneficiary'),
    bullet('Use the quick search bar (name, ID card or phone).'),
    bullet('Click "Advanced Search" to filter by attribute, fund, age, number of children, situation, age range, children\'s school grade.'),
    bullet('The "Widow with most children" button quickly finds large families.'),
    spacer(),
    subheading('3.4 View details and print'),
    bullet('Click a beneficiary in the table to open their detailed profile.'),
    bullet('See: personal info, children, received donations, disbursed amounts, medical referrals.'),
    bullet('From this profile, you can print their card or full file.'),
    noteBox('The printable beneficiary card includes essential information and can be laminated for field use.'),
    spacer(),
    subheading('3.5 Custom attributes'),
    para('You can create, edit and delete classification attributes from the Attribute Manager. Each attribute can be associated with multiple beneficiaries. Renaming an attribute automatically migrates all linked beneficiaries.'),
    line(),
  ];
}

function enFinanceModule() {
  return [
    heading('4. Financial Management', HeadingLevel.HEADING_1),
    para('The financial module covers all accounting operations: transactions, bank accounts, donation allocations.'),
    spacer(),
    subheading('4.1 Funds (Caisses)'),
    numbered(1, 'Go to the Funds tab in the sidebar.'),
    numbered(2, 'Create a fund (e.g., "Social Fund", "Medical Fund", "Zakat Fund").'),
    numbered(3, 'Add sub-categories for detailed tracking.'),
    spacer(),
    subheading('4.2 Bank accounts'),
    bullet('In the Finance tab, manage your bank accounts (bank name, account number, RIB, IBAN, SWIFT).'),
    bullet('Balances update automatically with transactions.'),
    spacer(),
    subheading('4.3 Create a transaction'),
    numbered(1, 'Choose the type: Deposit (Credit) to record a donation or payment, Withdrawal (Debit) for an expense or disbursement.'),
    numbered(2, 'Select the source: Bank or Physical cash.'),
    numbered(3, 'Select the fund and sub-category.'),
    numbered(4, 'Enter the amount — it will be automatically converted to words (Arabic and French).'),
    numbered(5, 'Optionally link a donor (for credits) or a beneficiary.'),
    numbered(6, 'Enter a description.'),
    numbered(7, 'Submit.'),
    spacer(),
    subheading('4.4 Pending transaction (donation promise)'),
    bullet('This checkbox only appears when a donor gives to a specific beneficiary (credit with donor + beneficiary).'),
    bullet('A pending transaction records money into the fund but can be confirmed or cancelled later.'),
    bullet('Confirming a pending transaction with a beneficiary automatically creates a debit transaction for the beneficiary.'),
    spacer(),
    subheading('4.5 Donation allocation and distribution'),
    bullet('When a donation is assigned to a beneficiary, an allocation is automatically created.'),
    bullet('Track the remaining amount to distribute and make partial disbursements over time.'),
    bullet('The allocations table can be filtered by donor, beneficiary, fund, amount, original donation status.'),
    spacer(),
    subheading('4.6 Transaction log'),
    bullet('View the complete history with filters: type, source, fund, status, date range, amount range, text search.'),
    bullet('Displayed statuses: Completed, Pending (Pledged), Cancelled, Partially disbursed, Fully disbursed.'),
    bullet('For each transaction: print a receipt (donation receipt for credits, expense slip for debits).'),
    spacer(),
    subheading('4.7 Confirm or cancel a pending transaction'),
    bullet('From the transaction detail window, use the Confirm or Cancel buttons.'),
    bullet('Confirming a pending credit creates a donation receipt and, if a beneficiary is linked, automatically generates the corresponding debit.'),
    bullet('Cancelling a pending credit reverses the funds from the fund.'),
    line(),
  ];
}

function enInventoryModule() {
  return [
    heading('5. Inventory and Loan Management', HeadingLevel.HEADING_1),
    subheading('5.1 Articles'),
    numbered(1, 'In the Stock tab, manage your articles (medications, school supplies, food items, etc.).'),
    numbered(2, 'Each article has: name, category, storage location, quantity, available quantity, status.'),
    numbered(3, 'Create categories and locations from the "Category Management" tab.'),
    numbered(4, 'Available article statuses: Available, On loan, Damaged, Out of service.'),
    bullet('Custom statuses can be created with a "permanent" or "temporary" indicator.'),
    spacer(),
    subheading('5.2 Beneficiary loans'),
    bullet('A loan temporarily gives articles to a beneficiary.'),
    bullet('Create a loan by selecting the beneficiary and articles (with quantities).'),
    bullet('Track status: Ongoing, Partially returned, Returned, Definitive.'),
    bullet('Manage partial returns: each item can be returned in batches, with condition tracking at loan and return time.'),
    bullet('Convert a loan to a permanent donation if needed (items will not be returned).'),
    spacer(),
    subheading('5.3 Category and location management'),
    bullet('Create, edit and delete article categories.'),
    bullet('Manage storage locations (shelf, cabinet, warehouse, etc.).'),
    bullet('Manage school grades used for beneficiary children.'),
    line(),
  ];
}

function enMedicalModule() {
  return [
    heading('6. Medical Referral', HeadingLevel.HEADING_1),
    subheading('6.1 Create a referral'),
    numbered(1, 'Go to the Medical Referral tab.'),
    numbered(2, 'Click "Add Medical Referral".'),
    numbered(3, 'Fill in:'),
    bullet('The beneficiary'),
    bullet('The treating doctor'),
    bullet('Analysis or examination type'),
    bullet('Hospital or clinic'),
    bullet('Fund and sub-category'),
    bullet('Amount (leave at zero if the doctor sets the fee)'),
    numbered(4, 'Print the referral — it includes a legal disclaimer and stamp/signature spaces.'),
    spacer(),
    subheading('6.2 Confirmation and tracking'),
    bullet('A referral can be confirmed with a final amount. Confirmation triggers automatic deduction from the selected fund.'),
    bullet('A referral can be cancelled if no longer valid.'),
    spacer(),
    subheading('6.3 Manage analyses and hospitals'),
    bullet('From Settings or the medical module, add medical analysis types.'),
    bullet('Add partner hospitals and clinics.'),
    line(),
  ];
}

function enDoctorsModule() {
  return [
    heading('7. Managing Doctors', HeadingLevel.HEADING_1),
    subheading('7.1 Register a doctor'),
    numbered(1, 'Go to the Doctors tab.'),
    numbered(2, 'Click "Add Doctor".'),
    numbered(3, 'Enter: first name, last name, phone, email, address, medical specialty.'),
    spacer(),
    subheading('7.2 Medical specialties'),
    numbered(1, 'From the Doctors module, manage specialties (general practitioner, pediatrician, ophthalmologist, etc.).'),
    numbered(2, 'Each doctor can be linked to a specialty.'),
    spacer(),
    subheading('7.3 Doctor statistics'),
    para('For each doctor, view:'),
    bullet('Total referrals received'),
    bullet('Referrals this month, this week, today'),
    bullet('Date of last referral'),
    bullet('Last 50 beneficiaries referred to this doctor'),
    line(),
  ];
}

function enDonorsModule() {
  return [
    heading('8. Managing Donors', HeadingLevel.HEADING_1),
    subheading('8.1 Register a donor'),
    numbered(1, 'Go to the Donors tab.'),
    numbered(2, 'Click "Add Donor".'),
    numbered(3, 'Enter: first name, last name, phone, email, address, gender.'),
    numbered(4, 'The reference code is automatically generated.'),
    spacer(),
    subheading('8.2 Donation tracking'),
    bullet('View the complete donation history for each donor.'),
    bullet('The total donated amount is calculated dynamically from donation receipts.'),
    spacer(),
    subheading('8.3 Donation receipts'),
    bullet('Print personalized donation receipts with amounts in words (Arabic and French).'),
    bullet('Each receipt includes: receipt number, donor, amount, fund, sub-category, description, signatures.'),
    line(),
  ];
}

function enAnalyticsModule() {
  return [
    heading('9. Analytics and Reports', HeadingLevel.HEADING_1),
    subheading('9.1 Period filters'),
    bullet('View data by: current month, last 3 months, current year, or custom period.'),
    spacer(),
    subheading('9.2 Key indicators'),
    bullet('Total income (total credits for the period)'),
    bullet('Total expenses (total debits for the period)'),
    bullet('Net financial position (income - expenses)'),
    bullet('Expense-to-income ratio (critical > 85%, average 60-85%, excellent < 60%)'),
    spacer(),
    subheading('9.3 Charts and visualizations'),
    bullet('Monthly income and expense evolution (bar chart)'),
    bullet('Funding source comparison (bank vs physical cash)'),
    bullet('Cash flow distribution (pie chart)'),
    spacer(),
    subheading('9.4 Smart analytics and recommendations'),
    para('The system automatically generates alerts and recommendations:'),
    bullet('Excessive spending alert if expense ratio exceeds 85%'),
    bullet('Deficit alert if a specific fund is in critical situation'),
    bullet('Donation concentration alert if one donor represents over 50% of income'),
    bullet('Transaction velocity index'),
    bullet('Financial safety margin'),
    spacer(),
    subheading('9.5 Printable report'),
    para('Generate a professional A4 report including all indicators, charts, and the detailed transaction log for the selected period.'),
    line(),
  ];
}

function enUsersModule() {
  return [
    heading('10. User Management', HeadingLevel.HEADING_1),
    warningBox('This module is only accessible to administrators.'),
    subheading('10.1 Tabs'),
    bullet('Users — List of all users with name, email, role, status.'),
    bullet('Pending invitations — List of sent invitations with link, expiry date, status.'),
    spacer(),
    subheading('10.2 Available actions'),
    bullet('Invite a user with role selection (Administrator, Treasurer, Volunteer)'),
    bullet('Create a user directly (without invitation)'),
    bullet('Copy invitation link'),
    bullet('Accept or reject a pending user'),
    bullet('Promote or demote a user\'s role'),
    bullet('Delete a user or invitation'),
    line(),
  ];
}

function enSettingsModule() {
  return [
    heading('11. Association Settings', HeadingLevel.HEADING_1),
    para('From the user menu > Settings, you can manage:'),
    bullet('Association name'),
    bullet('Default language (Arabic, French, English) — affects form input direction'),
    bullet('Association logo (URL)'),
    line(),
  ];
}

function enNotificationsModule() {
  return [
    heading('12. Notifications', HeadingLevel.HEADING_1),
    para('The built-in notification system alerts you in real-time about important events:'),
    bullet('Transaction notifications'),
    bullet('Stock and loan alerts'),
    bullet('Medical referral updates'),
    bullet('System notifications'),
    para('Unread notifications are displayed with a counter in the interface.'),
    line(),
  ];
}

function enTechnicalModule() {
  return [
    heading('13. Technical Information', HeadingLevel.HEADING_1),
    subheading('13.1 Real-time synchronization'),
    para('Data is synchronized in real-time via Socket.IO (local environment) or automatic polling every 15 seconds (on Vercel). All pages and lists update automatically.'),
    spacer(),
    subheading('13.2 Offline mode'),
    para('The application uses a local database (IndexedDB) via Dexie.js. Data is accessible even offline, and synchronization happens automatically when connectivity returns.'),
    spacer(),
    subheading('13.3 Security'),
    bullet('Secure authentication via JWT with automatic token refresh'),
    bullet('Data isolated per association (multi-tenant)'),
    bullet('Role-based access control (admin, treasurer, user)'),
    bullet('Server-side validation for all financial operations'),
    line(),
  ];
}

function enFaqModule() {
  return [
    heading('14. Frequently Asked Questions (FAQ)', HeadingLevel.HEADING_1),
    subheading('How do I reset my password?'),
    para('Contact your association administrator for a new invitation link.'),
    spacer(),
    subheading('Is my data backed up?'),
    para('Yes, all data is stored in a PostgreSQL database (Neon) and synced in real-time.'),
    spacer(),
    subheading('Can I use the app in Arabic?'),
    para('Yes, the full interface is available in Arabic, French and English with full RTL support.'),
    spacer(),
    subheading('How do I print a receipt or card?'),
    para('Each module has dedicated print buttons:'),
    bullet('Finance → Donation receipts and expense slips'),
    bullet('Beneficiaries → Beneficiary card and full file'),
    bullet('Medical referral → Printable referral form'),
    bullet('Analytics → Complete A4 report'),
    spacer(),
    subheading('How do I export data?'),
    para('Use Analytics > Printable report to generate a complete A4 document with all indicators.'),
    spacer(),
    subheading('Can I cancel a transaction?'),
    para('Yes, a pending transaction can be confirmed or cancelled. A completed transaction cannot be cancelled.'),
    spacer(),
    line(),
    spacer(200),
    new Paragraph({
      children: [new TextRun({ text: 'NEXUS CONSEIL & EXCELLENCE (NCE)', bold: true, size: 24, color: C.primary, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Directed by Mr BAGUENANE', size: 20, color: C.muted, font: 'Calibri', italics: true })],
      alignment: AlignmentType.CENTER,
    }),
  ];
}

// ────────────────────────────────────────────────────────────────
// ARABIC VERSION
// ────────────────────────────────────────────────────────────────

const AR = true;

function arCoverPage() {
  return [
    spacer(600),
    new Paragraph({
      children: [new TextRun({ text: 'NEXUS CONSEIL & EXCELLENCE', bold: true, size: 56, color: C.primary, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '(NCE)', bold: true, size: 40, color: C.accent, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    line(),
    new Paragraph({
      children: [new TextRun({ text: 'دليل المستخدم', bold: true, size: 44, color: C.primary, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'منصة إدارة الجمعيات الخيرية', size: 32, color: C.muted, font: 'Arial', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'الإصدار 1.0 — يوليو 2026', size: 24, color: C.muted, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'بإدارة السيد بغنين', size: 24, color: C.text, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new PageBreak(),
  ];
}

function arGeneralIntro() {
  return [
    heading('مقدمة عامة', HeadingLevel.HEADING_1, C.primary, AR),
    para('NCE هي منصة إدارة متكاملة صُممت خصيصاً للجمعيات الخيرية. تتيح لك إدارة جميع أنشطتك في أداة واحدة، بكل سهولة وأمان.', { rtl: AR }),
    para('يرشدك هذا الدليل خطوة بخطوة في التعامل مع كل وحدة وظيفية من التطبيق.', { rtl: AR }),
    spacer(),
    heading('هيكل التطبيق', HeadingLevel.HEADING_2, C.primary, AR),
    para('التطبيق منظم في وحدات يمكن الوصول إليها من القائمة الجانبية:', { rtl: AR }),
    bullet('لوحة التحكم — نظرة عامة على مؤشرات الأداء الرئيسية', AR),
    bullet('التحليلات والتقارير — إحصائيات ورسوم بيانية مالية', AR),
    bullet('المالية — المعاملات، الحسابات البنكية، التخصيصات', AR),
    bullet('الصناديق — إدارة الصناديق والفئات الفرعية', AR),
    bullet('المستفيدون — إدارة الأشخاص الذين يتم مساعدتهم', AR),
    bullet('المتبرعون — إدارة المتبرعين والإيصالات', AR),
    bullet('المخزون والإعارات — المواد والمخزون وإدارة الإعارات', AR),
    bullet('التوجيه الطبي — التوجيهات إلى الأطباء والمستشفيات', AR),
    bullet('الأطباء — دليل الأطباء الشركاء', AR),
    bullet('إدارة المستخدمين — إدارة الحسابات (للمدير فقط)', AR),
    line(),
  ];
}

function arAuthModule() {
  return [
    heading('1. الخطوات الأولى — تسجيل الدخول والإعداد', HeadingLevel.HEADING_1, C.primary, AR),
    subheading('1.1 إنشاء جمعيتك', AR),
    numbered(1, 'انتقل إلى التطبيق وسجل الدخول باستخدام حساب Google الخاص بك.', AR),
    numbered(2, 'إذا كنت أول مستخدم، أدخل اسم جمعيتك (بالعربية واللاتينية).', AR),
    numbered(3, 'تصبح تلقائياً مديراً للجمعية.', AR),
    spacer(),
    subheading('1.2 دعوة المتعاونين', AR),
    numbered(1, 'من قائمة إدارة المستخدمين، انقر على "دعوة مستخدم".', AR),
    numbered(2, 'اختر دوره: مدير، أمين مال، متطوع.', AR),
    numbered(3, 'انسخ رابط الدعوة الذي تم إنشاؤه وشاركه مع الشخص المعني.', AR),
    numbered(4, 'تنتهي صلاحية الرابط تلقائياً بعد المدة المحددة.', AR),
    warningBox('فقط المدير يمكنه دعوة أو تغيير أدوار أو حذف المستخدمين.', AR),
    spacer(),
    subheading('1.3 تسجيل الدخول بالبريد الإلكتروني وكلمة المرور', AR),
    para('يمكنك أيضاً إنشاء حساب بالبريد الإلكتروني وكلمة المرور عبر صفحة التسجيل. يبقى تسجيل الدخول عبر Google متاحاً كبديل.', { rtl: AR }),
    spacer(),
    subheading('1.4 تغيير اللغة', AR),
    bullet('انقر على صورتك الرمزية أسفل الشريط الجانبي.', AR),
    bullet('اختر العربية أو English (الإنجليزية) أو Français (الفرنسية).', AR),
    bullet('يتم حفظ اختيارك لزياراتك القادمة.', AR),
    noteBox('الواجهة الكاملة متاحة بالعربية (RTL) والفرنسية والإنجليزية. يتكيف اتجاه الإدخال في النماذج تلقائياً مع اللغة المختارة.', AR),
    spacer(),
    subheading('1.5 إعدادات الجمعية', AR),
    para('من قائمة المستخدم > إعدادات الجمعية، يمكنك تعديل:', { rtl: AR }),
    bullet('اسم الجمعية', AR),
    bullet('اللغة الافتراضية (العربية/الفرنسية/الإنجليزية)', AR),
    bullet('شعار الجمعية', AR),
    line(),
  ];
}

function arDashboardModule() {
  return [
    heading('2. لوحة التحكم', HeadingLevel.HEADING_1, C.primary, AR),
    para('لوحة التحكم هي الصفحة الرئيسية للتطبيق. تمنحك نظرة عامة فورية على نشاط جمعيتك.', { rtl: AR }),
    spacer(),
    subheading('2.1 المؤشرات الرئيسية', AR),
    bullet('إجمالي الرصيد البنكي — مجموع أرصدة جميع الحسابات البنكية', AR),
    bullet('إجمالي النقد — مجموع أرصدة جميع الصناديق', AR),
    bullet('إجمالي عدد المستفيدين المسجلين', AR),
    bullet('إجمالي عدد المتبرعين', AR),
    bullet('إجمالي عدد المواد في المخزون', AR),
    bullet('الإعارات النشطة', AR),
    spacer(),
    subheading('2.2 أرصدة الصناديق', AR),
    para('جدول يوضح الرصيد التفصيلي لكل صندوق من صناديق الجمعية.', { rtl: AR }),
    spacer(),
    subheading('2.3 المعاملات الأخيرة', AR),
    para('آخر 10 معاملات معروضة مع نوعها (إيداع/سحب) وحالتها (مكتمل/معلق/ملغي) والمبلغ والمتبرع والمستفيد المرتبطين.', { rtl: AR }),
    line(),
  ];
}

function arBeneficiariesModule() {
  return [
    heading('3. إدارة المستفيدين', HeadingLevel.HEADING_1, C.primary, AR),
    para('وحدة المستفيدين هي قلب النظام. كل شخص تساعدهم جمعيتك يتم تسجيله كمستفيد.', { rtl: AR }),
    spacer(),
    subheading('3.1 إضافة مستفيد', AR),
    numbered(1, 'انقر على علامة تبويب المستفيدون في الشريط الجانبي.', AR),
    numbered(2, 'انقر على زر "إضافة مستفيد".', AR),
    numbered(3, 'املأ المعلومات:', AR),
    bullet('الهوية: الاسم بالعربية واللاتينية، تاريخ الميلاد، الجنس', AR),
    bullet('جهات الاتصال: العنوان، الهاتف، رقم البطاقة الوطنية', AR),
    bullet('التصنيف: الصفة (أرملة، يتيم، شخص مسن، معاق، عائلة معوزة، أخرى)', AR),
    bullet('الصندوق: اربط المستفيد بصندوق وفئة فرعية', AR),
    numbered(4, 'قم بالتأكيد للحفظ.', AR),
    spacer(),
    subheading('3.2 إضافة الأطفال', AR),
    numbered(1, 'في نموذج الإضافة/التعديل، انقر على "إضافة طفل".', AR),
    numbered(2, 'أدخل لكل طفل: الاسم، تاريخ الميلاد، الجنس، الحالة الصحية، المستوى الدراسي.', AR),
    numbered(3, 'يتم ربط الأطفال تلقائياً بالمستفيد.', AR),
    spacer(),
    subheading('3.3 البحث عن مستفيد', AR),
    bullet('استخدم شريط البحث السريع (الاسم، رقم البطاقة أو الهاتف).', AR),
    bullet('انقر على "بحث متقدم" للتصفية حسب الصفة، الصندوق، العمر، عدد الأطفال، الحالة، الفئة العمرية، المستوى الدراسي للأطفال.', AR),
    bullet('زر "أرملة بأكثر أطفال" يساعد في العثور بسرعة على الأسر الكبيرة.', AR),
    spacer(),
    subheading('3.4 عرض التفاصيل والطباعة', AR),
    bullet('انقر على مستفيد في الجدول لفتح ملفه التفصيلي.', AR),
    bullet('ستظهر: معلوماته الشخصية، أطفاله، تبرعاته الواردة، المبالغ المصروفة، توجيهاته الطبية.', AR),
    bullet('من هذا الملف، يمكنك طباعة بطاقته أو ملفه الكامل.', AR),
    noteBox('بطاقة المستفيد القابلة للطباعة تتضمن المعلومات الأساسية ويمكن تغليفها للاستخدام الميداني.', AR),
    spacer(),
    subheading('3.5 الصفات المخصصة', AR),
    para('يمكنك إنشاء وتعديل وحذف صفات التصنيف من مدير الصفات. يمكن ربط كل صفة بعدة مستفيدين. يؤدي تغيير اسم الصفة إلى ترحيل تلقائي لجميع المستفيدين المرتبطين.', { rtl: AR }),
    line(),
  ];
}

function arFinanceModule() {
  return [
    heading('4. الإدارة المالية', HeadingLevel.HEADING_1, C.primary, AR),
    para('تغطي الوحدة المالية جميع العمليات المحاسبية: المعاملات، الحسابات البنكية، تخصيصات التبرعات.', { rtl: AR }),
    spacer(),
    subheading('4.1 الصناديق', AR),
    numbered(1, 'انتقل إلى علامة تبويب الصناديق في الشريط الجانبي.', AR),
    numbered(2, 'أنشئ صندوقاً (مثال: "الصندوق الاجتماعي"، "الصندوق الطبي"، "صندوق الزكاة").', AR),
    numbered(3, 'أضف فئات فرعية لتحسين المتابعة.', AR),
    spacer(),
    subheading('4.2 الحسابات البنكية', AR),
    bullet('في علامة تبويب المالية، قم بإدارة حساباتك البنكية (اسم البنك، رقم الحساب، RIB، IBAN، SWIFT).', AR),
    bullet('يتم تحديث الأرصدة تلقائياً عند إجراء المعاملات.', AR),
    spacer(),
    subheading('4.3 إنشاء معاملة', AR),
    numbered(1, 'اختر النوع: إيداع (دائن) لتسجيل تبرع أو إيداع، سحب (مدين) لتسجيل مصروف.', AR),
    numbered(2, 'اختر المصدر: بنك أو صندوق نقدي.', AR),
    numbered(3, 'اختر الصندوق والفئة الفرعية.', AR),
    numbered(4, 'أدخل المبلغ — سيتم تحويله تلقائياً إلى أحرف (عربية وفرنسية).', AR),
    numbered(5, 'يمكنك ربط متبرع (للدائن) أو مستفيد.', AR),
    numbered(6, 'أدخل وصفاً.', AR),
    numbered(7, 'قم بالتأكيد.', AR),
    spacer(),
    subheading('4.4 معاملة معلقة (وعد تبرع)', AR),
    bullet('تظهر خانة الاختيار هذه فقط عندما يتبرع متبرع لمستفيد معين (دائن مع متبرع + مستفيد).', AR),
    bullet('المعاملة المعلقة تسجل الأموال في الصندوق ويمكن تأكيدها أو إلغاؤها لاحقاً.', AR),
    bullet('تأكيد معاملة معلقة مع مستفيد ينشئ تلقائياً معاملة مدينة لصالح المستفيد.', AR),
    spacer(),
    subheading('4.5 تخصيص وتوزيع التبرعات', AR),
    bullet('عند تخصيص تبرع لمستفيد، يتم إنشاء تخصيص تلقائياً.', AR),
    bullet('يمكنك متابعة المبلغ المتبقي للتوزيع وإجراء صرف جزئي على عدة مرات.', AR),
    bullet('جدول التخصيصات يمكن تصفيته حسب المتبرع، المستفيد، الصندوق، المبلغ، حالة التبرع الأصلي.', AR),
    spacer(),
    subheading('4.6 سجل المعاملات', AR),
    bullet('اطلع على التاريخ الكامل مع مرشحات: النوع، المصدر، الصندوق، الحالة، نطاق التاريخ، نطاق المبلغ، بحث نصي.', AR),
    bullet('الحالات المعروضة: مكتمل، معلق (مرتبط بوعد)، ملغي، موزع جزئياً، موزع بالكامل.', AR),
    bullet('لكل معاملة: اطبع إيصالاً (إيصال تبرع للدائن، سند صرف للمدين).', AR),
    spacer(),
    subheading('4.7 تأكيد أو إلغاء معاملة معلقة', AR),
    bullet('من نافذة تفاصيل المعاملة، استخدم أزرار تأكيد أو إلغاء.', AR),
    bullet('تأكيد دائن معلق ينشئ إيصال تبرع، وإذا كان هناك مستفيد مرتبط، يُنشئ تلقائياً المدين المقابل.', AR),
    bullet('إلغاء دائن معلق يعكس الأموال من الصندوق.', AR),
    line(),
  ];
}

function arInventoryModule() {
  return [
    heading('5. إدارة المخزون والإعارات', HeadingLevel.HEADING_1, C.primary, AR),
    subheading('5.1 المواد', AR),
    numbered(1, 'في علامة تبويب المخزون، قم بإدارة موادك (أدوية، لوازم مدرسية، مواد غذائية، إلخ).', AR),
    numbered(2, 'كل مادة لها: اسم، تصنيف، موقع تخزين، كمية، كمية متاحة، حالة.', AR),
    numbered(3, 'أنشئ تصنيفات ومواقع تخزين من علامة تبويب "إدارة التصنيفات".', AR),
    numbered(4, 'حالات المواد المتاحة: متاح، معار، تالف، خارج الخدمة.', AR),
    bullet('يمكن إنشاء حالات مخصصة مع مؤشر "دائم" أو "مؤقت".', AR),
    spacer(),
    subheading('5.2 إعارات المستفيدين', AR),
    bullet('الإعارة تتيح إعطاء مواد لمستفيد بشكل مؤقت.', AR),
    bullet('أنشئ إعارة باختيار المستفيد والمواد مع الكميات.', AR),
    bullet('تتبع الحالة: جاري، مرتجع جزئياً، مرتجع، نهائي.', AR),
    bullet('إدارة الإرجاع الجزئي: يمكن إرجاع كل مادة على دفعات مع تتبع الحالة وقت الإعارة وعند الإرجاع.', AR),
    bullet('حول الإعارة إلى هبة دائمة إذا لزم الأمر (لن يتم إرجاع المواد).', AR),
    spacer(),
    subheading('5.3 إدارة التصنيفات والمواقع', AR),
    bullet('إنشاء وتعديل وحذف تصنيفات المواد.', AR),
    bullet('إدارة مواقع التخزين (رف، خزانة، مستودع، إلخ).', AR),
    bullet('إدارة المستويات الدراسية المستخدمة لأطفال المستفيدين.', AR),
    line(),
  ];
}

function arMedicalModule() {
  return [
    heading('6. التوجيه الطبي', HeadingLevel.HEADING_1, C.primary, AR),
    subheading('6.1 إنشاء توجيه', AR),
    numbered(1, 'انتقل إلى علامة تبويب التوجيه الطبي.', AR),
    numbered(2, 'انقر على "إضافة توجيه طبي".', AR),
    numbered(3, 'املأ:', AR),
    bullet('المستفيد المعني', AR),
    bullet('الطبيب المعالج (مختار من بين الأطباء المسجلين)', AR),
    bullet('نوع التحليل أو الفحص الطبي', AR),
    bullet('المستشفى أو العيادة', AR),
    bullet('الصندوق والفئة الفرعية', AR),
    bullet('المبلغ (أو اتركه صفراً إذا كان الطبيب سيحدد السعر)', AR),
    numbered(4, 'اطبع التوجيه — يتضمن إخلاء مسؤولية قانوني ومواقع للختم والتوقيع.', AR),
    spacer(),
    subheading('6.2 التأكيد والمتابعة', AR),
    bullet('يمكن تأكيد التوجيه بمبلغ نهائي. التأكيد يؤدي إلى خصم تلقائي من الصندوق المحدد.', AR),
    bullet('يمكن إلغاء التوجيه إذا لم يعد صالحاً.', AR),
    spacer(),
    subheading('6.3 إدارة التحاليل والمستشفيات', AR),
    bullet('من الإعدادات أو الوحدة الطبية، أضف أنواع التحاليل الطبية.', AR),
    bullet('أضف المستشفيات والعيادات الشريكة.', AR),
    line(),
  ];
}

function arDoctorsModule() {
  return [
    heading('7. إدارة الأطباء', HeadingLevel.HEADING_1, C.primary, AR),
    subheading('7.1 تسجيل طبيب', AR),
    numbered(1, 'انتقل إلى علامة تبويب الأطباء.', AR),
    numbered(2, 'انقر على "إضافة طبيب".', AR),
    numbered(3, 'أدخل: الاسم، اللقب، الهاتف، البريد الإلكتروني، العنوان، التخصص الطبي.', AR),
    spacer(),
    subheading('7.2 التخصصات الطبية', AR),
    numbered(1, 'من وحدة الأطباء، قم بإدارة التخصصات (طبيب عام، طبيب أطفال، طبيب عيون، إلخ).', AR),
    numbered(2, 'يمكن ربط كل طبيب بتخصص.', AR),
    spacer(),
    subheading('7.3 إحصائيات الطبيب', AR),
    para('لكل طبيب، يمكنك الاطلاع على:', { rtl: AR }),
    bullet('إجمالي عدد التوجيهات المستلمة', AR),
    bullet('التوجيهات هذا الشهر، هذا الأسبوع، اليوم', AR),
    bullet('تاريخ آخر توجيه', AR),
    bullet('آخر 50 مستفيداً تم توجيههم لهذا الطبيب', AR),
    line(),
  ];
}

function arDonorsModule() {
  return [
    heading('8. إدارة المتبرعين', HeadingLevel.HEADING_1, C.primary, AR),
    subheading('8.1 تسجيل متبرع', AR),
    numbered(1, 'انتقل إلى علامة تبويب المتبرعين.', AR),
    numbered(2, 'انقر على "إضافة متبرع".', AR),
    numbered(3, 'أدخل: الاسم، اللقب، الهاتف، البريد الإلكتروني، العنوان، الجنس.', AR),
    numbered(4, 'يتم إنشاء رمز المرجع تلقائياً.', AR),
    spacer(),
    subheading('8.2 متابعة التبرعات', AR),
    bullet('اطلع على التاريخ الكامل للتبرعات لكل متبرع.', AR),
    bullet('يتم حساب إجمالي المبلغ المتبرع به ديناميكياً من إيصالات التبرع.', AR),
    spacer(),
    subheading('8.3 إيصالات التبرع', AR),
    bullet('اطبع إيصالات تبرع مخصصة مع المبلغ بالحروف (عربية وفرنسية).', AR),
    bullet('كل إيصال يتضمن: رقم الإيصال، المتبرع، المبلغ، الصندوق، الفئة الفرعية، الوصف، التوقيعات.', AR),
    line(),
  ];
}

function arAnalyticsModule() {
  return [
    heading('9. التحليلات والتقارير', HeadingLevel.HEADING_1, C.primary, AR),
    subheading('9.1 تصفية الفترات', AR),
    bullet('اطلع على البيانات حسب: الشهر الحالي، آخر 3 أشهر، السنة الحالية، أو فترة مخصصة.', AR),
    spacer(),
    subheading('9.2 المؤشرات الرئيسية', AR),
    bullet('إجمالي المداخيل (مجموع الدائنون للفترة)', AR),
    bullet('إجمالي المصاريف (مجموع المدينون للفترة)', AR),
    bullet('الوضع المالي الصافي (المداخيل - المصاريف)', AR),
    bullet('نسبة المصاريف إلى المداخيل (حرج > 85%، متوسط 60-85%، ممتاز < 60%)', AR),
    spacer(),
    subheading('9.3 الرسوم البيانية', AR),
    bullet('التطور الشهري للمداخيل والمصاريف (رسم بياني أعمدة)', AR),
    bullet('مقارنة مصادر التمويل (بنك مقابل صندوق نقدي)', AR),
    bullet('توزيع التدفقات النقدية (رسم بياني دائري)', AR),
    spacer(),
    subheading('9.4 تحليلات ذكية وتوصيات', AR),
    para('يولد النظام تلقائياً تنبيهات وتوصيات:', { rtl: AR }),
    bullet('تنبيه الإنفاق المفرط إذا تجاوزت نسبة المصاريف 85%', AR),
    bullet('تنبيه العجز إذا كان صندوق معين في وضع حرج', AR),
    bullet('تنبيه تركيز التبرعات إذا كان متبرع واحد يمثل أكثر من 50% من المداخيل', AR),
    bullet('مؤشر سرعة المعاملات', AR),
    bullet('هامش الأمان المالي', AR),
    spacer(),
    subheading('9.5 تقرير قابل للطباعة', AR),
    para('قم بإنشاء تقرير A4 احترافي يتضمن جميع المؤشرات والرسوم البيانية وسجل المعاملات المفصل للفترة المحددة.', { rtl: AR }),
    line(),
  ];
}

function arUsersModule() {
  return [
    heading('10. إدارة المستخدمين', HeadingLevel.HEADING_1, C.primary, AR),
    warningBox('هذه الوحدة متاحة فقط للمديرين.', AR),
    subheading('10.1 الألسنة', AR),
    bullet('المستخدمون — قائمة جميع المستخدمين مع الاسم والبريد الإلكتروني والدور والحالة.', AR),
    bullet('الدعوات المعلقة — قائمة الدعوات المرسلة مع الرابط وتاريخ انتهاء الصلاحية والحالة.', AR),
    spacer(),
    subheading('10.2 الإجراءات المتاحة', AR),
    bullet('دعوة مستخدم مع اختيار الدور (مدير، أمين مال، متطوع)', AR),
    bullet('إنشاء مستخدم مباشرة (بدون دعوة)', AR),
    bullet('نسخ رابط الدعوة', AR),
    bullet('قبول أو رفض مستخدم معلق', AR),
    bullet('ترقية أو تخفيض دور مستخدم', AR),
    bullet('حذف مستخدم أو دعوة', AR),
    line(),
  ];
}

function arSettingsModule() {
  return [
    heading('11. إعدادات الجمعية', HeadingLevel.HEADING_1, C.primary, AR),
    para('من قائمة المستخدم > الإعدادات، يمكنك إدارة:', { rtl: AR }),
    bullet('اسم الجمعية', AR),
    bullet('اللغة الافتراضية (العربية، الفرنسية، الإنجليزية) — تؤثر على اتجاه إدخال النماذج', AR),
    bullet('شعار الجمعية (رابط URL)', AR),
    line(),
  ];
}

function arNotificationsModule() {
  return [
    heading('12. الإشعارات', HeadingLevel.HEADING_1, C.primary, AR),
    para('نظام الإشعارات المدمج ينبهك في الوقت الفعلي للأحداث المهمة:', { rtl: AR }),
    bullet('إشعارات المعاملات', AR),
    bullet('تنبيهات المخزون والإعارات', AR),
    bullet('تحديثات التوجيه الطبي', AR),
    bullet('إشعارات النظام', AR),
    para('يتم عرض الإشعارات غير المقروءة مع عداد في الواجهة.', { rtl: AR }),
    line(),
  ];
}

function arTechnicalModule() {
  return [
    heading('13. معلومات تقنية', HeadingLevel.HEADING_1, C.primary, AR),
    subheading('13.1 المزامنة في الوقت الفعلي', AR),
    para('يتم مزامنة البيانات في الوقت الفعلي عبر Socket.IO (في البيئة المحلية) أو عبر استقصاء تلقائي كل 15 ثانية (على Vercel). يتم تحديث جميع الصفحات والقوائم تلقائياً.', { rtl: AR }),
    spacer(),
    subheading('13.2 وضع عدم الاتصال', AR),
    para('يستخدم التطبيق قاعدة بيانات محلية (IndexedDB) عبر Dexie.js. البيانات متاحة حتى عند عدم الاتصال، وتتم المزامنة تلقائياً عند عودة الاتصال.', { rtl: AR }),
    spacer(),
    subheading('13.3 الأمان', AR),
    bullet('مصادقة آمنة عبر JWT مع تحديث تلقائي للرمز', AR),
    bullet('بيانات معزولة لكل جمعية (متعدد المستأجرين)', AR),
    bullet('التحكم في الوصول يعتمد على الأدوار (مدير، أمين مال، مستخدم)', AR),
    bullet('التحقق من صحة الخادم لجميع العمليات المالية', AR),
    line(),
  ];
}

function arFaqModule() {
  return [
    heading('14. الأسئلة المتكررة', HeadingLevel.HEADING_1, C.primary, AR),
    subheading('كيف يمكنني إعادة تعيين كلمة المرور؟', AR),
    para('اتصل بمسؤول جمعيتك لإنشاء رابط دعوة جديد.', { rtl: AR }),
    spacer(),
    subheading('هل البيانات محفوظة؟', AR),
    para('نعم، جميع البيانات مخزنة في قاعدة بيانات PostgreSQL (Neon) ويتم مزامنتها في الوقت الفعلي.', { rtl: AR }),
    spacer(),
    subheading('هل يمكنني استخدام التطبيق بالعربية؟', AR),
    para('نعم، الواجهة الكاملة متاحة بالعربية والفرنسية والإنجليزية مع دعم كامل للاتجاه من اليمين إلى اليسار (RTL).', { rtl: AR }),
    spacer(),
    subheading('كيف أطبع إيصالاً أو بطاقة؟', AR),
    para('كل وحدة توفر أزرار طباعة مخصصة:', { rtl: AR }),
    bullet('المالية → إيصالات التبرع وسندات الصرف', AR),
    bullet('المستفيدون → بطاقة المستفيد والملف الكامل', AR),
    bullet('التوجيه الطبي → نموذج توجيه قابل للطباعة', AR),
    bullet('التحليلات → تقرير A4 كامل', AR),
    spacer(),
    subheading('كيف أصدر البيانات؟', AR),
    para('استخدم التحليلات > تقرير قابل للطباعة لإنشاء مستند A4 كامل بجميع المؤشرات.', { rtl: AR }),
    spacer(),
    subheading('هل يمكنني إلغاء معاملة؟', AR),
    para('نعم، يمكن تأكيد أو إلغاء معاملة معلقة. لا يمكن إلغاء معاملة مكتملة.', { rtl: AR }),
    spacer(),
    line(),
    spacer(200),
    new Paragraph({
      children: [new TextRun({ text: 'NEXUS CONSEIL & EXCELLENCE (NCE)', bold: true, size: 24, color: C.primary, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: 'بإدارة السيد بغنين', size: 20, color: C.muted, font: 'Arial', italics: true })],
      alignment: AlignmentType.CENTER,
    }),
  ];
}

// ────────────────────────────────────────────────────────────────
// DOCUMENT BUILDERS
// ────────────────────────────────────────────────────────────────

async function buildFrenchDoc() {
  const sections = [
    ...frCoverPage(),
    ...frGeneralIntro(),
    ...frAuthModule(),
    ...frDashboardModule(),
    ...frBeneficiariesModule(),
    ...frFinanceModule(),
    ...frInventoryModule(),
    ...frMedicalModule(),
    ...frDoctorsModule(),
    ...frDonorsModule(),
    ...frAnalyticsModule(),
    ...frUsersModule(),
    ...frSettingsModule(),
    ...frNotificationsModule(),
    ...frTechnicalModule(),
    ...frFaqModule(),
  ];

  const doc = new Document({
    title: 'NCE - Guide Utilisateur',
    description: 'Guide complet du système de gestion associative NCE',
    creator: 'NEXUS CONSEIL & EXCELLENCE',
    styles: {
      paragraphStyles: [],
    },
    sections: [{ children: sections }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = '/home/mourad/Documents/DOCUMENTATION_UTILISATEUR_FR.docx';
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ ${outPath}  (${(buffer.length / 1024).toFixed(0)} KB)`);
}

async function buildEnglishDoc() {
  const sections = [
    ...enCoverPage(),
    ...enGeneralIntro(),
    ...enAuthModule(),
    ...enDashboardModule(),
    ...enBeneficiariesModule(),
    ...enFinanceModule(),
    ...enInventoryModule(),
    ...enMedicalModule(),
    ...enDoctorsModule(),
    ...enDonorsModule(),
    ...enAnalyticsModule(),
    ...enUsersModule(),
    ...enSettingsModule(),
    ...enNotificationsModule(),
    ...enTechnicalModule(),
    ...enFaqModule(),
  ];

  const doc = new Document({
    title: 'NCE - User Manual',
    description: 'Complete user manual for NCE association management system',
    creator: 'NEXUS CONSEIL & EXCELLENCE',
    sections: [{ children: sections }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = '/home/mourad/Documents/USER_MANUAL_EN.docx';
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ ${outPath}  (${(buffer.length / 1024).toFixed(0)} KB)`);
}

async function buildArabicDoc() {
  const sections = [
    ...arCoverPage(),
    ...arGeneralIntro(),
    ...arAuthModule(),
    ...arDashboardModule(),
    ...arBeneficiariesModule(),
    ...arFinanceModule(),
    ...arInventoryModule(),
    ...arMedicalModule(),
    ...arDoctorsModule(),
    ...arDonorsModule(),
    ...arAnalyticsModule(),
    ...arUsersModule(),
    ...arSettingsModule(),
    ...arNotificationsModule(),
    ...arTechnicalModule(),
    ...arFaqModule(),
  ];

  const doc = new Document({
    title: 'NCE - دليل المستخدم',
    description: 'دليل المستخدم الكامل لنظام إدارة الجمعيات NCE',
    creator: 'NEXUS CONSEIL & EXCELLENCE',
    sections: [{ children: sections }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = '/home/mourad/Documents/دليل_المستخدم_AR.docx';
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ ${outPath}  (${(buffer.length / 1024).toFixed(0)} KB)`);
}

// ── RUN ──────────────────────────────────────────────────────────
(async () => {
  console.log('\n📄 Génération des documents Word...\n');
  await buildFrenchDoc();
  await buildEnglishDoc();
  await buildArabicDoc();
  console.log('\n🎉 Tous les documents ont été générés avec succès !');
  console.log('📁 Emplacement : /home/mourad/Documents/\n');
})();
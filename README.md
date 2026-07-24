
<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0" />
  <img src="https://img.shields.io/badge/license-Private-red.svg" alt="License Private" />
  <img src="https://img.shields.io/badge/i18n-ar%20%7C%20fr%20%7C%20en-green.svg" alt="i18n: ar | fr | en" />
</p>

<h1 align="center">🕌 NEXUS CONSEIL & EXCELLENCE (NCE)</h1>
<h3 align="center">Système de Gestion Intégré pour Associations Caritatives</h3>
<h3 align="center">نظام إدارة شامل للجمعيات الخيرية</h3>
<h3 align="center">Integrated Management System for Charitable Associations</h3>

<br />

---

# 🇫🇷 Présentation Générale — Français

**NEXUS CONSEIL & EXCELLENCE (NCE)** est une plateforme SaaS de gestion associative complète, développée pour répondre aux besoins spécifiques des associations caritatives. Elle offre une solution intégrée couvrant l'ensemble des processus métier : gestion des bénéficiaires, des donateurs, des finances, du stock, des orientations médicales, et des utilisateurs — le tout dans un environnement multi-tenant sécurisé.

Construite avec **React + TypeScript** (frontend) et **Express + Prisma + PostgreSQL** (backend), la plateforme supporte **trois langues** (Arabe, Français, Anglais) avec un affichage RTL adaptatif.

---

## 🎯 Fonctionnalités

### 🔐 Authentification & Gestion des Utilisateurs

| Fonctionnalité | Description |
|---|---|
| **Création d'association** | Un premier utilisateur crée son association (nom arabe + latin) et devient administrateur |
| **Connexion Google OAuth** | Authentification simplifiée via compte Google |
| **Connexion Email/Mot de passe** | Authentification JWT classique avec refresh token automatique |
| **Système d'invitation** | Génération de liens d'invitation avec rôle prédéfini (admin, trésorier, bénévole) et expiration |
| **Contrôle d'accès par rôles** | Trois niveaux : administrateur (accès total), trésorier (finances + analyses), bénévole (accès limité) |
| **Gestion des utilisateurs** | Approbation, rejet, promotion, rétrogradation et suppression des membres |
| **Paramètres de l'association** | Modification du nom et du logo depuis le menu utilisateur |

### 👥 Gestion des Bénéficiaires

| Fonctionnalité | Description |
|---|---|
| **CRUD complet** | Ajout, modification, suppression et consultation des bénéficiaires |
| **Fiche détaillée** | Nom (arabe + latin), adresse, téléphone, carte d'identité, date de naissance, genre |
| **Classification** | Attributs personnalisables : veuve, orphelin, personne âgée, handicapé, famille démunie |
| **Gestion des enfants** | Chaque bénéficiaire peut avoir plusieurs enfants avec suivi santé et niveau scolaire |
| **Recherche avancée** | Filtres par attribut, caisse, genre, âge, nombre d'enfants, situation, recherche textuelle |
| **Recherche dédiée** | Bouton "Veuve avec plus d'enfants" avec filtrage par âge des enfants |
| **Impression** | Carte de bénéficiaire et dossier complet imprimables (A4) |
| **Historique financier** | Dons reçus, montants décaissés par caisse |
| **Suivi médical** | Orientations médicales liées au bénéficiaire |

### 💰 Gestion Financière

| Fonctionnalité | Description |
|---|---|
| **Comptes bancaires** | Gestion des comptes (RIB, IBAN, SWIFT) avec soldes |
| **Caisses (fonds)** | Caisses personnalisables avec sous-catégories et soldes automatiques |
| **Transactions crédit/débit** | Enregistrement des dépôts et retraits avec conversion automatique en lettres (arabe + français) |
| **Statuts de transaction** | En attente, confirmé, annulé — avec impact sur les soldes |
| **Distribution des dons** | Allocation des donations aux bénéficiaires avec suivi des montants restants |
| **Décaissement partiel** | Possibilité de décaisser partiellement un don en plusieurs fois |
| **Journal des transactions** | Recherche avec filtres par type, statut, source, caisse, période et montant |
| **Indicateurs financiers** | Statistiques agrégées et soldes en temps réel |

### 📦 Gestion du Stock et des Prêts

| Fonctionnalité | Description |
|---|---|
| **Articles et inventaire** | Gestion des articles avec catégorie, emplacement, quantité, statut |
| **Catégories d'articles** | Création et gestion des catégories (médical, scolaire, alimentaire, etc.) |
| **Emplacements de stockage** | Gestion des lieux de stockage |
| **Statuts personnalisés** | Types de statuts avec indicateur de péremption |
| **Prêts aux bénéficiaires** | Création de prêts liant un bénéficiaire à plusieurs articles |
| **Retour partiel** | Retour des articles par lots avec suivi des quantités restituées |
| **Prêt définitif** | Conversion d'un prêt en don définitif d'articles |
| **Ajout/Retrait d'articles** | Modification des prêts en cours |

### 🏥 Orientation Médicale

| Fonctionnalité | Description |
|---|---|
| **CRUD des orientations** | Création et suivi des orientations médicales |
| **Fiche complète** | Bénéficiaire, médecin, analyse, hôpital, montant, date |
| **Enfants accompagnants** | Ajout d'enfants bénéficiaires à une orientation |
| **Gestion des analyses** | Types d'analyses et examens médicaux personnalisables |
| **Gestion des hôpitaux** | Établissements de santé partenaires |
| **Impression** | Document d'orientation imprimable avec mention légale, signature du président et cachet |
| **Confirmation** | Saisie du montant réel après consultation médicale |
| **Statistiques** | Suivi des orientations par période |

### 👨‍⚕️ Gestion des Médecins

| Fonctionnalité | Description |
|---|---|
| **CRUD des médecins** | Fiche complète : nom, coordonnées, spécialité, adresse |
| **Spécialités** | Gestion des spécialités médicales avec compteur de médecins |
| **Statistiques avancées** | Nombre de patients, tendances mensuelles/hebdomadaires, dernière orientation |
| **Historique** | 50 derniers bénéficiaires orientés par médecin |
| **Recherche multicritère** | Par nom, téléphone, adresse, spécialité |

### 📊 Analyses et Rapports

| Fonctionnalité | Description |
|---|---|
| **KPIs financiers** | Revenus, dépenses, position nette, ratio dépenses/revenus |
| **Filtres périodiques** | Mois en cours, 3 derniers mois, année en cours, dates personnalisées |
| **Évolution mensuelle** | Graphique comparatif revenus/dépenses par mois |
| **Sources de financement** | Comparaison banque vs caisse |
| **Répartition par caisse** | Flux financier détaillé par fonds |
| **Analyses intelligentes** | Alertes de dépassement, détection de déficits, concentration des donateurs, vélocité des transactions |
| **Journal détaillé** | Journal de bord complet, filtrable et exportable |
| **Rapport imprimable** | Génération de rapport A4 professionnel |

### 📋 Fonctionnalités Transverses

| Fonctionnalité | Description |
|---|---|
| **Multi-langues** | Arabe, Français, Anglais — avec sélecteur dans l'interface |
| **Support RTL** | Affichage adaptatif droite-à-gauche pour l'arabe |
| **Impression** | Reçus, cartes, rapports, orientations — formats A4 et carte |
| **Synchronisation temps réel** | Socket.IO en local, polling sur Vercel |
| **Interface responsive** | Adaptation mobile, tablette et desktop |
| **Sécurité** | JWT, refresh tokens, contrôle d'accès par rôle |
| **Multi-tenant** | Chaque association voit uniquement ses données |

---

## 🛠️ Stack Technique

| Couche | Technologie |
|---|---|
| **Frontend** | React 19 + TypeScript, Vite 8, Tailwind CSS v4 |
| **UI Library** | shadcn/ui (Radix primitives) |
| **Backend** | Express 5 + TypeScript |
| **Base de données** | PostgreSQL via Prisma ORM (Neon Serverless) |
| **État serveur** | TanStack React Query v5 |
| **Stockage local** | Dexie.js (IndexedDB) |
| **Authentification** | JWT, Google OAuth, bcrypt |
| **i18n** | i18next, react-i18next |
| **Socket** | Socket.IO (temps réel) |
| **Déploiement** | Vercel (frontend + serverless API) |

---

## 🌐 Variables d'Environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL (Neon Serverless) |
| `JWT_SECRET` | Clé secrète pour les tokens d'accès JWT |
| `JWT_REFRESH_SECRET` | Clé secrète pour les refresh tokens |
| `FRONTEND_URL` | URL du frontend (utilisée pour CORS) |
| `GOOGLE_CLIENT_ID` | ID Client Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Secret Client Google OAuth |
| `PORT` | Port du serveur (défaut: 3001) |

---

# 🇬🇧 English Overview

**NEXUS CONSEIL & EXCELLENCE (NCE)** is a comprehensive SaaS platform for charity association management, designed to meet the specific needs of charitable organizations. It provides an end-to-end solution covering beneficiaries, donors, finances, inventory, medical referrals, and user management — all within a secure multi-tenant environment.

Built with **React + TypeScript** (frontend) and **Express + Prisma + PostgreSQL** (backend), the platform supports **three languages** (Arabic, French, English) with adaptive RTL display.

---

## 🎯 Features

### 🔐 Authentication & User Management

| Feature | Description |
|---|---|
| **Association Creation** | First user creates their association (Arabic + Latin name) and becomes admin |
| **Google OAuth Login** | Simplified authentication via Google account |
| **Email/Password Login** | Standard JWT authentication with auto-refresh token |
| **Invite System** | Shareable invitation links with predefined roles (admin, treasurer, volunteer) and expiry |
| **Role-Based Access Control** | Three levels: admin (full access), treasurer (finance + analytics), volunteer (limited access) |
| **User Management** | Approve, reject, promote, demote and remove members |
| **Association Settings** | Update name and logo from the user menu |

### 👥 Beneficiary Management

| Feature | Description |
|---|---|
| **Full CRUD** | Create, edit, delete and view beneficiaries |
| **Detailed Profile** | Name (Arabic + Latin), address, phone, ID card, date of birth, gender |
| **Classification** | Customizable attributes: widow, orphan, elderly, disabled, needy family |
| **Children Management** | Each beneficiary can have multiple children with health and school tracking |
| **Advanced Search** | Filters by attribute, fund, gender, age, children count, status, text search |
| **Dedicated Search** | "Widow with most children" button with child age filtering |
| **Printing** | Printable beneficiary card and full dossier (A4) |
| **Financial History** | Received donations, disbursed amounts by fund |
| **Medical Follow-up** | Linked medical referrals |

### 💰 Financial Management

| Feature | Description |
|---|---|
| **Bank Accounts** | Account management (RIB, IBAN, SWIFT) with balances |
| **Funds (Caisses)** | Customizable funds with sub-categories and automatic balance updates |
| **Credit/Debit Transactions** | Deposit and withdrawal recording with auto-conversion to Arabic + French words |
| **Transaction Statuses** | Pending, confirmed, cancelled — with balance impact |
| **Donation Distribution** | Allocate donations to beneficiaries with remaining amount tracking |
| **Partial Disbursement** | Disburse a donation partially across multiple operations |
| **Transaction Log** | Search with filters by type, status, source, fund, period and amount |
| **Financial Indicators** | Aggregated statistics and real-time balances |

### 📦 Inventory & Loan Management

| Feature | Description |
|---|---|
| **Article Management** | Inventory items with category, location, quantity, status |
| **Article Categories** | Category management (medical, school, food, etc.) |
| **Storage Locations** | Location management |
| **Custom Statuses** | Custom status types with expiry indicator |
| **Beneficiary Loans** | Loans linking a beneficiary to multiple articles |
| **Partial Return** | Batch item returns with quantity tracking |
| **Definitive Loan** | Convert a loan to a permanent donation of articles |
| **Add/Remove Items** | Modify active loans |

### 🏥 Medical Referral

| Feature | Description |
|---|---|
| **Referral CRUD** | Create and track medical referrals |
| **Full Details** | Beneficiary, doctor, analysis, hospital, amount, date |
| **Accompanying Children** | Add beneficiary children to a referral |
| **Analysis Types** | Customizable analysis and examination types |
| **Hospitals** | Partner healthcare facility management |
| **Printing** | Printable referral document with legal disclaimer, president signature and stamp |
| **Confirmation** | Enter actual amount after medical consultation |
| **Statistics** | Referral tracking by period |

### 👨‍⚕️ Doctor Management

| Feature | Description |
|---|---|
| **Doctor CRUD** | Full profile: name, contact info, specialty, address |
| **Specialties** | Medical specialty management with doctor counters |
| **Advanced Statistics** | Patient count, monthly/weekly trends, last referral |
| **History** | Last 50 beneficiaries referred per doctor |
| **Multi-criteria Search** | By name, phone, address, specialty |

### 📊 Analytics & Reports

| Feature | Description |
|---|---|
| **Financial KPIs** | Income, expenses, net position, expense-to-income ratio |
| **Period Filters** | Current month, last 3 months, current year, custom dates |
| **Monthly Evolution** | Income/expenses comparison chart by month |
| **Funding Sources** | Bank vs cash comparison |
| **Fund Distribution** | Detailed cash flow by fund |
| **Smart Analytics** | Overspending alerts, deficit detection, donor concentration, transaction velocity |
| **Detailed Log** | Complete, filterable and exportable transaction log |
| **Printable Report** | Professional A4 report generation |

### 📋 Cross-cutting Features

| Feature | Description |
|---|---|
| **Multi-language** | Arabic, French, English — with built-in selector |
| **RTL Support** | Adaptive right-to-left display for Arabic |
| **Printing** | Receipts, cards, reports, referrals — A4 and card formats |
| **Real-time Sync** | Socket.IO locally, polling on Vercel |
| **Responsive UI** | Mobile, tablet and desktop adaptation |
| **Security** | JWT, refresh tokens, role-based access control |
| **Multi-tenant** | Each association sees only its own data |

---

# 🇸🇦 العربية — نظرة عامة

**NEXUS CONSEIL & EXCELLENCE (NCE)** هي منصة SaaS متكاملة لإدارة الجمعيات الخيرية، صُممت لتلبية الاحتياجات الخاصة للجمعيات والمؤسسات الخيرية. تقدم المنصة حلاً شاملاً يغطي جميع العمليات الأساسية: إدارة المستفيدين، المتبرعين، المالية، المخزون، التوجيه الطبي، والمستخدمين — كل ذلك في بيئة متعددة المستأجرين آمنة.

بُنيت المنصة باستخدام **React + TypeScript** (واجهة أمامية) و **Express + Prisma + PostgreSQL** (واجهة خلفية)، وتدعم **ثلاث لغات** (العربية، الفرنسية، الإنجليزية) مع عرض متكيف من اليمين إلى اليسار.

---

## 🎯 المميزات

### 🔐 المصادقة وإدارة المستخدمين

| الميزة | الوصف |
|---|---|
| **إنشاء جمعية** | أول مستخدم ينشئ جمعيته (اسم بالعربية واللاتينية) ويصبح مديراً |
| **تسجيل الدخول بـ Google** | مصادقة مبسطة عبر حساب Google |
| **تسجيل الدخول بالبريد الإلكتروني** | مصادقة JWT قياسية مع تجديد تلقائي للرمز |
| **نظام الدعوات** | روابط دعوة قابلة للمشاركة بأدوار محددة مسبقاً (مدير، أمين مال، متطوع) مع صلاحية محددة |
| **التحكم بالوصول حسب الدور** | ثلاثة مستويات: مدير (وصول كامل)، أمين مال (المالية + التحليلات)، متطوع (وصول محدود) |
| **إدارة المستخدمين** | قبول، رفض، ترقية، تخفيض وحذف الأعضاء |
| **إعدادات الجمعية** | تعديل الاسم والشعار من قائمة المستخدم |

### 👥 إدارة المستفيدين

| الميزة | الوصف |
|---|---|
| **إدارة كاملة** | إضافة، تعديل، حذف وعرض المستفيدين |
| **ملف شخصي مفصل** | الاسم (عربية + لاتينية)، العنوان، الهاتف، البطاقة الوطنية، تاريخ الميلاد، الجنس |
| **التصنيف** | صفات مخصصة: أرملة، يتيم، شخص مسن، معاق، عائلة معوزة |
| **إدارة الأطفال** | كل مستفيد يمكنه إضافة أطفال مع متابعة صحية ومستوى دراسي |
| **بحث متقدم** | تصفية حسب الصفة، الصندوق، الجنس، العمر، عدد الأطفال، الحالة، بحث نصي |
| **بحث مخصص** | زر "أرملة بأكثر أطفال" مع تصفية حسب أعمار الأطفال |
| **الطباعة** | بطاقة مستفيد وملف كامل قابل للطباعة (A4) |
| **السجل المالي** | التبرعات الواردة والمبالغ المصروفة حسب الصندوق |
| **المتابعة الطبية** | التوجيهات الطبية المرتبطة بالمستفيد |

### 💰 الإدارة المالية

| الميزة | الوصف |
|---|---|
| **الحسابات البنكية** | إدارة الحسابات (RIB، IBAN، SWIFT) مع الأرصدة |
| **الصناديق** | صناديق مخصصة مع فئات فرعية وأرصدة آلية |
| **معاملات دائنة/مدينة** | تسجيل الإيداعات والسحوبات مع تحويل تلقائي إلى أحرف (عربية + فرنسية) |
| **حالات المعاملات** | معلقة، مؤكدة، ملغية — مع التأثير على الأرصدة |
| **توزيع التبرعات** | تخصيص التبرعات للمستفيدين مع متابعة المبالغ المتبقية |
| **الصرف الجزئي** | إمكانية صرف التبرع جزئياً على عدة عمليات |
| **سجل المعاملات** | بحث مع تصفية حسب النوع، الحالة، المصدر، الصندوق، الفترة والمبلغ |
| **المؤشرات المالية** | إحصائيات مجمعة وأرصدة في الوقت الفعلي |

### 📦 إدارة المخزون والإعارات

| الميزة | الوصف |
|---|---|
| **إدارة المواد** | مواد المخزون مع التصنيف، الموقع، الكمية، الحالة |
| **تصنيفات المواد** | إدارة التصنيفات (طبي، مدرسي، غذائي، إلخ) |
| **مواقع التخزين** | إدارة أماكن التخزين |
| **حالات مخصصة** | أنواع حالات مع مؤشر الصلاحية |
| **إعارات المستفيدين** | إعارات تربط مستفيداً بعدة مواد |
| **الإرجاع الجزئي** | إرجاع المواد على دفعات مع تتبع الكميات |
| **الإعارة النهائية** | تحويل الإعارة إلى هبة دائمة للمواد |
| **إضافة/إزالة مواد** | تعديل الإعارات النشطة |

### 🏥 التوجيه الطبي

| الميزة | الوصف |
|---|---|
| **إدارة التوجيهات** | إنشاء ومتابعة التوجيهات الطبية |
| **بيانات كاملة** | المستفيد، الطبيب، التحليل، المستشفى، المبلغ، التاريخ |
| **الأطفال المرافقون** | إضافة أطفال مستفيدين إلى التوجيه |
| **إدارة التحاليل** | أنواع التحاليل والفحوصات الطبية المخصصة |
| **إدارة المستشفيات** | إدارة المؤسسات الصحية الشريكة |
| **الطباعة** | وثيقة توجيه قابلة للطباعة مع إخلاء مسؤولية وتوقيع الرئيس والختم |
| **التأكيد** | إدخال المبلغ الفعلي بعد الاستشارة الطبية |
| **الإحصائيات** | متابعة التوجيهات حسب الفترة |

### 👨‍⚕️ إدارة الأطباء

| الميزة | الوصف |
|---|---|
| **إدارة الأطباء** | ملف كامل: الاسم، معلومات الاتصال، التخصص، العنوان |
| **التخصصات** | إدارة التخصصات الطبية مع عداد الأطباء |
| **إحصائيات متقدمة** | عدد المرضى، اتجاهات شهرية/أسبوعية، آخر توجيه |
| **السجل** | آخر 50 مستفيداً تم توجيههم لكل طبيب |
| **بحث متعدد المعايير** | بالاسم، الهاتف، العنوان، التخصص |

### 📊 التحليلات والتقارير

| الميزة | الوصف |
|---|---|
| **مؤشرات الأداء المالي** | المداخيل، المصاريف، الصافي المالي، معدل المصاريف إلى المداخيل |
| **تصفية الفترات** | الشهر الحالي، آخر 3 أشهر، السنة الحالية، تواريخ مخصصة |
| **التطور الشهري** | رسم بياني مقارن للمداخيل والمصاريف شهرياً |
| **مصادر التمويل** | مقارنة البنك مقابل الصندوق النقدي |
| **توزيع الصناديق** | التدفق المالي المفصل حسب الصناديق |
| **تحليلات ذكية** | تنبيهات التجاوز، كشف العجز، تركيز المتبرعين، سرعة المعاملات |
| **سجل مفصل** | سجل كامل قابل للتصفية والتصدير |
| **تقرير قابل للطباعة** | إنشاء تقرير احترافي بصيغة A4 |

### 📋 الميزات العرضانية

| الميزة | الوصف |
|---|---|
| **متعدد اللغات** | العربية، الفرنسية، الإنجليزية — مع منتقي لغة مدمج |
| **دعم RTL** | عرض متكيف من اليمين إلى اليسار للعربية |
| **الطباعة** | أوصال، بطاقات، تقارير، توجيهات — بصيغ A4 وبطاقة |
| **المزامنة الفورية** | Socket.IO محلياً، واستعلام دوري على Vercel |
| **واجهة متجاوبة** | تكيف مع الجوال، الجهاز اللوحي وسطح المكتب |
| **الأمان** | JWT، تجديد الرموز، التحكم بالوصول حسب الدور |
| **متعدد المستأجرين** | كل جمعية ترى بياناتها فقط |

---

<p align="center">
  <strong>NEXUS CONSEIL & EXCELLENCE (NCE)</strong><br />
  <em>Dirigé par Mr BAGUENANE</em>
</p>

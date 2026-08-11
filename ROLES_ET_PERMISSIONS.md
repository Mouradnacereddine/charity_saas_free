# 🎭 Rôles et Permissions — SaaS Association Caritative

> **Document de référence de la refonte RBAC (2026)**
> Système de rôles à 6 niveaux avec séparation stricte des domaines fonctionnels.

---

## 🇫🇷 Version Française

## 1. 🏗️ Architecture des rôles

Le système repose sur **6 rôles**, chacun lié à un domaine fonctionnel précis de l'association :

| Rôle | Code | Domaine | Personne type |
|---|---|---|---|
| 🛡️ **Super Administrateur** | `super_admin` | Tous les domaines | Fondateur / Président de l'association |
| 👔 **Administrateur** | `admin` | Administration (utilisateurs, paramètres) + lecture | Bureau de l'association |
| 💰 **Trésorier** | `treasurer` | Finance — tout ce qui concerne l'argent | Trésorier élu |
| 📦 **Magasinier** | `stock_manager` | Stock — articles, prêts, inventaires | Responsable du magasin / dépôt |
| 🤝 **Assistant social** | `social_worker` | Social — bénéficiaires, médical, docteurs | Assistant(e) social(e) |
| 🙋 **Bénévole** | `volunteer` | Lecture + saisie limitée | Bénévole |

### Hiérarchie de contrôle

```
super_admin ── contrôle TOUT ──> peut gérer les admins
    │                            (supprimer, rétrograder, promouvoir)
    ▼
admin ── contrôle ──> trésorier, magasinier, assistant social, bénévole
    │                 (MAIS PAS les autres admins ni super_admin)
    ▼
trésorier / magasinier / assistant social ── ne gèrent PAS d'utilisateurs
    ▼
bénévole ── accès le plus restreint
```

---

## 2. 👥 Détail des rôles et leurs tâches

### 🛡️ Super Administrateur (`super_admin`)

**C'est le fondateur de l'association** — celui qui a créé le compte / l'association en premier. Attribué automatiquement à la création, identifié par le badge **Fondateur**.

**Tâches :**
- ✅ **Tous** les privilèges sans exception
- ✅ Peut **promouvoir** n'importe qui en `admin` (le seul autorisé)
- ✅ Peut **supprimer/rétrograder** un autre admin
- ✅ Peut gérer les utilisateurs, la finance, le stock, le social, le médical
- ✅ Peut modifier les paramètres de l'association
- 🚫 **Limite** : ne peut pas se supprimer soi-même ni changer son propre rôle

> ⚠️ Il y a un seul `super_admin` par association. Ce rôle ne peut **jamais** être attribué manuellement (pas de promotion vers ce rôle) — il se transmet uniquement via la création de l'association.

### 👔 Administrateur (`admin`)

**Rôle de direction** du bureau de l'association.

**Tâches :**
- ✅ Gérer les **utilisateurs** : créer, promouvoir (trésorier/magasinier/assistant social), approuver/rejeter les candidatures, supprimer (volontaires et rôles fonctionnels)
- ✅ Gérer les **paramètres** de l'association (nom, langue, logo)
- ✅ **Lire** les données de tous les modules (finance, stock, social, médical) pour le suivi
- ✅ Voir le **dashboard complet** et les **analyses** financières
- 🚫 **Ne peut PAS** :
  - Supprimer ou rétrograder un autre admin
  - Modifier le super_admin
  - Promouvoir quelqu'un en `admin` (réservé au super_admin)
  - Créer/modifier/supprimer des transactions financières (lecture seule)

### 💰 Trésorier (`treasurer`)

**Gérant de l'argent** — exigence légale dans les associations.

**Tâches :**
- ✅ **Transactions** : enregistrer les crédits (dons) et débits (aides)
- ✅ **Comptes bancaires** : gérer les comptes et leurs soldes
- ✅ **Caisses** : créer et gérer les caisses (sociale, médicale, zakat, etc.)
- ✅ **Donateurs** : gérer les donateurs et leurs dons
- ✅ **Reçus de don** : générer et imprimer les reçus
- ✅ **Allocations** : suivre l'affectation des dons aux bénéficiaires
- ✅ Voir le **dashboard financier** et les **analyses**
- 🚫 **Ne peut PAS** : gérer les articles/stock, les bénéficiaires, le médical

### 📦 Magasinier (`stock_manager`)

**Responsable du dépôt et des articles.**

**Tâches :**
- ✅ **Articles** : créer, modifier, supprimer les articles (fauteuils roulants, cartables, colis, etc.)
- ✅ **Catégories** : gérer les catégories d'articles
- ✅ **Emplacements** : gérer les emplacements de stockage
- ✅ **Statuts** : gérer les statuts d'articles
- ✅ **Niveaux scolaires** : gérer les niveaux (pour les fournitures)
- ✅ **Inventaires (جرد)** : créer et compléter les inventaires physiques
- ✅ **Prêts** : créer des prêts d'articles aux bénéficiaires, suivre les retours
- 🚫 **Ne peut PAS** : gérer la finance, les bénéficiaires, le médical

### 🤝 Assistant social (`social_worker`)

**Le cœur opérationnel social** de l'association.

**Tâches :**
- ✅ **Bénéficiaires** : CRUD complet (veuves, orphelins, personnes âgées, handicapés, familles démunies)
- ✅ **Enfants** : gérer les enfants des bénéficiaires (santé, scolarité)
- ✅ **Orientations médicales** : créer et suivre les orientations vers médecins/hôpitaux
- ✅ **Types d'analyses** : gérer les types d'analyses médicales
- ✅ **Hôpitaux** : gérer la liste des hôpitaux
- ✅ **Docteurs** : gérer les médecins et leurs spécialités
- ✅ **Prêts** : créer des prêts d'articles pour les bénéficiaires (pas de suppression)
- ✅ **Donateurs** : consultation (suivi des dons)
- 🚫 **Ne peut PAS** : gérer l'argent, les articles/stock

### 🙋 Bénévole (`volunteer`)

**Accès limité de consultation et de saisie.**

**Tâches :**
- ✅ **Bénéficiaires** : créer et modifier (mais ne peut pas supprimer)
- ✅ **Reçus de don** : saisir un reçu
- ✅ **Consultation** : articles, prêts, orientations médicales, docteurs, hôpitaux, attributs
- ✅ **Dashboard** : statistiques basiques
- ✅ **Notifications** : consulter et marquer comme lues
- 🚫 **Ne peut PAS** :
  - Créer/modifier/supprimer des transactions, comptes bancaires, caisses
  - Créer/modifier/supprimer des articles ou faire des inventaires
  - Gérer les donateurs
  - Supprimer des bénéficiaires
  - Voir les données financières du dashboard

---

## 3. 🗂️ Matrice des permissions

| Module | Super Admin | Admin | Trésorier | Magasinier | Assistant Social | Bénévole |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Gestion utilisateurs | ✅ CRUD | ✅¹ | ❌ | ❌ | ❌ | ❌ |
| Paramètres association | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transactions | ✅ | 📖 | ✅ CRUD | ❌ | ❌ | ❌ |
| Comptes bancaires | ✅ | 📖 | ✅ CRUD | ❌ | ❌ | ❌ |
| Caisses | ✅ | 📖 | ✅ CRUD | ❌ | ❌ | ❌ |
| Donateurs | ✅ | 📖 | ✅ CRUD | ❌ | 📖 | ❌ |
| Reçus de don | ✅ | 📖 | ✅ CRUD | ❌ | ✏️ CRU | ✏️ CRU |
| Allocations | ✅ | 📖 | ✅ CRUD | ❌ | 📖 | ❌ |
| Articles | ✅ | 📖 | ❌ | ✅ CRUD | 📖 | 📖 |
| Catégories | ✅ | 📖 | ❌ | ✅ CRUD | 📖 | 📖 |
| Emplacements stockage | ✅ | ❌ | ❌ | ✅ CRUD | ❌ | ❌ |
| Inventaires (جرد) | ✅ | 📖 | ❌ | ✅ CRUD | ❌ | ❌ |
| Prêts | ✅ | 📖 | ❌ | ✅ CRUD | ✏️ CRU | 📖 |
| Bénéficiaires | ✅ | 📖 | ❌ | ❌ | ✅ CRUD | ✏️ CRU |
| Attributs bénéficiaire | ✅ | ✅ | ❌ | ❌ | 📖 | 📖 |
| Enfants | ✅ | 📖 | ❌ | ❌ | ✅ CRUD | ✏️ CRU |
| Orientations médicales | ✅ | ❌ | ❌ | ❌ | ✅ CRUD | 📖 |
| Types d'analyses | ✅ | ❌ | ❌ | ❌ | ✅ CRUD | ❌ |
| Hôpitaux | ✅ | ❌ | ❌ | ❌ | ✅ CRUD | 📖 |
| Docteurs | ✅ | ❌ | ❌ | ❌ | ✅ CRUD | 📖 |
| Spécialités | ✅ | ❌ | ❌ | ❌ | ✅ CRUD | ❌ |
| Dashboard | ✅ | ✅ | ✓ Finance | ✓ Stock | ✓ Social | ⚠️ Basique |
| Analyses | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Notifications | ✅ | ✅ | ✓ Propres | ✓ Propres | ✓ Propres | ✓ Propres |

**Légende :**
- ✅ CRUD : créer, lire, modifier, supprimer
- ✏️ CRU : créer, lire, modifier (pas de suppression)
- 📖 Lecture seule
- ❌ Aucun accès
- ¹ Admin : gestion des rôles inférieurs uniquement (jamais les admins ni super_admin)

---

## 4. 🔒 Règles de protection des administrateurs

Ces protections sont **appliquées côté serveur** et ne peuvent être contournées du frontend :

1. **Un admin ne peut pas supprimer un autre admin** → refus (403)
2. **Un admin ne peut pas rétrograder un autre admin** → refus (403)
3. **Personne ne peut modifier le super_admin** (sauf le super_admin lui-même pour la gestion)
4. **Seul le super_admin peut promouvoir quelqu'un en `admin`**
5. **Personne ne peut être promu `super_admin`** (rôle réservé au fondateur)
6. **Un administrateur ne peut pas changer son propre rôle**
7. **Un utilisateur ne peut pas se supprimer lui-même**

---

## 5. 🗣️ Rôles et actions d'invitation

| Inviteur | Rôles invitable | Rôles attribuables |
|---|---|---|
| super_admin | admin, trésorier, magasinier, assistant social, bénévole | idem |
| admin | trésorier, magasinier, assistant social, bénévole | idem |
| Autres rôles | aucun | aucun |

---

## 6. 🔄 Migration des rôles précédents

Avant cette refonte, le système avait 3 rôles : `admin`, `treasurer`, `user`.

| Ancien rôle | Nouveau rôle | Règle |
|---|---|---|
| `admin` (le premier créé par association) | `super_admin` | Le fondateur, identifié `isFounder: true` |
| `admin` (les autres) | `admin` | Inchangé |
| `treasurer` | `treasurer` | Inchangé |
| `user` | `volunteer` | Renommé automatiquement |

**Scripts de migration** (idempotents, exécutés automatiquement au déploiement Vercel) :
- `server/prisma/pre-migrate-enum.js` — renomme l'enum `user`→`volunteer`, ajoute les nouvelles valeurs et la colonne `isFounder`
- `server/prisma/migrate-roles.js` — promeut le premier admin en `super_admin`

---

## 7. 🔑 Détails techniques

### Implémentation
- **Backend** : `server/src/lib/permissions.ts` — matrice `ROLE_PERMISSIONS`, fonctions `hasPermission`, `canManageUser`, `getInvitableRoles`
- **Middleware** : `server/src/middleware/auth.ts` — `requirePermission(resource, action)`, `requireUserManagement()`
- **Frontend** : `src/hooks/usePermissions.ts` — hook `usePermissions()` avec `can(resource, action)`, `canManageUser`, `isSuperAdmin`
- **Schéma** : `server/prisma/schema.prisma` — enum `Role` (6 valeurs) + champ `User.isFounder`

### Exemple de vérification de permission
```typescript
// Un trésorier peut-il créer une transaction ?
hasPermission('treasurer', 'transactions', 'create'); // true

// Un admin peut-il supprimer un autre admin ?
canManageUser('admin', 'admin'); // false ❌

// Un super_admin peut-il gérer un admin ?
canManageUser('super_admin', 'admin'); // true ✅
```

---

## 8. 💡 Recommandations d'organisation

Pour un fonctionnement optimal d'une association caritative :

- **1 super_admin** : le président / fondateur (compte principal)
- **1-2 admins** : membres du bureau pour la gestion quotidienne
- **1 trésorier** : le trésorier élu (seul à manipuler l'argent)
- **1 magasinier** : le responsable du dépôt physique
- **1-3 assistants sociaux** : selon le volume de bénéficiaires
- **Bénévoles** : l'équipe terrain pour la saisie et l'aide

> 💡 **Principe de séparation** : l'argent (trésorier), les biens (magasinier) et les bénéficiaires (assistant social) sont gérés par **des personnes différentes** — c'est une bonne pratique de contrôle interne pour prévenir les malversations dans les associations.

---

*Document généré à partir de l'implémentation RBAC validée et déployée en production.*
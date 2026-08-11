// ============================================
// RBAC — Role-Based Access Control
// ============================================
// Couche de permissions : mappe chaque rôle vers ses autorisations.
// Import partagé par le middleware backend ET le hook frontend.

export type Action = 'create' | 'read' | 'update' | 'delete';

export type Resource =
  | 'users'
  | 'association_settings'
  | 'transactions'
  | 'bank_accounts'
  | 'caisses'
  | 'donors'
  | 'donation_receipts'
  | 'allocations'
  | 'articles'
  | 'article_categories'
  | 'storage_locations'
  | 'article_statuses'
  | 'school_grades'
  | 'stock_takes'
  | 'loans'
  | 'beneficiaries'
  | 'beneficiary_attributs'
  | 'medical_referrals'
  | 'analysis_types'
  | 'hospitals'
  | 'doctors'
  | 'specialties'
  | 'dashboard'
  | 'analytics'
  | 'notifications';

export type Permission = `${Resource}:${Action}`;

export type RoleType =
  | 'super_admin'
  | 'admin'
  | 'treasurer'
  | 'stock_manager'
  | 'social_worker'
  | 'volunteer';

// ── Helpers ─────────────────────────────────
const crud = (r: Resource): Permission[] => [`${r}:create`, `${r}:read`, `${r}:update`, `${r}:delete`];
const readOnly = (r: Resource): Permission[] => [`${r}:read`];
const cru = (r: Resource): Permission[] => [`${r}:create`, `${r}:read`, `${r}:update`];

// ── Permissions par rôle ────────────────────

const VOLUNTEER_PERMISSIONS: Permission[] = [
  // Bénéficiaires : saisie + consultation (pas de suppression)
  ...cru('beneficiaries'),
  // Reçus de don : saisie + consultation
  ...cru('donation_receipts'),
  // Articles : consultation uniquement
  ...readOnly('articles'),
  ...readOnly('article_categories'),
  // Prêts : consultation
  ...readOnly('loans'),
  // Médical : consultation
  ...readOnly('medical_referrals'),
  ...readOnly('hospitals'),
  ...readOnly('doctors'),
  // Attributs bénéficiaire : consultation
  ...readOnly('beneficiary_attributs'),
  // Dashboard : stats basiques
  ...readOnly('dashboard'),
  // Notifications : propres
  ...readOnly('notifications'),
  'notifications:update' as Permission, // marquer comme lu
];

const SOCIAL_WORKER_PERMISSIONS: Permission[] = [
  ...VOLUNTEER_PERMISSIONS,
  // Bénéficiaires : CRUD complet
  ...crud('beneficiaries'),
  // Donateurs : consultation
  ...readOnly('donors'),
  // Allocations : consultation
  ...readOnly('allocations'),
  // Prêts : CRU (pas de suppression)
  ...cru('loans'),
  // Médical : CRUD complet
  ...crud('medical_referrals'),
  ...crud('analysis_types'),
  ...crud('hospitals'),
  // Docteurs : CRUD complet
  ...crud('doctors'),
  ...crud('specialties'),
];

const STOCK_MANAGER_PERMISSIONS: Permission[] = [
  ...VOLUNTEER_PERMISSIONS,
  // Articles : CRUD complet
  ...crud('articles'),
  ...crud('article_categories'),
  ...crud('storage_locations'),
  ...crud('article_statuses'),
  ...crud('school_grades'),
  // Inventaires : CRUD complet
  ...crud('stock_takes'),
  // Prêts : CRUD complet
  ...crud('loans'),
];

const TREASURER_PERMISSIONS: Permission[] = [
  ...VOLUNTEER_PERMISSIONS,
  // Finance : CRUD complet
  ...crud('transactions'),
  ...crud('bank_accounts'),
  ...crud('caisses'),
  ...crud('donors'),
  ...crud('donation_receipts'),
  ...crud('allocations'),
  // Analytics
  ...readOnly('analytics'),
];

const ADMIN_PERMISSIONS: Permission[] = [
  // Gestion utilisateurs + paramètres
  ...crud('users'),
  ...crud('association_settings'),
  ...crud('beneficiary_attributs'),
  // Lecture sur tous les modules opérationnels
  ...readOnly('transactions'),
  ...readOnly('bank_accounts'),
  ...readOnly('caisses'),
  ...readOnly('donors'),
  ...readOnly('donation_receipts'),
  ...readOnly('allocations'),
  ...readOnly('articles'),
  ...readOnly('article_categories'),
  ...readOnly('storage_locations'),
  ...readOnly('article_statuses'),
  ...readOnly('school_grades'),
  ...readOnly('stock_takes'),
  ...readOnly('loans'),
  ...readOnly('beneficiaries'),
  ...readOnly('beneficiary_attributs'),
  ...readOnly('medical_referrals'),
  ...readOnly('hospitals'),
  ...readOnly('doctors'),
  ...readOnly('specialties'),
  // Dashboard + Analytics complets
  ...readOnly('dashboard'),
  ...readOnly('analytics'),
  // Notifications
  ...crud('notifications'),
];

// super_admin = toutes les permissions possibles
const ALL_RESOURCES: Resource[] = [
  'users', 'association_settings',
  'transactions', 'bank_accounts', 'caisses', 'donors', 'donation_receipts', 'allocations',
  'articles', 'article_categories', 'storage_locations', 'article_statuses', 'school_grades', 'stock_takes', 'loans',
  'beneficiaries', 'beneficiary_attributs',
  'medical_referrals', 'analysis_types', 'hospitals', 'doctors', 'specialties',
  'dashboard', 'analytics', 'notifications',
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = ALL_RESOURCES.flatMap(r => crud(r));

// ── Export : carte rôle → permissions ───────

export const ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
  super_admin: [...new Set(SUPER_ADMIN_PERMISSIONS)],
  admin: [...new Set(ADMIN_PERMISSIONS)],
  treasurer: [...new Set(TREASURER_PERMISSIONS)],
  stock_manager: [...new Set(STOCK_MANAGER_PERMISSIONS)],
  social_worker: [...new Set(SOCIAL_WORKER_PERMISSIONS)],
  volunteer: [...new Set(VOLUNTEER_PERMISSIONS)],
};

// ── Fonctions utilitaires ───────────────────

/**
 * Vérifie si un rôle a la permission d'effectuer une action sur une ressource.
 */
export function hasPermission(role: string, resource: Resource, action: Action): boolean {
  const perms = ROLE_PERMISSIONS[role as RoleType];
  if (!perms) return false;
  return perms.includes(`${resource}:${action}`);
}

/**
 * Vérifie si un rôle est protégé (admin ou super_admin).
 */
export function isProtectedRole(role: string): boolean {
  return role === 'super_admin' || role === 'admin';
}

/**
 * Vérifie si un acteur peut gérer (modifier/supprimer) un utilisateur cible.
 * Règles :
 * - super_admin peut gérer tout le monde
 * - admin ne peut PAS gérer admin ni super_admin
 * - admin peut gérer treasurer, stock_manager, social_worker, volunteer
 * - les autres rôles ne peuvent gérer personne
 */
export function canManageUser(actorRole: string, targetRole: string): boolean {
  if (actorRole === 'super_admin') return true;
  if (actorRole === 'admin' && isProtectedRole(targetRole)) return false;
  if (actorRole === 'admin') return true;
  return false;
}

/**
 * Liste des modules (pages) accessibles par un rôle.
 * Utilisé par le frontend pour filtrer la sidebar.
 */
export function getAccessiblePages(role: string): string[] {
  const pages: string[] = ['dashboard']; // Toujours accessible

  const r = role as RoleType;
  const perms = ROLE_PERMISSIONS[r];
  if (!perms) return pages;

  if (hasPermission(r, 'transactions', 'read') || hasPermission(r, 'transactions', 'create')) pages.push('finance');
  if (hasPermission(r, 'caisses', 'read') || hasPermission(r, 'caisses', 'create')) pages.push('caisses');
  if (hasPermission(r, 'donors', 'read') || hasPermission(r, 'donors', 'create')) pages.push('donors');
  if (hasPermission(r, 'articles', 'read')) pages.push('inventory');
  if (hasPermission(r, 'beneficiaries', 'read')) pages.push('beneficiaries');
  if (hasPermission(r, 'medical_referrals', 'read')) pages.push('medical');
  if (hasPermission(r, 'doctors', 'read')) pages.push('doctors');
  if (hasPermission(r, 'users', 'read')) pages.push('users');
  if (hasPermission(r, 'analytics', 'read')) pages.push('analytics');

  return pages;
}

/**
 * Rôles valides pour l'invitation, selon le rôle de l'inviteur.
 */
export function getInvitableRoles(actorRole: string): RoleType[] {
  if (actorRole === 'super_admin') {
    return ['admin', 'treasurer', 'stock_manager', 'social_worker', 'volunteer'];
  }
  if (actorRole === 'admin') {
    return ['treasurer', 'stock_manager', 'social_worker', 'volunteer'];
  }
  return [];
}

/**
 * Rôles valides pour l'assignation, selon le rôle de l'acteur.
 */
export function getAssignableRoles(actorRole: string): RoleType[] {
  if (actorRole === 'super_admin') {
    return ['admin', 'treasurer', 'stock_manager', 'social_worker', 'volunteer'];
  }
  if (actorRole === 'admin') {
    return ['treasurer', 'stock_manager', 'social_worker', 'volunteer'];
  }
  return [];
}

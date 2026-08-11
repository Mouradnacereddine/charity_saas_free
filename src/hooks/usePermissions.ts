import { useAuth } from './useAuth';

// ============================================
// Permissions frontend — miroir de server/src/lib/permissions.ts
// ============================================

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

const crud = (r: Resource): Permission[] => [`${r}:create`, `${r}:read`, `${r}:update`, `${r}:delete`];
const readOnly = (r: Resource): Permission[] => [`${r}:read`];
const cru = (r: Resource): Permission[] => [`${r}:create`, `${r}:read`, `${r}:update`];

const VOLUNTEER_PERMISSIONS: Permission[] = [
  ...cru('beneficiaries'),
  ...cru('donation_receipts'),
  ...readOnly('articles'),
  ...readOnly('article_categories'),
  ...readOnly('loans'),
  ...readOnly('medical_referrals'),
  ...readOnly('hospitals'),
  ...readOnly('doctors'),
  ...readOnly('beneficiary_attributs'),
  ...readOnly('dashboard'),
  ...readOnly('notifications'),
  'notifications:update' as Permission,
];

const SOCIAL_WORKER_PERMISSIONS: Permission[] = [
  ...VOLUNTEER_PERMISSIONS,
  ...crud('beneficiaries'),
  ...readOnly('donors'),
  ...readOnly('allocations'),
  ...cru('loans'),
  ...crud('medical_referrals'),
  ...crud('analysis_types'),
  ...crud('hospitals'),
  ...crud('doctors'),
  ...crud('specialties'),
];

const STOCK_MANAGER_PERMISSIONS: Permission[] = [
  ...VOLUNTEER_PERMISSIONS,
  ...crud('articles'),
  ...crud('article_categories'),
  ...crud('storage_locations'),
  ...crud('article_statuses'),
  ...crud('school_grades'),
  ...crud('stock_takes'),
  ...crud('loans'),
];

const TREASURER_PERMISSIONS: Permission[] = [
  ...VOLUNTEER_PERMISSIONS,
  ...crud('transactions'),
  ...crud('bank_accounts'),
  ...crud('caisses'),
  ...crud('donors'),
  ...crud('donation_receipts'),
  ...crud('allocations'),
  ...readOnly('analytics'),
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...crud('users'),
  ...crud('association_settings'),
  ...crud('beneficiary_attributs'),
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
  ...readOnly('dashboard'),
  ...readOnly('analytics'),
  ...crud('notifications'),
];

const ALL_RESOURCES: Resource[] = [
  'users', 'association_settings',
  'transactions', 'bank_accounts', 'caisses', 'donors', 'donation_receipts', 'allocations',
  'articles', 'article_categories', 'storage_locations', 'article_statuses', 'school_grades', 'stock_takes', 'loans',
  'beneficiaries', 'beneficiary_attributs',
  'medical_referrals', 'analysis_types', 'hospitals', 'doctors', 'specialties',
  'dashboard', 'analytics', 'notifications',
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = ALL_RESOURCES.flatMap((r) => crud(r));

export const ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
  super_admin: [...new Set(SUPER_ADMIN_PERMISSIONS)],
  admin: [...new Set(ADMIN_PERMISSIONS)],
  treasurer: [...new Set(TREASURER_PERMISSIONS)],
  stock_manager: [...new Set(STOCK_MANAGER_PERMISSIONS)],
  social_worker: [...new Set(SOCIAL_WORKER_PERMISSIONS)],
  volunteer: [...new Set(VOLUNTEER_PERMISSIONS)],
};

export function hasPermission(role: string, resource: Resource, action: Action): boolean {
  const perms = ROLE_PERMISSIONS[role as RoleType];
  if (!perms) return false;
  return perms.includes(`${resource}:${action}`);
}

/**
 * Vérifie si un rôle d'acteur peut gérer (modifier/supprimer) un rôle cible.
 * Miroir de la logique backend.
 */
export function canManageUser(actorRole: string, targetRole: string): boolean {
  if (actorRole === 'super_admin') return true;
  if (actorRole === 'admin' && (targetRole === 'admin' || targetRole === 'super_admin')) return false;
  if (actorRole === 'admin') return true;
  return false;
}

/**
 * Rôles valides pour l'assignation selon le rôle de l'acteur.
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

/**
 * Hook de permissions — à utiliser dans les composants.
 */
export function usePermissions() {
  const { user, role, isAdmin, isSuperAdmin } = useAuth();

  const can = (resource: Resource, action: Action): boolean => {
    if (!role) return false;
    return hasPermission(role, resource, action);
  };

  const canAny = (resource: Resource): boolean => {
    if (!role) return false;
    return (['create', 'read', 'update', 'delete'] as Action[]).some((a) => hasPermission(role, resource, a));
  };

  return {
    user,
    role,
    isAdmin,
    isSuperAdmin,
    can,
    canAny,
    canManageUser,
    getAssignableRoles,
  };
}

import { Request, Response, NextFunction } from 'express';
import { verifyToken, AccessTokenPayload } from '../lib/jwt';
import { hasPermission, canManageUser, isProtectedRole, type Resource, type Action } from '../lib/permissions';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: AccessTokenPayload;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, any>;
  body: any;
  params: Record<string, string>;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || Array.isArray(authHeader) || !authHeader.startsWith('Bearer ')) {
    console.warn(`🔐 401 — No valid Authorization header. URL: ${req.method} ${req.path}, IP: ${req.ip}`);
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    console.warn(`🔐 401 — Invalid or expired token. URL: ${req.method} ${req.path}, IP: ${req.ip}, Token prefix: ${token.substring(0, 12)}...`);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Vérifie que l'utilisateur a le rôle admin ou super_admin.
 * Rétro-compatible avec l'ancien middleware.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

/**
 * Middleware générique de vérification de permission.
 * Vérifie que le rôle de l'utilisateur a la permission resource:action.
 */
export function requirePermission(resource: Resource, action: Action) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    if (!hasPermission(req.user.role, resource, action)) {
      res.status(403).json({
        error: 'Accès interdit — permissions insuffisantes',
        required: `${resource}:${action}`,
        yourRole: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware spécifique pour la gestion des utilisateurs.
 * Vérifie les règles de protection des admins :
 * - Empêche la suppression de soi-même
 * - Empêche la modification/suppression d'un admin par un non-super_admin
 * - Empêche l'escalade de privilèges
 */
export function requireUserManagement() {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const actor = req.user;
    if (!actor) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    // Pour les opérations sur un utilisateur spécifique (PUT, DELETE)
    if (req.params.id) {
      const targetUser = await prisma.user.findFirst({
        where: { id: req.params.id, associationId: actor.associationId },
        select: { role: true, id: true },
      });

      if (!targetUser) {
        res.status(404).json({ error: 'Utilisateur non trouvé' });
        return;
      }

      // Empêcher la suppression de soi-même
      if (req.method === 'DELETE' && actor.userId === targetUser.id) {
        res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
        return;
      }

      // Empêcher la modification de son propre rôle
      if (req.method === 'PUT' && actor.userId === targetUser.id && req.body?.role !== undefined && req.body.role !== targetUser.role) {
        res.status(400).json({ error: 'لا يمكنك تغيير دورك الخاص' });
        return;
      }

      // Vérifier si l'acteur peut gérer l'utilisateur cible
      if (!canManageUser(actor.role, targetUser.role)) {
        res.status(403).json({
          error: actor.role === 'admin'
            ? 'لا يمكن للمسؤول تعديل أو حذف مسؤول آخر'
            : 'صلاحيات غير كافية',
        });
        return;
      }

      // Empêcher l'escalade de privilèges
      if (req.body?.role) {
        const newRole = req.body.role;

        // Personne ne peut promouvoir en super_admin (transfert via endpoint dédié)
        if (newRole === 'super_admin') {
          res.status(403).json({
            error: 'لا يمكن تعيين دور المدير العام — يتم نقله فقط عبر تحويل الملكية',
          });
          return;
        }

        // Seul super_admin peut promouvoir en admin
        if (newRole === 'admin' && actor.role !== 'super_admin') {
          res.status(403).json({
            error: 'المدير العام فقط يمكنه تعيين دور المسؤول',
          });
          return;
        }
      }
    }

    next();
  };
}

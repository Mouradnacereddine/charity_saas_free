import type { AuthRequest } from '../middleware/auth';
import prisma from './prisma';

// ============================================
// AUDIT TRAIL — journal "qui a fait quoi"
// ============================================
// Enregistre les actions de modification (create, update, delete, confirm,
// cancel, login, logout, register) dans la table AuditLog.
// Les consultations/recherches ne sont JAMAIS journalisées.
//
// L'échec d'un log ne doit jamais bloquer l'action principale.

/** Cache mémoire des infos utilisateurs pour limiter les requêtes DB. */
const userInfoCache = new Map<string, { name: string | null; email: string | null }>();

async function resolveUserInfo(userId: string | undefined): Promise<{ name: string | null; email: string | null }> {
  if (!userId) return { name: null, email: null };

  const cached = userInfoCache.get(userId);
  if (cached) return cached;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const info = { name: user?.name ?? null, email: user?.email ?? null };
    userInfoCache.set(userId, info);
    return info;
  } catch {
    // Ignore — on retourne null si la résolution échoue
  }
  return { name: null, email: null };
}

export interface AuditInput {
  action: string;
  resource: string;
  resourceId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Journalise une action d'audit.
 * @param req  Requête Express (req.user doit être présent pour les routes protégées).
 * @param input Détails de l'action.
 * @param override  Permet de fournir explicitement associationId/userId/userName
 *                  pour les routes publiques (login, register) sans req.user.
 */
export async function logAudit(
  req: AuthRequest,
  input: AuditInput,
  override?: { associationId?: string; userId?: string; userName?: string; userEmail?: string; userRole?: string },
): Promise<void> {
  try {
    const associationId = override?.associationId ?? req.user?.associationId;
    const userId = override?.userId ?? req.user?.userId;
    const resolved = await resolveUserInfo(userId);
    const userName = override?.userName ?? resolved.name;
    const userEmail = override?.userEmail ?? resolved.email;

    if (!associationId) {
      console.warn('⚠️ Audit log skipped: no associationId');
      return;
    }

    await prisma.auditLog.create({
      data: {
        associationId,
        userId: userId ?? null,
        userName,
        userEmail,
        userRole: override?.userRole ?? req.user?.role ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        description: input.description ?? null,
        metadata: (input.metadata as object) ?? undefined,
      },
    });
  } catch (err) {
    // L'échec d'audit ne doit JAMAIS faire échouer l'action principale
    console.error('⚠️ Audit log failed:', err);
  }
}

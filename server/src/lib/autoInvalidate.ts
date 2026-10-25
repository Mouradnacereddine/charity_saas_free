/**
 * Auto-invalidation middleware.
 * After POST/PUT/DELETE on any /api/* route, emit a socket
 * invalidation event scoped to the associationId from req.user.
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { emitInvalidation } from './socket';

// Maps API path prefixes to TanStack Query key prefixes
const PATH_TO_RESOURCE: Record<string, string[]> = {
  '/finance/transactions': ['transactions', 'finance-allocations', 'caisses', 'dashboard'],
  '/finance/allocations': ['finance-allocations', 'allocations'],
  '/finance/bank-accounts': ['bank-accounts', 'finance-stats'],
  '/finance/stats': ['finance-stats'],
  '/beneficiaries': ['beneficiaries'],
  '/caisses': ['caisses'],
  '/donors': ['donors'],
  '/dashboard': ['dashboard'],
  '/medical/referrals': ['medical-referrals'],
  '/medical/analysis-types': ['analysis-types'],
  '/medical/hospitals': ['hospitals'],
  '/inventory/articles': ['articles'],
  '/inventory/article-categories': ['article-categories'],
  '/inventory/storage-locations': ['storage-locations'],
  '/inventory/school-grades': ['school-grades'],
  '/inventory/article-statuses': ['article-statuses'],
  '/inventory/stock-takes': ['stock-takes', 'articles'],
  '/loans': ['loans'],
  '/doctors': ['doctors'],
  '/doctors/specialties': ['doctor-specialties'],
  '/notifications': ['notifications'],
  '/beneficiary-attributs': ['attributs'],
  '/auth/users': ['users'],
  '/auth/invites': ['invites'],
  '/auth/association': ['auth'],
};

export function autoInvalidate(req: AuthRequest, res: Response, next: NextFunction) {
  // Store original json to intercept the response
  const originalJson = res.json.bind(res);
  // `req.path` est déjà amputé du préfixe de montage par le router d'Express
  // (`app.use('/api/donors', autoInvalidate, ...)` → `req.path` vaut `/` ou
  // `/123`). Aucune clé de PATH_TO_RESOURCE (qui sont des chemins *complets*)
  // ne pouvait donc matcher : aucune invalidation n'était jamais émise.
  // `originalUrl` conserve le chemin complet ; on retire le query string.
  const { method } = req;
  const pathApresApi = (req.originalUrl || req.url || '').split('?')[0].replace(/^\/api/, '');

  res.json = function (body: any) {
    // Only emit for mutation methods that succeeded
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && res.statusCode < 400) {
      // Find matching resource keys
      const matched = Object.entries(PATH_TO_RESOURCE).find(([prefix]) =>
        pathApresApi.startsWith(prefix)
      );
      if (matched && req.user?.associationId) {
        for (const resource of matched[1]) {
          emitInvalidation(req.user.associationId, resource);
        }
      }
    }
    return originalJson(body);
  };

  next();
}

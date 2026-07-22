import { Request, Response, NextFunction } from 'express';
import { verifyToken, AccessTokenPayload } from '../lib/jwt';

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

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AccessTokenPayload {
  userId: string;
  associationId: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
  // Génération du jeton. Comparée à `User.tokenVersion` au moment du refresh :
  // un jeton émis avant une déconnexion ou un changement de mot de passe est
  // rejeté. `?: number` pour rester compatible avec les jetons déjà émis.
  tokenVersion?: number;
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.accessTokenExpiry });
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.refreshTokenExpiry });
}

export function verifyToken(token: string): AccessTokenPayload {
  // Restreindre l'algorithme attendu est défensif : `jsonwebtoken@9` refuse
  // déjà `alg: none` et n'accepte que HMAC avec un secret chaîne, mais un
  // futur passage à une clé PEM ouvrirait la confusion d'algorithme.
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as AccessTokenPayload;
}

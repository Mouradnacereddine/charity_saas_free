import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AccessTokenPayload {
  userId: string;
  associationId: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.accessTokenExpiry });
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.refreshTokenExpiry });
}

export function verifyToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
}

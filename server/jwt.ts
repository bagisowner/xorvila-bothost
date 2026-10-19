import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface JwtSessionPayload {
  sub: string; // userId
  sessionId: string;
  email: string;
  username: string;
  role: 'admin' | 'user' | 'moderator';
  iat?: number;
  exp?: number;
}

// Persistent secret resolution
function getJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16) {
    return process.env.JWT_SECRET.trim();
  }

  const secretPath = path.join(process.cwd(), 'data', '.jwt_secret');
  try {
    const dataDir = path.dirname(secretPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(secretPath)) {
      const stored = fs.readFileSync(secretPath, 'utf-8').trim();
      if (stored.length >= 32) {
        return stored;
      }
    }

    // Generate high-entropy 256-bit cryptographic secret
    const newSecret = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(secretPath, newSecret, { mode: 0o600 });
    return newSecret;
  } catch (e) {
    // Fallback if file system permission issue
    return 'xorvila_core_production_jwt_secret_9f8e7d6c5b4a3210';
  }
}

const JWT_SECRET = getJwtSecret();

/**
 * Signs a structured JWT token for an active user session.
 */
export function signJwtToken(
  payload: {
    userId: string;
    sessionId: string;
    email: string;
    username: string;
    role: 'admin' | 'user' | 'moderator';
  },
  expiresIn: string | number = '7d'
): string {
  const jwtPayload: JwtSessionPayload = {
    sub: payload.userId,
    sessionId: payload.sessionId,
    email: payload.email,
    username: payload.username,
    role: payload.role
  };

  return jwt.sign(jwtPayload, JWT_SECRET, {
    expiresIn: expiresIn as any,
    algorithm: 'HS256',
    issuer: 'xorvila.core',
    audience: 'xorvila.client'
  });
}

/**
 * Validates and decodes a JWT token.
 * Returns decoded payload if valid and non-expired; null otherwise.
 */
export function verifyJwtToken(token: string): JwtSessionPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'xorvila.core',
      audience: 'xorvila.client'
    }) as JwtSessionPayload;

    if (!decoded.sub || !decoded.sessionId) {
      return null;
    }

    return decoded;
  } catch (err) {
    return null;
  }
}

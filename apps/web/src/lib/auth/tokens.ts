import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from '@agrimed/types';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
const ALG = 'HS256';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

export async function signAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secret);
}

export async function signRefreshToken(payload: Pick<JWTPayload, 'userId'>): Promise<string> {
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(secret);
}

export async function verifyToken<T = JWTPayload>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as T;
  } catch {
    return null;
  }
}

export function buildJWTPayload(user: {
  _id: { toString(): string };
  role: string;
  badge: { type: string; isActive: boolean };
  supplierId?: string;
}): JWTPayload {
  return {
    userId: user._id.toString(),
    role: user.role as JWTPayload['role'],
    badgeType: user.badge.type as JWTPayload['badgeType'],
    badgeActive: user.badge.isActive,
    supplierId: user.supplierId,
  };
}

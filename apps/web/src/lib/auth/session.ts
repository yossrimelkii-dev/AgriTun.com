import { cookies } from 'next/headers';
import { verifyToken } from './tokens';
import type { JWTPayload } from '@agrimed/types';
import { connectDB } from '@agrimed/db';
import { User } from '@agrimed/db/models';
import { Supplier } from '@agrimed/db/models';

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;

  if (token) {
    const accessSession = await verifyToken<JWTPayload>(token);
    if (accessSession) return accessSession;
  }

  const refreshToken = cookieStore.get('refresh_token')?.value;
  if (!refreshToken) return null;

  const refreshSession = await verifyToken<{ userId?: string }>(refreshToken);
  if (!refreshSession?.userId) return null;

  await connectDB();
  const user = await User.findById(refreshSession.userId).select('role badge').lean();
  if (!user) return null;

  let supplierId: string | undefined;
  if (user.role === 'SUPPLIER' || user.role === 'SUPPLIER_PRIME' || user.role === 'SUPER_SUPPLIER') {
    const supplier = await Supplier.findOne({ userId: user._id }).select('_id').lean();
    supplierId = supplier?._id?.toString();
  }

  return {
    userId: user._id.toString(),
    role: user.role as JWTPayload['role'],
    badgeType: user.badge.type,
    badgeActive: user.badge.isActive,
    supplierId,
  };
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

export async function requireRole(
  ...allowedRoles: JWTPayload['role'][]
): Promise<JWTPayload> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

export async function requireSupplier(): Promise<JWTPayload & { supplierId: string }> {
  const session = await requireRole('SUPPLIER', 'SUPPLIER_PRIME', 'SUPER_SUPPLIER');
  if (!session.supplierId) {
    throw new Error('SUPPLIER_PROFILE_REQUIRED');
  }
  return session as JWTPayload & { supplierId: string };
}

export async function requireSupplierPrimeOrSuper(): Promise<JWTPayload & { supplierId: string }> {
  const session = await requireRole('SUPPLIER_PRIME', 'SUPER_SUPPLIER');
  if (!session.supplierId) {
    throw new Error('SUPPLIER_PROFILE_REQUIRED');
  }
  return session as JWTPayload & { supplierId: string };
}

export async function getFullUser(userId: string) {
  await connectDB();
  return User.findById(userId).lean();
}

export async function getSupplierForUser(userId: string) {
  await connectDB();
  return Supplier.findOne({ userId }).lean();
}

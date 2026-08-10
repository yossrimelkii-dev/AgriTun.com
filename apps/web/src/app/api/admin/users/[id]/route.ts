export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { User } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

// PATCH /api/admin/users/[id] — update user role, badge, or ban status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const body = await req.json();
    const update: Record<string, unknown> = {};

    // Role change
    if (body.role && ['BUYER', 'SUPPLIER', 'SUPER_SUPPLIER', 'ADMIN', 'GUEST'].includes(body.role)) {
      update.role = body.role;
    }

    // PRIME badge toggle
    if (body.badge !== undefined) {
      if (body.badge === 'PRIME') {
        update['badge.type'] = 'PRIME';
        update['badge.isActive'] = true;
        update['badge.issuedAt'] = new Date();
        update['badge.expiresAt'] = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      } else if (body.badge === 'FREE') {
        update['badge.type'] = 'FREE';
        update['badge.isActive'] = false;
      }
    }

    // Email verification override
    if (body.isEmailVerified !== undefined) {
      update.isEmailVerified = !!body.isEmailVerified;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(params.id, { $set: update }, { new: true })
      .select('-passwordHash -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

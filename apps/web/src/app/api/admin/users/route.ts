export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { User } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const role = searchParams.get('role');

    const query: Record<string, unknown> = {};
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-passwordHash -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ users });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

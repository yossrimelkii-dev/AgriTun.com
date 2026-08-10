export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { AuditLog, User } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const action = searchParams.get('action');
    const targetType = searchParams.get('targetType');

    const query: Record<string, unknown> = {};
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Resolve user names
    const userIds = [...new Set(logs.map((l: any) => l.userId?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('email profile.firstName profile.lastName role')
      .lean();
    const userMap = new Map(
      users.map((u: any) => [
        u._id.toString(),
        { email: u.email, name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.email, role: u.role },
      ])
    );

    const enriched = logs.map((l: any) => ({
      ...l,
      user: userMap.get(l.userId?.toString()) || { email: '—', name: '—', role: '—' },
    }));

    return NextResponse.json({ logs: enriched });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

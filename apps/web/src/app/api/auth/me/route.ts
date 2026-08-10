export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { User } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';

// GET /api/auth/me — return current user info (or null)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    await connectDB();
    const user = await User.findById(session.userId)
      .select('profile email role badge')
      .lean();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        speciality: user.profile?.speciality,
        email: user.email,
        role: user.role,
        badge: user.badge,
        supplierId: session.supplierId,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectDB, OnboardingRequest } from '@agrimed/db';
import { requireRole } from '@/lib/auth/session';

export async function GET() {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const requests = await OnboardingRequest.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests });
  } catch (error: any) {
    if (error?.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin onboarding requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SiteSetting } from '@agrimed/db';
import { requireRole } from '@/lib/auth/session';

const SETTING_KEY = 'registration';

export async function GET() {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const setting = await SiteSetting.findOne({ key: SETTING_KEY }).lean();
    return NextResponse.json({
      onboardingActive: setting?.onboardingActive ?? false,
      updatedAt: setting?.updatedAt ?? null,
    });
  } catch (error: any) {
    if (error?.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin onboarding setting fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const body = await req.json();
    const onboardingActive = Boolean(body?.onboardingActive);

    const setting = await SiteSetting.findOneAndUpdate(
      { key: SETTING_KEY },
      { $set: { key: SETTING_KEY, onboardingActive } },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ onboardingActive: setting?.onboardingActive ?? false });
  } catch (error: any) {
    if (error?.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin onboarding setting update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

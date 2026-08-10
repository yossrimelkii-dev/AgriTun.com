export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectDB, SiteSetting } from '@agrimed/db';

const SETTING_KEY = 'registration';

export async function GET() {
  try {
    await connectDB();
    const setting = await SiteSetting.findOne({ key: SETTING_KEY }).lean();
    return NextResponse.json({ onboardingActive: setting?.onboardingActive ?? false });
  } catch (error) {
    console.error('Onboarding setting fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

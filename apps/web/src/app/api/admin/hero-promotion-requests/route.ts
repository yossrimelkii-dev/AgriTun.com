export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { HeroPromotionRequest } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function GET(): Promise<NextResponse> {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const requests = await HeroPromotionRequest.find({})
      .populate('supplierId', 'companyName slug')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

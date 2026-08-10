export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Supplier } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const suppliers = await Supplier.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ suppliers });
  } catch (error: any) {
    if (error?.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

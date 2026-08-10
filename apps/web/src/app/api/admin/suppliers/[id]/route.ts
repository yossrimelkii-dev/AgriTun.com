export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Supplier } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const { isVerified } = await req.json();

    const supplier = await Supplier.findByIdAndUpdate(
      params.id,
      { isVerified: Boolean(isVerified) },
      { new: true }
    ).lean();

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ supplier });
  } catch (error: any) {
    if (error?.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Supplier, User } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';

function roleToTier(role: string | undefined): 'FREE' | 'PRIME' | 'SUPER' | null {
  if (role === 'SUPER_SUPPLIER') return 'SUPER';
  if (role === 'SUPPLIER_PRIME') return 'PRIME';
  if (role === 'SUPPLIER') return 'FREE';
  return null;
}

// GET /api/supplier/me — return the current authenticated user's supplier profile
// (or { supplier: null } if they don't have one)
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.supplierId) {
      return NextResponse.json({ supplier: null, tier: null });
    }

    await connectDB();
    const supplier = await Supplier.findById(session.supplierId).lean();
    if (!supplier) {
      return NextResponse.json({ supplier: null, tier: null });
    }

    const user = await User.findById(session.userId).select('email role').lean();
    const primaryAddress = supplier.addresses?.[0];

    return NextResponse.json({
      tier: roleToTier(session.role),
      supplier: {
        id: supplier._id,
        companyName: supplier.companyName,
        logo: supplier.logo || '',
        slug: supplier.slug,
        isVerified: !!supplier.isVerified,
        taxId: supplier.taxId || '',
        email: user?.email || '',
        phone: supplier.socialLinks?.phone || '',
        website: supplier.socialLinks?.website || '',
        address: primaryAddress?.addressLine || '',
        city: [primaryAddress?.city, primaryAddress?.wilaya, primaryAddress?.postalCode]
          .filter(Boolean)
          .join(', '),
      },
    });
  } catch {
    return NextResponse.json({ supplier: null, tier: null });
  }
}

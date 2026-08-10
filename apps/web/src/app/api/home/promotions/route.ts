export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Promotion } from '@agrimed/db/models';

export async function GET() {
  try {
    await connectDB();

    const now = new Date();

    const promotions = await Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ endDate: 1, createdAt: -1 })
      .populate('supplierId', 'slug companyName logo sector isVerified')
      .lean();

    const normalized = promotions.map((promotion: any) => ({
      _id: promotion._id.toString(),
      title: promotion.title,
      description: promotion.description,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      supplier: {
        slug: promotion.supplierId?.slug || '',
        companyName: promotion.supplierId?.companyName || 'Fournisseur',
        logo: promotion.supplierId?.logo || '',
        sector: promotion.supplierId?.sector || 'BOTH',
        isVerified: !!promotion.supplierId?.isVerified,
      },
    }));

    return NextResponse.json({ promotions: normalized });
  } catch (error) {
    console.error('Home promotions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Supplier, User } from '@agrimed/db/models';

// GET — list verified suppliers + add user role info for SUPER_SUPPLIER identification
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const sector = searchParams.get('sector');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

    const query: Record<string, unknown> = { isVerified: true };
    if (sector && ['MEDICAL', 'AGRICULTURAL', 'BOTH'].includes(sector)) {
      query.sector = sector;
    }

    const suppliers = await Supplier.find(query)
      .select('userId companyName slug logo sector description addresses stats')
      .sort({ 'stats.totalProducts': -1 })
      .limit(limit)
      .lean();

    // Fetch user roles for suppliers to identify SUPER_SUPPLIER
    const supplierUserIds = suppliers.map((s: any) => s.userId).filter(Boolean);
    const users = supplierUserIds.length
      ? await User.find({ _id: { $in: supplierUserIds } }).select('_id role').lean()
      : [];
    const usersById = new Map(users.map((u: any) => [u._id.toString(), u]));

    // Add role info to suppliers
    const suppliersWithRole = suppliers.map((supplier: any) => {
      const user = usersById.get(supplier.userId?.toString());
      return {
        ...supplier,
        userRole: user?.role,
      };
    });

    // Sort: SUPER_SUPPLIER first (priority), then by totalProducts descending
    suppliersWithRole.sort((a: any, b: any) => {
      const aIsSuperSupplier = a.userRole === 'SUPER_SUPPLIER' ? 0 : 1;
      const bIsSuperSupplier = b.userRole === 'SUPER_SUPPLIER' ? 0 : 1;
      
      if (aIsSuperSupplier !== bIsSuperSupplier) {
        return aIsSuperSupplier - bIsSuperSupplier;
      }
      
      return (b.stats?.totalProducts || 0) - (a.stats?.totalProducts || 0);
    });

    return NextResponse.json({ suppliers: suppliersWithRole });
  } catch (error) {
    console.error('Suppliers list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

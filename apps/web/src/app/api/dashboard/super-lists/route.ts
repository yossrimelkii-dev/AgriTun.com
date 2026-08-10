export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Supplier } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

// GET — list all super lists for this SUPER_SUPPLIER
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireRole('SUPER_SUPPLIER');
    type SupplierSuperGrossViewList = {
      _id: mongoose.Types.ObjectId;
      createdAt?: Date;
      settings?: {
        superGrossViewList?: mongoose.Types.ObjectId[];
      };
    };

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

    const query: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(session.userId),
    };

    if (cursor && mongoose.isValidObjectId(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    // Query from settings.superGrossViewList — for now, we'll return the supplier's own setting
    const supplier = (await Supplier.findOne({ userId: new mongoose.Types.ObjectId(session.userId) })
      .select('settings.superGrossViewList createdAt')
      .lean()) as SupplierSuperGrossViewList | null;

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 400 });
    }

    // For now, treat superGrossViewList as a single "list" with array of supplier IDs
    const lists = [
      {
        _id: supplier._id,
        name: 'Prime Fournisseurs (Prix Super Gros)',
        isPublished: true,
        supplierIds: supplier.settings?.superGrossViewList || [],
        createdAt: supplier.createdAt || new Date(),
      },
    ];

    return NextResponse.json({ lists, hasMore: false });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('List super-lists error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — create/update the super supplier list
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireRole('SUPER_SUPPLIER');

    const body = await req.json();
    const { supplierIds, isPublished } = body;

    if (!Array.isArray(supplierIds)) {
      return NextResponse.json({ error: 'supplierIds must be an array' }, { status: 400 });
    }

    // Validate that all IDs are valid ObjectIds
    const validIds = supplierIds.filter((id: any) => {
      try {
        return mongoose.isValidObjectId(id);
      } catch {
        return false;
      }
    });

    // Update supplier's superGrossViewList
    const supplier = await Supplier.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(session.userId) },
      {
        $set: {
          'settings.superGrossViewList': validIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
      { new: true }
    ).lean();

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 400 });
    }

    return NextResponse.json({
      list: {
        _id: supplier._id,
        name: 'Prime Fournisseurs (Prix Super Gros)',
        isPublished: isPublished !== false,
        supplierIds: validIds,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create super-list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

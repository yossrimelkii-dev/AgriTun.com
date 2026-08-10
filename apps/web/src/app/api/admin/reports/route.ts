export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Report, User, Product, Supplier } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';
import mongoose from 'mongoose';

// GET — list all reports
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Enrich with reporter emails and target names
    const reporterIds = [...new Set(reports.map((r: any) => r.reporterId?.toString()).filter(Boolean))];
    const productIds = reports.filter((r: any) => r.targetType === 'PRODUCT').map((r: any) => r.targetId);
    const supplierIds = reports.filter((r: any) => r.targetType === 'SUPPLIER').map((r: any) => r.targetId);

    const [reporters, products, suppliers] = await Promise.all([
      reporterIds.length ? User.find({ _id: { $in: reporterIds } }).select('email').lean() : [],
      productIds.length ? Product.find({ _id: { $in: productIds } }).select('name').lean() : [],
      supplierIds.length ? Supplier.find({ _id: { $in: supplierIds } }).select('companyName').lean() : [],
    ]);

    const reporterMap = new Map((reporters as any[]).map((u) => [u._id.toString(), u.email]));
    const productMap = new Map((products as any[]).map((p) => [p._id.toString(), p.name]));
    const supplierMap = new Map((suppliers as any[]).map((s) => [s._id.toString(), s.companyName]));

    const enriched = reports.map((r: any) => ({
      ...r,
      reporterEmail: reporterMap.get(r.reporterId?.toString()) || null,
      targetName: r.targetType === 'PRODUCT'
        ? productMap.get(r.targetId?.toString()) || null
        : supplierMap.get(r.targetId?.toString()) || null,
    }));

    return NextResponse.json({ reports: enriched });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — update report status
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireRole('ADMIN');

    const { reportId, status } = await req.json();
    if (!reportId || !status) {
      return NextResponse.json({ error: 'reportId and status are required' }, { status: 400 });
    }
    if (!['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const update: Record<string, unknown> = { status };
    if (status === 'RESOLVED' || status === 'DISMISSED') {
      update.resolvedBy = new mongoose.Types.ObjectId(session.userId);
      update.resolvedAt = new Date();
    }

    const report = await Report.findByIdAndUpdate(reportId, update, { new: true }).lean();
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin report update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Supplier, User } from '@agrimed/db/models';
import { requireSupplier } from '@/lib/auth/session';
import mongoose from 'mongoose';

interface SubscriptionRequest {
  _id: string;
  supplierId: string;
  userId: string;
  currentRole: string;
  requestedRole: string;
  requestedPlan: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  priceRange: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SupplierWithUpgradeStatus {
  supplier: any;
  currentPlan: string;
  upgradeRequest: SubscriptionRequest | null;
}

// GET — list supplier's upgrade requests
export async function GET() {
  try {
    await connectDB();
    const session = await requireSupplier();

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not initialized');

    const requests = await db
      .collection('subscriptionrequests')
      .find({ supplierId: new mongoose.Types.ObjectId(session.supplierId) })
      .sort({ createdAt: -1 })
      .toArray();

    const supplier = await Supplier.findById(session.supplierId).select('userId').lean();
    const user = await User.findById(supplier?.userId).select('role').lean();

    const planMap: Record<string, string> = {
      SUPPLIER: 'Pointe de vente',
      SUPPLIER_PRIME: 'Grossist',
      SUPER_SUPPLIER: 'Source',
    };

    return NextResponse.json({
      currentRole: user?.role || 'SUPPLIER',
      currentPlan: planMap[user?.role || 'SUPPLIER'] || 'Pointe de vente',
      requests: requests.map((req: any) => ({
        _id: req._id?.toString(),
        ...req,
      })),
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST — request subscription upgrade
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireSupplier();
    const body = await req.json();

    const requestedRole = String(body?.requestedRole ?? '').trim();
    const reason = String(body?.reason ?? '').trim();

    if (!['SUPPLIER_PRIME', 'SUPER_SUPPLIER'].includes(requestedRole)) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
    }

    const supplier = await Supplier.findById(session.supplierId).select('userId').lean();
    const user = await User.findById(supplier?.userId).select('role').lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentRole = user.role;

    // Prevent downgrading or requesting same level
    const roleHierarchy: Record<string, number> = {
      SUPPLIER: 1,
      SUPPLIER_PRIME: 2,
      SUPER_SUPPLIER: 3,
    };

    const currentLevel = roleHierarchy[currentRole] || 0;
    const requestedLevel = roleHierarchy[requestedRole] || 0;

    if (requestedLevel <= currentLevel) {
      return NextResponse.json({ error: 'Cannot downgrade or request the same plan' }, { status: 400 });
    }

    // Check if there's already a pending request
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not initialized');

    const existingRequest = await db.collection('subscriptionrequests').findOne({
      supplierId: new mongoose.Types.ObjectId(session.supplierId),
      status: 'PENDING',
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending upgrade request' }, { status: 400 });
    }

    const planPrices: Record<string, string> = {
      SUPPLIER_PRIME: '200-250 DT/month',
      SUPER_SUPPLIER: '300-350 DT/month',
    };

    const newRequest = {
      supplierId: new mongoose.Types.ObjectId(session.supplierId),
      userId: new mongoose.Types.ObjectId(session.userId),
      currentRole,
      requestedRole,
      requestedPlan: requestedRole === 'SUPPLIER_PRIME' ? 'Grossist' : 'Source',
      status: 'PENDING',
      priceRange: planPrices[requestedRole],
      reason: reason || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('subscriptionrequests').insertOne(newRequest);

    return NextResponse.json(
      {
        request: {
          _id: result.insertedId.toString(),
          ...newRequest,
        },
      },
      { status: 201 }
    );
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    console.error('Subscription request error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

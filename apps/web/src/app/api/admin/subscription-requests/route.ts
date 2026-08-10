export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { User, Supplier } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';
import mongoose from 'mongoose';

// GET — list all subscription requests
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireRole('ADMIN');

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not initialized');

    // Get all subscription requests with supplier and user info
    const requests = await db
      .collection('subscriptionrequests')
      .aggregate([
        {
          $lookup: {
            from: 'suppliers',
            localField: 'supplierId',
            foreignField: '_id',
            as: 'supplier',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$supplier' },
        { $unwind: '$user' },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();

    return NextResponse.json({ requests: requests || [] });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH — approve or reject a subscription request
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireRole('ADMIN');
    const body = await req.json();

    const requestId = String(body?.requestId ?? '').trim();
    const action = String(body?.action ?? '').trim();

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not initialized');

    const subscriptionRequest = await db.collection('subscriptionrequests').findOne({
      _id: new mongoose.Types.ObjectId(requestId),
    });

    if (!subscriptionRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      // Update user role
      await User.findByIdAndUpdate(subscriptionRequest.userId, {
        role: subscriptionRequest.requestedRole,
      });

      // Update supplier subscription
      const planDetails = {
        SUPPLIER_PRIME: {
          planName: 'Grossist',
          maxProducts: 200,
          featuredSlots: 5,
          analyticsAccess: true,
        },
        SUPER_SUPPLIER: {
          planName: 'Source',
          maxProducts: undefined,
          featuredSlots: 20,
          analyticsAccess: true,
        },
      };

      const details = planDetails[subscriptionRequest.requestedRole as keyof typeof planDetails];

      await Supplier.findByIdAndUpdate(subscriptionRequest.supplierId, {
        subscription: {
          planName: details?.planName,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isActive: true,
          maxProducts: details?.maxProducts,
          featuredSlots: details?.featuredSlots,
          analyticsAccess: details?.analyticsAccess,
        },
      });

      // Update request status
      await db.collection('subscriptionrequests').updateOne(
        { _id: new mongoose.Types.ObjectId(requestId) },
        {
          $set: {
            status: 'APPROVED',
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({ message: 'Upgrade approved' });
    } else {
      // REJECT
      await db.collection('subscriptionrequests').updateOne(
        { _id: new mongoose.Types.ObjectId(requestId) },
        {
          $set: {
            status: 'REJECTED',
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({ message: 'Upgrade rejected' });
    }
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    console.error('Admin subscription error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

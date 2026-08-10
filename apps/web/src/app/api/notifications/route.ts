export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Notification } from '@agrimed/db/models';
import { requireAuth } from '@/lib/auth/session';

// GET — list notifications for the authenticated user
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireAuth();

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);
    const unreadOnly = searchParams.get('unread') === 'true';

    const query: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(session.userId),
    };

    if (unreadOnly) query.isRead = false;
    if (cursor) query._id = { $lt: new mongoose.Types.ObjectId(cursor) };

    const notifications = await Notification.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = notifications.length > limit;
    const data = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? data[data.length - 1]?._id?.toString() : undefined;

    // Also get unread count
    const unreadCount = await Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(session.userId),
      isRead: false,
    });

    return NextResponse.json({ notifications: data, nextCursor, hasMore, unreadCount });
  } catch (error) {
    console.error('Notification list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireAuth();

    const { ids } = await req.json();

    if (ids && Array.isArray(ids)) {
      // Mark specific notifications as read
      await Notification.updateMany(
        {
          _id: { $in: ids.map((id: string) => new mongoose.Types.ObjectId(id)) },
          userId: new mongoose.Types.ObjectId(session.userId),
        },
        { $set: { isRead: true, readAt: new Date() } }
      );
    } else {
      // Mark all as read
      await Notification.updateMany(
        {
          userId: new mongoose.Types.ObjectId(session.userId),
          isRead: false,
        },
        { $set: { isRead: true, readAt: new Date() } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Message, User } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// GET /api/messages — list conversations (threads) for current user
// ?threadId=xxx — get messages in a specific thread
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');

    if (threadId) {
      // Verify user is part of this thread
      const threadParts = threadId.split('_');
      if (!threadParts.includes(session.userId)) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      }

      const messages = await Message.find({ threadId })
        .sort({ createdAt: 1 })
        .limit(100)
        .lean();

      // Mark unread messages as read
      await Message.updateMany(
        { threadId, recipientId: session.userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return NextResponse.json({ messages });
    }

    // List threads: get latest message per thread the user is involved in
    const uid = new mongoose.Types.ObjectId(session.userId);
    const threads = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: uid },
            { recipientId: uid },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$threadId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipientId', uid] },
                    { $eq: ['$isRead', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: 50 },
    ]);

    // Get participant info
    const participantIds = new Set<string>();
    for (const t of threads) {
      participantIds.add(t.lastMessage.senderId.toString());
      participantIds.add(t.lastMessage.recipientId.toString());
    }
    participantIds.delete(session.userId);

    const participants = await User.find({
      _id: { $in: Array.from(participantIds) },
    })
      .select('firstName lastName email role')
      .lean();
    const participantMap = new Map(participants.map((p: any) => [p._id.toString(), p]));

    const threadList = threads.map((t: any) => {
      const otherId =
        t.lastMessage.senderId.toString() === session.userId
          ? t.lastMessage.recipientId.toString()
          : t.lastMessage.senderId.toString();
      return {
        threadId: t._id,
        lastMessage: t.lastMessage,
        unreadCount: t.unreadCount,
        participant: participantMap.get(otherId) || null,
      };
    });

    return NextResponse.json({ threads: threadList });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/messages — send a message
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { recipientId, content } = await req.json();
    if (!recipientId || !content?.trim()) {
      return NextResponse.json({ error: 'recipientId et content requis' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Message trop long (max 2000 caractères)' }, { status: 400 });
    }

    await connectDB();

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 });
    }

    // Deterministic thread ID: sort user IDs alphabetically
    const ids = [session.userId, recipientId].sort();
    const threadId = `${ids[0]}_${ids[1]}`;

    const message = await Message.create({
      senderId: session.userId,
      recipientId,
      threadId,
      content: content.trim(),
      isRead: false,
      attachments: [],
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { AgriHelpRequest, User } from '@agrimed/db';
import { requireAuth, requireRole } from '@/lib/auth/session';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await requireAuth();
    await connectDB();

    const query: Record<string, unknown> = {};

    const role = session.role as string;

    if (role === 'BUYER') {
      query.peasantId = new mongoose.Types.ObjectId(session.userId);
    } else if (role === 'AGRI_ENGINEER') {
      query.$or = [
        { engineerId: new mongoose.Types.ObjectId(session.userId) },
        { status: 'OPEN', engineerId: { $exists: false } },
        { status: 'OPEN', engineerId: null },
      ];
    } else if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requests = await AgriHelpRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ requests });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('BUYER');
    await connectDB();

    const body = await req.json();

    const titleInput = String(body?.title ?? '').trim();
    const descriptionInput = String(body?.description ?? '').trim();
    const initialMessage = String(body?.initialMessage ?? '').trim();
    const speciality = String(body?.speciality ?? '').trim();
    const engineerIdRaw = String(body?.engineerId ?? '').trim();
    const imageUrls = Array.isArray(body?.imageUrls)
      ? body.imageUrls.filter((u: unknown) => typeof u === 'string').map((u: string) => u.trim()).filter(Boolean)
      : [];

    const title = titleInput || (initialMessage ? `Demande agronomique — ${speciality}` : '');
    const description = descriptionInput || initialMessage;

    if (!title || !description || !speciality) {
      return NextResponse.json({ error: 'title, description et speciality sont requis' }, { status: 400 });
    }

    let engineerId: mongoose.Types.ObjectId | undefined;
    if (engineerIdRaw) {
      if (!mongoose.isValidObjectId(engineerIdRaw)) {
        return NextResponse.json({ error: 'Ingénieur sélectionné invalide' }, { status: 400 });
      }

      const engineer = await User.findOne({ _id: engineerIdRaw, role: 'AGRI_ENGINEER' }).select('_id').lean();
      if (!engineer) {
        return NextResponse.json({ error: 'Ingénieur introuvable' }, { status: 404 });
      }

      engineerId = new mongoose.Types.ObjectId(engineerIdRaw);
    }

    const created = await AgriHelpRequest.create({
      peasantId: new mongoose.Types.ObjectId(session.userId),
      engineerId,
      speciality,
      title,
      description,
      imageUrls,
      status: 'OPEN',
      discussion: initialMessage
        ? [
            {
              senderId: new mongoose.Types.ObjectId(session.userId),
              message: initialMessage,
              createdAt: new Date(),
            },
          ]
        : [],
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

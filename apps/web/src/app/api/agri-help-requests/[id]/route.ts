export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { AgriHelpRequest } from '@agrimed/db';
import { requireAuth } from '@/lib/auth/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const role = session.role as string;
    await connectDB();

    const id = params.id;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json();
    const action = String(body?.action ?? '');

    const requestDoc = await AgriHelpRequest.findById(id);
    if (!requestDoc) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const isOwner = requestDoc.peasantId.toString() === session.userId;
    const isEngineerOwner = requestDoc.engineerId?.toString() === session.userId;

    if (action === 'claim') {
      if (role !== 'AGRI_ENGINEER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (requestDoc.engineerId && requestDoc.engineerId.toString() !== session.userId) {
        return NextResponse.json({ error: 'Déjà attribuée à un autre ingénieur' }, { status: 409 });
      }

      requestDoc.engineerId = new mongoose.Types.ObjectId(session.userId);
      if (requestDoc.status === 'OPEN') requestDoc.status = 'IN_PROGRESS';
      await requestDoc.save();
      return NextResponse.json({ request: requestDoc });
    }

    if (action === 'reply') {
      if (!isOwner && !isEngineerOwner && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (role === 'BUYER' && requestDoc.status === 'OPEN' && (requestDoc.discussion?.length ?? 0) > 0) {
        return NextResponse.json({ error: 'En attente d\'acceptation du spécialiste' }, { status: 409 });
      }

      const message = String(body?.message ?? '').trim();
      if (!message) {
        return NextResponse.json({ error: 'Message requis' }, { status: 400 });
      }

      requestDoc.discussion.push({
        senderId: new mongoose.Types.ObjectId(session.userId),
        message,
        createdAt: new Date(),
      });

      if (role === 'AGRI_ENGINEER') {
        const recommendation = String(body?.engineerRecommendation ?? '').trim();
        if (recommendation) {
          requestDoc.engineerRecommendation = recommendation;
        }
        if (!requestDoc.engineerId) {
          requestDoc.engineerId = new mongoose.Types.ObjectId(session.userId);
        }
        requestDoc.status = 'IN_PROGRESS';
      }

      await requestDoc.save();
      return NextResponse.json({ request: requestDoc });
    }

    if (action === 'submit_result') {
      if (!isOwner && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const hasExistingFeedback = Boolean(
        requestDoc.feedback?.createdAt ||
          typeof requestDoc.feedback?.stars === 'number' ||
          (requestDoc.feedback?.comment && requestDoc.feedback.comment.trim().length > 0)
      );

      if (hasExistingFeedback) {
        return NextResponse.json({ error: 'Feedback déjà soumis pour cette demande' }, { status: 409 });
      }

      if (requestDoc.status === 'OPEN') {
        return NextResponse.json({ error: 'Vous devez terminer l\'aide avant de laisser un feedback' }, { status: 409 });
      }

      if (!requestDoc.engineerId) {
        return NextResponse.json({ error: 'Aucun spécialiste assigné à cette demande' }, { status: 409 });
      }

      const peasantResult = String(body?.peasantResult ?? '').trim();
      const stars = Number(body?.stars);
      const comment = String(body?.comment ?? '').trim();

      if (!peasantResult) {
        return NextResponse.json({ error: 'Résultat requis' }, { status: 400 });
      }

      if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
        return NextResponse.json({ error: 'La note doit être entre 1 et 5' }, { status: 400 });
      }

      requestDoc.peasantResult = peasantResult;
      requestDoc.feedback = {
        stars,
        comment,
        createdAt: new Date(),
      };
      requestDoc.status = 'RESOLVED';
      await requestDoc.save();

      return NextResponse.json({ request: requestDoc });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Event, EventParticipation } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const event = await Event.findOne({ _id: params.id, isActive: true }).lean();
    if (!event) {
      return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });
    }

    if (!event.allowParticipation) {
      return NextResponse.json({ error: 'Participation fermée' }, { status: 400 });
    }

    const body = await req.json();
    const rawAnswers = Array.isArray(body?.answers) ? body.answers : [];

    const answersByQuestionId = new Map<string, string>(
      rawAnswers
        .map((item: any) => [String(item?.questionId ?? ''), String(item?.value ?? '').trim()])
        .filter(([questionId]) => Boolean(questionId))
    );

    const normalizedAnswers = event.participationFormEnabled
      ? event.participationFormQuestions.map((question) => ({
          questionId: question.id,
          label: question.label,
          value: String(answersByQuestionId.get(question.id) ?? '').trim(),
          required: question.required,
        }))
      : [];

    const missingRequired = normalizedAnswers.find((answer) => answer.required && !answer.value);
    if (missingRequired) {
      return NextResponse.json(
        { error: `La question "${missingRequired.label}" est obligatoire` },
        { status: 400 }
      );
    }

    try {
      await EventParticipation.create({
        eventId: event._id,
        userId: new mongoose.Types.ObjectId(session.userId),
        answers: normalizedAnswers.map(({ required, ...answer }) => answer),
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        return NextResponse.json({ error: 'Vous participez déjà à cet événement' }, { status: 409 });
      }
      throw error;
    }

    await Event.updateOne({ _id: event._id }, { $inc: { 'stats.participants': 1 } });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Event participation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

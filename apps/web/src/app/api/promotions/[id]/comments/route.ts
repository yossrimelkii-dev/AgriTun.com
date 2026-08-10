export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { HeroSlide, PromotionComment, User } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const comments = await PromotionComment.find({ slideId: params.id })
      .select('authorName content createdAt userId')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const userIds = comments
      .map((comment) => comment.userId)
      .filter(Boolean);

    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select('_id role profile.firstName profile.lastName profile.speciality')
          .lean()
      : [];

    const usersById = new Map(users.map((user) => [String(user._id), user]));

    const enrichedComments = comments.map((comment) => {
      const authorId = String(comment.userId);
      const author = usersById.get(authorId);
      const isSpecialist = author?.role === 'AGRI_ENGINEER';
      const fallbackName = comment.authorName || 'Utilisateur';
      const fullName = [author?.profile?.firstName, author?.profile?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      return {
        _id: comment._id,
        authorName: fullName || fallbackName,
        authorId,
        authorRole: author?.role || 'BUYER',
        authorSpeciality: author?.profile?.speciality || '',
        profileUrl: isSpecialist ? `/specialists/${authorId}` : `/users/${authorId}`,
        isSpecialist,
        content: comment.content,
        createdAt: comment.createdAt,
      };
    });

    return NextResponse.json({ comments: enrichedComments });
  } catch (error) {
    console.error('Promotion comments fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const slide = await HeroSlide.findById(params.id).select('_id').lean();
    if (!slide) {
      return NextResponse.json({ error: 'Promotion introuvable' }, { status: 404 });
    }

    const body = await req.json();
    const content = String(body?.content ?? '').trim();

    if (!content) {
      return NextResponse.json({ error: 'Commentaire requis' }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: 'Commentaire trop long (max 2000 caractères)' }, { status: 400 });
    }

    const user = await User.findById(session.userId).select('profile.firstName profile.lastName').lean();
    const authorName = user
      ? `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim()
      : 'Utilisateur';

    const comment = await PromotionComment.create({
      slideId: new mongoose.Types.ObjectId(params.id),
      userId: new mongoose.Types.ObjectId(session.userId),
      authorName: authorName || 'Utilisateur',
      content,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Promotion comment create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
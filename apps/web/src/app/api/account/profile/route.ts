import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { User } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// GET /api/account/profile — get current user profile
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.userId)
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/account/profile — update current user profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const allowedFields = ['firstName', 'lastName', 'phone', 'company'];
    const updates: Record<string, string> = {};
    for (const key of allowedFields) {
      if (typeof body[key] === 'string') {
        updates[key] = body[key].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune mise à jour' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(session.userId, updates, {
      new: true,
      runValidators: true,
    })
      .select('-password')
      .lean();

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

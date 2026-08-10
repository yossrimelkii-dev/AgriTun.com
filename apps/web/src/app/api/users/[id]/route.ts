export const dynamic = 'force-dynamic';

import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB, User } from '@agrimed/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const user = await User.findById(params.id)
      .select('_id role profile.firstName profile.lastName profile.avatarUrl profile.bio profile.city profile.country profile.speciality createdAt')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: String(user._id),
        role: user.role,
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        avatarUrl: user.profile?.avatarUrl || '',
        bio: user.profile?.bio || '',
        city: user.profile?.city || '',
        country: user.profile?.country || '',
        speciality: user.profile?.speciality || '',
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Public user profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

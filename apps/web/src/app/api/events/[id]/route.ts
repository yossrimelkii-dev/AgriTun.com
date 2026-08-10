export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Event, EventParticipation, Supplier, User } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const event = await Event.findOne({ _id: params.id, isActive: true }).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const supplier = await Supplier.findById(event.supplierId)
      .select('companyName slug logo isVerified')
      .lean();
    const specialist = supplier
      ? null
      : await User.findOne({ _id: event.supplierId, role: 'AGRI_ENGINEER' })
          .select('profile.firstName profile.lastName profile.speciality profile.avatarUrl email')
          .lean();

    const session = await getSession();
    let alreadyJoined = false;

    if (session?.userId) {
      const participation = await EventParticipation.findOne({
        eventId: event._id,
        userId: session.userId,
      })
        .select('_id')
        .lean();
      alreadyJoined = Boolean(participation);
    }

    return NextResponse.json({
      event,
      supplier: supplier
        ? {
            id: String(supplier._id),
            companyName: supplier.companyName,
            slug: supplier.slug,
            logo: supplier.logo,
            isVerified: supplier.isVerified,
          }
        : null,
      specialist: specialist
        ? {
            id: String(specialist._id),
            firstName: specialist.profile?.firstName || '',
            lastName: specialist.profile?.lastName || '',
            speciality: specialist.profile?.speciality || '',
            avatarUrl: specialist.profile?.avatarUrl || '',
            email: specialist.email,
          }
        : null,
      alreadyJoined,
    });
  } catch (error) {
    console.error('Event detail fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

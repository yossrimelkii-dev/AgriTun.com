export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Event, Supplier, User } from '@agrimed/db/models';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const limitParam = Number(req.nextUrl.searchParams.get('limit') || 24);
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 24, 1), 60);

    const events = await Event.find({ isActive: true })
      .sort({ eventDate: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    if (events.length === 0) {
      return NextResponse.json({ events: [] });
    }

    const supplierIds = Array.from(new Set(events.map((event) => String(event.supplierId)).filter(Boolean)));
    const suppliers = await Supplier.find({ _id: { $in: supplierIds } })
      .select('companyName slug logo isVerified')
      .lean();
    const specialists = await User.find({ _id: { $in: supplierIds }, role: 'AGRI_ENGINEER' })
      .select('profile.firstName profile.lastName profile.speciality profile.avatarUrl email')
      .lean();

    const suppliersById = new Map(suppliers.map((supplier) => [String(supplier._id), supplier]));
    const specialistsById = new Map(specialists.map((specialist) => [String(specialist._id), specialist]));

    const payload = events.map((event) => {
      const supplier = suppliersById.get(String(event.supplierId));
      const specialist = specialistsById.get(String(event.supplierId));

      return {
        _id: String(event._id),
        title: event.title,
        description: event.description,
        imageUrl: event.imageUrl,
        eventDate: event.eventDate,
        organizer: event.organizer,
        allowParticipation: event.allowParticipation,
        stats: event.stats || { participants: 0 },
        supplier: supplier
          ? {
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
      };
    });

    return NextResponse.json({ events: payload });
  } catch (error) {
    console.error('Events list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

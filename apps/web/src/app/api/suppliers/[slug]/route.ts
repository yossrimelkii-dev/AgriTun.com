export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Supplier, Product, User, Event } from '@agrimed/db/models';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();

    const supplier = await Supplier.findOne({ slug: params.slug, isVerified: true }).lean();
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const owner = await User.findById(supplier.userId).select('email').lean();

    // Get supplier's active products
    const products = await Product.find({
      supplierId: supplier._id,
      status: 'ACTIVE',
    })
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(50)
      .lean();

    const events = await Event.find({
      supplierId: supplier._id,
      isActive: true,
    })
      .sort({ eventDate: -1, createdAt: -1 })
      .limit(8)
      .lean();

    // Increment profile views
    await Supplier.updateOne(
      { _id: supplier._id },
      { $inc: { 'stats.profileViews': 1 } }
    );

    return NextResponse.json({
      supplier: {
        ...supplier,
        contactEmail: owner?.email || null,
      },
      products,
      events: events.map((event) => ({
        _id: String(event._id),
        title: event.title,
        description: event.description,
        imageUrl: event.imageUrl,
        eventDate: event.eventDate,
        organizer: event.organizer,
        allowParticipation: event.allowParticipation,
        stats: event.stats || { participants: 0 },
      })),
    });
  } catch (error) {
    console.error('Supplier profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

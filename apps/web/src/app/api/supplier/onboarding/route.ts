import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Supplier, User } from '@agrimed/db/models';
import { requireAuth } from '@/lib/auth/session';
import { signAccessToken, buildJWTPayload } from '@/lib/auth/tokens';

export const dynamic = 'force-dynamic';

// POST /api/supplier/onboarding — create supplier profile after registration
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== 'SUPPLIER') {
      return NextResponse.json({ error: 'Réservé aux fournisseurs' }, { status: 403 });
    }

    await connectDB();

    // Check if supplier profile already exists
    const existing = await Supplier.findOne({ userId: session.userId });
    if (existing) {
      return NextResponse.json({ error: 'Profil déjà créé', supplierId: existing._id.toString() }, { status: 409 });
    }

    const body = await req.json();
    const { companyName, sector, description, city, wilaya, phone } = body;

    if (!companyName?.trim() || !sector) {
      return NextResponse.json({ error: 'Nom d\'entreprise et secteur requis' }, { status: 400 });
    }

    if (!['MEDICAL', 'AGRICULTURAL', 'BOTH'].includes(sector)) {
      return NextResponse.json({ error: 'Secteur invalide' }, { status: 400 });
    }

    // Generate unique slug
    const baseSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    const supplier = await Supplier.create({
      userId: session.userId,
      companyName: companyName.trim(),
      slug: uniqueSlug,
      sector,
      description: description?.trim() || undefined,
      isVerified: false,
      addresses: city || wilaya ? [{
        city: city?.trim(),
        wilaya: wilaya?.trim(),
        country: 'TN',
        isHeadquarters: true,
      }] : [],
      subscription: { isActive: false },
      settings: {
        showPhonePublicly: false,
        autoConfirmOrders: false,
        notifyNewOrder: true,
        notifyLowStock: true,
      },
    });

    // Update user phone if provided
    if (phone?.trim()) {
      await User.findByIdAndUpdate(session.userId, { phone: phone.trim() });
    }

    // Issue new access token with supplierId
    const user = await User.findById(session.userId).lean();
    if (user) {
      const jwtPayload = buildJWTPayload({
        ...user,
        supplierId: supplier._id.toString(),
      });
      const accessToken = await signAccessToken(jwtPayload);

      const response = NextResponse.json({
        supplier: {
          id: supplier._id.toString(),
          slug: supplier.slug,
          companyName: supplier.companyName,
          sector: supplier.sector,
        },
      }, { status: 201 });

      response.cookies.set('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({
      supplier: { id: supplier._id.toString(), slug: supplier.slug },
    }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Onboarding error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Supplier } from '@agrimed/db/models';
import { requireSupplier } from '@/lib/auth/session';

export async function GET() {
  try {
    await connectDB();
    const session = await requireSupplier();

    const supplier = await Supplier.findOne({ userId: session.userId }).lean();
    if (!supplier) {
      return NextResponse.json({ error: 'Profil fournisseur introuvable' }, { status: 404 });
    }

    return NextResponse.json({ supplier });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    if (error?.message === 'SUPPLIER_PROFILE_REQUIRED') {
      return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    }
    console.error('Supplier settings fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireSupplier();

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.companyName === 'string' && body.companyName.trim()) {
      updates.companyName = body.companyName.trim();
    }
    if (typeof body.description === 'string') {
      updates.description = body.description.trim();
    }
    if (typeof body.taxId === 'string') {
      updates.taxId = body.taxId.trim();
    }
    if (typeof body.logo === 'string') {
      const trimmed = body.logo.trim();
      if (trimmed === '' || /^https?:\/\//i.test(trimmed)) {
        updates.logo = trimmed;
      } else {
        return NextResponse.json({ error: 'Logo URL invalide' }, { status: 400 });
      }
    }
    if (body.address && typeof body.address === 'object') {
      updates.addresses = [
        {
          label: 'Siège',
          addressLine: typeof body.address.addressLine === 'string' ? body.address.addressLine.trim() : undefined,
          city: typeof body.address.city === 'string' ? body.address.city.trim() : undefined,
          wilaya: typeof body.address.wilaya === 'string' ? body.address.wilaya.trim() : undefined,
          postalCode: typeof body.address.postalCode === 'string' ? body.address.postalCode.trim() : undefined,
          country: 'TN',
          isHeadquarters: true,
        },
      ];
    }
    if (body.socialLinks && typeof body.socialLinks === 'object') {
      updates.socialLinks = {
        website: typeof body.socialLinks.website === 'string' ? body.socialLinks.website.trim() : undefined,
        linkedin: typeof body.socialLinks.linkedin === 'string' ? body.socialLinks.linkedin.trim() : undefined,
        facebook: typeof body.socialLinks.facebook === 'string' ? body.socialLinks.facebook.trim() : undefined,
        phone: typeof body.socialLinks.phone === 'string' ? body.socialLinks.phone.trim() : undefined,
        whatsapp: typeof body.socialLinks.whatsapp === 'string' ? body.socialLinks.whatsapp.trim() : undefined,
      };
    }

    if (typeof body.settings === 'object' && body.settings) {
      if (typeof (body.settings as any).showPhonePublicly === 'boolean') {
        updates['settings.showPhonePublicly'] = (body.settings as any).showPhonePublicly;
      }
      if (typeof (body.settings as any).autoConfirmOrders === 'boolean') {
        updates['settings.autoConfirmOrders'] = (body.settings as any).autoConfirmOrders;
      }
      if (typeof (body.settings as any).notifyNewOrder === 'boolean') {
        updates['settings.notifyNewOrder'] = (body.settings as any).notifyNewOrder;
      }
      if (typeof (body.settings as any).notifyLowStock === 'boolean') {
        updates['settings.notifyLowStock'] = (body.settings as any).notifyLowStock;
      }
    }

    if (typeof body.location === 'object' && body.location) {
      const lat = Number((body.location as any).lat);
      const lng = Number((body.location as any).lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json({ error: 'Coordonnées GPS invalides' }, { status: 400 });
      }

      updates['settings.location'] = {
        lat,
        lng,
        updatedAt: new Date(),
      };
    }

    if (body.location === null) {
      updates['settings.location'] = null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune mise à jour' }, { status: 400 });
    }

    const supplier = await Supplier.findOneAndUpdate(
      { userId: session.userId },
      { $set: updates },
      { new: true }
    ).lean();

    return NextResponse.json({ supplier });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    if (error?.message === 'SUPPLIER_PROFILE_REQUIRED') {
      return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    }
    console.error('Supplier settings update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
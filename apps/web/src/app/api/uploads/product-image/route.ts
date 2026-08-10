export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireSupplier } from '@/lib/auth/session';

function configureCloudinary() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('CLOUDINARY_NOT_CONFIGURED');
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireSupplier();
    configureCloudinary();

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    const maxSizeBytes = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: 'Image must be 8MB or less' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${bytes.toString('base64')}`;

    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: 'tunagri/products',
      resource_type: 'image',
      overwrite: false,
    });

    return NextResponse.json({
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    if (error?.message === 'SUPPLIER_PROFILE_REQUIRED') {
      return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    }
    if (error?.message === 'CLOUDINARY_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'Cloudinary config missing' }, { status: 500 });
    }
    console.error('Product image upload error:', error);
    return NextResponse.json({ error: 'Erreur upload image' }, { status: 500 });
  }
}

/**
 * One-time migration: convert base64 data-URI images stored in `categories.image`
 * to Cloudinary URLs so the landing-page API can actually deliver them.
 *
 * Usage:
 *   pnpm --filter @agrimed/db tsx src/migrate_category_images.ts
 *
 * Reads: MONGODB_URI, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 * Safe to re-run (idempotent — skips docs whose image is already an http(s) URL).
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Category } from './models/Category.js';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!mongoUri) throw new Error('MONGODB_URI is required');
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET are required');
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

  await mongoose.connect(mongoUri);
  console.log('→ Connected to Mongo');

  const cursor = Category.find({
    image: { $regex: '^data:', $options: 'i' },
  })
    .select('_id name slug image')
    .cursor();

  let scanned = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for await (const doc of cursor) {
    scanned += 1;
    const image = (doc.image as string | undefined) || '';
    if (!image.startsWith('data:')) {
      skipped += 1;
      continue;
    }

    try {
      const uploaded = await cloudinary.uploader.upload(image, {
        folder: 'tunagri/categories',
        resource_type: 'image',
        overwrite: false,
        transformation: [{ width: 800, height: 600, crop: 'fill', quality: 'auto' }],
        public_id: `migrated-${doc._id.toString()}`,
      });
      await Category.updateOne({ _id: doc._id }, { $set: { image: uploaded.secure_url } });
      migrated += 1;
      console.log(`  ✓ ${doc.slug || doc._id}  →  ${uploaded.secure_url}`);
    } catch (err: any) {
      failed += 1;
      console.error(`  ✗ ${doc.slug || doc._id}: ${err?.message || err}`);
    }
  }

  console.log('');
  console.log(`Scanned:  ${scanned}`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

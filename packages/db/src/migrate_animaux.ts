// @ts-nocheck
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load monorepo root .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './connection.js';
import { Category } from './models/Category.js';
import { Product } from './models/Product.js';

type CategoryDoc = {
  _id: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
  name: string;
  slug: string;
  sector: 'MEDICAL' | 'AGRICULTURAL' | 'BOTH';
  ancestors?: Array<{ _id: mongoose.Types.ObjectId; name: string; slug: string }>;
};

function toAnimauxName(name: string): string {
  const exactMap: Record<string, string> = {
    'Équipement Médical': 'Équipement des animaux',
    'Consommables Médicaux': 'Consommables pour animaux',
    'Diagnostic': 'Diagnostic animal',
    'Imagerie': 'Imagerie animale',
  };

  if (exactMap[name]) return exactMap[name]!;

  return name
    .replace(/médicaux/gi, 'animaux')
    .replace(/médicale/gi, 'animale')
    .replace(/médical/gi, 'animal');
}

function toAnimauxSlug(slug: string): string {
  const exactMap: Record<string, string> = {
    'equipement-medical': 'equipement-animaux',
    'consommables-medicaux': 'consommables-animaux',
    'diagnostic-medical': 'diagnostic-animal',
    'imagerie-medicale': 'imagerie-animale',
  };

  if (exactMap[slug]) return exactMap[slug]!;

  return slug
    .replace(/medicaux/gi, 'animaux')
    .replace(/medicale/gi, 'animale')
    .replace(/medical/gi, 'animal');
}

function defaultImageForProduct(product: any): string {
  const seed = encodeURIComponent(product?.slug || product?.name || String(product?._id));
  return `https://picsum.photos/seed/${seed}/1200/900.jpg`;
}

function isDirectImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png)(\?.*)?$/i.test(url.trim());
}

function isSupportedImageHost(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // Keep cloudflare/cdn plus the selected dummyimage provider.
    return (
      host === 'picsum.photos' ||
      host === 'cdn.agritun.com' ||
      host.endsWith('.r2.cloudflarestorage.com')
    );
  } catch {
    return false;
  }
}

async function migrate() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log(`🚀 Starting animaux migration${dryRun ? ' (dry-run)' : ''}...`);
  await connectDB();

  const categories = (await Category.find({}).lean()) as CategoryDoc[];
  const categoryById = new Map(categories.map((c) => [String(c._id), c]));

  // 1) Rename MEDICAL category names/slugs
  const categoryOps: any[] = [];
  const renameMap = new Map<string, { name: string; slug: string }>();

  for (const category of categories) {
    if (category.sector !== 'MEDICAL') continue;

    const newName = toAnimauxName(category.name);
    const newSlug = toAnimauxSlug(category.slug);

    if (newName !== category.name || newSlug !== category.slug) {
      renameMap.set(String(category._id), { name: newName, slug: newSlug });
      categoryOps.push({
        updateOne: {
          filter: { _id: category._id },
          update: { $set: { name: newName, slug: newSlug } },
        },
      });
    }
  }

  // 2) Rebuild ancestors for all categories to keep tree labels/slugs consistent
  for (const category of categories) {
    const ancestors: Array<{ _id: mongoose.Types.ObjectId; name: string; slug: string }> = [];
    let currentParentId = category.parentId;

    while (currentParentId) {
      const parent = categoryById.get(String(currentParentId));
      if (!parent) break;

      const renamed = renameMap.get(String(parent._id));
      ancestors.unshift({
        _id: parent._id,
        name: renamed?.name ?? parent.name,
        slug: renamed?.slug ?? parent.slug,
      });
      currentParentId = parent.parentId;
    }

    categoryOps.push({
      updateOne: {
        filter: { _id: category._id },
        update: { $set: { ancestors, depth: ancestors.length } },
      },
    });
  }

  if (!dryRun && categoryOps.length) {
    await Category.bulkWrite(categoryOps, { ordered: false });
  }

  // Refresh categories after updates to rebuild product categoryPath correctly
  const freshCategories = (await Category.find({}).lean()) as CategoryDoc[];
  const freshById = new Map(freshCategories.map((c) => [String(c._id), c]));

  // 3) Update products:
  //    - sync categoryPath names/slugs with latest category data
  //    - backfill missing product image URL
  const products = await Product.find({}).lean();
  const productOps: any[] = [];
  let imagesBackfilled = 0;
  let imagesNormalized = 0;
  let pathsUpdated = 0;

  for (const product of products as any[]) {
    let changed = false;
    const updateSet: Record<string, any> = {};

    // Rebuild categoryPath from parent chain + category
    const category = freshById.get(String(product.categoryId));
    if (category) {
      const rebuiltPath = [
        ...(category.ancestors || []),
        { _id: category._id, name: category.name, slug: category.slug },
      ];

      const oldPath = JSON.stringify(product.categoryPath || []);
      const newPath = JSON.stringify(rebuiltPath);
      if (oldPath !== newPath) {
        updateSet.categoryPath = rebuiltPath;
        pathsUpdated++;
        changed = true;
      }
    }

    // Ensure top-level product image URL exists and is directly renderable (.jpg/.png)
    const currentImages = Array.isArray(product.images) ? product.images : [];
    const validImages = currentImages.filter((img: any) => img?.url && typeof img.url === 'string');
    const hasDirectImage = validImages.some((img: any) => isDirectImageUrl(img.url));
    const hasSupportedHost = validImages.some((img: any) => isSupportedImageHost(img.url));

    if (validImages.length === 0) {
      updateSet.images = [
        {
          url: defaultImageForProduct(product),
          alt: product.name || 'Produit',
          order: 0,
        },
      ];
      imagesBackfilled++;
      changed = true;
    } else if (!hasDirectImage || !hasSupportedHost) {
      updateSet.images = [
        {
          url: defaultImageForProduct(product),
          alt: product.name || 'Produit',
          order: 0,
        },
      ];
      imagesNormalized++;
      changed = true;
    }

    if (changed) {
      productOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: updateSet },
        },
      });
    }
  }

  if (!dryRun && productOps.length) {
    await Product.bulkWrite(productOps, { ordered: false });
  }

  console.log('✅ Migration summary:');
  console.log(`   Categories touched: ${categoryOps.length}`);
  console.log(`   Product categoryPath updates: ${pathsUpdated}`);
  console.log(`   Product image URL backfilled: ${imagesBackfilled}`);
  console.log(`   Product image URL normalized (.jpg/.png): ${imagesNormalized}`);
  console.log(`   Dry run: ${dryRun ? 'YES (no writes)' : 'NO (writes applied)'}`);

  await disconnectDB();
  console.log('🏁 Done.');
}

migrate().catch(async (err) => {
  console.error('❌ Migration failed:', err);
  try {
    await disconnectDB();
  } catch {}
  process.exit(1);
});

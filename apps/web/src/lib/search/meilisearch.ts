import { Meilisearch } from 'meilisearch';

const client = new Meilisearch({
  host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_MASTER_KEY || 'local-dev-master-key',
});

export const PRODUCTS_INDEX = 'products';

// Initialize indexes and settings
export async function initSearchIndexes() {
  const index = client.index(PRODUCTS_INDEX);

  await index.updateSettings({
    searchableAttributes: ['name', 'description', 'tags', 'supplierName', 'categoryName'],
    filterableAttributes: ['sector', 'categoryId', 'supplierId', 'status', 'isFeatured', 'priceVisibility'],
    sortableAttributes: ['retailPrice', 'rating', 'totalOrders', 'createdAt'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  });

  return index;
}

// Sync a single product to Meilisearch
export async function indexProduct(product: {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  sector: string;
  status: string;
  tags?: string[];
  isFeatured?: boolean;
  priceVisibility?: string;
  categoryId?: string;
  categoryPath?: Array<{ name: string }>;
  supplierId?: string;
  supplierSnapshot?: { name: string; slug: string; isVerified: boolean; rating?: number };
  variants?: Array<{ pricing: { retailPrice: number }; stockQty: number }>;
  stats?: { rating: number; totalOrders: number; views: number };
  createdAt?: Date | string;
}) {
  const index = client.index(PRODUCTS_INDEX);

  const firstVariant = product.variants?.[0];
  const doc = {
    id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    description: product.description?.replace(/<[^>]*>/g, '').slice(0, 500),
    sector: product.sector,
    status: product.status,
    tags: product.tags || [],
    isFeatured: product.isFeatured || false,
    priceVisibility: product.priceVisibility || 'PUBLIC',
    categoryId: product.categoryId?.toString(),
    categoryName: product.categoryPath?.map((c) => c.name).join(' > ') || '',
    supplierId: product.supplierId?.toString(),
    supplierName: product.supplierSnapshot?.name || '',
    retailPrice: firstVariant?.pricing.retailPrice || 0,
    inStock: (firstVariant?.stockQty ?? 0) > 0,
    rating: product.stats?.rating || 0,
    totalOrders: product.stats?.totalOrders || 0,
    views: product.stats?.views || 0,
    createdAt: product.createdAt ? new Date(product.createdAt).getTime() : Date.now(),
  };

  await index.addDocuments([doc]);
}

// Remove a product from the index
export async function removeProduct(productId: string) {
  const index = client.index(PRODUCTS_INDEX);
  await index.deleteDocument(productId);
}

// Bulk sync all active products
export async function syncAllProducts(products: Array<Parameters<typeof indexProduct>[0]>) {
  const index = client.index(PRODUCTS_INDEX);

  const docs = products
    .filter((p) => p.status === 'ACTIVE')
    .map((product) => {
      const firstVariant = product.variants?.[0];
      return {
        id: product._id.toString(),
        name: product.name,
        slug: product.slug,
        description: product.description?.replace(/<[^>]*>/g, '').slice(0, 500),
        sector: product.sector,
        status: product.status,
        tags: product.tags || [],
        isFeatured: product.isFeatured || false,
        priceVisibility: product.priceVisibility || 'PUBLIC',
        categoryId: product.categoryId?.toString(),
        categoryName: product.categoryPath?.map((c) => c.name).join(' > ') || '',
        supplierId: product.supplierId?.toString(),
        supplierName: product.supplierSnapshot?.name || '',
        retailPrice: firstVariant?.pricing.retailPrice || 0,
        inStock: (firstVariant?.stockQty ?? 0) > 0,
        rating: product.stats?.rating || 0,
        totalOrders: product.stats?.totalOrders || 0,
        views: product.stats?.views || 0,
        createdAt: product.createdAt ? new Date(product.createdAt).getTime() : Date.now(),
      };
    });

  if (docs.length > 0) {
    await index.addDocuments(docs);
  }

  return docs.length;
}

// Perform a search
export async function searchProducts(
  query: string,
  options?: {
    sector?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
    sort?: string[];
  }
) {
  const index = client.index(PRODUCTS_INDEX);

  const filters: string[] = ['status = "ACTIVE"'];
  if (options?.sector) filters.push(`sector = "${options.sector}"`);
  if (options?.categoryId) filters.push(`categoryId = "${options.categoryId}"`);

  return index.search(query, {
    filter: filters.join(' AND '),
    limit: options?.limit || 20,
    offset: options?.offset || 0,
    sort: options?.sort,
    attributesToHighlight: ['name', 'description'],
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>',
  });
}

export { client as meilisearchClient };

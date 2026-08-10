'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/products/product-card';
import { Boxes, Stethoscope, Sprout, PackageOpen } from 'lucide-react';

export default function ProductsCatalogPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogContent />
    </Suspense>
  );
}

function CatalogSkeleton() {
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-72 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </main>
    </>
  );
}

function CatalogContent() {
  const searchParams = useSearchParams();
  const [sector, setSector] = useState(searchParams.get('sector') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState('newest');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', sector],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sector) params.set('sector', sector);
      const res = await fetch(`/api/categories?${params}`);
      return res.json();
    },
  });

  const allCategories: any[] = categoriesData?.categories || [];
  const resolvedCategoryId = category
    ? allCategories.find((c) => c._id === category || c.slug === category)?._id || category
    : '';

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products-catalog', sector, resolvedCategoryId, sort, cursor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sector) params.set('sector', sector);
      if (resolvedCategoryId) params.set('categoryId', resolvedCategoryId);
      if (cursor) params.set('cursor', cursor);
      params.set('limit', '24');
      const res = await fetch(`/api/products?${params}`);
      return res.json();
    },
  });

  const products = data?.products || data?.items || [];
  const categories = allCategories;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="inline-flex items-center gap-2">
              {sector === 'MEDICAL' ? (
                <Stethoscope className="h-7 w-7 text-primary" strokeWidth={1.8} />
              ) : sector === 'AGRICULTURAL' ? (
                <Sprout className="h-7 w-7 text-secondary" strokeWidth={1.8} />
              ) : (
                <Boxes className="h-7 w-7 text-muted-foreground" strokeWidth={1.8} />
              )}
              <span>
                {sector === 'MEDICAL' ? 'Équipement des animaux' :
                 sector === 'AGRICULTURAL' ? 'Produits Agricoles' :
                 'Tous les Produits'}
              </span>
            </span>
          </h1>
          <p className="text-muted-foreground">
            Trouvez les meilleurs produits B2B pour votre activité
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className="w-64 shrink-0 hidden lg:block space-y-6">
            {/* Sector Filter */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Secteur</h3>
              <div className="space-y-2">
                {[
                  { value: '', label: 'Tous les secteurs', icon: PackageOpen },
                  { value: 'MEDICAL', label: 'Équipement des animaux', icon: Stethoscope },
                  { value: 'AGRICULTURAL', label: 'Agricole', icon: Sprout },
                ].map((s) => (
                  <button
                    key={s.value}
                    className={`block w-full text-left px-3 py-1.5 rounded text-sm transition ${
                      sector === s.value ? 'bg-primary text-white' : 'hover:bg-muted'
                    }`}
                    onClick={() => { setSector(s.value); setCategory(''); setCursor(undefined); }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <s.icon className="h-4 w-4" strokeWidth={1.8} />
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3">Catégorie</h3>
                <div className="space-y-1">
                  <button
                    className={`block w-full text-left px-3 py-1.5 rounded text-sm transition ${
                      !resolvedCategoryId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                    }`}
                    onClick={() => { setCategory(''); setCursor(undefined); }}
                  >
                    Toutes
                  </button>
                  {categories.map((cat: any) => (
                    <button
                      key={cat._id}
                      className={`block w-full text-left px-3 py-1.5 rounded text-sm transition ${
                        resolvedCategoryId === cat._id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                      }`}
                      onClick={() => { setCategory(cat._id); setCursor(undefined); }}
                    >
                      {'—'.repeat(cat.depth || 0)} {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Trier par</h3>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={sort}
                onChange={(e) => { setSort(e.target.value); setCursor(undefined); }}
              >
                <option value="newest">Plus récents</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="popular">Populaires</option>
              </select>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {/* Mobile filters */}
            <div className="flex gap-2 mb-6 lg:hidden flex-wrap">
              {['', 'MEDICAL', 'AGRICULTURAL'].map((s) => (
                <Button
                  key={s}
                  variant={sector === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setSector(s); setCursor(undefined); }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {s === '' ? (
                      <PackageOpen className="h-4 w-4" strokeWidth={1.8} />
                    ) : s === 'MEDICAL' ? (
                      <Stethoscope className="h-4 w-4" strokeWidth={1.8} />
                    ) : (
                      <Sprout className="h-4 w-4" strokeWidth={1.8} />
                    )}
                    {s === '' ? 'Tous' : s}
                  </span>
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-72 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="mb-4 flex justify-center">
                  <PackageOpen className="h-12 w-12 text-muted-foreground" strokeWidth={1.6} />
                </div>
                <p className="text-xl font-medium mb-2">Aucun produit trouvé</p>
                <p className="text-muted-foreground">Essayez de modifier vos filtres</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {products.length} produit{products.length > 1 ? 's' : ''} trouvé{products.length > 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {products.map((product: any) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {data?.nextCursor && (
                  <div className="text-center mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setCursor(data.nextCursor)}
                      disabled={isFetching}
                    >
                      {isFetching ? 'Chargement...' : 'Charger plus de produits'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

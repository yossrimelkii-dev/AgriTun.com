'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/product-card';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [sector, setSector] = useState<string>(searchParams.get('sector') || '');
  const [submitted, setSubmitted] = useState(initialQuery);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', submitted, sector],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sector) params.set('sector', sector);
      params.set('limit', '300');

      const res = await fetch(`/api/products?${params}`);
      const json = await res.json();
      const items = json?.items || json?.products || [];
      const q = submitted.trim().toLowerCase();

      const hits = q
        ? items.filter((product: any) =>
            [product.name, product.title, product.slug, product.categoryName, product.supplierName, product.sector]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q)
          )
        : items;

      return {
        hits: hits.slice(0, 40),
        totalHits: hits.length,
        processingTimeMs: 0,
      };
    },
    enabled: submitted.length > 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Search Bar */}
          <form onSubmit={handleSubmit} className="flex gap-4 mb-8">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher des produits, fournisseurs..."
              className="flex-1 text-lg h-12"
              autoFocus
            />
            <Button type="submit" size="lg" className="h-12 px-8">
              Rechercher
            </Button>
          </form>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {[
              { value: '', label: 'Tous les secteurs' },
              { value: 'MEDICAL', label: '🏥 Équipement des animaux' },
              { value: 'AGRICULTURAL', label: '🌾 Agricole' },
            ].map((s) => (
              <Button
                key={s.value}
                variant={sector === s.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSector(s.value); setSubmitted(query); }}
              >
                {s.label}
              </Button>
            ))}
          </div>

          {/* Results */}
          {submitted && (
            <div className="mb-4 text-sm text-muted-foreground">
              {data?.totalHits !== undefined
                ? `${data.totalHits} résultat(s) pour "${submitted}" (${data.processingTimeMs}ms)`
                : isFetching ? 'Recherche en cours...' : ''}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-72 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : data?.hits?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.hits.map((hit: any) => (
                <Link key={hit.id} href={`/products/${hit.slug}`}>
                  <div className="border rounded-lg p-4 hover:shadow-md transition">
                    <h3 className="font-medium text-sm line-clamp-2 mb-2"
                      dangerouslySetInnerHTML={{
                        __html: hit._formatted?.name || hit.name
                      }}
                    />
                    <p className="text-xs text-muted-foreground mb-1">{hit.supplierName}</p>
                    <p className="text-xs text-muted-foreground mb-2">{hit.categoryName}</p>
                    {hit.retailPrice > 0 && (
                      <p className="font-bold text-primary">
                        {new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(hit.retailPrice)}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">{hit.sector}</span>
                      {hit.isFeatured && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">⭐ Vedette</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : submitted ? (
            <div className="text-center py-20">
              <p className="text-xl font-medium mb-2">Aucun résultat trouvé</p>
              <p className="text-muted-foreground">Essayez d&apos;autres mots-clés ou changez de secteur</p>
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-xl font-medium mb-2">🔍 Recherchez des produits</p>
              <p className="text-muted-foreground">Tapez un mot-clé pour trouver des produits médicaux ou agricoles</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

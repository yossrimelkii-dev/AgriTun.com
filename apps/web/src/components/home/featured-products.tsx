'use client';

import { useQuery } from '@tanstack/react-query';
import { ProductCard } from '@/components/products/product-card';

async function fetchFeaturedProducts() {
  const res = await fetch('/api/products?featured=true&limit=8');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export function FeaturedProducts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: fetchFeaturedProducts,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-muted h-[320px]" />
        ))}
      </div>
    );
  }

  if (error || !data?.items?.length) {
    return <p className="text-muted-foreground text-center py-8">Aucun produit en vedette pour le moment.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {data.items.map((product: Record<string, unknown>) => (
        <ProductCard key={product._id as string} product={product} />
      ))}
    </div>
  );
}

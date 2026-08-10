'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { ProductCard } from '@/components/products/product-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

async function fetchProductsForBand() {
  const res = await fetch('/api/products?limit=12&status=ACTIVE');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export function HorizontalProducts() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'horizontal-band'],
    queryFn: fetchProductsForBand,
  });

  const products = data?.items || [];

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 400;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (isLoading) {
    return (
      <section className="bg-background border-y py-8">
        <div className="container">
          <h3 className="text-lg font-semibold mb-6">Produits populaires</h3>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64 h-80 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!products.length) {
    return null;
  }

  return (
    <section className="bg-background border-y py-8">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Produits populaires</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left')}
              className="h-9 w-9"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('right')}
              className="h-9 w-9"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto overflow-y-hidden pb-4 scroll-smooth [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-foreground/40"
        >
          {products.map((product: Record<string, unknown>) => (
            <div
              key={product._id as string}
              className="flex-shrink-0 w-64"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

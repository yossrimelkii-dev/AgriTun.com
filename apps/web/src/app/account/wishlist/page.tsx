'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductCard } from '@/components/products/product-card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/providers/locale-provider';
import Link from 'next/link';

export default function AccountWishlistPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await fetch('/api/wishlist');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/wishlist?productId=${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast({ title: 'Supprimé de la liste' });
    },
  });

  const wishlist = data?.wishlist || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-4">❤️</p>
        <p className="text-muted-foreground mb-4">{t('accountWishlist.empty')}</p>
        <Link href="/products" className="text-primary hover:underline text-sm">
          {t('accountWishlist.discoverProducts')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">{t('accountWishlist.heading')} ({wishlist.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {wishlist.map((item: any) => (
          <div key={item._id} className="relative">
            <ProductCard product={item.product} />
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 text-red-500 hover:text-red-600 bg-white/90"
              onClick={() => removeMutation.mutate(item.productId?.toString())}
              disabled={removeMutation.isPending}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

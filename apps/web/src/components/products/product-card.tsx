'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PrimeLockBadge } from '@/components/products/prime-lock-badge';
import { StockBadge } from '@/components/products/stock-badge';
import { useI18n } from '@/components/providers/locale-provider';

interface ProductCardProps {
  product: Record<string, unknown>;
  showWholesalePrice?: boolean;
}

export function ProductCard({ product, showWholesalePrice = true }: ProductCardProps) {
  const { t, locale } = useI18n();
  const variants = product.variants as Array<Record<string, unknown>> | undefined;
  const firstVariant = variants?.[0];
  const pricing = firstVariant?.pricing as Record<string, unknown> | undefined;
  const stats = product.stats as Record<string, unknown> | undefined;
  const supplierSnapshot = product.supplierSnapshot as Record<string, unknown> | undefined;
  const promotion = product.promotion as Record<string, unknown> | undefined;
  const stockQty = (firstVariant?.stockQty as number) ?? 0;
  const numberLocale = locale === 'fr' ? 'fr-TN' : locale === 'en' ? 'en-US' : 'ar-TN';

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Image */}
      <Link href={`/products/${product.slug}`}>
        <div className="aspect-square bg-muted relative overflow-hidden">
          {product.images && (product.images as Array<Record<string, string>>)[0]?.url ? (
            <img
              src={(product.images as Array<Record<string, string>>)[0]!.url}
              alt={product.name as string}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground">
              📦
            </div>
          )}

          {/* Promotion badge */}
          {promotion?.isActive && (
            <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-1 rounded">
              -{promotion.discountValue as number}
              {promotion.discountType === 'PERCENT' ? '%' : ' DT'}
            </div>
          )}

          {/* Featured badge */}
          {product.isFeatured && (
            <div className="absolute top-2 right-2 bg-prime text-white text-xs font-semibold px-2 py-1 rounded">
              {t('productCard.featured')}
            </div>
          )}
        </div>
      </Link>

      <CardContent className="p-4">
        {/* Supplier info */}
        {supplierSnapshot && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            {supplierSnapshot.isVerified && <span className="text-primary">✓</span>}
            <span>{supplierSnapshot.name as string}</span>
            {stats?.rating && (
              <span className="ml-auto">⭐ {(stats.rating as number).toFixed(1)}</span>
            )}
          </div>
        )}

        {/* Product name */}
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors">
            {product.name as string}
          </h3>
        </Link>

        {/* Pricing */}
        <div className="mt-3 space-y-1">
          <p className="text-lg font-bold text-foreground">
            {(pricing?.retailPrice as number)?.toLocaleString(numberLocale)} DT
          </p>

          {showWholesalePrice && (
            /* PRIME price or lock */
            pricing?.primeRequired ? (
              <PrimeLockBadge />
            ) : pricing?.superGrossPrice ? (
              <p className="text-sm text-amber-700 font-semibold">
                💰 Prix Super Gros: {(pricing.superGrossPrice as number).toLocaleString(numberLocale)} DT
              </p>
            ) : pricing?.bulkPrice ? (
              <p className="text-sm text-prime font-semibold">
                {t('productCard.wholesalePrice')}: {(pricing.bulkPrice as number).toLocaleString(numberLocale)} DT
                <span className="text-xs text-muted-foreground ml-1">
                  ({t('productCard.minPrefix')} {pricing.minBulkQty as number})
                </span>
              </p>
            ) : null
          )}
        </div>

        {/* Stock badge */}
        <div className="mt-2">
          <StockBadge qty={stockQty} />
        </div>
      </CardContent>
    </Card>
  );
}

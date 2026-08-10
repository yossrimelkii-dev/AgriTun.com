'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { PrimeLockBadge } from '@/components/products/prime-lock-badge';
import { StockBadge } from '@/components/products/stock-badge';
import { useCartStore } from '@/stores/cart';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(price);

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}`);
      if (!res.ok) throw new Error('Product not found');
      return res.json();
    },
  });

  const product = data?.product;
  const variant = product?.variants?.[selectedVariant];
  const galleryImages: string[] = (product?.images || [])
    .map((img: any) => (typeof img === 'string' ? img : img?.url))
    .filter(Boolean);

  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await fetch('/api/wishlist');
      if (res.status === 401) return { wishlist: [] };
      return res.json();
    },
    retry: 1,
  });

  const isFavorited = wishlistData?.wishlist?.some(
    (w: any) => w.productId === product?._id
  ) ?? false;

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        await fetch(`/api/wishlist?productId=${product._id}`, { method: 'DELETE' });
      } else {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product._id }),
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-muted animate-pulse rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              <div className="h-12 bg-muted animate-pulse rounded w-1/3" />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-20 text-center min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Produit non trouvé</h1>
          <p className="text-muted-foreground">Le produit demandé n&apos;existe pas ou a été retiré.</p>
        </main>
        <Footer />
      </>
    );
  }

  const handleAddToCart = () => {
    if (!variant) return;
    addItem({
      productId: product._id,
      variantId: variant._id,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      unitPrice: variant.pricing.retailPrice,
      qty,
      supplierId: product.supplierId,
      image: galleryImages?.[0] || '',
    });
  };

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        {/* Breadcrumb */}
        {product.categoryPath && (
          <nav className="text-sm text-muted-foreground mb-6">
            {product.categoryPath.map((c: any, i: number) => (
              <span key={c._id}>
                {i > 0 && ' / '}
                <span className="hover:text-foreground cursor-pointer">{c.name}</span>
              </span>
            ))}
          </nav>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left — Image */}
          <div className="space-y-3">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {galleryImages.length > 0 ? (
                <img
                  src={galleryImages[Math.min(selectedImage, galleryImages.length - 1)]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-6xl">{product.sector === 'MEDICAL' ? '🏥' : '🌾'}</div>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {galleryImages.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded border overflow-hidden ${
                      selectedImage === idx ? 'ring-2 ring-primary border-primary' : 'border-muted'
                    }`}
                  >
                    <img src={url} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — Info */}
          <div className="space-y-6">
            <div>
              {product.isFeatured && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium mb-2 inline-block">
                  ⭐ Produit Vedette
                </span>
              )}
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-muted-foreground">
                  Par{' '}
                  {product.supplierSnapshot?.slug ? (
                    <Link
                      href={`/suppliers/${product.supplierSnapshot.slug}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {product.supplierSnapshot?.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{product.supplierSnapshot?.name}</span>
                  )}
                </span>
                {product.supplierSnapshot?.isVerified && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Vérifié</span>
                )}
              </div>
            </div>

            {/* Price */}
            {variant && (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(variant.pricing.retailPrice)}
                  <span className="text-sm font-normal text-muted-foreground ml-2">/ {variant.unit}</span>
                </p>
                {variant.pricing.superGrossPrice ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-900">
                      💰 Prix Super Gros: {formatPrice(variant.pricing.superGrossPrice)}
                      <span className="text-amber-700 ml-1">(réservé aux fournisseurs autorisés)</span>
                    </p>
                  </div>
                ) : null}
                {variant.pricing.bulkPrice ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-800">
                      💎 Prix Grossiste: {formatPrice(variant.pricing.bulkPrice)}
                      <span className="text-amber-600 ml-1">(min. {variant.pricing.minBulkQty} unités)</span>
                    </p>
                  </div>
                ) : product.primeRequired ? (
                  <PrimeLockBadge />
                ) : null}
              </div>
            )}

            {/* Variant Selector */}
            {product.variants.length > 1 && (
              <div>
                <p className="text-sm font-medium mb-2">Variante:</p>
                <div className="flex gap-2">
                  {product.variants.map((v: any, i: number) => (
                    <Button
                      key={i}
                      variant={selectedVariant === i ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedVariant(i)}
                    >
                      {v.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock */}
            {variant && <StockBadge qty={variant.stockQty - (variant.reservedQty || 0)} />}

            {/* Add to Cart */}
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg">
                <button
                  className="px-3 py-2 text-lg hover:bg-muted"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                >−</button>
                <span className="px-4 py-2 font-medium min-w-[3rem] text-center">{qty}</span>
                <button
                  className="px-3 py-2 text-lg hover:bg-muted"
                  onClick={() => setQty(qty + 1)}
                >+</button>
              </div>
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={!variant || variant.stockQty <= 0}
              >
                {variant && variant.stockQty > 0 ? 'Ajouter au panier' : 'Rupture de stock'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={isFavorited ? 'text-red-500 border-red-200 hover:bg-red-50' : ''}
                onClick={() => toggleFav.mutate()}
                disabled={toggleFav.isPending}
              >
                {isFavorited ? '❤️' : '🤍'}
              </Button>
            </div>

            {/* Composition */}
            {product.attributes?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Richesses garanties</p>
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Composant</th>
                        <th className="text-left px-3 py-2 font-medium">Concentration</th>
                        <th className="text-left px-3 py-2 font-medium">Unité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {product.attributes.map((attr: any, i: number) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{attr.key}</td>
                          <td className="px-3 py-2">{attr.value}</td>
                          <td className="px-3 py-2 text-muted-foreground">{attr.unit || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-muted px-2 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <Card className="mt-12">
            <CardContent className="py-6">
              <h2 className="text-xl font-bold mb-4">Description</h2>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {product.stats && (
          <div className="grid grid-cols-4 gap-4 mt-8">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">{product.stats.views}</p>
                <p className="text-xs text-muted-foreground">Vues</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">{product.stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Commandes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">⭐ {product.stats.rating?.toFixed(1) || '—'}</p>
                <p className="text-xs text-muted-foreground">Note</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">{product.stats.reviewCount || 0}</p>
                <p className="text-xs text-muted-foreground">Avis</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

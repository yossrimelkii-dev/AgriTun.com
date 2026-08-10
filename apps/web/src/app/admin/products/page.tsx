'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface AdminProduct {
  _id: string;
  name: string;
  slug: string;
  sector: string;
  status: string;
  isFeatured: boolean;
  supplierSnapshot?: { name?: string; slug?: string; isVerified?: boolean };
  variants?: Array<{ name: string; pricing: { retailPrice: number }; stockQty: number }>;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  DRAFT: 'bg-gray-100 text-gray-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  DELETED: 'bg-red-100 text-red-700',
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(price);

export default function AdminProductsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: unknown }) => {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'Produit mis à jour ✓' });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', statusFilter, sectorFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (sectorFilter) params.set('sector', sectorFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/products?${params}`);
      if (!res.ok) return { products: [] };
      return res.json();
    },
  });

  const products: AdminProduct[] = data?.products || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion des Produits</h1>
        <p className="text-muted-foreground">Modérez les produits de la marketplace ({products.length} résultats)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher un produit..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          {['', 'ACTIVE', 'DRAFT', 'PAUSED', 'DELETED'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s || 'Tous'}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {[
            { value: '', label: 'Tous secteurs' },
            { value: 'MEDICAL', label: '🏥 Médical' },
            { value: 'AGRICULTURAL', label: '🌾 Agricole' },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={sectorFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSectorFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucun produit trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">Produit</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Fournisseur</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Secteur</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Prix</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Stock</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Statut</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => {
                const firstVariant = p.variants?.[0];
                const totalStock = p.variants?.reduce((sum, v) => sum + (v.stockQty || 0), 0) ?? 0;
                return (
                  <tr key={p._id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.slug}`} className="hover:underline">
                        <p className="text-sm font-medium">
                          {p.isFeatured && '⭐ '}{p.name}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {p.supplierSnapshot?.name || '—'}
                      {p.supplierSnapshot?.isVerified && (
                        <span className="text-green-600 ml-1">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {p.sector === 'MEDICAL' ? '🏥' : p.sector === 'AGRICULTURAL' ? '🌾' : '🔄'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {firstVariant ? formatPrice(firstVariant.pricing.retailPrice) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={totalStock === 0 ? 'text-red-600 font-medium' : ''}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[p.status] || 'bg-gray-100'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className={`text-xs h-7 ${p.isFeatured ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}`}
                          onClick={() => updateProduct.mutate({ id: p._id, isFeatured: !p.isFeatured })}
                          disabled={updateProduct.isPending}
                        >
                          {p.isFeatured ? '⭐ Retirer vedette' : '☆ Mettre en vedette'}
                        </Button>
                        {p.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 text-yellow-700 border-yellow-200 hover:bg-yellow-50"
                            onClick={() => updateProduct.mutate({ id: p._id, status: 'PAUSED' })}
                            disabled={updateProduct.isPending}
                          >
                            Suspendre
                          </Button>
                        )}
                        {p.status === 'PAUSED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => updateProduct.mutate({ id: p._id, status: 'ACTIVE' })}
                            disabled={updateProduct.isPending}
                          >
                            Réactiver
                          </Button>
                        )}
                        {p.status !== 'DELETED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => updateProduct.mutate({ id: p._id, status: 'DELETED' })}
                            disabled={updateProduct.isPending}
                          >
                            Supprimer
                          </Button>
                        )}
                        {p.status === 'DELETED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => updateProduct.mutate({ id: p._id, status: 'ACTIVE' })}
                            disabled={updateProduct.isPending}
                          >
                            Restaurer
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

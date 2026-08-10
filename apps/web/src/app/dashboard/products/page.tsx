'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/providers/locale-provider';

interface Product {
  _id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'DELETED';
  sector: string;
  variants: Array<{
    name: string;
    sku: string;
    stockQty: number;
    pricing: { retailPrice: number; bulkPrice?: number };
  }>;
  stats?: { views: number; totalOrders: number; rating: number };
  isFeatured: boolean;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  DELETED: 'bg-red-100 text-red-700',
};

export default function DashboardProductsPage() {
  const { t, locale } = useI18n();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const numberLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  const formatPrice = (price: number) =>
    new Intl.NumberFormat(numberLocale, { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(price);

  const statusLabel = (status: Product['status']) => {
    if (status === 'DRAFT') return t('dashboardProducts.statusDraft');
    if (status === 'ACTIVE') return t('dashboardProducts.statusActive');
    if (status === 'PAUSED') return t('dashboardProducts.statusPaused');
    if (status === 'DELETED') return t('dashboardProducts.statusDeleted');
    return status;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-products', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/dashboard/products?${params}`);
      return res.json();
    },
  });

  const products: Product[] = data?.products || data?.items || [];
  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const res = await fetch(`/api/dashboard/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-products'] });
      toast({ title: t('dashboardProducts.statusUpdated') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/products/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-products'] });
      toast({ title: t('dashboardProducts.productDeleted') });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboardProducts.heading')}</h1>
          <p className="text-muted-foreground">{t('dashboardProducts.subtitle')}</p>
        </div>
        <Link href="/dashboard/products/create">
          <Button className="bg-primary hover:bg-primary/90">{t('dashboardProducts.addProduct')}</Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder={t('dashboardProducts.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          {['', 'DRAFT', 'ACTIVE', 'PAUSED'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status ? statusLabel(status as Product['status']) : t('dashboardProducts.all')}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('dashboardProducts.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardProducts.product')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardProducts.sku')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardProducts.price')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardProducts.stock')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardProducts.status')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardProducts.views')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardProducts.orders')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardProducts.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((product) => {
                const variant = product.variants[0];
                return (
                  <tr key={product._id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sector}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{variant?.sku || '—'}</td>
                    <td className="px-4 py-3 text-sm">{variant ? formatPrice(variant.pricing.retailPrice) : '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={variant && variant.stockQty < 10 ? 'text-red-600 font-medium' : ''}>
                        {variant?.stockQty ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[product.status] || ''}`}>
                        {statusLabel(product.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{product.stats?.views ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{product.stats?.totalOrders ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/dashboard/products/${product._id}/edit`}>
                          <Button variant="outline" size="sm">{t('dashboardProducts.edit')}</Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className={product.status === 'ACTIVE' ? 'text-yellow-600' : 'text-green-600'}
                          onClick={() => toggleStatusMutation.mutate({
                            id: product._id,
                            newStatus: product.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
                          })}
                          disabled={toggleStatusMutation.isPending}
                        >
                          {product.status === 'ACTIVE' ? t('dashboardProducts.pause') : t('dashboardProducts.activate')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardProducts.total')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{products.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardProducts.active')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{products.filter((p) => p.status === 'ACTIVE').length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardProducts.drafts')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-gray-600">{products.filter((p) => p.status === 'DRAFT').length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardProducts.lowStock')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{products.filter((p) => (p.variants[0]?.stockQty ?? 0) < 10).length}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}

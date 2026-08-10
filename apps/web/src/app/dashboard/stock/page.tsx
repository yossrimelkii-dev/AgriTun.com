'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/providers/locale-provider';

interface StockItem {
  _id: string;
  name: string;
  variants: Array<{
    _id: string;
    name: string;
    sku: string;
    stockQty: number;
    reservedQty: number;
    unit: string;
  }>;
  status: string;
}

const MOVEMENT_TYPES = [
  { value: 'STOCK_IN', key: 'dashboardStock.movementIn' },
  { value: 'STOCK_OUT', key: 'dashboardStock.movementOut' },
  { value: 'ADJUSTMENT', key: 'dashboardStock.movementAdjustment' },
  { value: 'DAMAGE', key: 'dashboardStock.movementDamage' },
  { value: 'RETURN', key: 'dashboardStock.movementReturn' },
] as const;

export default function DashboardStockPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [adjustTarget, setAdjustTarget] = useState<{ productId: string; variantId: string; variantName: string; currentQty: number } | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('STOCK_IN');
  const [adjustReason, setAdjustReason] = useState('');

  const numberLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR';
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-FR';

  const movementTypeLabel = (type: string) => {
    if (type === 'STOCK_IN') return t('dashboardStock.movementIn');
    if (type === 'STOCK_OUT') return t('dashboardStock.movementOut');
    if (type === 'ADJUSTMENT') return t('dashboardStock.movementAdjustment');
    if (type === 'DAMAGE') return t('dashboardStock.movementDamage');
    if (type === 'RETURN') return t('dashboardStock.movementReturn');
    return type;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-products-stock'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/products?limit=100');
      return res.json();
    },
  });

  const { data: movementsData } = useQuery({
    queryKey: ['dashboard-stock-movements'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stock?limit=20');
      return res.json();
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/dashboard/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const r = await res.json();
        throw new Error(r.error || 'Error');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-products-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stock-movements'] });
      toast({ title: `${t('dashboardStock.stockUpdated')}: ${data.previousQty} → ${data.newQty}` });
      setAdjustTarget(null);
      setAdjustQty('');
      setAdjustReason('');
    },
    onError: (e: Error) => {
      toast({ title: e.message });
    },
  });

  const products: StockItem[] = data?.items || data?.products || [];
  const movements = movementsData?.movements || [];

  const lowStock = products.filter((p) =>
    p.variants.some((v) => v.stockQty - (v.reservedQty || 0) < 10 && v.stockQty > 0)
  );
  const outOfStock = products.filter((p) =>
    p.variants.every((v) => v.stockQty <= 0)
  );
  const totalUnits = products.reduce(
    (sum, p) => sum + p.variants.reduce((s, v) => s + v.stockQty, 0),
    0
  );
  const totalReserved = products.reduce(
    (sum, p) => sum + p.variants.reduce((s, v) => s + (v.reservedQty || 0), 0),
    0
  );

  function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustTarget) return;
    adjustMutation.mutate({
      productId: adjustTarget.productId,
      variantId: adjustTarget.variantId,
      qty: parseInt(adjustQty),
      movementType: adjustType,
      reason: adjustReason,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboardStock.heading')}</h1>
        <p className="text-muted-foreground">{t('dashboardStock.subtitle')}</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardStock.totalUnits')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalUnits.toLocaleString(numberLocale)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardStock.reserved')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{totalReserved.toLocaleString(numberLocale)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardStock.lowStock')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-orange-600">{lowStock.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardStock.outOfStock')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{outOfStock.length}</p></CardContent>
        </Card>
      </div>

      {/* Adjust stock modal */}
      {adjustTarget && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">
              {t('dashboardStock.adjustStock')} — {adjustTarget.variantName}
              <span className="text-muted-foreground font-normal ml-2">({t('dashboardStock.current')}: {adjustTarget.currentQty})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdjust} className="flex items-end gap-4">
              <div>
                <Label className="text-xs">{t('dashboardStock.type')}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
                  {MOVEMENT_TYPES.map((movement) => <option key={movement.value} value={movement.value}>{t(movement.key)}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">{t('dashboardStock.quantity')}</Label>
                <Input type="number" min="1" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} required className="w-28" />
              </div>
              <div className="flex-1">
                <Label className="text-xs">{t('dashboardStock.reasonOptional')}</Label>
                <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder={t('dashboardStock.reasonPlaceholder')} />
              </div>
              <Button type="submit" disabled={adjustMutation.isPending}>
                {adjustMutation.isPending ? t('dashboardStock.loading') : t('dashboardStock.apply')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAdjustTarget(null)}>{t('dashboardStock.cancel')}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardStock.product')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardStock.variant')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardStock.sku')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium">{t('dashboardStock.stock')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium">{t('dashboardStock.reservedCol')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium">{t('dashboardStock.available')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardStock.status')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium">{t('dashboardStock.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.flatMap((product) =>
                product.variants.map((variant, vi) => {
                  const reserved = variant.reservedQty || 0;
                  const available = variant.stockQty - reserved;
                  const status = available <= 0 ? t('dashboardStock.statusOut') : available < 10 ? t('dashboardStock.statusLow') : t('dashboardStock.statusOk');
                  const computedColor = status === t('dashboardStock.statusOut')
                    ? 'bg-red-100 text-red-700'
                    : status === t('dashboardStock.statusLow')
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-green-100 text-green-700';
                  return (
                    <tr key={`${product._id}-${vi}`} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">{vi === 0 ? product.name : ''}</td>
                      <td className="px-4 py-3 text-sm">{variant.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{variant.sku}</td>
                      <td className="px-4 py-3 text-sm text-right">{variant.stockQty}</td>
                      <td className="px-4 py-3 text-sm text-right">{reserved}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{available}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${computedColor}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setAdjustTarget({
                            productId: product._id,
                            variantId: variant._id,
                            variantName: `${product.name} — ${variant.name}`,
                            currentQty: variant.stockQty,
                          })}
                        >
                          {t('dashboardStock.adjust')}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent movements */}
      {movements.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboardStock.movementsRecent')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {movements.map((m: any) => (
                <div key={m._id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div>
                    <span className={`inline-block w-20 text-xs font-medium ${
                      ['STOCK_IN', 'RETURN'].includes(m.movementType) ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {movementTypeLabel(m.movementType)}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {m.variantName || t('dashboardStock.movementVariantFallback')} — {m.productId?.name || t('dashboardStock.movementProductFallback')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      {m.previousQty} → {m.newQty} ({m.qty > 0 ? '+' : ''}{m.qty})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString(dateLocale)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

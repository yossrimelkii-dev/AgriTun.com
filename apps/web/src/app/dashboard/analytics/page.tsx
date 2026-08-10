'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/components/providers/locale-provider';

const MONTHS = {
  fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['جان', 'فب', 'مار', 'أبر', 'مايو', 'يون', 'يول', 'أغس', 'سب', 'أكت', 'نوف', 'ديس'],
};

export default function DashboardAnalyticsPage() {
  const { t, locale } = useI18n();

  const formatPrice = (price: number) => {
    const localeMap = { fr: 'fr-TN', en: 'en-US', ar: 'ar-TN' };
    return new Intl.NumberFormat(localeMap[locale as keyof typeof localeMap] || 'fr-TN', {
      style: 'currency',
      currency: 'TND',
      maximumFractionDigits: 0,
    }).format(price);
  };
  const { data: revenueData } = useQuery({
    queryKey: ['analytics', 'revenue'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/analytics?metric=revenue');
      if (!res.ok) throw new Error('Failed to load revenue analytics');
      return res.json();
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ['analytics', 'top-products'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/analytics?metric=top-products');
      if (!res.ok) throw new Error('Failed to load top products analytics');
      return res.json();
    },
  });

  const { data: ordersByStatus } = useQuery({
    queryKey: ['analytics', 'orders-by-status'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/analytics?metric=orders-by-status');
      if (!res.ok) throw new Error('Failed to load order status analytics');
      return res.json();
    },
  });

  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/analytics?metric=overview');
      if (!res.ok) throw new Error('Failed to load overview analytics');
      return res.json();
    },
  });

  const revenue: Array<{ _id: { year: number; month: number }; total: number }> = (revenueData?.data || []).map((item: any) => ({
    ...item,
    total: item.total ?? item.revenue ?? 0,
  }));
  const maxRevenue = Math.max(...revenue.map((r) => r.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboardAnalytics.heading')}</h1>
        <p className="text-muted-foreground">{t('dashboardAnalytics.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardAnalytics.revenue30d')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatPrice(overview?.data?.revenue30d || overview?.data?.totalRevenue || 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardAnalytics.orders30d')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{overview?.data?.orders30d || overview?.data?.ordersThisMonth || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardAnalytics.pending')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-yellow-600">{overview?.data?.pendingOrders || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardAnalytics.avgCart')}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(overview?.data?.orders30d || overview?.data?.ordersThisMonth)
                ? formatPrice((overview.data.revenue30d || overview.data.totalRevenue || 0) / (overview.data.orders30d || overview.data.ordersThisMonth))
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart (CSS bar chart) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboardAnalytics.monthlyRevenue')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-64">
            {revenue.map((r) => (
              <div key={`${r._id.year}-${r._id.month}`} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{formatPrice(r.total)}</span>
                <div
                  className="w-full bg-primary/80 rounded-t min-h-[4px] transition-all"
                  style={{ height: `${(r.total / maxRevenue) * 200}px` }}
                />
                <span className="text-xs font-medium">{MONTHS[locale as keyof typeof MONTHS][r._id.month - 1]}</span>
              </div>
            ))}
            {revenue.length === 0 && (
              <p className="text-muted-foreground text-sm w-full text-center py-20">{t('dashboardAnalytics.noData')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader><CardTitle>{t('dashboardAnalytics.topProducts')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(topProducts?.data || []).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                    <div>
                      <p className="text-sm font-medium">{p._id?.productName || t('dashboardAnalytics.productName')}</p>
                      <p className="text-xs text-muted-foreground">{p.totalQty ?? p.totalUnits ?? 0} {t('dashboardAnalytics.sold')}</p>
                    </div>
                  </div>
                  <p className="font-medium text-sm">{formatPrice(p.totalRevenue)}</p>
                </div>
              ))}
              {(!topProducts?.data || topProducts.data.length === 0) && (
                <p className="text-muted-foreground text-sm text-center py-4">{t('dashboardAnalytics.noSales')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader><CardTitle>{t('dashboardAnalytics.ordersByStatus')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(ordersByStatus?.data || []).map((s: any) => {
                const colors: Record<string, string> = {
                  PENDING: 'bg-yellow-500', CONFIRMED: 'bg-emerald-500', PROCESSING: 'bg-red-600',
                  SHIPPED: 'bg-purple-500', DELIVERED: 'bg-green-600', CANCELLED: 'bg-red-500',
                };
                const getStatusLabel = (status: string) => {
                  const statusMap: Record<string, string> = {
                    PENDING: 'dashboardAnalytics.statusPending',
                    CONFIRMED: 'dashboardAnalytics.statusConfirmed',
                    PROCESSING: 'dashboardAnalytics.statusProcessing',
                    SHIPPED: 'dashboardAnalytics.statusShipped',
                    DELIVERED: 'dashboardAnalytics.statusDelivered',
                    CANCELLED: 'dashboardAnalytics.statusCancelled',
                  };
                  return t(statusMap[status] || 'dashboardAnalytics.statusPending');
                };
                return (
                  <div key={s._id} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${colors[s._id] || 'bg-gray-500'}`} />
                    <span className="text-sm flex-1">{getStatusLabel(s._id)}</span>
                    <span className="font-bold text-sm">{s.count}</span>
                  </div>
                );
              })}
              {(!ordersByStatus?.data || ordersByStatus.data.length === 0) && (
                <p className="text-muted-foreground text-sm text-center py-4">{t('dashboardAnalytics.noOrders')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

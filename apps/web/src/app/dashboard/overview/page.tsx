'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Package, Clock3, TrendingUp } from 'lucide-react';
import { useI18n } from '@/components/providers/locale-provider';

async function fetchOverview() {
  const res = await fetch('/api/dashboard/analytics?metric=overview');
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function fetchOrdersByStatus() {
  const res = await fetch('/api/dashboard/analytics?metric=orders-by-status');
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default function DashboardOverviewPage() {
  const { t, locale } = useI18n();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: fetchOverview,
  });

  const { data: orderStats } = useQuery({
    queryKey: ['dashboard', 'orders-by-status'],
    queryFn: fetchOrdersByStatus,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-muted h-32" />
        ))}
      </div>
    );
  }

  const numberLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  const kpis = [
    {
      title: t('dashboardOverview.revenue'),
      value: `${(overview?.data?.totalRevenue ?? 0).toLocaleString(numberLocale)} TND`,
      icon: DollarSign,
      iconClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
    },
    {
      title: t('dashboardOverview.totalOrders'),
      value: overview?.data?.totalOrders ?? 0,
      icon: Package,
      iconClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
    },
    {
      title: t('dashboardOverview.ordersThisMonth'),
      value: overview?.data?.ordersThisMonth ?? 0,
      icon: TrendingUp,
      iconClass: 'text-violet-600',
      bgClass: 'bg-violet-50',
    },
    {
      title: t('dashboardOverview.pending'),
      value: overview?.data?.pendingOrders ?? 0,
      icon: Clock3,
      iconClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('dashboardOverview.heading')}</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${kpi.bgClass}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.iconClass}`} strokeWidth={1.8} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders by status */}
      {orderStats?.data && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboardOverview.ordersByStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {orderStats.data.map((s: { _id: string; count: number; total: number }) => (
                <div key={s._id} className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{s.count}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s._id}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.total.toLocaleString(numberLocale)} TND
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

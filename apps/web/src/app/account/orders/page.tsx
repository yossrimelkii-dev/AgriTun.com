'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/providers/locale-provider';

const getStatusLabels = (t: Function): Record<string, { label: string; color: string }> => ({
  PENDING: { label: t('accountOrders.statusPending'), color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: t('accountOrders.statusConfirmed'), color: 'bg-emerald-100 text-emerald-700' },
  PROCESSING: { label: t('accountOrders.statusProcessing'), color: 'bg-indigo-100 text-indigo-700' },
  SHIPPED: { label: t('accountOrders.statusShipped'), color: 'bg-purple-100 text-purple-700' },
  DELIVERED: { label: t('accountOrders.statusDelivered'), color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: t('accountOrders.statusCancelled'), color: 'bg-red-100 text-red-700' },
  REFUNDED: { label: t('accountOrders.statusRefunded'), color: 'bg-gray-100 text-gray-600' },
});

export default function AccountOrdersPage() {
  const { t, locale } = useI18n();

  const getDateLocale = (locale: string) => {
    if (locale === 'fr') return 'fr-FR';
    if (locale === 'en') return 'en-GB';
    return 'ar-TN';
  };

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) {
        if (res.status === 401) return { orders: [] };
        throw new Error('Failed');
      }
      return res.json();
    },
    retry: 1,
  });

  const orders = data?.orders || data?.items || [];
  const statusLabels = getStatusLabels(t);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-4">📦</p>
        <p className="text-muted-foreground mb-4">{t('accountOrders.empty')}</p>
        <Link href="/products" className="text-primary hover:underline text-sm">
          {t('accountOrders.discoverProducts')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{t('accountOrders.heading')} ({orders.length})</h2>

      {orders.map((order: any) => {
        const st = statusLabels[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' };
        return (
          <Card key={order._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-mono text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString(getDateLocale(locale), {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  {order.supplier?.name ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('accountOrders.supplier')}{' '}
                      {order.supplier?.slug ? (
                        <Link href={`/suppliers/${order.supplier.slug}`} className="text-primary hover:underline font-medium">
                          {order.supplier.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{order.supplier.name}</span>
                      )}
                    </p>
                  ) : null}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>
                  {st.label}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                {order.items?.slice(0, 3).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.productName} × {item.qty}
                    </span>
                    <span>{item.subtotal?.toLocaleString(locale === 'fr' ? 'fr-TN' : locale === 'en' ? 'en-US' : 'ar-TN')} DT</span>
                  </div>
                ))}
                {order.items?.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{order.items.length - 3} autre(s) article(s)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <p className="font-bold">
                  {order.pricing?.totalTTC?.toLocaleString(locale === 'fr' ? 'fr-TN' : locale === 'en' ? 'en-US' : 'ar-TN')} DT
                </p>
                <div className="flex items-center gap-3">
                  {order.status === 'DELIVERED' && (
                    <span className="text-xs text-green-600">✓ {t('accountOrders.statusDelivered')}</span>
                  )}
                  {order.status === 'DELIVERED' && (
                    order.invoiceId ? (
                      <Link
                        href={`/invoice/${order.invoiceId}`}
                        className="text-xs px-2.5 py-1 rounded-md border border-primary/30 text-primary hover:bg-primary/5"
                      >
                        {t('accountOrders.viewInvoice')}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t('accountOrders.invoiceUnavailable')}</span>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

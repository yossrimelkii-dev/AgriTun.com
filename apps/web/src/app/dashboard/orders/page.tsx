'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/providers/locale-provider';

interface OrderItem {
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
  buyerSnapshot: { name: string; email: string };
  pricing: { totalHT: number; tva: number; totalTTC: number };
  invoiceId?: string;
  createdAt: string;
}

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export default function DashboardOrdersPage() {
  const { t, locale } = useI18n();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const numberLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-FR';

  const formatPrice = (price: number) =>
    new Intl.NumberFormat(numberLocale, { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(price);

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PENDING: { label: t('dashboardOrders.statusPending'), color: 'bg-yellow-100 text-yellow-700' },
    CONFIRMED: { label: t('dashboardOrders.statusConfirmed'), color: 'bg-blue-100 text-blue-700' },
    PROCESSING: { label: t('dashboardOrders.statusProcessing'), color: 'bg-indigo-100 text-indigo-700' },
    SHIPPED: { label: t('dashboardOrders.statusShipped'), color: 'bg-purple-100 text-purple-700' },
    DELIVERED: { label: t('dashboardOrders.statusDelivered'), color: 'bg-green-100 text-green-700' },
    CANCELLED: { label: t('dashboardOrders.statusCancelled'), color: 'bg-red-100 text-red-700' },
  };

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-orders', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/dashboard/orders?${params}`);
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await fetch(`/api/dashboard/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] }),
  });

  const generateInvoice = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate invoice');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
      toast({ title: `${t('dashboardOrders.invoiceGenerated')}: ${data.invoice?.invoiceNumber || t('dashboardOrders.notAvailable')} ✓` });
    },
    onError: (error: any) => {
      toast({ title: error.message || t('dashboardOrders.invoiceError') });
    },
  });

  const generateQuote = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate quote');
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
      toast({
        title: `${t('dashboardOrders.quoteGenerated')}: ${data.quote?.quoteNumber || ''} ✓`,
      });
      // Optimistic redirect to view/edit the new quote.
      if (data.quote?._id) window.location.href = `/quote/${data.quote._id}`;
    },
    onError: (error: any) => {
      toast({ title: error.message || t('dashboardOrders.quoteError') });
    },
  });

  const orders: Order[] = data?.items || data?.orders || [];

  const getNextStatus = (current: string) => {
    const idx = STATUS_FLOW.indexOf(current);
    if (idx >= 0 && idx < STATUS_FLOW.length - 1) return STATUS_FLOW[idx + 1];
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboardOrders.heading')}</h1>
        <p className="text-muted-foreground">{t('dashboardOrders.subtitle')}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', ...Object.keys(STATUS_LABELS)].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status ? STATUS_LABELS[status]?.label : t('dashboardOrders.all')}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('dashboardOrders.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const nextStatus = getNextStatus(order.status);
            const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100' };
            return (
              <Card key={order._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-bold text-sm">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString(dateLocale, { dateStyle: 'medium' })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(order.pricing.totalTTC)}</p>
                        <p className="text-xs text-muted-foreground">{order.items.length} {t('dashboardOrders.articleCount')}</p>
                      </div>
                    <div className="flex gap-2">
                        {nextStatus && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus.mutate({ orderId: order._id, status: nextStatus })}
                            disabled={updateStatus.isPending}
                          >
                            → {STATUS_LABELS[nextStatus]?.label}
                          </Button>
                        )}
                        {order.status !== 'PENDING' && order.status !== 'CANCELLED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-secondary border-secondary/30 hover:bg-secondary/10"
                            onClick={() => generateQuote.mutate(order._id)}
                            disabled={generateQuote.isPending}
                          >
                            📝 {t('dashboardOrders.generateQuote')}
                          </Button>
                        )}
                        {!order.invoiceId && order.status !== 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => generateInvoice.mutate(order._id)}
                            disabled={generateInvoice.isPending}
                          >
                            📄 {t('dashboardOrders.invoice')}
                          </Button>
                        )}
                        {order.invoiceId && (
                          <Link href={`/invoice/${order.invoiceId}`}>
                            <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                              🖨️ {t('dashboardOrders.print')}
                            </Button>
                          </Link>
                        )}
                        {order.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => updateStatus.mutate({ orderId: order._id, status: 'CANCELLED' })}
                            disabled={updateStatus.isPending}
                          >
                            {t('dashboardOrders.cancel')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm">
                      <span className="text-muted-foreground">{t('dashboardOrders.customer')}:</span>{' '}
                      {order.buyerSnapshot?.name || t('dashboardOrders.notAvailable')} ({order.buyerSnapshot?.email || ''})
                    </p>
                    <div className="mt-2 space-y-1">
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          {item.quantity}x {item.productName} — {item.variantName} — {formatPrice(item.unitPrice * item.quantity)}
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

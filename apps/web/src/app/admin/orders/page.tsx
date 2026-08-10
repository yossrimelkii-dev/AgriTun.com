'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AdminOrder {
  _id: string;
  orderNumber: string;
  status: string;
  buyerSnapshot?: { name?: string; email?: string };
  supplierName?: string;
  pricing: { subtotalHT: number; tvaAmount: number; totalTTC: number; currency: string };
  items: Array<{ productName: string; quantity: number }>;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: 'Confirmée', color: 'bg-emerald-100 text-emerald-700' },
  PROCESSING: { label: 'En traitement', color: 'bg-indigo-100 text-indigo-700' },
  SHIPPED: { label: 'Expédiée', color: 'bg-purple-100 text-purple-700' },
  DELIVERED: { label: 'Livrée', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(price);

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/orders?${params}`);
      if (!res.ok) return { orders: [] };
      return res.json();
    },
  });

  const orders: AdminOrder[] = data?.orders || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Toutes les Commandes</h1>
        <p className="text-muted-foreground">
          Supervisez l&apos;ensemble des commandes de la plateforme ({orders.length} résultats)
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', ...Object.keys(STATUS_LABELS)].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s ? STATUS_LABELS[s]?.label : 'Toutes'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucune commande trouvée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">N° Commande</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Client</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Fournisseur</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Articles</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Total TTC</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Statut</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => {
                const info = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100' };
                return (
                  <tr key={order._id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{order.buyerSnapshot?.name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{order.buyerSnapshot?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.supplierName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {order.items?.length || 0} article{(order.items?.length || 0) > 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatPrice(order.pricing.totalTTC)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${info.color}`}>
                        {info.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
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

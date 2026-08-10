'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Clock3,
  DollarSign,
  Factory,
  Gem,
  Package,
  ShieldAlert,
  ShoppingCart,
  Users,
} from 'lucide-react';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(price);

export default function AdminOverviewPage() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) return null;
      return res.json();
    },
  });

  const kpis = [
    { label: 'Utilisateurs', value: stats?.users ?? '—', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Fournisseurs', value: stats?.suppliers ?? '—', icon: Factory, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Produits', value: stats?.products ?? '—', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Commandes', value: stats?.orders ?? '—', icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Revenus Totaux', value: stats?.revenue ? formatPrice(stats.revenue) : '—', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Commandes en attente', value: stats?.pendingOrders ?? '—', icon: Clock3, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Fournisseurs non vérifiés', value: stats?.unverifiedSuppliers ?? '—', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Utilisateurs Prime', value: stats?.primeUsers ?? '—', icon: Gem, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vue d&apos;ensemble</h1>
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center justify-between gap-2">
                <span>{kpi.label}</span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${kpi.bg}`}>
                  <kpi.icon className={`h-4.5 w-4.5 ${kpi.color}`} strokeWidth={1.8} />
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

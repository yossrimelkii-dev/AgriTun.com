'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

interface SupplierRow {
  _id: string;
  companyName: string;
  slug: string;
  sector: string;
  isVerified: boolean;
  subscription: { isActive: boolean; planName: string };
  stats: { totalProducts: number; totalOrders: number; averageRating: number };
  createdAt: string;
}

export default function AdminSuppliersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/suppliers');
      return res.json();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, isVerified }: { id: string; isVerified: boolean }) => {
      const res = await fetch(`/api/admin/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] }),
  });

  const suppliers: SupplierRow[] = data?.suppliers || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestion des Fournisseurs</h1>

      {/* Suppliers Table Section */}
      <h2 className="text-xl font-semibold">Liste des Fournisseurs</h2>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">Entreprise</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Secteur</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Plan</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Produits</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Commandes</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Note</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Statut</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((s) => (
                <tr key={s._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{s.companyName}</td>
                  <td className="px-4 py-3 text-sm">{s.sector === 'MEDICAL' ? '🏥' : '🌾'} {s.sector}</td>
                  <td className="px-4 py-3 text-sm">{s.subscription?.planName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-right">{s.stats?.totalProducts ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right">{s.stats?.totalOrders ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right">⭐ {s.stats?.averageRating?.toFixed(1) ?? '—'}</td>
                  <td className="px-4 py-3">
                    {s.isVerified ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ Vérifié</span>
                    ) : (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">En attente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verifyMutation.mutate({ id: s._id, isVerified: !s.isVerified })}
                    >
                      {s.isVerified ? 'Révoquer' : 'Vérifier'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

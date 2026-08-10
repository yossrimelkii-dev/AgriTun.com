'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ReportItem {
  _id: string;
  reporterId: string;
  reporterEmail?: string;
  targetType: 'PRODUCT' | 'SUPPLIER';
  targetId: string;
  targetName?: string;
  reason: string;
  status: string;
  resolvedAt?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  REVIEWED: { label: 'Examiné', color: 'bg-emerald-100 text-emerald-700' },
  RESOLVED: { label: 'Résolu', color: 'bg-green-100 text-green-700' },
  DISMISSED: { label: 'Rejeté', color: 'bg-gray-100 text-gray-700' },
};

export default function AdminReportsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/reports?${params}`);
      if (!res.ok) return { reports: [] };
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Statut mis à jour ✓' });
    },
  });

  const suspendProduct = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAUSED' }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => toast({ title: 'Produit suspendu ✓' }),
  });

  const suspendUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'GUEST' }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => toast({ title: 'Utilisateur suspendu ✓' }),
  });

  const reports: ReportItem[] = data?.reports || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Signalements</h1>
        <p className="text-muted-foreground">
          Examinez les signalements et prenez des mesures ({reports.length} résultats)
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', ...Object.keys(STATUS_STYLES)].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s ? STATUS_STYLES[s]?.label : 'Tous'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-4">🛡️</p>
            <p className="text-muted-foreground">Aucun signalement trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const info = STATUS_STYLES[report.status] || { label: report.status, color: 'bg-gray-100' };
            const isPending = report.status === 'PENDING' || report.status === 'REVIEWED';
            return (
              <Card key={report._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {report.targetType === 'PRODUCT' ? '📦 Produit' : '🏭 Fournisseur'}
                        </span>
                        {report.targetName && (
                          <span className="text-sm font-medium text-primary">{report.targetName}</span>
                        )}
                        <span className="text-xs text-muted-foreground">ID: {report.targetId.slice(-8)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>
                          {info.label}
                        </span>
                      </div>
                      <p className="text-sm bg-muted/50 rounded p-2">{report.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.reporterEmail && <>Signalé par <span className="font-medium">{report.reporterEmail}</span> · </>}
                        {new Date(report.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
                        {report.resolvedAt && ` · Résolu le ${new Date(report.resolvedAt).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                    {isPending && (
                      <div className="flex flex-col gap-2 shrink-0">
                        {/* Status actions */}
                        <div className="flex gap-2">
                          {report.status === 'PENDING' && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ reportId: report._id, status: 'REVIEWED' })} disabled={updateStatus.isPending}>
                              Examiner
                            </Button>
                          )}
                          <Button size="sm" onClick={() => updateStatus.mutate({ reportId: report._id, status: 'RESOLVED' })} disabled={updateStatus.isPending}>
                            Résoudre
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ reportId: report._id, status: 'DISMISSED' })} disabled={updateStatus.isPending}>
                            Rejeter
                          </Button>
                        </div>
                        {/* Direct moderation actions */}
                        <div className="flex gap-2">
                          {report.targetType === 'PRODUCT' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                suspendProduct.mutate(report.targetId);
                                updateStatus.mutate({ reportId: report._id, status: 'RESOLVED' });
                              }}
                              disabled={suspendProduct.isPending}
                            >
                              🚫 Suspendre le produit
                            </Button>
                          )}
                          {report.reporterId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                              onClick={() => suspendUser.mutate(report.reporterId)}
                              disabled={suspendUser.isPending}
                            >
                              ⚠️ Suspendre le signaleur
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
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

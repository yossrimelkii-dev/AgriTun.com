'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AuditEntry {
  _id: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  user: { email: string; name: string; role: string };
  createdAt: string;
}

const ACTION_ICONS: Record<string, string> = {
  CREATE: '➕',
  UPDATE: '✏️',
  DELETE: '🗑️',
  LOGIN: '🔑',
  LOGOUT: '🚪',
  VERIFY: '✅',
  REVOKE: '❌',
};

export default function AdminAuditPage() {
  const [targetType, setTargetType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', targetType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (targetType) params.set('targetType', targetType);
      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) return { logs: [] };
      return res.json();
    },
  });

  const logs: AuditEntry[] = data?.logs || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Journal d&apos;Audit</h1>
        <p className="text-muted-foreground">
          Historique des actions administratives ({logs.length} entrées)
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { value: '', label: 'Tous' },
          { value: 'USER', label: '👤 Utilisateurs' },
          { value: 'SUPPLIER', label: '🏭 Fournisseurs' },
          { value: 'PRODUCT', label: '📦 Produits' },
          { value: 'ORDER', label: '🛒 Commandes' },
          { value: 'CATEGORY', label: '📂 Catégories' },
        ].map((opt) => (
          <Button
            key={opt.value}
            variant={targetType === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTargetType(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-muted-foreground">Aucune entrée d&apos;audit trouvée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Utilisateur</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Action</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Cible</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Détails</th>
                <th className="text-left px-4 py-3 text-sm font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{log.user.name}</p>
                    <p className="text-xs text-muted-foreground">{log.user.role}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="mr-1">{ACTION_ICONS[log.action] || '📝'}</span>
                    {log.action}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium">{log.targetType}</span>
                    {log.targetId && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({log.targetId.slice(-6)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {log.ipAddress || '—'}
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

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface UserRow {
  _id: string;
  email: string;
  role: string;
  badge: { type: string; isActive: boolean };
  profile: { firstName?: string; lastName?: string };
  isEmailVerified: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      return res.json();
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: unknown }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Utilisateur mis à jour ✓' });
    },
    onError: () => {
      toast({ title: 'Erreur de mise à jour' });
    },
  });

  const users: UserRow[] = data?.users || [];

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700',
    SUPPLIER: 'bg-emerald-100 text-emerald-700',
    SUPER_SUPPLIER: 'bg-purple-100 text-purple-700',
    BUYER: 'bg-green-100 text-green-700',
    GUEST: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion des Utilisateurs</h1>
        <p className="text-muted-foreground">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
      </div>

      {/* Role filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: '', label: 'Tous' },
          { value: 'BUYER', label: '🛒 Acheteurs' },
          { value: 'SUPPLIER', label: '🏭 Fournisseurs' },
          { value: 'SUPPLIER_PRIME', label: '💎 Fournisseurs Prime' },
          { value: 'SUPER_SUPPLIER', label: '🚀 Super Fournisseurs' },
          { value: 'ADMIN', label: '👑 Admins' },
          { value: 'GUEST', label: '👤 Invités' },
        ].map((opt) => (
          <Button
            key={opt.value}
            variant={roleFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">Utilisateur</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Rôle</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Badge</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Vérifié</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Inscription</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">
                    {user.profile?.firstName || ''} {user.profile?.lastName || ''}
                  </td>
                  <td className="px-4 py-3 text-sm">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="text-xs border rounded px-2 py-1 bg-background"
                      value={user.role}
                      onChange={(e) => updateUser.mutate({ id: user._id, role: e.target.value })}
                      disabled={updateUser.isPending}
                    >
                      <option value="GUEST">GUEST</option>
                      <option value="BUYER">BUYER</option>
                      <option value="SUPPLIER">SUPPLIER</option>
                      <option value="SUPER_SUPPLIER">SUPER_SUPPLIER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.badge?.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 bg-amber-50 border-amber-200 text-amber-700"
                        onClick={() => updateUser.mutate({ id: user._id, badge: 'FREE' })}
                        disabled={updateUser.isPending}
                      >
                        💎 PRIME → Retirer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => updateUser.mutate({ id: user._id, badge: 'PRIME' })}
                        disabled={updateUser.isPending || user.role !== 'BUYER'}
                        title={user.role !== 'BUYER' ? 'Seulement pour les acheteurs' : ''}
                      >
                        Passer PRIME
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.isEmailVerified ? (
                      <span className="text-green-600">✅</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => updateUser.mutate({ id: user._id, isEmailVerified: true })}
                        disabled={updateUser.isPending}
                      >
                        ❌ Vérifier
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    {user.role !== 'GUEST' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => updateUser.mutate({ id: user._id, role: 'GUEST' })}
                        disabled={updateUser.isPending}
                      >
                        Suspendre
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => updateUser.mutate({ id: user._id, role: 'BUYER' })}
                        disabled={updateUser.isPending}
                      >
                        Réactiver
                      </Button>
                    )}
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

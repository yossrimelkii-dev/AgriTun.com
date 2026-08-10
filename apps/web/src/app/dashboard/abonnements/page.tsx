'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const PLANS = [
  {
    id: 'SUPPLIER',
    name: 'Pointe de vente',
    description: 'Perfect for small retailers',
    price: '100-150',
    currency: 'DT',
    period: '/month',
    features: [
      'Prix détail (Retail price)',
      'Up to 50 products',
      'Basic analytics',
      'Product management',
      'Customer support',
    ],
    color: 'blue',
  },
  {
    id: 'SUPPLIER_PRIME',
    name: 'Grossist',
    description: 'Ideal for wholesalers',
    price: '200-250',
    currency: 'DT',
    period: '/month',
    features: [
      'All Pointe de vente features',
      'Prix détail + Prix gros',
      'Up to 200 products',
      'Advanced analytics',
      'Event creation',
      'Priority support',
      'API access',
    ],
    color: 'purple',
    popular: true,
  },
  {
    id: 'SUPER_SUPPLIER',
    name: 'Source',
    description: 'For large suppliers and distributors',
    price: '300-350',
    currency: 'DT',
    period: '/month',
    features: [
      'All Grossist features',
      'Prix détail + Prix gros + Prix super gros',
      'Unlimited products',
      'Premium analytics with exports',
      'Supplier management list',
      'Hero spotlight requests',
      '24/7 support',
      'Dedicated account manager',
    ],
    color: 'emerald',
  },
];

export default function AbonnementsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data: meData } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { user: null };
      return res.json();
    },
    retry: false,
    staleTime: 60000,
  });

  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['subscription-requests'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/subscription-requests');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const currentRole = meData?.user?.role;
  const currentPlan = subscriptionData?.currentPlan;
  const pendingRequest = subscriptionData?.requests?.find((r: any) => r.status === 'PENDING');

  const upgradeMutation = useMutation({
    mutationFn: async (requestedRole: string) => {
      const res = await fetch('/api/dashboard/subscription-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedRole,
          reason: reason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error || 'Failed to request upgrade');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-requests'] });
      toast({ title: 'Upgrade request sent ✓' });
      setSelectedPlan(null);
      setReason('');
    },
    onError: (error: Error) => {
      toast({ title: error.message });
    },
  });

  if (isLoading || !currentRole) {
    return (
      <div className="space-y-4 max-w-6xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const roleHierarchy: Record<string, number> = {
    SUPPLIER: 1,
    SUPPLIER_PRIME: 2,
    SUPER_SUPPLIER: 3,
  };

  const currentLevel = roleHierarchy[currentRole] || 0;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Abonnements</h1>
        <p className="text-muted-foreground">
          Choose the right plan for your business. Current plan: <span className="font-semibold text-foreground">{currentPlan}</span>
        </p>
      </div>

      {/* Pending Request Warning */}
      {pendingRequest && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">Pending Upgrade Request</p>
          <p className="text-sm mt-1">
            Your upgrade to {pendingRequest.requestedPlan} is pending admin approval. Status: <span className="font-semibold">{pendingRequest.status}</span>
          </p>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.id === currentRole;
          const isUpgradable = roleHierarchy[plan.id] > currentLevel;
          const isDowngradable = roleHierarchy[plan.id] < currentLevel;
          const bgColor =
            plan.color === 'blue'
              ? 'bg-blue-50 border-blue-200'
              : plan.color === 'purple'
                ? 'bg-purple-50 border-purple-200'
                : 'bg-emerald-50 border-emerald-200';
          const accentColor =
            plan.color === 'blue'
              ? 'text-blue-700'
              : plan.color === 'purple'
                ? 'text-purple-700'
                : 'text-emerald-700';
          const buttonColor =
            plan.color === 'blue'
              ? 'bg-blue-600 hover:bg-blue-700'
              : plan.color === 'purple'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-emerald-600 hover:bg-emerald-700';

          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border-2 ${isCurrentPlan ? 'border-current' : bgColor} overflow-hidden transition-transform hover:scale-105`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-1 text-xs font-bold">
                  Popular
                </div>
              )}

              <CardHeader className={`${isCurrentPlan ? 'bg-current text-white' : bgColor}`}>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className={`text-sm ${isCurrentPlan ? 'text-white/80' : 'text-muted-foreground'}`}>{plan.description}</p>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* Price */}
                <div>
                  <div className={`text-3xl font-bold ${accentColor}`}>
                    {plan.price} {plan.currency}
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.period}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className={`mt-1 ${accentColor}`}>✓</span>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                {isCurrentPlan ? (
                  <Button variant="outline" disabled className="w-full">
                    Current Plan
                  </Button>
                ) : isUpgradable ? (
                  <Button
                    className={`w-full text-white ${buttonColor}`}
                    onClick={() => setSelectedPlan(plan.id)}
                    disabled={pendingRequest !== undefined}
                  >
                    Upgrade
                  </Button>
                ) : isDowngradable ? (
                  <Button variant="outline" disabled className="w-full">
                    Downgrade not allowed
                  </Button>
                ) : null}
              </CardContent>
            </div>
          );
        })}
      </div>

      {/* Upgrade Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Request Upgrade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Upgrade to: {PLANS.find((p) => p.id === selectedPlan)?.name}</p>
                <p className="text-sm text-muted-foreground">Price range: {PLANS.find((p) => p.id === selectedPlan)?.price} DT/month</p>
              </div>

              <div>
                <label className="text-sm font-medium">Why are you upgrading? (optional)</label>
                <textarea
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Tell us about your business growth..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPlan(null);
                    setReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    if (selectedPlan) {
                      upgradeMutation.mutate(selectedPlan);
                    }
                  }}
                  disabled={upgradeMutation.isPending}
                >
                  {upgradeMutation.isPending ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Back Link */}
      <div className="pt-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard/settings">← Back to Settings</Link>
        </Button>
      </div>
    </div>
  );
}

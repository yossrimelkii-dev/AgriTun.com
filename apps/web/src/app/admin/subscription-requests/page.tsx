'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionRequest {
  _id: string;
  supplierId: string;
  userId: string;
  supplier?: { companyName?: string; email?: string; slug?: string; sector?: string; isVerified?: boolean };
  user?: { email?: string; name?: string };
  currentRole: string;
  requestedRole: string;
  requestedPlan: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  priceRange: string;
  reason?: string;
  createdAt: string;
}

export default function AdminSubscriptionRequestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequest | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscription-requests'],
    queryFn: async () => {
      const res = await fetch('/api/admin/subscription-requests');
      if (!res.ok) throw new Error('Failed to load requests');
      return res.json();
    },
  });

  const requests: SubscriptionRequest[] = data?.requests || [];

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch('/api/admin/subscription-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action: 'APPROVE',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error || 'Failed to approve');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['admin-subscription-requests'] });
      toast({ title: 'Request approved ✓' });
      setProcessingId(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message });
      setProcessingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch('/api/admin/subscription-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action: 'REJECT',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error || 'Failed to reject');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['admin-subscription-requests'] });
      toast({ title: 'Request rejected ✓' });
      setProcessingId(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message });
      setProcessingId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const pendingRequests = requests.filter((r: any) => r.status === 'PENDING');
  const approvedRequests = requests.filter((r: any) => r.status === 'APPROVED');
  const rejectedRequests = requests.filter((r: any) => r.status === 'REJECTED');

  const statusBg: Record<string, string> = {
    PENDING: 'bg-yellow-50 border-yellow-200',
    APPROVED: 'bg-green-50 border-green-200',
    REJECTED: 'bg-red-50 border-red-200',
  };

  const statusColor: Record<string, string> = {
    PENDING: 'text-yellow-700',
    APPROVED: 'text-green-700',
    REJECTED: 'text-red-700',
  };

  const renderRequestCard = (request: any) => (
    <Card key={request._id} className={`border-2 ${statusBg[request.status]}`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Supplier Info */}
          <div>
            <button
              type="button"
              onClick={() => setSelectedRequest(request)}
              className="font-semibold text-left hover:text-blue-600 hover:underline transition-colors"
            >
              {request.supplier?.companyName || 'Supplier profile'}
            </button>
            <p className="text-sm text-muted-foreground">{request.user?.email}</p>
          </div>

          {/* Upgrade Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current Plan</p>
              <p className="font-medium capitalize">
                {request.currentRole === 'SUPPLIER'
                  ? 'Pointe de vente'
                  : request.currentRole === 'SUPPLIER_PRIME'
                    ? 'Grossist'
                    : 'Source'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Requested Plan</p>
              <p className="font-medium">{request.requestedPlan}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Price Range</p>
              <p className="font-medium">{request.priceRange}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className={`font-medium ${statusColor[request.status]}`}>{request.status}</p>
            </div>
          </div>

          {/* Reason */}
          {request.reason && (
            <div>
              <p className="text-sm text-muted-foreground">Reason</p>
              <p className="text-sm italic">{request.reason}</p>
            </div>
          )}

          {/* Date */}
          <div className="text-xs text-muted-foreground">
            Requested on {new Date(request.createdAt).toLocaleDateString('fr-FR')}
          </div>

          {/* Actions */}
          {request.status === 'PENDING' && (
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setProcessingId(request._id);
                  rejectMutation.mutate(request._id);
                }}
                disabled={processingId === request._id}
              >
                Reject
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  setProcessingId(request._id);
                  approveMutation.mutate(request._id);
                }}
                disabled={processingId === request._id}
              >
                Approve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Subscription Upgrade Requests</h1>
        <p className="text-muted-foreground">
          Total: {requests.length} | Pending: {pendingRequests.length} | Approved: {approvedRequests.length}
        </p>
      </div>

      {/* Pending Requests */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          Pending Requests <span className="text-yellow-600 font-normal">({pendingRequests.length})</span>
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="text-muted-foreground">No pending requests</p>
        ) : (
          <div className="space-y-3">{pendingRequests.map(renderRequestCard)}</div>
        )}
      </div>

      {/* Approved Requests */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          Approved Requests <span className="text-green-600 font-normal">({approvedRequests.length})</span>
        </h2>
        {approvedRequests.length === 0 ? (
          <p className="text-muted-foreground">No approved requests</p>
        ) : (
          <div className="space-y-3">{approvedRequests.map(renderRequestCard)}</div>
        )}
      </div>

      {/* Rejected Requests */}
      {rejectedRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">
            Rejected Requests <span className="text-red-600 font-normal">({rejectedRequests.length})</span>
          </h2>
          <div className="space-y-3">{rejectedRequests.map(renderRequestCard)}</div>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-100">Supplier profile</p>
                <h3 className="text-xl font-bold">{selectedRequest.supplier?.companyName || 'Supplier'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-md px-2 py-1 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{selectedRequest.supplier?.email || selectedRequest.user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{selectedRequest.user?.name || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current → Requested</p>
                <p className="font-medium">
                  {selectedRequest.currentRole} → {selectedRequest.requestedRole}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requested plan</p>
                <p className="font-medium">{selectedRequest.requestedPlan}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price range</p>
                <p className="font-medium">{selectedRequest.priceRange}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                  {selectedRequest.status}
                </p>
              </div>
              {selectedRequest.reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p className="italic">{selectedRequest.reason}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    setProcessingId(selectedRequest._id);
                    approveMutation.mutate(selectedRequest._id, {
                      onSuccess: () => setSelectedRequest(null),
                    });
                  }}
                  disabled={processingId === selectedRequest._id}
                >
                  Approve
                </Button>
                <Button
                  className="flex-1"
                  variant="destructive"
                  onClick={() => {
                    setProcessingId(selectedRequest._id);
                    rejectMutation.mutate(selectedRequest._id, {
                      onSuccess: () => setSelectedRequest(null),
                    });
                  }}
                  disabled={processingId === selectedRequest._id}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

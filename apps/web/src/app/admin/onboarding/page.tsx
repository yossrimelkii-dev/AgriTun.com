'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type OnboardingRequest = {
  _id: string;
  firstName: string;
  lastName: string;
  professional: 'AGRICULTEUR' | 'FOURNISSEUR' | 'SPECIALIST' | 'CENTRE_DE_FORMATION';
  phoneNumber: string;
  companyName?: string;
  email?: string;
  location?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

type ApprovalForm = {
  firstName: string;
  lastName: string;
  professional: OnboardingRequest['professional'];
  phoneNumber: string;
  companyName: string;
  email: string;
  location: string;
  passwordMode: 'AUTO' | 'MANUAL';
  password: string;
};

export default function AdminOnboardingPage() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [approvalForm, setApprovalForm] = useState<ApprovalForm>({
    firstName: '',
    lastName: '',
    professional: 'AGRICULTEUR',
    phoneNumber: '',
    companyName: '',
    email: '',
    location: '',
    passwordMode: 'AUTO',
    password: '',
  });
  const [approvalError, setApprovalError] = useState('');
  const [approvalSuccess, setApprovalSuccess] = useState('');

  const { data: settingData } = useQuery({
    queryKey: ['admin-onboarding-setting'],
    queryFn: async () => {
      const res = await fetch('/api/admin/site-settings/onboarding');
      if (!res.ok) throw new Error('Failed to load onboarding setting');
      return res.json();
    },
  });

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['admin-onboarding-requests'],
    queryFn: async () => {
      const res = await fetch('/api/admin/onboarding-requests');
      if (!res.ok) throw new Error('Failed to load onboarding requests');
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (nextValue: boolean) => {
      const res = await fetch('/api/admin/site-settings/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingActive: nextValue }),
      });
      if (!res.ok) throw new Error('Failed to update onboarding setting');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-onboarding-setting'] });
      queryClient.invalidateQueries({ queryKey: ['admin-onboarding-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest) throw new Error('Aucune demande sélectionnée');

      const payload = {
        ...approvalForm,
        email: approvalForm.email.trim(),
        companyName: approvalForm.companyName.trim(),
        location: approvalForm.location.trim(),
        password:
          approvalForm.passwordMode === 'MANUAL' ? approvalForm.password.trim() : undefined,
      };

      const res = await fetch(`/api/admin/onboarding-requests/${selectedRequest._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Échec de l’approbation');
      }

      return result;
    },
    onSuccess: (result) => {
      setApprovalSuccess(
        result?.temporaryPassword
          ? `Demande approuvée. Login: ${result.loginEmail} | Mot de passe temporaire généré: ${result.temporaryPassword}`
          : `Demande approuvée. Login: ${result.loginEmail}`
      );
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ['admin-onboarding-setting'] });
      queryClient.invalidateQueries({ queryKey: ['admin-onboarding-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error: Error) => {
      setApprovalError(error.message);
    },
  });

  function openApprovalModal(request: OnboardingRequest) {
    setApprovalError('');
    setApprovalSuccess('');
    setSelectedRequest(request);
    setApprovalForm({
      firstName: request.firstName ?? '',
      lastName: request.lastName ?? '',
      professional: request.professional,
      phoneNumber: request.phoneNumber ?? '',
      companyName: request.companyName ?? '',
      email: request.email ?? '',
      location: request.location ?? '',
      passwordMode: 'AUTO',
      password: '',
    });
  }

  const requiresCompany = approvalForm.professional !== 'AGRICULTEUR';

  const onboardingActive = Boolean(settingData?.onboardingActive);
  const requests: OnboardingRequest[] = requestsData?.requests ?? [];

  const stats = useMemo(() => {
    const pending = requests.filter((item) => item.status === 'PENDING').length;
    const approved = requests.filter((item) => item.status === 'APPROVED').length;
    const rejected = requests.filter((item) => item.status === 'REJECTED').length;
    return { pending, approved, rejected, total: requests.length };
  }, [requests]);

  return (
    <div className="space-y-6">
      {approvalSuccess && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {approvalSuccess}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Onboarding</h1>
          <p className="text-muted-foreground">Activez ou désactivez le flux d&apos;inscription et consultez les demandes reçues.</p>
        </div>
        <Button
          onClick={() => toggleMutation.mutate(!onboardingActive)}
          disabled={toggleMutation.isPending}
          variant={onboardingActive ? 'destructive' : 'default'}
        >
          {onboardingActive ? 'Désactiver l\'onboarding' : 'Activer l\'onboarding'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>État actuel</CardTitle>
          <CardDescription>
            Quand l&apos;onboarding est actif, <code>/register</code> redirige automatiquement vers <code>/onboarding</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="font-medium">Mode onboarding</p>
              <p className="text-sm text-muted-foreground">
                {onboardingActive ? 'Actif — l’inscription classique est redirigée vers onboarding' : 'Désactivé — le formulaire d’inscription reste disponible'}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${onboardingActive ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
              {onboardingActive ? 'ACTIF' : 'INACTIF'}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total', value: stats.total },
          { label: 'En attente', value: stats.pending },
          { label: 'Approuvées', value: stats.approved },
          { label: 'Refusées', value: stats.rejected },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des demandes d&apos;onboarding</CardTitle>
          <CardDescription>Vous pouvez suivre les demandes envoyées par les utilisateurs.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">Nom</th>
                    <th className="py-3 pr-4">Profession</th>
                    <th className="py-3 pr-4">Société</th>
                    <th className="py-3 pr-4">Téléphone</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Location</th>
                    <th className="py-3 pr-4">Statut</th>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((item) => (
                    <tr key={item._id} className="border-b last:border-0 align-top">
                      <td className="py-3 pr-4 font-medium">{item.firstName} {item.lastName}</td>
                      <td className="py-3 pr-4">{item.professional}</td>
                      <td className="py-3 pr-4">{item.companyName || '—'}</td>
                      <td className="py-3 pr-4">{item.phoneNumber}</td>
                      <td className="py-3 pr-4">{item.email || '—'}</td>
                      <td className="py-3 pr-4">{item.location || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {item.status === 'PENDING' ? (
                          <Button size="sm" onClick={() => openApprovalModal(item)}>
                            Approuver
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl bg-background shadow-2xl border overflow-hidden">
            <div className="flex items-start justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">Approuver la demande</h3>
                <p className="text-sm text-muted-foreground">
                  Complétez les informations manquantes puis validez. Un email et un SMS seront envoyés si configurés.
                </p>
              </div>
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setSelectedRequest(null)}>
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {approvalError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{approvalError}</div>}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span>Prénom</span>
                  <input className="w-full rounded-md border px-3 py-2" value={approvalForm.firstName} onChange={(e) => setApprovalForm((prev) => ({ ...prev, firstName: e.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span>Nom</span>
                  <input className="w-full rounded-md border px-3 py-2" value={approvalForm.lastName} onChange={(e) => setApprovalForm((prev) => ({ ...prev, lastName: e.target.value }))} />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span>Profession</span>
                  <input className="w-full rounded-md border px-3 py-2 bg-muted/60" value={approvalForm.professional} readOnly />
                </label>
                <label className="space-y-2 text-sm">
                  <span>Téléphone</span>
                  <input className="w-full rounded-md border px-3 py-2" value={approvalForm.phoneNumber} onChange={(e) => setApprovalForm((prev) => ({ ...prev, phoneNumber: e.target.value }))} />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span>Email <span className="text-muted-foreground">(optionnel)</span></span>
                  <input className="w-full rounded-md border px-3 py-2" value={approvalForm.email} onChange={(e) => setApprovalForm((prev) => ({ ...prev, email: e.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span>Location</span>
                  <input className="w-full rounded-md border px-3 py-2" value={approvalForm.location} onChange={(e) => setApprovalForm((prev) => ({ ...prev, location: e.target.value }))} />
                </label>
              </div>

              {requiresCompany && (
                <label className="space-y-2 text-sm block">
                  <span>Nom de la société</span>
                  <input className="w-full rounded-md border px-3 py-2" value={approvalForm.companyName} onChange={(e) => setApprovalForm((prev) => ({ ...prev, companyName: e.target.value }))} />
                </label>
              )}

              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <p className="text-sm font-medium">Mot de passe</p>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="passwordMode" checked={approvalForm.passwordMode === 'AUTO'} onChange={() => setApprovalForm((prev) => ({ ...prev, passwordMode: 'AUTO', password: '' }))} />
                    Générer automatiquement
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="passwordMode" checked={approvalForm.passwordMode === 'MANUAL'} onChange={() => setApprovalForm((prev) => ({ ...prev, passwordMode: 'MANUAL' }))} />
                    Saisir manuellement
                  </label>
                </div>
                {approvalForm.passwordMode === 'MANUAL' && (
                  <label className="space-y-2 text-sm block">
                    <span>Mot de passe</span>
                    <input
                      type="password"
                      className="w-full rounded-md border px-3 py-2"
                      value={approvalForm.password}
                      onChange={(e) => setApprovalForm((prev) => ({ ...prev, password: e.target.value }))}
                    />
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedRequest(null)}>
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending || !approvalForm.firstName.trim() || !approvalForm.lastName.trim() || !approvalForm.phoneNumber.trim() || (requiresCompany && !approvalForm.companyName.trim()) || (approvalForm.passwordMode === 'MANUAL' && !approvalForm.password.trim())}
                >
                  {approveMutation.isPending ? 'Validation...' : 'Approuver et envoyer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

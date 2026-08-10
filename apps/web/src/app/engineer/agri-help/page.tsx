'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type HelpRequest = {
  _id: string;
  title: string;
  description: string;
  speciality: string;
  imageUrls: string[];
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  peasantId: string;
  engineerId?: string;
  engineerRecommendation?: string;
  discussion?: Array<{ senderId: string; message: string; createdAt: string }>;
  createdAt: string;
};

export default function EngineerAgriHelpPage() {
  const qc = useQueryClient();
  const [replyById, setReplyById] = useState<Record<string, string>>({});
  const [recoById, setRecoById] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ['agri-help-engineer-requests'],
    queryFn: async () => {
      const res = await fetch('/api/agri-help-requests');
      return res.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['agri-help-engineer-stats'],
    queryFn: async () => {
      const res = await fetch('/api/agri-help-requests/engineer-stats');
      return res.json();
    },
  });

  const requests: HelpRequest[] = data?.requests ?? [];
  const stats = statsData?.stats;

  const claimMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/agri-help-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Erreur de prise en charge');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agri-help-engineer-requests'] });
      qc.invalidateQueries({ queryKey: ['agri-help-engineer-stats'] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/agri-help-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          message: replyById[requestId] ?? '',
          engineerRecommendation: recoById[requestId] ?? '',
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Erreur de réponse');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agri-help-engineer-requests'] });
      qc.invalidateQueries({ queryKey: ['agri-help-engineer-stats'] });
    },
  });

  return (
    <>
      <Navbar />
      <main className="container py-8 min-h-screen">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Espace ingénieur agronome</h1>
          <p className="text-sm text-muted-foreground">
            Consultez les demandes reçues, prenez-les en charge, puis accompagnez le paysan jusqu’au résultat final.
          </p>
        </div>

        <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Demandes traitées</p><p className="text-xl font-semibold">{stats?.totalHandled ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Demandes résolues</p><p className="text-xl font-semibold">{stats?.resolvedCount ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Feedback reçus</p><p className="text-xl font-semibold">{stats?.totalFeedbacks ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Note moyenne</p><p className="text-xl font-semibold">{stats?.averageRating ?? 0} ⭐</p></CardContent></Card>
        </section>

        <section className="mt-8 space-y-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">Aucune demande disponible.</CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request._id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <span className="text-xs rounded-full border px-2 py-0.5">{request.status}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Spécialité demandée: {request.speciality}</p>
                  <p className="text-sm">{request.description}</p>

                  {request.imageUrls?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {request.imageUrls.map((url, idx) => (
                        <a key={`${url}-${idx}`} href={url} target="_blank" rel="noreferrer" className="text-xs underline text-primary">
                          Image {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {!request.engineerId && request.status === 'OPEN' ? (
                      <Button onClick={() => claimMutation.mutate(request._id)} disabled={claimMutation.isPending}>
                        Prendre en charge
                      </Button>
                    ) : null}
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <textarea
                      className="w-full rounded-md border px-3 py-2 text-sm min-h-[85px]"
                      placeholder="Message de discussion"
                      value={replyById[request._id] ?? ''}
                      onChange={(e) => setReplyById((prev) => ({ ...prev, [request._id]: e.target.value }))}
                    />
                    <textarea
                      className="w-full rounded-md border px-3 py-2 text-sm min-h-[90px]"
                      placeholder="Recommandation technique (traitement, dosage, prévention...)"
                      value={recoById[request._id] ?? request.engineerRecommendation ?? ''}
                      onChange={(e) => setRecoById((prev) => ({ ...prev, [request._id]: e.target.value }))}
                    />
                    <Button onClick={() => replyMutation.mutate(request._id)} disabled={replyMutation.isPending}>
                      Répondre au paysan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

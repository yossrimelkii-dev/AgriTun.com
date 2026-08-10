'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button, buttonVariants } from '@/components/ui/button';

type FormationQuestion = {
  id: string;
  label: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX';
  required: boolean;
  options?: string[];
};

type FormationDetail = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  formationDate: string;
  location?: string;
  organizer: string;
  allowParticipation: boolean;
  participationFormEnabled: boolean;
  participationFormQuestions: FormationQuestion[];
  stats?: { participants?: number };
};

export default function FormationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const { data: meData } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { user: null };
      return res.json();
    },
    retry: false,
    staleTime: 60_000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['formation-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/formations/${id}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load formation');
      return json;
    },
  });

  const formation: FormationDetail | undefined = data?.formation;
  const specialist = data?.specialist;
  const alreadyJoined: boolean = Boolean(data?.alreadyJoined);
  const participationStatus: string | null = data?.participationStatus || null;

  const requiredMissing = useMemo(() => {
    if (!formation?.participationFormEnabled) return false;
    return formation.participationFormQuestions.some((q) => q.required && !String(formValues[q.id] || '').trim());
  }, [formation, formValues]);

  const participateMutation = useMutation({
    mutationFn: async () => {
      const answers = (formation?.participationFormQuestions || []).map((q) => ({
        questionId: q.id,
        value: String(formValues[q.id] || '').trim(),
      }));

      const res = await fetch(`/api/formations/${id}/participate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to participate');
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['formation-detail', id] }),
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {isLoading ? (
          <section className="container py-12">
            <div className="h-[520px] rounded-3xl bg-muted animate-pulse" />
          </section>
        ) : isError || !formation ? (
          <section className="container py-20 text-center space-y-4">
            <h1 className="text-3xl font-bold">Formation not found</h1>
            <p className="text-muted-foreground">This formation does not exist or is no longer available.</p>
            <Link href="/formations" className={buttonVariants()}>
              Back to formations
            </Link>
          </section>
        ) : (
          <section className="container py-12 space-y-8">
            <div className="overflow-hidden rounded-3xl border bg-card shadow-lg">
              {formation.imageUrl ? (
                <div className="relative aspect-[16/8] w-full bg-muted">
                  <img src={formation.imageUrl} alt={formation.title} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="relative aspect-[16/8] w-full bg-gradient-to-br from-emerald-500/20 via-primary/20 to-lime-400/20" />
              )}

              <div className="p-6 md:p-8 space-y-4">
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Formation</span>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{formation.title}</h1>
                {formation.description ? <p className="text-muted-foreground text-base md:text-lg">{formation.description}</p> : null}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(formation.formationDate).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <p className="text-muted-foreground">Organizer</p>
                    <p className="font-medium">{formation.organizer}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <p className="text-muted-foreground">Participants</p>
                    <p className="font-medium">{formation.stats?.participants || 0}</p>
                  </div>
                </div>

                {specialist ? (
                  <div className="pt-2 text-sm">
                    <span className="text-muted-foreground">Specialist: </span>
                    <span className="font-medium">{specialist.firstName} {specialist.lastName}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border bg-card p-6 md:p-8 space-y-4">
              <h2 className="text-2xl font-bold">Participation</h2>

              {!formation.allowParticipation ? (
                <p className="text-muted-foreground">Participation is closed for this formation.</p>
              ) : alreadyJoined ? (
                <div className="space-y-3">
                  <div className="rounded-xl border bg-green-50 text-green-700 px-4 py-3">
                    You already joined this formation.
                  </div>
                  {participationStatus ? (
                    <div className="inline-flex rounded-full border px-3 py-1 text-xs font-medium">
                      Status: {participationStatus.toLowerCase()}
                    </div>
                  ) : null}
                </div>
              ) : !meData?.user ? (
                <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                  Please login to participate.
                  <div className="mt-3">
                    <Link href="/login" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                      Login
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {formation.participationFormEnabled && formation.participationFormQuestions.length > 0 ? (
                    <div className="space-y-4">
                      {formation.participationFormQuestions.map((question) => (
                        <div key={question.id} className="space-y-2">
                          <label className="text-sm font-medium block">{question.label} {question.required ? '*' : ''}</label>
                          {question.type === 'TEXTAREA' ? (
                            <textarea className="w-full min-h-[100px] rounded-md border px-3 py-2 text-sm" value={formValues[question.id] || ''} onChange={(e) => setFormValues((prev) => ({ ...prev, [question.id]: e.target.value }))} />
                          ) : question.type === 'SELECT' ? (
                            <select className="h-10 w-full rounded-md border px-3 text-sm" value={formValues[question.id] || ''} onChange={(e) => setFormValues((prev) => ({ ...prev, [question.id]: e.target.value }))}>
                              <option value="">Select an option</option>
                              {(question.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : question.type === 'CHECKBOX' ? (
                            <label className="inline-flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={formValues[question.id] === 'yes'} onChange={(e) => setFormValues((prev) => ({ ...prev, [question.id]: e.target.checked ? 'yes' : '' }))} />
                              Yes
                            </label>
                          ) : (
                            <input className="h-10 w-full rounded-md border px-3 text-sm" value={formValues[question.id] || ''} onChange={(e) => setFormValues((prev) => ({ ...prev, [question.id]: e.target.value }))} />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No form is required. Click the button below to participate.</p>
                  )}

                  <Button onClick={() => participateMutation.mutate()} disabled={participateMutation.isPending || requiredMissing}>
                    {participateMutation.isPending ? 'Submitting…' : 'Participate'}
                  </Button>

                  {participateMutation.error ? <p className="text-sm text-red-600">{(participateMutation.error as Error).message}</p> : null}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

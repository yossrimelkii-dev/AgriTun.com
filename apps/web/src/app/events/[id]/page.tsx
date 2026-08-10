'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button, buttonVariants } from '@/components/ui/button';

type EventQuestion = {
  id: string;
  label: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX';
  required: boolean;
  options?: string[];
};

type EventDetail = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  eventDate: string;
  organizer: string;
  allowParticipation: boolean;
  participationFormEnabled: boolean;
  participationFormQuestions: EventQuestion[];
  stats?: { participants?: number };
};

export default function EventDetailPage() {
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
    queryKey: ['event-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/events/${id}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load event');
      return json;
    },
  });

  const event: EventDetail | undefined = data?.event;
  const supplier = data?.supplier;
  const specialist = data?.specialist;
  const alreadyJoined: boolean = Boolean(data?.alreadyJoined);

  const requiredMissing = useMemo(() => {
    if (!event?.participationFormEnabled) return false;
    return event.participationFormQuestions.some((q) => q.required && !String(formValues[q.id] || '').trim());
  }, [event, formValues]);

  const participateMutation = useMutation({
    mutationFn: async () => {
      const answers = (event?.participationFormQuestions || []).map((q) => ({
        questionId: q.id,
        value: String(formValues[q.id] || '').trim(),
      }));

      const res = await fetch(`/api/events/${id}/participate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to participate');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', id] });
    },
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {isLoading ? (
          <section className="container py-12">
            <div className="h-[520px] rounded-3xl bg-muted animate-pulse" />
          </section>
        ) : isError || !event ? (
          <section className="container py-20 text-center space-y-4">
            <h1 className="text-3xl font-bold">Event not found</h1>
            <p className="text-muted-foreground">This event does not exist or is no longer available.</p>
            <Link href="/" className={buttonVariants()}>
              Back to home
            </Link>
          </section>
        ) : (
          <section className="container py-12 space-y-8">
            <div className="overflow-hidden rounded-3xl border bg-card shadow-lg">
              {event.imageUrl ? (
                <div className="relative aspect-[16/8] w-full bg-muted">
                  <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="relative aspect-[16/8] w-full bg-gradient-to-br from-indigo-500/20 via-primary/20 to-emerald-400/20" />
              )}

              <div className="p-6 md:p-8 space-y-4">
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Event</span>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{event.title}</h1>
                {event.description ? <p className="text-muted-foreground text-base md:text-lg">{event.description}</p> : null}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(event.eventDate).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <p className="text-muted-foreground">Organizer</p>
                    <p className="font-medium">{event.organizer}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <p className="text-muted-foreground">Participants</p>
                    <p className="font-medium">{event.stats?.participants || 0}</p>
                  </div>
                </div>

                {supplier?.slug ? (
                  <div className="pt-2 text-sm">
                    <Link href={`/suppliers/${supplier.slug}`} className="text-primary hover:underline">
                      View organizer profile: {supplier.companyName}
                    </Link>
                  </div>
                ) : specialist?.id ? (
                  <div className="pt-2 text-sm">
                    <Link href={`/specialists/${specialist.id}`} className="text-primary hover:underline">
                      View organizer profile: {specialist.firstName} {specialist.lastName}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border bg-card p-6 md:p-8 space-y-4">
              <h2 className="text-2xl font-bold">Participation</h2>

              {!event.allowParticipation ? (
                <p className="text-muted-foreground">Participation is closed for this event.</p>
              ) : alreadyJoined ? (
                <div className="rounded-xl border bg-green-50 text-green-700 px-4 py-3">
                  You already joined this event.
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
                  {event.participationFormEnabled && event.participationFormQuestions.length > 0 ? (
                    <div className="space-y-4">
                      {event.participationFormQuestions.map((question) => (
                        <div key={question.id} className="space-y-2">
                          <label className="text-sm font-medium block">
                            {question.label} {question.required ? '*' : ''}
                          </label>

                          {question.type === 'TEXTAREA' ? (
                            <textarea
                              className="w-full min-h-[100px] rounded-md border px-3 py-2 text-sm"
                              value={formValues[question.id] || ''}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, [question.id]: e.target.value }))}
                            />
                          ) : question.type === 'SELECT' ? (
                            <select
                              className="h-10 w-full rounded-md border px-3 text-sm"
                              value={formValues[question.id] || ''}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, [question.id]: e.target.value }))}
                            >
                              <option value="">Select an option</option>
                              {(question.options || []).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : question.type === 'CHECKBOX' ? (
                            <label className="inline-flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={formValues[question.id] === 'yes'}
                                onChange={(e) =>
                                  setFormValues((prev) => ({ ...prev, [question.id]: e.target.checked ? 'yes' : '' }))
                                }
                              />
                              Yes
                            </label>
                          ) : (
                            <input
                              className="h-10 w-full rounded-md border px-3 text-sm"
                              value={formValues[question.id] || ''}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, [question.id]: e.target.value }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No form is required. Click the button below to participate.</p>
                  )}

                  <Button
                    onClick={() => participateMutation.mutate()}
                    disabled={participateMutation.isPending || requiredMissing}
                  >
                    {participateMutation.isPending ? 'Submitting…' : 'Participate'}
                  </Button>

                  {participateMutation.error ? (
                    <p className="text-sm text-red-600">{(participateMutation.error as Error).message}</p>
                  ) : null}
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

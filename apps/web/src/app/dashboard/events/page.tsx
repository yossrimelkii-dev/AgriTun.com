'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EventQuestion {
  id: string;
  label: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX';
  required: boolean;
  options?: string[];
}

interface SupplierEvent {
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
  isActive: boolean;
}

interface EventParticipant {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  answers: Array<{ questionId: string; label: string; value: string }>;
  createdAt: string;
}

export default function DashboardEventsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [allowParticipation, setAllowParticipation] = useState(true);
  const [participationFormEnabled, setParticipationFormEnabled] = useState(false);
  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [participantsByEvent, setParticipantsByEvent] = useState<Record<string, EventParticipant[]>>({});
  const [expandedParticipants, setExpandedParticipants] = useState<Record<string, boolean>>({});
  const [participantsLoadingByEvent, setParticipantsLoadingByEvent] = useState<Record<string, boolean>>({});

  // Fetch current user role to check access
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
  const currentRole = meData?.user?.role;
  const canAccessEvents = currentRole === 'SUPPLIER_PRIME' || currentRole === 'SUPER_SUPPLIER';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-events'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/events');
      if (!res.ok) throw new Error('Failed to load events');
      return res.json();
    },
  });

  const events: SupplierEvent[] = data?.events || [];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/dashboard/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create event');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-events'] });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setImageUrl('');
      setEventDate('');
      setOrganizer('');
      setAllowParticipation(true);
      setParticipationFormEnabled(false);
      setQuestions([]);
    },
  });

  const heroRequestMutation = useMutation({
    mutationFn: async (event: SupplierEvent) => {
      const now = new Date();
      const eventDate = new Date(event.eventDate);
      const hasFutureEventDate = !Number.isNaN(eventDate.getTime()) && eventDate.getTime() > now.getTime();

      const payload = {
        title: event.title,
        description: event.description || `Event by ${event.organizer}`,
        imageUrl: event.imageUrl || '',
        linkUrl: `/events/${event._id}`,
        ctaLabel: 'Participate now',
        kind: 'EVENT',
        composition: 'Event details available on page',
        dosage: 'Not applicable',
        startDate: now.toISOString(),
        endDate: hasFutureEventDate ? eventDate.toISOString() : undefined,
      };

      const res = await fetch('/api/dashboard/hero-promotion-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to send hero request');
      return json;
    },
  });

  const canSubmit = useMemo(() => {
    if (!title.trim() || !eventDate) return false;
    if (participationFormEnabled) {
      return questions.every((q) => q.label.trim().length > 0);
    }
    return true;
  }, [title, eventDate, participationFormEnabled, questions]);

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { id: `q_${Date.now()}_${prev.length}`, label: '', type: 'TEXT', required: false, options: [] },
    ]);
  }

  function updateQuestion(index: number, patch: Partial<EventQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      title,
      description,
      imageUrl,
      eventDate,
      organizer,
      allowParticipation,
      participationFormEnabled,
      participationFormQuestions: participationFormEnabled ? questions : [],
    });
  }

  async function toggleParticipants(eventId: string) {
    const isExpanded = expandedParticipants[eventId];
    if (isExpanded) {
      setExpandedParticipants((prev) => ({ ...prev, [eventId]: false }));
      return;
    }

    setExpandedParticipants((prev) => ({ ...prev, [eventId]: true }));

    if (participantsByEvent[eventId]) {
      return;
    }

    setParticipantsLoadingByEvent((prev) => ({ ...prev, [eventId]: true }));

    try {
      const res = await fetch(`/api/dashboard/events/${eventId}/participants`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load participants');
      setParticipantsByEvent((prev) => ({ ...prev, [eventId]: json?.participants || [] }));
    } catch {
      setParticipantsByEvent((prev) => ({ ...prev, [eventId]: [] }));
    } finally {
      setParticipantsLoadingByEvent((prev) => ({ ...prev, [eventId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      {!canAccessEvents && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-800">
          <p className="font-medium">Accès restreint</p>
          <p className="text-sm mt-1">Only Supplier Prime and Super Suppliers can create and manage events.</p>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">Create supplier-owned events and let users participate.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} disabled={!canAccessEvents}>{showForm ? 'Cancel' : '+ New event'}</Button>
      </div>

      {showForm && canAccessEvents && (
        <Card>
          <CardHeader>
            <CardTitle>Create event</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label>Organizer</Label>
                  <Input value={organizer} onChange={(e) => setOrganizer(e.target.value)} className="mt-1" placeholder="Company / organizer name" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Event date *</Label>
                  <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1" placeholder="https://..." />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <textarea
                  className="mt-1 w-full min-h-[120px] rounded-md border px-3 py-2 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your event..."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={allowParticipation} onChange={(e) => setAllowParticipation(e.target.checked)} />
                  Allow users to participate
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={participationFormEnabled}
                    onChange={(e) => setParticipationFormEnabled(e.target.checked)}
                    disabled={!allowParticipation}
                  />
                  Add custom participation form
                </label>
              </div>

              {allowParticipation && participationFormEnabled && (
                <div className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Custom questions</p>
                    <Button type="button" variant="outline" size="sm" onClick={addQuestion}>+ Add question</Button>
                  </div>

                  {questions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No questions yet. Users can still participate without form fields.</p>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((question, index) => (
                        <div key={question.id} className="rounded-lg border p-3 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Input
                              value={question.label}
                              onChange={(e) => updateQuestion(index, { label: e.target.value })}
                              placeholder="Question label"
                            />
                            <select
                              value={question.type}
                              onChange={(e) => updateQuestion(index, { type: e.target.value as EventQuestion['type'] })}
                              className="h-10 rounded-md border px-3 text-sm"
                            >
                              <option value="TEXT">Text</option>
                              <option value="TEXTAREA">Textarea</option>
                              <option value="SELECT">Select</option>
                              <option value="CHECKBOX">Checkbox</option>
                            </select>
                            <div className="flex items-center justify-between rounded-md border px-3">
                              <label className="text-sm flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={question.required}
                                  onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                                />
                                Required
                              </label>
                              <button type="button" className="text-sm text-red-600" onClick={() => removeQuestion(index)}>
                                Remove
                              </button>
                            </div>
                          </div>

                          {question.type === 'SELECT' && (
                            <Input
                              value={(question.options || []).join(', ')}
                              onChange={(e) =>
                                updateQuestion(index, {
                                  options: e.target.value
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="Option 1, Option 2, Option 3"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" disabled={!canSubmit || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create event'}
              </Button>
              {createMutation.error ? (
                <p className="text-sm text-red-600">{(createMutation.error as Error).message}</p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>My events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events created yet.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event._id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.eventDate).toLocaleString()} · Organizer: {event.organizer}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Participants: {event.stats?.participants || 0} · Participation {event.allowParticipation ? 'enabled' : 'disabled'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/events/${event._id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                        View event page
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleParticipants(event._id)}
                        disabled={participantsLoadingByEvent[event._id]}
                      >
                        {expandedParticipants[event._id] ? 'Hide participants' : 'Consult participants'}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => heroRequestMutation.mutate(event)}
                        disabled={heroRequestMutation.isPending}
                      >
                        {heroRequestMutation.isPending ? 'Requesting…' : 'Request hero spotlight'}
                      </Button>
                    </div>
                  </div>

                  {expandedParticipants[event._id] && (
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                      {participantsLoadingByEvent[event._id] ? (
                        <p className="text-sm text-muted-foreground">Loading participants...</p>
                      ) : (participantsByEvent[event._id] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No participants yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {(participantsByEvent[event._id] || []).map((participant) => (
                            <div key={participant._id} className="rounded-md border bg-background p-3">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <p className="font-medium text-sm">{participant.name}</p>
                                <p className="text-xs text-muted-foreground">{new Date(participant.createdAt).toLocaleString()}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">{participant.email || '—'} · {participant.role}</p>

                              {participant.answers?.length ? (
                                <div className="mt-2 space-y-1">
                                  {participant.answers.map((answer) => (
                                    <p key={`${participant._id}-${answer.questionId}`} className="text-xs text-muted-foreground">
                                      <span className="font-medium">{answer.label}:</span> {answer.value || '—'}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

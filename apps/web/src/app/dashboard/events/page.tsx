'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUploadField } from '@/components/ui/image-upload-field';
import { useToast } from '@/hooks/use-toast';
import { Edit2, Save, Trash2, X } from 'lucide-react';

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

interface EditState {
  title: string;
  description: string;
  imageUrl: string;
  eventDate: string;
  organizer: string;
  allowParticipation: boolean;
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DashboardEventsPage() {
  const { toast } = useToast();
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [showPast, setShowPast] = useState(false);

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
  const canAccessEvents =
    currentRole === 'SUPPLIER' ||
    currentRole === 'SUPPLIER_PRIME' ||
    currentRole === 'SUPER_SUPPLIER';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-events'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/events');
      if (!res.ok) throw new Error('Failed to load events');
      return res.json();
    },
  });

  const events: SupplierEvent[] = data?.events || [];

  // Split upcoming (or today) vs past events for the "historique" view.
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = Date.now();
    const upcoming: SupplierEvent[] = [];
    const past: SupplierEvent[] = [];
    for (const ev of events) {
      const ts = new Date(ev.eventDate).getTime();
      if (Number.isFinite(ts) && ts < now) past.push(ev);
      else upcoming.push(ev);
    }
    // upcoming: soonest first; past: most recent first
    upcoming.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    past.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  const visibleEvents = showPast ? pastEvents : upcomingEvents;

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
      queryClient.invalidateQueries({ queryKey: ['home-events-latest'] });
      queryClient.invalidateQueries({ queryKey: ['public-events-list'] });
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<EditState> }) => {
      const res = await fetch(`/api/dashboard/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      return json;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-events'] }),
        queryClient.invalidateQueries({ queryKey: ['home-events-latest'] }),
        queryClient.invalidateQueries({ queryKey: ['public-events-list'] }),
      ]);
      setEditingId(null);
      setEditState(null);
      toast({ title: 'Événement mis à jour ✓' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err?.message || 'Update failed' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/events/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Delete failed');
      }
      return res.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-events'] }),
        queryClient.invalidateQueries({ queryKey: ['home-events-latest'] }),
        queryClient.invalidateQueries({ queryKey: ['public-events-list'] }),
      ]);
      toast({ title: 'Événement supprimé' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err?.message || 'Delete failed' });
    },
  });

  const heroRequestMutation = useMutation({
    mutationFn: async (event: SupplierEvent) => {
      const now = new Date();
      const eventDateObj = new Date(event.eventDate);
      const hasFutureEventDate = !Number.isNaN(eventDateObj.getTime()) && eventDateObj.getTime() > now.getTime();

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
        endDate: hasFutureEventDate ? eventDateObj.toISOString() : undefined,
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
    onSuccess: () => {
      toast({ title: 'Demande envoyée', description: 'La demande de mise en avant a été soumise.' });
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

  function startEditing(event: SupplierEvent) {
    setEditingId(event._id);
    setEditState({
      title: event.title,
      description: event.description || '',
      imageUrl: event.imageUrl || '',
      eventDate: toDatetimeLocal(event.eventDate),
      organizer: event.organizer,
      allowParticipation: event.allowParticipation,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditState(null);
  }

  function saveEditing() {
    if (!editingId || !editState) return;
    updateMutation.mutate({
      id: editingId,
      payload: {
        title: editState.title,
        description: editState.description,
        imageUrl: editState.imageUrl,
        eventDate: editState.eventDate,
        organizer: editState.organizer,
        allowParticipation: editState.allowParticipation,
      },
    });
  }

  function confirmDelete(event: SupplierEvent) {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        `Supprimer l'événement "${event.title}" ? Toutes les participations associées seront également supprimées. Cette action est irréversible.`
      );
      if (!ok) return;
    }
    deleteMutation.mutate(event._id);
  }

  async function toggleParticipants(eventId: string) {
    const isExpanded = expandedParticipants[eventId];
    if (isExpanded) {
      setExpandedParticipants((prev) => ({ ...prev, [eventId]: false }));
      return;
    }

    setExpandedParticipants((prev) => ({ ...prev, [eventId]: true }));

    if (participantsByEvent[eventId]) return;

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
          <p className="text-sm mt-1">Vous devez avoir un compte fournisseur pour gérer des événements.</p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Événements</h1>
          <p className="text-muted-foreground">Créez, modifiez et gérez vos événements — consultez aussi l'historique.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} disabled={!canAccessEvents}>
          {showForm ? 'Annuler' : '+ Nouvel événement'}
        </Button>
      </div>

      {showForm && canAccessEvents && (
        <Card>
          <CardHeader>
            <CardTitle>Créer un événement</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Titre *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label>Organisateur</Label>
                  <Input value={organizer} onChange={(e) => setOrganizer(e.target.value)} className="mt-1" placeholder="Nom de la société / organisateur" />
                </div>
              </div>

              <div>
                <Label>Date de l'événement *</Label>
                <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="mt-1" />
              </div>

              <ImageUploadField
                label="Image de couverture"
                value={imageUrl}
                onChange={setImageUrl}
                aspectRatio="wide"
              />

              <div>
                <Label>Description</Label>
                <textarea
                  className="mt-1 w-full min-h-[120px] rounded-md border px-3 py-2 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre événement..."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={allowParticipation} onChange={(e) => setAllowParticipation(e.target.checked)} />
                  Autoriser les participations
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={participationFormEnabled}
                    onChange={(e) => setParticipationFormEnabled(e.target.checked)}
                    disabled={!allowParticipation}
                  />
                  Ajouter un formulaire personnalisé
                </label>
              </div>

              {allowParticipation && participationFormEnabled && (
                <div className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Questions personnalisées</p>
                    <Button type="button" variant="outline" size="sm" onClick={addQuestion}>+ Ajouter</Button>
                  </div>

                  {questions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune question. Les participants pourront quand même s'inscrire.</p>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((question, index) => (
                        <div key={question.id} className="rounded-lg border p-3 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Input
                              value={question.label}
                              onChange={(e) => updateQuestion(index, { label: e.target.value })}
                              placeholder="Libellé de la question"
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
                                Obligatoire
                              </label>
                              <button type="button" className="text-sm text-red-600" onClick={() => removeQuestion(index)}>
                                Supprimer
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
                {createMutation.isPending ? 'Création…' : "Créer l'événement"}
              </Button>
              {createMutation.error ? (
                <p className="text-sm text-red-600">{(createMutation.error as Error).message}</p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Upcoming / Past tabs */}
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setShowPast(false)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            !showPast ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          À venir ({upcomingEvents.length})
        </button>
        <button
          type="button"
          onClick={() => setShowPast(true)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            showPast ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Historique ({pastEvents.length})
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{showPast ? 'Événements passés' : 'Mes événements à venir'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : visibleEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {showPast ? 'Aucun événement passé.' : 'Aucun événement à venir.'}
            </p>
          ) : (
            <div className="space-y-3">
              {visibleEvents.map((event) => {
                const isEditing = editingId === event._id;
                return (
                  <div key={event._id} className="rounded-xl border p-4 space-y-3">
                    {isEditing && editState ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Titre *</Label>
                            <Input
                              value={editState.title}
                              onChange={(e) => setEditState((s) => (s ? { ...s, title: e.target.value } : s))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Organisateur</Label>
                            <Input
                              value={editState.organizer}
                              onChange={(e) => setEditState((s) => (s ? { ...s, organizer: e.target.value } : s))}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Date</Label>
                          <Input
                            type="datetime-local"
                            value={editState.eventDate}
                            onChange={(e) => setEditState((s) => (s ? { ...s, eventDate: e.target.value } : s))}
                            className="mt-1"
                          />
                        </div>

                        <ImageUploadField
                          label="Image de couverture"
                          value={editState.imageUrl}
                          onChange={(url) => setEditState((s) => (s ? { ...s, imageUrl: url } : s))}
                          aspectRatio="wide"
                        />

                        <div>
                          <Label>Description</Label>
                          <textarea
                            className="mt-1 w-full min-h-[100px] rounded-md border px-3 py-2 text-sm"
                            value={editState.description}
                            onChange={(e) =>
                              setEditState((s) => (s ? { ...s, description: e.target.value } : s))
                            }
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editState.allowParticipation}
                            onChange={(e) =>
                              setEditState((s) => (s ? { ...s, allowParticipation: e.target.checked } : s))
                            }
                          />
                          Autoriser les participations
                        </label>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveEditing}
                            disabled={updateMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {updateMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="h-4 w-4 mr-2" />
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {event.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={event.imageUrl}
                                alt=""
                                className="h-16 w-16 rounded-lg object-cover border shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold">{event.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(event.eventDate).toLocaleString('fr-FR')} · Organisateur: {event.organizer}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Participants: {event.stats?.participants || 0} · Participations {event.allowParticipation ? 'ouvertes' : 'fermées'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/events/${event._id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                              Voir la page
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleParticipants(event._id)}
                              disabled={participantsLoadingByEvent[event._id]}
                            >
                              {expandedParticipants[event._id] ? 'Masquer participants' : 'Consulter participants'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => startEditing(event)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Éditer
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => confirmDelete(event)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => heroRequestMutation.mutate(event)}
                              disabled={heroRequestMutation.isPending}
                            >
                              {heroRequestMutation.isPending ? 'Envoi…' : 'Mise en avant'}
                            </Button>
                          </div>
                        </div>

                        {expandedParticipants[event._id] && (
                          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                            {participantsLoadingByEvent[event._id] ? (
                              <p className="text-sm text-muted-foreground">Chargement des participants...</p>
                            ) : (participantsByEvent[event._id] || []).length === 0 ? (
                              <p className="text-sm text-muted-foreground">Aucun participant pour le moment.</p>
                            ) : (
                              <div className="space-y-2">
                                {(participantsByEvent[event._id] || []).map((participant) => (
                                  <div key={participant._id} className="rounded-md border bg-background p-3">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                      <p className="font-medium text-sm">{participant.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(participant.createdAt).toLocaleString('fr-FR')}
                                      </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {participant.email || '—'} · {participant.role}
                                    </p>

                                    {participant.answers?.length ? (
                                      <div className="mt-2 space-y-1">
                                        {participant.answers.map((answer) => (
                                          <p
                                            key={`${participant._id}-${answer.questionId}`}
                                            className="text-xs text-muted-foreground"
                                          >
                                            <span className="font-medium">{answer.label}:</span>{' '}
                                            {answer.value || '—'}
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
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

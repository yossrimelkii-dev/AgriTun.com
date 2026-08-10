'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

interface EventQuestionDraft {
  id: string;
  label: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX';
  required: boolean;
  optionsText: string;
}

interface EngineerEvent {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  eventDate: string;
  organizer: string;
  allowParticipation: boolean;
  participationFormEnabled: boolean;
  stats?: { participants?: number };
}

export default function EventsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [eventForm, setEventForm] = useState<Record<string, string>>({
    allowParticipation: 'true',
    participationFormEnabled: 'true',
  });
  const [eventQuestions, setEventQuestions] = useState<EventQuestionDraft[]>([]);

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['engineer-events'],
    queryFn: async () => {
      const res = await fetch('/api/engineer/events');
      if (!res.ok) throw new Error('Failed to load events');
      return res.json();
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/engineer/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Event creation failed');
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineer-events'] });
      setEventForm({ allowParticipation: 'true', participationFormEnabled: 'true' });
      setEventQuestions([]);
      toast({ title: 'Événement créé avec succès!' });
    },
    onError: () => {
      toast({ title: 'Erreur lors de la création' });
    },
  });

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/engineer/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Événements</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Creation Form */}
        <Card className="lg:col-span-1 lg:sticky lg:top-24 lg:h-fit">
          <CardHeader>
            <CardTitle>Créer un événement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            <div className="grid gap-3">
              <Input
                placeholder="Titre"
                value={eventForm.title ?? ''}
                onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <Input
                type="datetime-local"
                value={eventForm.eventDate ?? ''}
                onChange={(e) => setEventForm((prev) => ({ ...prev, eventDate: e.target.value }))}
              />
              <Input
                placeholder="Lieu / Ville"
                value={eventForm.location ?? ''}
                onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))}
              />
              <Input
                placeholder="Image URL"
                value={eventForm.imageUrl ?? ''}
                onChange={(e) => setEventForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              />
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Description"
                value={eventForm.description ?? ''}
                onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(eventForm.allowParticipation ?? 'true') === 'true'}
                  onChange={(e) =>
                    setEventForm((prev) => ({ ...prev, allowParticipation: String(e.target.checked) }))
                  }
                />
                Allow participation
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(eventForm.participationFormEnabled ?? 'true') === 'true'}
                  onChange={(e) =>
                    setEventForm((prev) => ({ ...prev, participationFormEnabled: String(e.target.checked) }))
                  }
                />
                Dynamic form
              </label>
            </div>

            {(eventForm.participationFormEnabled ?? 'true') === 'true' ? (
              <div className="space-y-3 rounded-2xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Form questions</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEventQuestions((prev) => [...prev, { id: `q_${Date.now()}`, label: '', type: 'TEXT', required: false, optionsText: '' }])
                    }
                  >
                    Add
                  </Button>
                </div>
                {eventQuestions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No questions added yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {eventQuestions.map((question, index) => (
                      <div key={question.id} className="grid gap-2 rounded-xl border bg-background p-2">
                        <Input
                          size={28}
                          placeholder={`Question ${index + 1}`}
                          value={question.label}
                          onChange={(e) =>
                            setEventQuestions((prev) =>
                              prev.map((item) => (item.id === question.id ? { ...item, label: e.target.value } : item))
                            )
                          }
                        />
                        <select
                          className="h-8 rounded-md border px-2 text-xs"
                          value={question.type}
                          onChange={(e) =>
                            setEventQuestions((prev) =>
                              prev.map((item) =>
                                item.id === question.id ? { ...item, type: e.target.value as EventQuestionDraft['type'] } : item
                              )
                            )
                          }
                        >
                          <option value="TEXT">Text</option>
                          <option value="TEXTAREA">Textarea</option>
                          <option value="SELECT">Select</option>
                          <option value="CHECKBOX">Checkbox</option>
                        </select>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) =>
                                setEventQuestions((prev) =>
                                  prev.map((item) =>
                                    item.id === question.id ? { ...item, required: e.target.checked } : item
                                  )
                                )
                              }
                            />
                            Required
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6"
                            onClick={() =>
                              setEventQuestions((prev) => prev.filter((item) => item.id !== question.id))
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <Button
              type="button"
              disabled={createEventMutation.isPending || !eventForm.title || !eventForm.eventDate}
              className="w-full"
              onClick={() =>
                createEventMutation.mutate({
                  title: eventForm.title,
                  description: eventForm.description,
                  imageUrl: eventForm.imageUrl,
                  eventDate: eventForm.eventDate,
                  organizer: eventForm.location || undefined,
                  allowParticipation: (eventForm.allowParticipation ?? 'true') === 'true',
                  participationFormEnabled: (eventForm.participationFormEnabled ?? 'true') === 'true',
                  participationFormQuestions: eventQuestions.map((q) => ({
                    id: q.id,
                    label: q.label,
                    type: q.type,
                    required: q.required,
                    options:
                      q.type === 'SELECT'
                        ? q.optionsText
                            .split(',')
                            .map((opt) => opt.trim())
                            .filter(Boolean)
                        : [],
                  })),
                })
              }
            >
              {createEventMutation.isPending ? 'Creating...' : 'Créer l\'événement'}
            </Button>
          </CardContent>
        </Card>

        {/* Events List */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (eventsData?.events || []).length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Aucun événement créé yet.</p>
              </CardContent>
            </Card>
          ) : (
            (eventsData?.events || []).map((event: EngineerEvent) => (
              <Card key={event._id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{event.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.eventDate).toLocaleString('fr-TN')}
                      </p>
                    </div>
                    <span className="rounded-full border px-2 py-1 text-[10px] font-medium uppercase">
                      {event.allowParticipation ? 'Open' : 'Closed'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{event.description || 'Aucune description'}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                      {event.stats?.participants || 0} participants
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1">{event.organizer}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/engineer/dashboard/events/${event._id}`}>Voir les détails</Link>
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1">
                      Éditer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

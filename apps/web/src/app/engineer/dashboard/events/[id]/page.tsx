'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit2, Megaphone, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { HeroPromotionRequestDialog } from '@/components/promotions/hero-promotion-request-dialog';

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

interface EventParticipant {
  id: string;
  eventId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  user: { email: string; firstName: string; lastName: string } | null;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<EngineerEvent>>({});
  const [promoOpen, setPromoOpen] = useState(false);

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['engineer-event', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/engineer/events`);
      if (!res.ok) throw new Error('Failed to load event');
      const data = await res.json();
      const event = data.events?.find((e: EngineerEvent) => e._id === params.id);
      return event;
    },
  });

  const { data: participantsData } = useQuery({
    queryKey: ['engineer-event-participants', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/engineer/events`);
      if (!res.ok) throw new Error('Failed to load participants');
      const data = await res.json();
      const participants = data.participations?.filter((p: EventParticipant) => p.eventId === params.id) || [];
      return participants;
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/engineer/events/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineer-events'] });
      setIsEditing(false);
      toast({ title: 'Événement mis à jour avec succès!' });
    },
  });

  const startEditing = () => {
    if (eventData) {
      setEditData(eventData);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
  };

  const saveChanges = () => {
    updateEventMutation.mutate({
      title: editData.title,
      description: editData.description,
      imageUrl: editData.imageUrl,
      eventDate: editData.eventDate,
      organizer: editData.organizer,
      allowParticipation: editData.allowParticipation,
    });
  };

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/engineer/events/${params.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Suppression échouée');
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineer-events'] });
      toast({ title: 'Événement supprimé' });
      router.push('/engineer/dashboard/events');
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err?.message });
    },
  });

  const confirmAndDelete = () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        'Supprimer cet événement ? Toutes les participations associées seront également supprimées. Cette action est irréversible.'
      );
      if (!ok) return;
    }
    deleteEventMutation.mutate();
  };

  const reviewParticipationMutation = useMutation({
    mutationFn: async ({ participationId, status }: { participationId: string; status: 'ACCEPTED' | 'REJECTED' }) => {
      const res = await fetch(`/api/engineer/events/${params.id}/participants/${participationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Review failed');
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineer-event-participants'] });
      toast({ title: 'Participation mise à jour' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:p-8">
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="flex-1 p-6 md:p-8">
        <Button asChild variant="ghost">
          <Link href="/engineer/dashboard/events">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
        <div className="mt-8">
          <p className="text-muted-foreground">Événement non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link href="/engineer/dashboard/events">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
        {!isEditing && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setPromoOpen(true)}>
              <Megaphone className="h-4 w-4 mr-2" />
              Demander la mise en avant
            </Button>
            <Button onClick={startEditing}>
              <Edit2 className="h-4 w-4 mr-2" />
              Éditer
            </Button>
            <Button
              variant="destructive"
              onClick={confirmAndDelete}
              disabled={deleteEventMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteEventMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button
              onClick={saveChanges}
              disabled={updateEventMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
            <Button onClick={cancelEditing} variant="outline">
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          </div>
        )}
      </div>

      <HeroPromotionRequestDialog
        open={promoOpen}
        onOpenChange={setPromoOpen}
        subject={{
          kind: 'EVENT',
          id: String(params.id),
          title: eventData.title,
          description: eventData.description,
          imageUrl: eventData.imageUrl,
          date: eventData.eventDate,
        }}
      />

      {/* Cover Image */}
      {eventData.imageUrl && (
        <div className="relative h-64 rounded-2xl overflow-hidden bg-muted">
          <img
            src={eventData.imageUrl}
            alt={eventData.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Éditer l'événement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Titre</label>
                  <Input
                    value={editData.title ?? ''}
                    onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={editData.description ?? ''}
                    onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="datetime-local"
                    value={editData.eventDate ?? ''}
                    onChange={(e) => setEditData((prev) => ({ ...prev, eventDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Organisateur</label>
                  <Input
                    value={editData.organizer ?? ''}
                    onChange={(e) => setEditData((prev) => ({ ...prev, organizer: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Image URL</label>
                  <Input
                    value={editData.imageUrl ?? ''}
                    onChange={(e) => setEditData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editData.allowParticipation ?? true}
                    onChange={(e) => setEditData((prev) => ({ ...prev, allowParticipation: e.target.checked }))}
                  />
                  <label className="text-sm">Autoriser la participation</label>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">{eventData.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      {new Date(eventData.eventDate).toLocaleString('fr-TN')}
                    </p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-xs font-medium uppercase">
                    {eventData.allowParticipation ? 'Open' : 'Closed'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">{eventData.description || 'Aucune description'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Organisateur</p>
                    <p className="font-medium">{eventData.organizer || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Participants</p>
                    <p className="font-medium">{eventData.stats?.participants ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Participants Section */}
          {!isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Participations ({(participantsData || []).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(participantsData || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun participant pour le moment.
                  </p>
                )}
                {(participantsData || []).map((participant: EventParticipant) => (
                  <div
                    key={participant.id}
                    className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {participant.user?.firstName} {participant.user?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{participant.user?.email}</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        Status: {participant.status === 'PENDING' ? '⏳ En attente' : participant.status === 'ACCEPTED' ? '✓ Accepté' : '✗ Rejeté'}
                      </p>
                    </div>
                    {participant.status === 'PENDING' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            reviewParticipationMutation.mutate({
                              participationId: participant.id,
                              status: 'ACCEPTED',
                            })
                          }
                          disabled={reviewParticipationMutation.isPending}
                        >
                          Accepter
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            reviewParticipationMutation.mutate({
                              participationId: participant.id,
                              status: 'REJECTED',
                            })
                          }
                          disabled={reviewParticipationMutation.isPending}
                        >
                          Rejeter
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Participants</p>
                <p className="text-2xl font-bold">{eventData.stats?.participants ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <p className="text-sm font-medium">
                  {eventData.allowParticipation ? '✓ Ouvert' : '✗ Fermé'}
                </p>
              </div>
              {eventData.participationFormEnabled && (
                <div>
                  <p className="text-xs text-muted-foreground">Formulaire</p>
                  <p className="text-sm font-medium">Personnalisé</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button asChild className="w-full" variant="outline">
            <Link href="/engineer/dashboard/events">Retour à la liste</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

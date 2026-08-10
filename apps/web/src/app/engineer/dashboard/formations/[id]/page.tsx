'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit2, Save, X } from 'lucide-react';
import { useState } from 'react';

interface EngineerFormation {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  formationDate: string;
  location?: string;
  organizer: string;
  allowParticipation: boolean;
  participationFormEnabled: boolean;
  stats?: { participants?: number };
}

interface FormationParticipant {
  id: string;
  formationId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  user: { email: string; firstName: string; lastName: string } | null;
}

export default function FormationDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<EngineerFormation>>({});

  const { data: formationData, isLoading } = useQuery({
    queryKey: ['engineer-formation', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/engineer/formations`);
      if (!res.ok) throw new Error('Failed to load formation');
      const data = await res.json();
      const formation = data.formations?.find((f: EngineerFormation) => f._id === params.id);
      return formation;
    },
  });

  const { data: participantsData } = useQuery({
    queryKey: ['engineer-formation-participants', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/engineer/formations`);
      if (!res.ok) throw new Error('Failed to load participants');
      const data = await res.json();
      const participants = data.participations?.filter((p: FormationParticipant) => p.formationId === params.id) || [];
      return participants;
    },
  });

  const updateFormationMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/engineer/formations/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineer-formations'] });
      setIsEditing(false);
      toast({ title: 'Formation mise à jour avec succès!' });
    },
  });

  const startEditing = () => {
    if (formationData) {
      setEditData(formationData);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
  };

  const saveChanges = () => {
    updateFormationMutation.mutate({
      title: editData.title,
      description: editData.description,
      imageUrl: editData.imageUrl,
      formationDate: editData.formationDate,
      location: editData.location,
      allowParticipation: editData.allowParticipation,
    });
  };

  const reviewParticipationMutation = useMutation({
    mutationFn: async ({ participationId, status }: { participationId: string; status: 'ACCEPTED' | 'REJECTED' }) => {
      const res = await fetch(`/api/engineer/formations/${params.id}/participants/${participationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Review failed');
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineer-formation-participants'] });
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

  if (!formationData) {
    return (
      <div className="flex-1 p-6 md:p-8">
        <Button asChild variant="ghost">
          <Link href="/engineer/dashboard/formations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
        <div className="mt-8">
          <p className="text-muted-foreground">Formation non trouvée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/engineer/dashboard/formations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
        {!isEditing && (
          <Button onClick={startEditing}>
            <Edit2 className="h-4 w-4 mr-2" />
            Éditer
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button
              onClick={saveChanges}
              disabled={updateFormationMutation.isPending}
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

      {/* Cover Image */}
      {formationData.imageUrl && (
        <div className="relative h-64 rounded-2xl overflow-hidden bg-muted">
          <img
            src={formationData.imageUrl}
            alt={formationData.title}
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
                <CardTitle>Éditer la formation</CardTitle>
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
                    value={editData.formationDate ?? ''}
                    onChange={(e) => setEditData((prev) => ({ ...prev, formationDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Lieu</label>
                  <Input
                    value={editData.location ?? ''}
                    onChange={(e) => setEditData((prev) => ({ ...prev, location: e.target.value }))}
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
                    <CardTitle className="text-2xl">{formationData.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      {new Date(formationData.formationDate).toLocaleString('fr-TN')}
                    </p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-xs font-medium uppercase">
                    {formationData.allowParticipation ? 'Open' : 'Closed'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">{formationData.description || 'Aucune description'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Lieu</p>
                    <p className="font-medium">{formationData.location || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Participants</p>
                    <p className="font-medium">{formationData.stats?.participants ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Participants Section */}
          {!isEditing && (participantsData || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Participations ({(participantsData || []).length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(participantsData || []).map((participant: FormationParticipant) => (
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
                <p className="text-2xl font-bold">{formationData.stats?.participants ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <p className="text-sm font-medium">
                  {formationData.allowParticipation ? '✓ Ouvert' : '✗ Fermé'}
                </p>
              </div>
              {formationData.participationFormEnabled && (
                <div>
                  <p className="text-xs text-muted-foreground">Formulaire</p>
                  <p className="text-sm font-medium">Personnalisé</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button asChild className="w-full" variant="outline">
            <Link href="/engineer/dashboard/formations">Retour à la liste</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

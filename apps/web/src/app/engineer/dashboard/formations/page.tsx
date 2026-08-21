'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

interface FormationQuestionDraft {
  id: string;
  label: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX';
  required: boolean;
  optionsText: string;
}

interface EngineerFormationParticipant {
  id: string;
  formationId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  user: { email: string; firstName: string; lastName: string } | null;
}

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

export default function FormationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formationForm, setFormationForm] = useState<Record<string, string>>({
    allowParticipation: 'true',
    participationFormEnabled: 'true',
  });
  const [formationQuestions, setFormationQuestions] = useState<FormationQuestionDraft[]>([]);

  const { data: formationsData, isLoading } = useQuery({
    queryKey: ['engineer-formations'],
    queryFn: async () => {
      const res = await fetch('/api/engineer/formations');
      if (!res.ok) throw new Error('Failed to load formations');
      return res.json();
    },
  });

  const createFormationMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/engineer/formations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Formation creation failed');
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineer-formations'] });
      setFormationForm({ allowParticipation: 'true', participationFormEnabled: 'true' });
      setFormationQuestions([]);
      toast({ title: 'Formation créée avec succès!' });
    },
    onError: () => {
      toast({ title: 'Erreur lors de la création' });
    },
  });

  const reviewParticipationMutation = useMutation({
    mutationFn: async ({ formationId, participationId, status }: { formationId: string; participationId: string; status: 'ACCEPTED' | 'REJECTED' }) => {
      const res = await fetch(`/api/engineer/formations/${formationId}/participants/${participationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Review failed');
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['engineer-formations'] });
      toast({ title: 'Participation mise à jour' });
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
        <h1 className="text-3xl font-bold">Formations</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Creation Form */}
        <Card className="lg:col-span-1 lg:sticky lg:top-24 lg:h-fit">
          <CardHeader>
            <CardTitle>Créer une formation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            <div className="grid gap-3">
              <Input
                placeholder="Titre"
                value={formationForm.title ?? ''}
                onChange={(e) => setFormationForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <Input
                type="datetime-local"
                value={formationForm.formationDate ?? ''}
                onChange={(e) => setFormationForm((prev) => ({ ...prev, formationDate: e.target.value }))}
              />
              <Input
                placeholder="Lieu"
                value={formationForm.location ?? ''}
                onChange={(e) => setFormationForm((prev) => ({ ...prev, location: e.target.value }))}
              />
              <Input
                placeholder="Image URL"
                value={formationForm.imageUrl ?? ''}
                onChange={(e) => setFormationForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              />
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Description"
                value={formationForm.description ?? ''}
                onChange={(e) => setFormationForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(formationForm.allowParticipation ?? 'true') === 'true'}
                  onChange={(e) =>
                    setFormationForm((prev) => ({ ...prev, allowParticipation: String(e.target.checked) }))
                  }
                />
                Allow participation
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(formationForm.participationFormEnabled ?? 'true') === 'true'}
                  onChange={(e) =>
                    setFormationForm((prev) => ({ ...prev, participationFormEnabled: String(e.target.checked) }))
                  }
                />
                Dynamic form
              </label>
            </div>

            {(formationForm.participationFormEnabled ?? 'true') === 'true' ? (
              <div className="space-y-3 rounded-2xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Form questions</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormationQuestions((prev) => [...prev, { id: `q_${Date.now()}`, label: '', type: 'TEXT', required: false, optionsText: '' }])
                    }
                  >
                    Add
                  </Button>
                </div>
                {formationQuestions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No questions added yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {formationQuestions.map((question, index) => (
                      <div key={question.id} className="grid gap-2 rounded-xl border bg-background p-2">
                        <Input
                          size={28}
                          placeholder={`Question ${index + 1}`}
                          value={question.label}
                          onChange={(e) =>
                            setFormationQuestions((prev) =>
                              prev.map((item) => (item.id === question.id ? { ...item, label: e.target.value } : item))
                            )
                          }
                        />
                        <select
                          className="h-8 rounded-md border px-2 text-xs"
                          value={question.type}
                          onChange={(e) =>
                            setFormationQuestions((prev) =>
                              prev.map((item) =>
                                item.id === question.id ? { ...item, type: e.target.value as FormationQuestionDraft['type'] } : item
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
                                setFormationQuestions((prev) =>
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
                              setFormationQuestions((prev) => prev.filter((item) => item.id !== question.id))
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
              disabled={createFormationMutation.isPending || !formationForm.title || !formationForm.formationDate}
              className="w-full"
              onClick={() =>
                createFormationMutation.mutate({
                  title: formationForm.title,
                  description: formationForm.description,
                  imageUrl: formationForm.imageUrl,
                  formationDate: formationForm.formationDate,
                  location: formationForm.location,
                  allowParticipation: (formationForm.allowParticipation ?? 'true') === 'true',
                  participationFormEnabled: (formationForm.participationFormEnabled ?? 'true') === 'true',
                  participationFormQuestions: formationQuestions.map((q) => ({
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
              {createFormationMutation.isPending ? 'Creating...' : 'Créer la formation'}
            </Button>
          </CardContent>
        </Card>

        {/* Formations List */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (formationsData?.formations || []).length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Aucune formation créée yet.</p>
              </CardContent>
            </Card>
          ) : (
            (formationsData?.formations || []).map((formation: EngineerFormation) => {
              const requests: EngineerFormationParticipant[] = (formationsData?.participations || []).filter(
                (item: EngineerFormationParticipant) => item.formationId === formation._id
              );
              return (
                <Card key={formation._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{formation.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(formation.formationDate).toLocaleString('fr-TN')}
                        </p>
                      </div>
                      <span className="rounded-full border px-2 py-1 text-[10px] font-medium uppercase">
                        {formation.allowParticipation ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{formation.description || 'Aucune description'}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                        {formation.stats?.participants || 0} participants
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1">{formation.location || 'Sans lieu'}</span>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/engineer/dashboard/formations/${formation._id}`}>
                        Voir les détails
                      </Link>
                    </Button>

                    {requests.length > 0 && (
                      <div className="space-y-3 border-t pt-4">
                        <h4 className="font-medium text-sm">Participations ({requests.length})</h4>
                        {requests.map((request) => (
                          <div
                            key={request.id}
                            className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {request.user?.firstName || request.user?.email || 'Utilisateur'}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">{request.status.toLowerCase()}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  reviewParticipationMutation.mutate({
                                    formationId: formation._id,
                                    participationId: request.id,
                                    status: 'ACCEPTED',
                                  })
                                }
                              >
                                Accept
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  reviewParticipationMutation.mutate({
                                    formationId: formation._id,
                                    participationId: request.id,
                                    status: 'REJECTED',
                                  })
                                }
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

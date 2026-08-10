'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { KeyValueLineEditor } from '@/components/forms/key-value-line-editor';
import { createEmptyKeyValueLine, hasKeyValueLines, parseKeyValueLines, serializeKeyValueLines, type KeyValueLine } from '@/lib/key-value-lines';

interface HeroSlide {
  _id: string;
  title: string;
  description?: string;
  kind: 'PRODUCT' | 'EVENT';
  imageUrl?: string;
  ctaLabel: string;
  linkUrl: string;
  composition?: string;
  dosage?: string;
  isActive: boolean;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

interface HeroPromotionRequest {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl: string;
  ctaLabel: string;
  kind: 'PRODUCT' | 'EVENT';
  composition: string;
  dosage: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string;
  createdAt: string;
  supplierId?: { companyName?: string; slug?: string };
}

export default function AdminHeroPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    kind: 'PRODUCT' as 'PRODUCT' | 'EVENT',
    imageUrl: '',
    ctaLabel: 'Voir plus',
    linkUrl: '',
    compositionLines: [createEmptyKeyValueLine()] as KeyValueLine[],
    dosageLines: [createEmptyKeyValueLine()] as KeyValueLine[],
    isActive: true,
    sortOrder: '0',
    startDate: '',
    endDate: '',
  });
  const [adminNoteByRequest, setAdminNoteByRequest] = useState<Record<string, string>>({});

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-hero-slides'],
    queryFn: async () => {
      const res = await fetch('/api/admin/hero-slides', { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Impossible de charger les slides hero');
      }
      return res.json();
    },
  });

  const slides: HeroSlide[] = data?.slides || [];
  const counts = data?.counts || { active: 0, total: 0 };

  const { data: requestData } = useQuery({
    queryKey: ['admin-hero-promotion-requests'],
    queryFn: async () => {
      const res = await fetch('/api/admin/hero-promotion-requests', { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Impossible de charger les demandes fournisseur');
      }
      return res.json();
    },
  });

  const requests: HeroPromotionRequest[] = requestData?.requests || [];

  const activeSlides = useMemo(() => slides.filter((slide) => slide.isActive).length, [slides]);
  const editingSlide = useMemo(() => slides.find((slide) => slide._id === editingId), [editingId, slides]);
  const isEditing = !!editingId;
  const canActivate = form.isActive
    ? isEditing && editingSlide?.isActive
      ? activeSlides <= 10
      : activeSlides < 10
    : true;
  const canSubmit = Boolean(form.title.trim() && form.linkUrl.trim() && form.ctaLabel.trim() && canActivate);
  const hasProductDetails = form.kind === 'EVENT' || (hasKeyValueLines(form.compositionLines) && hasKeyValueLines(form.dosageLines));
  const canSubmitWithDetails = canSubmit && hasProductDetails;

  function renderKeyValueText(value?: string) {
    const lines = parseKeyValueLines(value || '');

    if (lines.length === 0) {
      return '—';
    }

    return (
      <span className="inline-flex flex-col gap-0.5 align-top">
        {lines.map((line, index) => (
          <span key={`${line.title}-${index}`}>
            {line.title ? <span className="font-medium">{line.title}:</span> : null} {line.value || '—'}
          </span>
        ))}
      </span>
    );
  }

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setForm({
      title: '',
      description: '',
      kind: 'PRODUCT',
      imageUrl: '',
      ctaLabel: 'Voir plus',
      linkUrl: '',
      compositionLines: [createEmptyKeyValueLine()],
      dosageLines: [createEmptyKeyValueLine()],
      isActive: true,
      sortOrder: '0',
      startDate: '',
      endDate: '',
    });
  }

  function startEdit(slide: HeroSlide) {
    setEditingId(slide._id);
    setShowForm(true);
    setForm({
      title: slide.title,
      description: slide.description || '',
      kind: slide.kind,
      imageUrl: slide.imageUrl || '',
      ctaLabel: slide.ctaLabel,
      linkUrl: slide.linkUrl,
      compositionLines: parseKeyValueLines(slide.composition),
      dosageLines: parseKeyValueLines(slide.dosage),
      isActive: slide.isActive,
      sortOrder: String(slide.sortOrder ?? 0),
      startDate: slide.startDate ? slide.startDate.slice(0, 16) : '',
      endDate: slide.endDate ? slide.endDate.slice(0, 16) : '',
    });
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const { compositionLines, dosageLines, ...payload } = form;
      const res = await fetch('/api/admin/hero-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          composition: serializeKeyValueLines(compositionLines),
          dosage: serializeKeyValueLines(dosageLines),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Échec de création');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hero-slides'] });
      toast({ title: 'Slide hero créée ✓' });
      resetForm();
    },
    onError: (err: Error) => toast({ title: err.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error('Slide introuvable');
      const { compositionLines, dosageLines, ...payload } = form;
      const res = await fetch(`/api/admin/hero-slides/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          composition: serializeKeyValueLines(compositionLines),
          dosage: serializeKeyValueLines(dosageLines),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Échec de mise à jour');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hero-slides'] });
      toast({ title: 'Slide hero mise à jour ✓' });
      resetForm();
    },
    onError: (err: Error) => toast({ title: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/hero-slides/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Échec de suppression');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hero-slides'] });
      toast({ title: 'Slide supprimée' });
    },
    onError: (err: Error) => toast({ title: err.message }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/hero-slides/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Échec de mise à jour');
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-hero-slides'] }),
    onError: (err: Error) => toast({ title: err.message }),
  });

  const processRequestMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const res = await fetch(`/api/admin/hero-promotion-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNote: adminNoteByRequest[id] || '' }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Erreur de traitement');
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hero-promotion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-hero-slides'] });
      toast({ title: 'Demande traitée ✓' });
    },
    onError: (err: Error) => toast({ title: err.message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hero du site</h1>
          <p className="text-muted-foreground">
            {counts.active} slide(s) active(s) · {counts.total} au total · max 10 actives
          </p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>{showForm ? 'Annuler' : '+ Nouvelle slide'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Modifier la slide hero' : 'Créer une slide hero'}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ajoutez une promotion produit ou un événement. Le hero défile automatiquement sur l’accueil.
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!canSubmitWithDetails) {
                  toast({ title: 'Complétez le titre, le lien et le bouton. Vérifiez aussi la limite de 10 slides actives.' });
                  return;
                }
                if (isEditing) {
                  updateMutation.mutate();
                } else {
                  createMutation.mutate();
                }
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Titre *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Promo Ramadhan" required />
                </div>
                <div className="space-y-1">
                  <Label>Type *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value as 'PRODUCT' | 'EVENT' })}
                  >
                    <option value="PRODUCT">Promotion produit</option>
                    <option value="EVENT">Événement</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Texte d'accroche" />
                </div>
                <div className="space-y-1">
                  <Label>Image URL</Label>
                  <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>

              {form.kind === 'PRODUCT' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <KeyValueLineEditor
                      label="Composition *"
                      entries={form.compositionLines}
                      onChange={(entries) => setForm({ ...form, compositionLines: entries })}
                      titlePlaceholder="Ex: Élément"
                      valuePlaceholder="Ex: NPK 12-8-10"
                      addLabel="Ajouter une ligne de composition"
                    />
                  </div>
                  <div className="space-y-2">
                    <KeyValueLineEditor
                      label="Dosage *"
                      entries={form.dosageLines}
                      onChange={(entries) => setForm({ ...form, dosageLines: entries })}
                      titlePlaceholder="Ex: Fréquence"
                      valuePlaceholder="Ex: 2 ml / litre"
                      addLabel="Ajouter une ligne de dosage"
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Texte du bouton *</Label>
                  <Input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="Voir l'offre" required />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Lien cible *</Label>
                  <Input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="/products/mon-produit ou /events/mon-evenement" required />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <Label>Ordre</Label>
                  <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Début</Label>
                  <Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Fin</Label>
                  <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Statut</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.isActive ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || !canSubmitWithDetails}>
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Enregistrement...'
                    : isEditing
                      ? 'Mettre à jour'
                      : 'Créer la slide'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={createMutation.isPending || updateMutation.isPending}>
                  Réinitialiser
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="font-medium">Échec du chargement des slides</p>
            <p className="text-sm text-muted-foreground">{(error as Error)?.message || 'Erreur inconnue'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'Rechargement...' : 'Réessayer'}
            </Button>
          </CardContent>
        </Card>
      ) : slides.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground">Aucune slide hero créée</p>
            <Button onClick={() => setShowForm(true)}>Créer la première slide</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {slides.map((slide) => (
            <Card key={slide._id}>
              <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{slide.title}</p>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${slide.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {slide.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-primary/10 text-primary">
                      {slide.kind === 'PRODUCT' ? 'Produit' : 'Événement'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {slide.description || 'Aucune description'} · Ordre {slide.sortOrder} · <span className="break-all">{slide.linkUrl}</span>
                  </p>
                  {slide.kind === 'PRODUCT' && (
                    <p className="text-xs text-muted-foreground">
                      Composition: {renderKeyValueText(slide.composition)} · Dosage: {renderKeyValueText(slide.dosage)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(slide)}>
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActiveMutation.mutate({ id: slide._id, isActive: !slide.isActive })}
                  >
                    {slide.isActive ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={() => {
                      if (confirm('Supprimer cette slide hero ?')) deleteMutation.mutate(slide._id);
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Demandes fournisseurs pour le Hero</CardTitle>
          <p className="text-sm text-muted-foreground">Validez ou rejetez les demandes de mise en avant produit.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande pour le moment.</p>
          ) : (
            requests.map((request) => (
              <div key={request._id} className="rounded-xl border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{request.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Fournisseur: {request.supplierId?.companyName || '—'} · {new Date(request.createdAt).toLocaleString('fr-TN')}
                    </p>
                  </div>
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${request.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : request.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {request.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Type: {request.kind === 'PRODUCT' ? 'Produit' : 'Événement'}</p>
                <p className="text-sm text-muted-foreground">{request.description || 'Aucune description'}</p>
                <p className="text-xs text-muted-foreground">Composition: {renderKeyValueText(request.composition)}</p>
                <p className="text-xs text-muted-foreground">Dosage: {renderKeyValueText(request.dosage)}</p>
                <p className="text-xs text-muted-foreground break-all">Lien: {request.linkUrl}</p>
                {request.adminNote ? <p className="text-xs text-muted-foreground">Note admin: {request.adminNote}</p> : null}

                {request.status === 'PENDING' && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Note admin (optionnel)"
                      value={adminNoteByRequest[request._id] || ''}
                      onChange={(e) => setAdminNoteByRequest((prev) => ({ ...prev, [request._id]: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => processRequestMutation.mutate({ id: request._id, action: 'approve' })}
                        disabled={processRequestMutation.isPending}
                      >
                        Accepter & publier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processRequestMutation.mutate({ id: request._id, action: 'reject' })}
                        disabled={processRequestMutation.isPending}
                      >
                        Rejeter
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
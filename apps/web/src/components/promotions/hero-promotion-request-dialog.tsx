'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, X } from 'lucide-react';

export interface HeroPromotionSubject {
  kind: 'EVENT' | 'FORMATION';
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  date?: string | Date;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: HeroPromotionSubject;
}

function toDateInput(d?: string | Date) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function HeroPromotionRequestDialog({ open, onOpenChange, subject }: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Voir plus');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Reset when a different subject is opened.
  useEffect(() => {
    if (!open) return;
    setTitle(subject.title || '');
    setDescription(subject.description || '');
    setImageUrl(subject.imageUrl || '');
    setCtaLabel('Voir plus');
    const today = new Date();
    setStartDate(toDateInput(today));
    // Default end date: subject date or +14 days
    const suggestedEnd = subject.date ? new Date(subject.date) : new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    setEndDate(toDateInput(suggestedEnd));
  }, [open, subject]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/engineer/hero-promotion-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: subject.kind,
          subjectId: subject.id,
          title,
          description,
          imageUrl,
          ctaLabel,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Envoi échoué');
      return json;
    },
    onSuccess: () => {
      toast({
        title: 'Demande envoyée',
        description: 'Votre demande de mise en avant a été soumise à la modération.',
      });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err?.message || 'Envoi échoué' });
    },
  });

  if (!open) return null;

  const kindLabel = subject.kind === 'FORMATION' ? 'la formation' : "l'événement";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={() => !submitMutation.isPending && onOpenChange(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-background shadow-2xl border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Mettre en avant sur la page d'accueil</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Envoyez une demande pour promouvoir {kindLabel} <span className="font-medium">"{subject.title}"</span> dans le hero d'accueil. Votre demande sera vérifiée par un admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => !submitMutation.isPending && onOpenChange(false)}
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="px-6 pb-6 pt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) {
              toast({ title: 'Titre requis' });
              return;
            }
            submitMutation.mutate();
          }}
        >
          <div>
            <Label htmlFor="promo-title">Titre affiché</Label>
            <Input
              id="promo-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={220}
              required
            />
          </div>

          <div>
            <Label htmlFor="promo-desc">Description (optionnel)</Label>
            <textarea
              id="promo-desc"
              className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </div>

          <div>
            <Label htmlFor="promo-image">Image (URL)</Label>
            <Input
              id="promo-image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              maxLength={3000}
            />
            {imageUrl && (
              <div className="mt-2 h-24 w-full overflow-hidden rounded-md border bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Prévisualisation" className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="promo-cta">Texte du bouton</Label>
            <Input
              id="promo-cta"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="promo-start">Début (souhaité)</Label>
              <Input
                id="promo-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="promo-end">Fin (souhaité)</Label>
              <Input
                id="promo-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitMutation.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Envoi...' : 'Envoyer la demande'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

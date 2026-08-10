'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CalendarDays, Megaphone, Sparkles, Store, TrendingUp } from 'lucide-react';

type PromotionItem = {
  _id: string;
  title: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  startDate: string;
  endDate: string;
  supplier: {
    slug: string;
    companyName: string;
    logo?: string;
    sector: 'MEDICAL' | 'AGRICULTURAL' | 'BOTH';
    isVerified: boolean;
  };
};

async function fetchPromotions() {
  const res = await fetch('/api/home/promotions', { cache: 'no-store' });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || 'Impossible de charger les promotions');
  }
  return res.json();
}

function formatPeriod(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
}

function promotionLabel(item: PromotionItem) {
  return item.discountType === 'PERCENT' ? `${item.discountValue}% de réduction` : `${item.discountValue} DT offerts`;
}

export function PromotionsShowcase() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['home-promotions'],
    queryFn: fetchPromotions,
  });

  const promotions: PromotionItem[] = data?.promotions || [];

  const featured = useMemo(() => promotions.slice(0, 3), [promotions]);

  return (
    <section id="promotions" className="container py-12 scroll-mt-24">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Megaphone className="h-3.5 w-3.5 text-primary" />
            Promotions & annonces fournisseurs
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Les nouveautés qui méritent une vraie mise en avant</h2>
          <p className="text-muted-foreground md:text-lg">
            Les fournisseurs peuvent publier ici leurs promotions produit, lancements et annonces spéciales —
            visible directement sur la page d’accueil.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/promotions">Publier une annonce</Link>
          </Button>
          <Button asChild>
            <Link href="/products">
              Explorer les produits <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[260px] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : error || promotions.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <Card className="overflow-hidden border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Aucune promotion active pour le moment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Les prochaines annonces fournisseurs apparaîtront ici dès qu’elles seront publiées depuis l’espace
                fournisseur.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="font-medium text-foreground">Nouveaux produits</p>
                  <p className="mt-1 text-sm">Mettez en avant vos lancements, bundles et nouveautés.</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="font-medium text-foreground">Événements à venir</p>
                  <p className="mt-1 text-sm">Annonces, démonstrations, webinaires et journées fournisseurs.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Espace fournisseur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Créez vos promotions dans le dashboard et gagnez une place sur la page d’accueil.
              </p>
              <Button className="w-full" asChild>
                <Link href="/dashboard/promotions">Ouvrir les promotions</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
            <CardContent className="p-0">
              {featured.slice(0, 1).map((item) => (
                <div key={item._id} className="relative p-6 md:p-8">
                  <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
                  <div className="relative space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-sm">
                        Annonce vedette
                      </span>
                      <span className="inline-flex items-center rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                        {promotionLabel(item)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold md:text-3xl">{item.title}</h3>
                      <p className="max-w-2xl text-muted-foreground md:text-lg">
                        {item.description || 'Une offre spéciale publiée directement par le fournisseur.'}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Fournisseur</p>
                        <p className="mt-1 font-semibold">{item.supplier.companyName}</p>
                      </div>
                      <div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Période</p>
                        <p className="mt-1 font-semibold">{formatPeriod(item.startDate, item.endDate)}</p>
                      </div>
                      <div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Secteur</p>
                        <p className="mt-1 font-semibold">
                          {item.supplier.sector === 'MEDICAL'
                            ? 'Médical'
                            : item.supplier.sector === 'AGRICULTURAL'
                              ? 'Agricole'
                              : 'Les deux'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button asChild>
                        <Link href={`/suppliers/${item.supplier.slug}`}>Voir le fournisseur</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/products">Voir les produits liés</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-3 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Nouvelles annonces en continu</p>
                    <p className="text-sm text-muted-foreground">Mise à jour automatique depuis les fournisseurs.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {promotions.slice(0, 3).map((item) => (
                <Card key={item._id} className="transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatPeriod(item.startDate, item.endDate)}
                        </div>
                        <p className="font-semibold leading-snug">{item.title}</p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {item.description || 'Annonce fournisseur pour booster un produit ou un lancement.'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                        {promotionLabel(item)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{item.supplier.companyName}</span>
                      <Link href={`/suppliers/${item.supplier.slug}`} className="font-medium text-primary hover:underline">
                        Découvrir
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
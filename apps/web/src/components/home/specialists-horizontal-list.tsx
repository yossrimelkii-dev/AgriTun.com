'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/providers/locale-provider';

type SpecialistItem = {
  id: string;
  firstName: string;
  lastName: string;
  speciality: string;
  bio: string;
  workSummary: string;
  cvUrl?: string;
  stats: {
    totalHandled: number;
    averageRating: number;
  };
};

export function SpecialistsHorizontalList() {
  const { t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ['specialists'],
    queryFn: async () => {
      const res = await fetch('/api/specialists');
      if (!res.ok) throw new Error('Failed to load specialists');
      return res.json();
    },
  });

  const specialists: SpecialistItem[] = data?.specialists ?? [];

  return (
    <section className="container py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('specialistsSection.label')}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{t('specialistsSection.title')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t('specialistsSection.subtitle')}
          </p>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <Link href="/specialists">{t('specialistsSection.viewAll')}</Link>
        </Button>
      </div>

      <div className="-mx-1 overflow-x-auto pb-2" dir="ltr">
        <div className="flex gap-4 px-1 min-w-max snap-x snap-mandatory" dir="ltr">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[220px] w-[290px] rounded-3xl border bg-muted/50 animate-pulse snap-start" />
              ))
            : specialists.map((specialist) => (
                <Card key={specialist.id} className="w-[290px] shrink-0 snap-start overflow-hidden" dir="ltr">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-bold text-emerald-700">
                        {(specialist.firstName?.[0] ?? 'S')}{specialist.lastName?.[0] ?? ''}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold leading-tight">
                          {specialist.firstName} {specialist.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {specialist.speciality || t('specialistsSection.fallbackSpeciality')}
                        </p>
                      </div>
                    </div>

                    {specialist.bio ? (
                      <p className="text-sm text-muted-foreground line-clamp-3">{specialist.bio}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('specialistsSection.fallbackBio')}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-center text-sm">
                      <div className="rounded-2xl bg-muted/60 p-3">
                        <p className="text-lg font-semibold">{specialist.stats.totalHandled}</p>
                        <p className="text-[11px] text-muted-foreground">{t('specialistsSection.requests')}</p>
                      </div>
                      <div className="rounded-2xl bg-muted/60 p-3">
                        <p className="text-lg font-semibold">{specialist.stats.averageRating.toFixed(1)} ⭐</p>
                        <p className="text-[11px] text-muted-foreground">{t('specialistsSection.average')}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild className="flex-1">
                        <Link href={`/specialists/${specialist.id}`}>{t('specialistsSection.profile')}</Link>
                      </Button>
                      <Button variant="outline" asChild className="shrink-0">
                        <Link href={`/account/agri-help?engineerId=${specialist.id}`}>{t('specialistsSection.contact')}</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>
    </section>
  );
}
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/providers/locale-provider';

interface SpecialistItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  speciality: string;
  avatarUrl: string;
  bio: string;
  workSummary: string;
  cvUrl: string;
  badge?: { type?: string };
  stats: {
    totalHandled: number;
    resolvedCount: number;
    totalFeedbacks: number;
    averageRating: number;
  };
}

export default function SpecialistsPage() {
  const [search, setSearch] = useState('');
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return specialists;
    return specialists.filter((specialist) => {
      return [
        `${specialist.firstName} ${specialist.lastName}`,
        specialist.speciality,
        specialist.bio,
        specialist.workSummary,
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [search, specialists]);

  return (
    <>
      <Navbar />
      <main className="container py-8 min-h-screen">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('specialists.heading')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('specialists.description')}
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('specialists.searchPlaceholder')}
            className="w-full md:w-96 rounded-xl border bg-background px-4 py-2 text-sm"
          />
        </div>

        <section className="mt-8">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl border bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
              {t('specialists.noSpecialists')}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((specialist) => (
                <Card key={specialist.id} className="overflow-hidden">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-bold text-emerald-700">
                        {(specialist.firstName?.[0] ?? 'S')}{(specialist.lastName?.[0] ?? '')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg leading-tight">
                          {specialist.firstName} {specialist.lastName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{specialist.speciality || t('specialists.defaultSpeciality')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{specialist.email}</p>
                      </div>
                    </div>
                    {specialist.bio && <p className="text-sm text-muted-foreground line-clamp-3">{specialist.bio}</p>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-center text-sm">
                      <div className="rounded-xl bg-muted/60 p-3">
                        <p className="text-lg font-semibold">{specialist.stats.totalHandled}</p>
                        <p className="text-xs text-muted-foreground">{t('specialists.requests')}</p>
                      </div>
                      <div className="rounded-xl bg-muted/60 p-3">
                        <p className="text-lg font-semibold">{specialist.stats.averageRating.toFixed(1)} ⭐</p>
                        <p className="text-xs text-muted-foreground">{t('specialists.averageRating')}</p>
                      </div>
                    </div>
                    {specialist.workSummary && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {specialist.workSummary}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {specialist.badge?.type && (
                        <span className="rounded-full border bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          {specialist.badge.type}
                        </span>
                      )}
                      {specialist.cvUrl && (
                        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                          {t('specialists.cvAvailable')}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button asChild className="flex-1">
                        <Link href={`/specialists/${specialist.id}`}>{t('specialists.viewProfile')}</Link>
                      </Button>
                      {specialist.cvUrl && (
                        <Button variant="outline" asChild>
                          <a href={specialist.cvUrl} target="_blank" rel="noreferrer">
                            {t('specialists.cv')}
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

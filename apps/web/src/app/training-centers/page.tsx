'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TrainingCenterItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  speciality: string;
  avatarUrl?: string;
  bio?: string;
  workSummary?: string;
  location?: { label?: string; city?: string } | null;
  stats: { totalFormations: number; totalParticipants: number; upcomingFormations: number };
}

export default function TrainingCentersPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['training-centers'],
    queryFn: async () => {
      const res = await fetch('/api/training-centers');
      if (!res.ok) throw new Error('Failed to load training centers');
      return res.json();
    },
  });

  const centers: TrainingCenterItem[] = data?.trainingCenters ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return centers;
    return centers.filter((center) => {
      return [
        `${center.firstName} ${center.lastName}`,
        center.speciality,
        center.bio,
        center.workSummary,
        center.location?.label,
        center.location?.city,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [search, centers]);

  return (
    <>
      <Navbar />
      <main className="container py-8 min-h-screen">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Centres de formation</h1>
            <p className="text-muted-foreground mt-1">Découvrez les profils publics des centres de formation partenaires.</p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un centre..."
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
              Aucun centre de formation disponible pour le moment.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((center) => {
                const name = `${center.firstName} ${center.lastName}`.trim();
                return (
                  <Card key={center.id} className="overflow-hidden">
                    <CardHeader className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-700 overflow-hidden">
                          {center.avatarUrl ? <img src={center.avatarUrl} alt={name} className="h-full w-full object-cover" /> : '🏫'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg leading-tight">{name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{center.speciality || 'Centre de formation'}</p>
                          <p className="text-xs text-muted-foreground mt-1">{center.email}</p>
                        </div>
                      </div>
                      {center.bio && <p className="text-sm text-muted-foreground line-clamp-3">{center.bio}</p>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-3 text-center text-sm">
                        <div className="rounded-xl bg-muted/60 p-3">
                          <p className="text-lg font-semibold">{center.stats.totalFormations}</p>
                          <p className="text-xs text-muted-foreground">Formations</p>
                        </div>
                        <div className="rounded-xl bg-muted/60 p-3">
                          <p className="text-lg font-semibold">{center.stats.upcomingFormations}</p>
                          <p className="text-xs text-muted-foreground">À venir</p>
                        </div>
                        <div className="rounded-xl bg-muted/60 p-3">
                          <p className="text-lg font-semibold">{center.stats.totalParticipants}</p>
                          <p className="text-xs text-muted-foreground">Participants</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {center.location?.label || center.location?.city ? <span>📍 {center.location?.label || center.location?.city}</span> : <span>📍 Localisation disponible</span>}
                      </div>

                      <div className="flex gap-3">
                        <Button asChild className="flex-1">
                          <Link href={`/training-centers/${center.id}`}>Voir le profil</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
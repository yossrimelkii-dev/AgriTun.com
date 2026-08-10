'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/providers/locale-provider';

type TrainingCenterItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  speciality: string;
  avatarUrl?: string;
  bio?: string;
  workSummary?: string;
  location?: { label?: string; city?: string; lat?: number; lng?: number } | null;
  stats: { totalFormations: number; totalParticipants: number; upcomingFormations: number };
};

export function TrainingCentersHorizontalList() {
  const { t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ['home-training-centers'],
    queryFn: async () => {
      const res = await fetch('/api/training-centers?limit=12');
      if (!res.ok) throw new Error('Failed to load training centers');
      return res.json();
    },
  });

  const trainingCenters: TrainingCenterItem[] = data?.trainingCenters ?? [];

  return (
    <section className="container py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Nos centres de formation</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Centres de formation spécialisés</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Découvrez les profils de centres de formation avec leurs localisations, spécialités et programmes publiés.
          </p>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <Link href="/training-centers">Voir tout</Link>
        </Button>
      </div>

      <div className="-mx-1 overflow-x-auto pb-2" dir="ltr">
        <div className="flex gap-4 px-1 min-w-max snap-x snap-mandatory" dir="ltr">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[220px] w-[420px] rounded-3xl border bg-muted/50 animate-pulse snap-start" />
              ))
            : trainingCenters.map((center) => {
                const name = `${center.firstName} ${center.lastName}`.trim() || 'Centre de formation';
                return (
                  <Card key={center.id} className="w-[420px] shrink-0 snap-start overflow-hidden border-muted/60 shadow-sm" dir="ltr">
                    <CardContent className="p-0">
                      <div className="h-28 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 relative">
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="absolute -bottom-8 left-4 h-16 w-16 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden flex items-center justify-center text-2xl font-bold text-indigo-700">
                          {center.avatarUrl ? (
                            <Image src={center.avatarUrl} alt={name} width={64} height={64} sizes="64px" className="h-full w-full object-cover" />
                          ) : (
                            '🏫'
                          )}
                        </div>
                      </div>

                      <div className="p-5 pt-10 space-y-4">
                        <div>
                          <p className="text-base font-semibold leading-tight line-clamp-2">{name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{center.speciality || 'Centre de formation'}</p>
                          {center.location?.label || center.location?.city ? (
                            <p className="text-xs text-muted-foreground mt-1">📍 {center.location?.label || center.location?.city}</p>
                          ) : null}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {center.bio || center.workSummary || 'Profil du centre de formation disponible.'}
                        </p>

                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div className="rounded-2xl bg-muted/60 p-3">
                            <p className="text-lg font-semibold">{center.stats.totalFormations}</p>
                            <p className="text-[11px] text-muted-foreground">Formations</p>
                          </div>
                          <div className="rounded-2xl bg-muted/60 p-3">
                            <p className="text-lg font-semibold">{center.stats.upcomingFormations}</p>
                            <p className="text-[11px] text-muted-foreground">À venir</p>
                          </div>
                          <div className="rounded-2xl bg-muted/60 p-3">
                            <p className="text-lg font-semibold">{center.stats.totalParticipants}</p>
                            <p className="text-[11px] text-muted-foreground">Participants</p>
                          </div>
                        </div>

                        <Button asChild className="w-full">
                          <Link href={`/training-centers/${center.id}`}>Voir le profil</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </div>
    </section>
  );
}
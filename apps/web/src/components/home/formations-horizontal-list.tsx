'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type FormationItem = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  formationDate: string;
  location?: string;
  organizer: string;
  stats?: { participants?: number };
  specialist?: { id?: string; firstName?: string; lastName?: string; speciality?: string } | null;
};

async function fetchLatestFormations() {
  const res = await fetch('/api/formations?limit=4', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load formations');
  return res.json();
}

export function FormationsHorizontalList() {
  const { data, isLoading } = useQuery({
    queryKey: ['home-formations-latest'],
    queryFn: fetchLatestFormations,
  });

  const formations: FormationItem[] = data?.formations ?? [];

  return (
    <section className="bg-background py-12">
      <div className="container">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Formations</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Les 4 dernières formations</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Découvrez les formations les plus récentes publiées par nos spécialistes et centres partenaires.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/formations">Voir tout</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[340px] rounded-2xl border bg-muted animate-pulse" />
            ))}
          </div>
        ) : formations.length === 0 ? (
          <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
            Aucune formation disponible pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {formations.map((formation) => (
              <Card key={formation._id} className="group overflow-hidden border-muted/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <CardContent className="p-0">
                  <Link href={`/formations/${formation._id}`} className="block">
                    <div className="relative h-40 overflow-hidden bg-muted">
                      {formation.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={formation.imageUrl}
                          alt={formation.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-emerald-500/25 via-primary/10 to-lime-400/20" />
                      )}
                      <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
                        {new Date(formation.formationDate).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>

                  <div className="space-y-3 p-4">
                    <Link href={`/formations/${formation._id}`}>
                      <h3 className="text-lg font-semibold line-clamp-1 hover:text-primary transition-colors">{formation.title}</h3>
                    </Link>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {formation.description || 'Consultez le programme et les détails de cette formation.'}
                    </p>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p>Organisateur: {formation.organizer || '—'}</p>
                      <p>Lieu: {formation.location || '—'}</p>
                      <p>Participants: {formation.stats?.participants || 0}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {formation.specialist?.id ? (
                        <span className="text-xs text-primary line-clamp-1">
                          {formation.specialist.firstName} {formation.specialist.lastName}
                        </span>
                      ) : (
                        <span />
                      )}

                      <Link href={`/formations/${formation._id}`} className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90">
                        Voir →
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
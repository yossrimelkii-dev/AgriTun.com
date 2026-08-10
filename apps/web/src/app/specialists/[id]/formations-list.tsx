'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FormationsList({ specialistId }: { specialistId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['public-formations-list', specialistId],
    queryFn: async () => {
      const res = await fetch('/api/formations?limit=30');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const formations = (data?.formations || []).filter((f: any) => f.specialist?.id === specialistId);

  if (isLoading) return <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
  </div>;

  if (formations.length === 0) {
    return <p className="text-muted-foreground py-6 text-center border rounded-2xl bg-muted/20">Aucune formation publiée pour le moment.</p>;
  }

  return (
    <div className={formations.length === 1 ? 'w-full' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'}>
      {formations.map((f: any) => (
        <article key={f._id} className={`group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${formations.length === 1 ? 'relative lg:grid lg:grid-cols-[1.35fr_1fr] lg:min-h-[480px]' : ''}`}>
          <div className={`relative overflow-hidden bg-muted ${formations.length === 1 ? 'h-72 lg:h-full' : 'h-44'}`}>
            {f.imageUrl ? (
              <img src={f.imageUrl} alt={f.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-lime-400/20" />
            )}
            <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
              {new Date(f.formationDate).toLocaleDateString()}
            </div>
          </div>

          <div className={`space-y-3 ${formations.length === 1 ? 'p-6 sm:p-8 lg:flex lg:flex-col lg:justify-center lg:pr-36' : 'p-4'}`}>
            <h3 className={`font-semibold ${formations.length === 1 ? 'text-3xl sm:text-4xl leading-tight' : 'text-base sm:text-lg line-clamp-1'}`}>{f.title}</h3>
            <p className={`text-sm text-muted-foreground ${formations.length === 1 ? 'max-w-2xl text-base sm:text-lg leading-7 line-clamp-5' : 'line-clamp-2'}`}>{f.description || ''}</p>

            <div className={`space-y-1 text-xs text-muted-foreground ${formations.length === 1 ? 'text-sm sm:text-base' : ''}`}>
              <p>Organisateur: {f.organizer || '—'}</p>
              <p>Lieu: {f.location || '—'}</p>
              <p>Participants: {f.stats?.participants || 0}</p>
            </div>

            <div className={`pt-1 flex ${formations.length === 1 ? 'justify-end lg:absolute lg:bottom-6 lg:right-6 lg:pt-0' : 'justify-end'}`}>
              <a href={`/formations/${f._id}`} className={`inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 ${formations.length === 1 ? 'px-5 py-3 text-sm sm:text-base shadow-sm' : ''}`}>Voir →</a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type EventItem = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  eventDate: string;
  organizer: string;
  stats?: { participants?: number };
  supplier?: { companyName?: string; slug?: string } | null;
  specialist?: { id?: string; firstName?: string; lastName?: string } | null;
};

async function fetchLatestEvents() {
  const res = await fetch('/api/events?limit=4', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load events');
  return res.json();
}

export function EventsHorizontalList() {
  const { data, isLoading } = useQuery({
    queryKey: ['home-events-latest'],
    queryFn: fetchLatestEvents,
  });

  const events: EventItem[] = data?.events ?? [];

  return (
    <section className="bg-muted/30 py-12">
      <div className="container">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Events</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Les 4 derniers événements</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Parcourez les événements les plus récents proposés par nos fournisseurs vérifiés.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/events">Voir tout</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[340px] rounded-2xl border bg-muted animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
            Aucun événement disponible pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {events.map((event) => (
              <Card key={event._id} className="group overflow-hidden border-muted/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <CardContent className="p-0">
                  <Link href={`/events/${event._id}`} className="block">
                    <div className="relative h-40 overflow-hidden bg-muted">
                      {event.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/25 via-primary/10 to-emerald-400/20" />
                      )}
                      <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>

                  <div className="space-y-3 p-4">
                    <Link href={`/events/${event._id}`}>
                      <h3 className="text-lg font-semibold line-clamp-1 hover:text-primary transition-colors">{event.title}</h3>
                    </Link>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description || 'Retrouvez les détails de cet événement dans sa page dédiée.'}
                    </p>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p>Organisateur: {event.organizer || '—'}</p>
                      <p>Participants: {event.stats?.participants || 0}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {event.supplier?.slug ? (
                        <Link href={`/suppliers/${event.supplier.slug}`} className="text-xs text-primary hover:underline line-clamp-1">
                          {event.supplier.companyName || 'Supplier profile'}
                        </Link>
                      ) : event.specialist?.id ? (
                        <Link href={`/specialists/${event.specialist.id}`} className="text-xs text-primary hover:underline line-clamp-1">
                          {event.specialist.firstName || 'Profile'} {event.specialist.lastName || ''}
                        </Link>
                      ) : (
                        <span />
                      )}

                      <Link href={`/events/${event._id}`} className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90">
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
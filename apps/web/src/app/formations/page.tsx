'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ArrowRight, Users, MapPin, GraduationCap, RotateCcw } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { buttonVariants } from '@/components/ui/button';

interface PublicFormation {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  formationDate: string;
  location?: string;
  organizer: string;
  allowParticipation: boolean;
  stats?: { participants?: number };
  specialist?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    speciality?: string;
    avatarUrl?: string;
    email?: string;
  } | null;
}

function toDateKey(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function FormationsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-formations-list'],
    queryFn: async () => {
      const res = await fetch('/api/formations?limit=30', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load formations');
      return json;
    },
  });

  const formations: PublicFormation[] = data?.formations || [];

  const formationsCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const formation of formations) {
      const key = toDateKey(formation.formationDate);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [formations]);

  const monthDays = useMemo(() => {
    if (!selectedMonth) return [] as Array<{ day: number | null; dateKey: string | null }>;

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(month)) return [] as Array<{ day: number | null; dateKey: string | null }>;

    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading = (first.getDay() + 6) % 7;
    const cells: Array<{ day: number | null; dateKey: string | null }> = [];

    for (let i = 0; i < leading; i += 1) cells.push({ day: null, dateKey: null });
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, dateKey: toDateKey(new Date(year, month, day)) });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, dateKey: null });
    return cells;
  }, [selectedMonth]);

  const filteredFormations = useMemo(() => {
    return formations.filter((formation) => {
      const formationDateKey = toDateKey(formation.formationDate);
      const monthMatch = selectedMonth ? formationDateKey.startsWith(selectedMonth) : true;
      const dateMatch = selectedDate ? formationDateKey === selectedDate : true;
      return monthMatch && dateMatch;
    });
  }, [formations, selectedMonth, selectedDate]);

  const { upcomingFormations, pastFormations } = useMemo(() => {
    const now = Date.now();
    const upcoming: PublicFormation[] = [];
    const past: PublicFormation[] = [];

    for (const formation of filteredFormations) {
      if (new Date(formation.formationDate).getTime() >= now) upcoming.push(formation);
      else past.push(formation);
    }

    return { upcomingFormations: upcoming, pastFormations: past };
  }, [filteredFormations]);

  function resetFilters() {
    setSelectedMonth(getCurrentMonthKey());
    setSelectedDate('');
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="relative overflow-hidden border-b bg-gradient-to-br from-emerald-500/10 via-background to-primary/10">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          </div>

          <div className="container relative py-14 md:py-20">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
                <GraduationCap className="h-3.5 w-3.5" /> Formations
              </span>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Discover the latest formations</h1>
              <p className="text-base md:text-lg text-muted-foreground">
                Explore training sessions created by specialists with a clean calendar view and fast participation.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-10 md:py-14 space-y-10">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[360px] rounded-2xl border bg-muted animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border p-8 text-center">
              <h2 className="text-2xl font-semibold">Unable to load formations</h2>
              <p className="text-muted-foreground mt-2">Please try again in a moment.</p>
            </div>
          ) : formations.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center">
              <h2 className="text-2xl font-semibold">No formations available yet</h2>
              <p className="text-muted-foreground mt-2">Check back soon for specialist-led formations.</p>
            </div>
          ) : (
            <>
              <section className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowFilters((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur transition hover:bg-muted"
                >
                  <CalendarDays className="h-3.5 w-3.5 text-primary" /> Calendar filters
                </button>
              </section>

              {showFilters ? (
                <section className="mx-auto w-full max-w-3xl rounded-2xl border bg-card/95 p-3 md:p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Filter by calendar/date</p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); if (selectedDate && !selectedDate.startsWith(e.target.value)) setSelectedDate(''); }} className="h-9 w-full rounded-md border px-3 text-xs" />
                    <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); if (e.target.value) setSelectedMonth(e.target.value.slice(0, 7)); }} className="h-9 w-full rounded-md border px-3 text-xs" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => <div key={label}>{label}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {monthDays.map((cell, index) => {
                        if (!cell.day || !cell.dateKey) return <div key={`empty-${index}`} className="aspect-square rounded-md bg-muted/30" />;
                        const count = formationsCountByDate.get(cell.dateKey) || 0;
                        const isSelected = selectedDate === cell.dateKey;
                        return (
                          <button
                            type="button"
                            key={cell.dateKey}
                            onClick={() => setSelectedDate((prev) => (prev === cell.dateKey ? '' : cell.dateKey))}
                            className={`aspect-square rounded-md border text-[11px] flex flex-col items-center justify-center transition ${count > 0 ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'} ${isSelected ? 'ring-2 ring-primary/40' : ''}`}
                            title={count > 0 ? `${count} formation(s)` : 'No formations'}
                          >
                            <span>{cell.day}</span>
                            {count > 0 ? <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Upcoming formations</h2>
                  <span className="text-sm text-muted-foreground">{upcomingFormations.length} found</span>
                </div>

                {upcomingFormations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming formations for now.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {upcomingFormations.map((formation) => (
                      <article key={formation._id} className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                        <div className="relative h-44 overflow-hidden bg-muted">
                          {formation.imageUrl ? (
                            <img src={formation.imageUrl} alt={formation.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-emerald-500/25 via-primary/10 to-emerald-400/20" />
                          )}
                          <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
                            {new Date(formation.formationDate).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <h3 className="text-lg font-semibold line-clamp-1">{formation.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{formation.description || 'Formation details are available on the formation page.'}</p>

                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{formation.location || formation.organizer}</p>
                            <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />{formation.stats?.participants || 0} participants</p>
                          </div>

                          <div className="pt-1 flex items-center justify-between gap-2">
                            {formation.specialist?.id ? (
                              <span className="text-xs text-primary line-clamp-1">
                                {formation.specialist.firstName} {formation.specialist.lastName}
                              </span>
                            ) : <span />}

                            <Link href={`/formations/${formation._id}`} className={buttonVariants({ size: 'sm' })}>
                              View formation <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {pastFormations.length > 0 ? (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Latest past formations</h2>
                    <span className="text-sm text-muted-foreground">{pastFormations.length} found</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {pastFormations.slice(0, 6).map((formation) => (
                      <Link key={formation._id} href={`/formations/${formation._id}`} className="rounded-xl border bg-card/70 p-4 transition-colors hover:bg-card">
                        <p className="text-sm font-medium line-clamp-1">{formation.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(formation.formationDate).toLocaleDateString()} · {formation.location || formation.organizer}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/providers/locale-provider';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react';

interface ParticipatedEventItem {
  participationId: string;
  participatedAt: string;
  event: {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    eventDate: string;
    organizer: string;
    allowParticipation: boolean;
    isActive: boolean;
  };
}

interface ParticipatedFormationItem {
  participationId: string;
  participatedAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  formation: {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    formationDate: string;
    organizer: string;
    location?: string;
    allowParticipation: boolean;
    isActive: boolean;
  };
}

function toDateKey(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AccountProfilePage() {
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [formationCalendarMonth, setFormationCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedFormationDateKey, setSelectedFormationDateKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/account/profile');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const user = data?.user;

  const { data: participatedEventsData, isLoading: isLoadingParticipatedEvents } = useQuery({
    queryKey: ['account-participated-events'],
    enabled: Boolean(user && user.role === 'BUYER'),
    queryFn: async () => {
      const res = await fetch('/api/account/participated-events', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Failed to load participated events');
      return payload;
    },
  });

  const participatedEvents: ParticipatedEventItem[] = participatedEventsData?.events || [];

  const { data: participatedFormationsData, isLoading: isLoadingParticipatedFormations } = useQuery({
    queryKey: ['account-participated-formations'],
    enabled: Boolean(user && user.role === 'BUYER'),
    queryFn: async () => {
      const res = await fetch('/api/account/participated-formations', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Failed to load participated formations');
      return payload;
    },
  });

  const participatedFormations: ParticipatedFormationItem[] = participatedFormationsData?.formations || [];

  useEffect(() => {
    if (selectedDateKey || !participatedEvents.length) return;
    setSelectedDateKey(toDateKey(participatedEvents[0].event.eventDate));
  }, [participatedEvents, selectedDateKey]);

  useEffect(() => {
    if (selectedFormationDateKey || !participatedFormations.length) return;
    setSelectedFormationDateKey(toDateKey(participatedFormations[0].formation.formationDate));
  }, [participatedFormations, selectedFormationDateKey]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, ParticipatedEventItem[]>();
    for (const item of participatedEvents) {
      const key = toDateKey(item.event.eventDate);
      const previous = grouped.get(key) || [];
      previous.push(item);
      grouped.set(key, previous);
    }
    return grouped;
  }, [participatedEvents]);

  const formationsByDate = useMemo(() => {
    const grouped = new Map<string, ParticipatedFormationItem[]>();
    for (const item of participatedFormations) {
      const key = toDateKey(item.formation.formationDate);
      const previous = grouped.get(key) || [];
      previous.push(item);
      grouped.set(key, previous);
    }
    return grouped;
  }, [participatedFormations]);

  const monthDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmptyDays = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: Array<{ day: number | null; dateKey: string | null }> = [];
    for (let i = 0; i < leadingEmptyDays; i += 1) {
      cells.push({ day: null, dateKey: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      cells.push({ day, dateKey: toDateKey(date) });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: null, dateKey: null });
    }

    return cells;
  }, [calendarMonth]);

  const formationMonthDays = useMemo(() => {
    const year = formationCalendarMonth.getFullYear();
    const month = formationCalendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmptyDays = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: Array<{ day: number | null; dateKey: string | null }> = [];
    for (let i = 0; i < leadingEmptyDays; i += 1) {
      cells.push({ day: null, dateKey: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      cells.push({ day, dateKey: toDateKey(date) });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: null, dateKey: null });
    }

    return cells;
  }, [formationCalendarMonth]);

  const focusedDateKey = useMemo(() => {
    const monthPrefix = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`;
    const matched = Array.from(eventsByDate.keys()).find((key) => key.startsWith(monthPrefix));
    if (selectedDateKey && eventsByDate.has(selectedDateKey)) {
      return selectedDateKey;
    }
    return matched || selectedDateKey;
  }, [calendarMonth, eventsByDate, selectedDateKey]);

  const focusedFormationDateKey = useMemo(() => {
    const monthPrefix = `${formationCalendarMonth.getFullYear()}-${String(formationCalendarMonth.getMonth() + 1).padStart(2, '0')}`;
    const matched = Array.from(formationsByDate.keys()).find((key) => key.startsWith(monthPrefix));
    if (selectedFormationDateKey && formationsByDate.has(selectedFormationDateKey)) {
      return selectedFormationDateKey;
    }
    return matched || selectedFormationDateKey;
  }, [formationCalendarMonth, formationsByDate, selectedFormationDateKey]);

  const focusedFormationEvents = focusedFormationDateKey ? formationsByDate.get(focusedFormationDateKey) || [] : [];

  const focusedDateEvents = focusedDateKey ? eventsByDate.get(focusedDateKey) || [] : [];

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'fr' ? 'fr-TN' : locale === 'ar' ? 'ar-TN' : 'en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale]
  );

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'fr' ? 'fr-TN' : locale === 'ar' ? 'ar-TN' : 'en-GB', {
        month: 'long',
        year: 'numeric',
      }),
    [locale]
  );

  const updateMutation = useMutation({
    mutationFn: async (formData: Record<string, string>) => {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: t('account.updateSuccess') });
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [initDone, setInitDone] = useState(false);

  // Sync form when data loads
  if (user && !initDone) {
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      company: user.company || '',
    });
    setInitDone(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('account.pleaseLogin')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('account.personalInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate(form);
            }}
            className="space-y-4 max-w-md"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('account.firstName')}</Label>
                <Input
                  value={form.firstName ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('account.lastName')}</Label>
                <Input
                  value={form.lastName ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('account.email')}</Label>
              <Input value={user.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>{t('account.phone')}</Label>
              <Input
                value={form.phone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('account.company')}</Label>
              <Input
                value={form.company ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t('account.saving') : t('account.save')}
            </Button>
          </form>
        </CardContent>
      </Card>


      {user.role === 'BUYER' && (
        <Card className="overflow-hidden border-emerald-200">
          <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              {t('account.participatedFormationsTitle')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('account.participatedFormationsSubtitle')}</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {isLoadingParticipatedFormations ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : participatedFormations.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('account.noParticipatedFormations')}</p>
            ) : (
              <>
                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <Button type="button" variant="outline" size="icon" onClick={() => setFormationCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <p className="text-base font-semibold capitalize">{monthFormatter.format(formationCalendarMonth)}</p>
                    <Button type="button" variant="outline" size="icon" onClick={() => setFormationCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground mb-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                      <div key={label} className="py-1">{label}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {formationMonthDays.map((cell, index) => {
                      if (!cell.day || !cell.dateKey) {
                        return <div key={`formation-empty-${index}`} className="aspect-square rounded-xl bg-muted/30" />;
                      }

                      const hasFormations = formationsByDate.has(cell.dateKey);
                      const isFocused = focusedFormationDateKey === cell.dateKey;

                      return (
                        <button
                          type="button"
                          key={cell.dateKey}
                          onClick={() => setSelectedFormationDateKey(cell.dateKey)}
                          className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-sm transition ${
                            hasFormations
                              ? 'border-emerald-400/40 bg-emerald-50 text-emerald-700 font-semibold'
                              : 'border-border bg-background text-muted-foreground'
                          } ${isFocused ? 'ring-2 ring-emerald-400/40' : ''}`}
                        >
                          <span>{cell.day}</span>
                          {hasFormations ? <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-600" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {focusedFormationDateKey
                      ? `${t('account.formationsOnDate')} ${new Date(focusedFormationDateKey).toLocaleDateString(locale === 'fr' ? 'fr-TN' : locale === 'ar' ? 'ar-TN' : 'en-GB')}`
                      : t('account.formationsOnDateFallback')}
                  </p>

                  {focusedFormationEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('account.noFormationsOnDate')}</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {focusedFormationEvents.map((item) => {
                        const statusLabel =
                          item.status === 'ACCEPTED'
                            ? t('account.formationStatusAccepted')
                            : item.status === 'REJECTED'
                              ? t('account.formationStatusRejected')
                              : t('account.formationStatusPending');

                        return (
                          <div key={item.participationId} className="rounded-xl border p-4 bg-card shadow-sm space-y-3">
                            <div>
                              <h3 className="font-semibold line-clamp-1">{item.formation.title}</h3>
                              {item.formation.description ? <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.formation.description}</p> : null}
                            </div>

                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p className="flex items-center gap-2">
                                <Clock3 className="h-3.5 w-3.5" />
                                {dateFormatter.format(new Date(item.formation.formationDate))}
                              </p>
                              <p className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" />
                                {item.formation.location || item.formation.organizer}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[11px] rounded-full px-2.5 py-1 font-medium ${
                                item.status === 'ACCEPTED'
                                  ? 'bg-green-100 text-green-700'
                                  : item.status === 'REJECTED'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}>
                                {statusLabel}
                              </span>

                              <Link href={`/formations/${item.formation.id}`} className="text-sm font-medium text-emerald-600 hover:underline">
                                {t('account.viewParticipatedFormation')}
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('account.subscription')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm px-3 py-1 rounded-full font-medium ${
                user.badge?.type === 'PRIME'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {user.badge?.type === 'PRIME' ? t('account.prime') : t('account.free')}
            </span>
            {user.badge?.type === 'PRIME' && user.badge?.expiresAt && (
              <span className="text-sm text-muted-foreground">
                {t('account.expiresOn')} {new Date(user.badge.expiresAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-GB' : 'ar-TN')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {user.role === 'BUYER' && (
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {t('account.participatedEventsTitle')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('account.participatedEventsSubtitle')}</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {isLoadingParticipatedEvents ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : participatedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('account.noParticipatedEvents')}</p>
            ) : (
              <>
                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <p className="text-base font-semibold capitalize">{monthFormatter.format(calendarMonth)}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground mb-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                      <div key={label} className="py-1">{label}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {monthDays.map((cell, index) => {
                      if (!cell.day || !cell.dateKey) {
                        return <div key={`empty-${index}`} className="aspect-square rounded-xl bg-muted/30" />;
                      }

                      const hasEvents = eventsByDate.has(cell.dateKey);
                      const isFocused = focusedDateKey === cell.dateKey;

                      return (
                        <button
                          type="button"
                          key={cell.dateKey}
                          onClick={() => setSelectedDateKey(cell.dateKey)}
                          className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-sm transition ${
                            hasEvents
                              ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                              : 'border-border bg-background text-muted-foreground'
                          } ${isFocused ? 'ring-2 ring-primary/40' : ''}`}
                        >
                          <span>{cell.day}</span>
                          {hasEvents ? <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {focusedDateKey
                      ? `${t('account.eventsOnDate')} ${new Date(focusedDateKey).toLocaleDateString(locale === 'fr' ? 'fr-TN' : locale === 'ar' ? 'ar-TN' : 'en-GB')}`
                      : t('account.eventsOnDateFallback')}
                  </p>

                  {focusedDateEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('account.noEventsOnDate')}</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {focusedDateEvents.map((item) => (
                        <div key={item.participationId} className="rounded-xl border p-4 bg-card shadow-sm space-y-3">
                          <div>
                            <h3 className="font-semibold line-clamp-1">{item.event.title}</h3>
                            {item.event.description ? (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.event.description}</p>
                            ) : null}
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p className="flex items-center gap-2">
                              <Clock3 className="h-3.5 w-3.5" />
                              {dateFormatter.format(new Date(item.event.eventDate))}
                            </p>
                            <p className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5" />
                              {item.event.organizer}
                            </p>
                          </div>

                          <div className="pt-1">
                            <Link href={`/events/${item.event.id}`} className="text-sm font-medium text-primary hover:underline">
                              {t('account.viewParticipatedEvent')}
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

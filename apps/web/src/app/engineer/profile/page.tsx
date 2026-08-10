'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocationPicker } from '@/components/maps/location-picker';
import { useToast } from '@/hooks/use-toast';

interface EngineerProfile {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  country: string;
  avatarUrl: string;
  bio: string;
  speciality: string;
  workSummary: string;
  cvUrl: string;
  location?: {
    lat?: number;
    lng?: number;
    label?: string;
  } | null;
  stats: {
    totalHandled: number;
    resolvedCount: number;
    totalFeedbacks: number;
    averageRating: number;
  };
  recentWorks: Array<{
    id: string;
    title: string;
    speciality: string;
    engineerRecommendation: string;
    status: string;
    rating: number | null;
    updatedAt: string;
  }>;
}

export default function EngineerProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [initDone, setInitDone] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['engineer-profile'],
    queryFn: async () => {
      const res = await fetch('/api/engineer/profile');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const profile: EngineerProfile | undefined = data?.profile;

  useEffect(() => {
    if (profile && !initDone) {
      setForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        city: profile.city || '',
        country: profile.country || '',
        avatarUrl: profile.avatarUrl || '',
        bio: profile.bio || '',
        speciality: profile.speciality || '',
        workSummary: profile.workSummary || '',
        cvUrl: profile.cvUrl || '',
        locationLabel: profile.location?.label || '',
        locationLat: profile.location?.lat !== undefined ? String(profile.location.lat) : '',
        locationLng: profile.location?.lng !== undefined ? String(profile.location.lng) : '',
      });
      setInitDone(true);
    }
  }, [initDone, profile]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await fetch('/api/engineer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: async (result) => {
      const nextProfile = result?.profile as EngineerProfile | undefined;
      if (nextProfile) {
        setForm({
          firstName: nextProfile.firstName || '',
          lastName: nextProfile.lastName || '',
          phone: nextProfile.phone || '',
          city: nextProfile.city || '',
          country: nextProfile.country || '',
          avatarUrl: nextProfile.avatarUrl || '',
          bio: nextProfile.bio || '',
          speciality: nextProfile.speciality || '',
          workSummary: nextProfile.workSummary || '',
          cvUrl: nextProfile.cvUrl || '',
          locationLabel: nextProfile.location?.label || '',
          locationLat: nextProfile.location?.lat !== undefined ? String(nextProfile.location.lat) : '',
          locationLng: nextProfile.location?.lng !== undefined ? String(nextProfile.location.lng) : '',
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['engineer-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['specialists'] });
      await queryClient.invalidateQueries({ queryKey: ['specialist', profile?.id] });
      toast({ title: 'Profil ingénieur mis à jour' });
    },
  });

  const selectedLocationLat = form.locationLat && Number.isFinite(Number(form.locationLat)) ? Number(form.locationLat) : undefined;
  const selectedLocationLng = form.locationLng && Number.isFinite(Number(form.locationLng)) ? Number(form.locationLng) : undefined;

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="container py-10 min-h-screen">
          <div className="h-48 rounded-3xl bg-muted animate-pulse" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Navbar />
        <main className="container py-20 min-h-screen text-center">
          <p className="text-muted-foreground">Profil introuvable.</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container py-8 min-h-screen">
        <section className="rounded-3xl border bg-gradient-to-br from-emerald-50 to-background p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-emerald-100 text-3xl font-bold text-emerald-700">
                {(profile.firstName?.[0] ?? 'S')}
                {profile.lastName?.[0] ?? ''}
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-emerald-700 font-medium">Profil ingénieur</p>
                <h1 className="mt-1 text-3xl font-bold">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="mt-1 text-muted-foreground">{profile.speciality || 'Spécialiste agronomique'}</p>
                <p className="mt-2 text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center text-sm lg:min-w-80">
              {[
                { label: 'Demandes traitées', value: profile.stats.totalHandled },
                { label: 'Note moyenne', value: `${profile.stats.averageRating.toFixed(1)} ⭐` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border bg-card p-4">
                  <p className="text-xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/engineer/dashboard">Ouvrir mon dashboard spécialiste</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/engineer/agri-help">Voir mes demandes agronomiques</Link>
            </Button>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Mettre à jour votre profil</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMutation.mutate(form);
                }}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input value={form.firstName ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={form.lastName ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input value={form.phone ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ville</Label>
                    <Input value={form.city ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pays</Label>
                    <Input value={form.country ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Photo de profil</Label>
                    <Input value={form.avatarUrl ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, avatarUrl: e.target.value }))} placeholder="https://..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Spécialité</Label>
                  <Input value={form.speciality ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, speciality: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Résumé de travail</Label>
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.workSummary ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, workSummary: e.target.value }))}
                    rows={5}
                    placeholder="Présentez vos missions, vos types d'interventions, vos zones d'expertise..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <textarea
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.bio ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    placeholder="Parlez de votre parcours et de votre expérience."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lien du CV</Label>
                  <Input value={form.cvUrl ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, cvUrl: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Localisation publique</Label>
                  <Input
                    value={form.locationLabel ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, locationLabel: e.target.value }))}
                    placeholder="Ex: Siège, bureau, atelier..."
                  />
                  <LocationPicker
                    value={{ lat: selectedLocationLat, lng: selectedLocationLng }}
                    onChange={({ lat, lng }) =>
                      setForm((prev) => ({
                        ...prev,
                        locationLat: String(lat),
                        locationLng: String(lng),
                      }))
                    }
                    markerTitle={`${form.firstName || profile.firstName || 'Spécialiste'} ${form.lastName || profile.lastName || ''}`.trim()}
                    markerSubtitle={form.speciality || profile.speciality || form.locationLabel || 'Spécialiste agricole'}
                  />
                  <p className="text-xs text-muted-foreground">Choisissez votre localisation sur la carte, sans saisir les coordonnées manuellement.</p>
                </div>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Mise à jour...' : 'Enregistrer le profil'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>CV et présentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{profile.workSummary || 'Ajoutez votre résumé de travail pour présenter votre expertise.'}</p>
                {profile.cvUrl ? (
                  <a href={profile.cvUrl} target="_blank" rel="noreferrer" className="inline-flex font-medium text-primary underline">
                    Consulter le CV
                  </a>
                ) : (
                  <p className="font-medium text-foreground">Aucun CV publié pour le moment.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dashboard spécialiste</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Gérez vos formations, vos événements et les participations dans un espace dédié et plus simple.</p>
                <Button asChild>
                  <Link href="/engineer/dashboard">Accéder au dashboard</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dernières réalisations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.recentWorks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune réalisation enregistrée.</p>
                ) : (
                  profile.recentWorks.map((work) => (
                    <div key={work.id} className="rounded-2xl border p-4 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{work.title}</p>
                        <span className="text-xs rounded-full border px-2 py-0.5">{work.status}</span>
                      </div>
                      <p className="text-muted-foreground mt-1">{work.speciality}</p>
                      <p className="mt-2 text-foreground">{work.engineerRecommendation || 'Aucune recommandation publique.'}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {work.rating ? `${work.rating} ⭐ • ` : ''}
                        {new Date(work.updatedAt).toLocaleDateString('fr-TN')}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

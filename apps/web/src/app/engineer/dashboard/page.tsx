'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EngineerProfileSummary {
  firstName: string;
  stats: {
    totalHandled: number;
    resolvedCount: number;
    totalFeedbacks: number;
    averageRating: number;
  };
}

export default function EngineerDashboardPage() {
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['engineer-profile'],
    queryFn: async () => {
      const res = await fetch('/api/engineer/profile');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const profile: EngineerProfileSummary | undefined = profileData?.profile;

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8">
      {/* Header */}
      <section className="rounded-3xl border bg-gradient-to-br from-emerald-50 to-background p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-emerald-700 font-medium">
              Dashboard spécialiste
            </p>
            <h1 className="mt-1 text-3xl font-bold">
              Bienvenue{profile ? `, ${profile.firstName}` : ''}
            </h1>
            <p className="mt-1 text-muted-foreground">
              Créez vos formations, vos événements et gérez les participations dans un seul espace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/engineer/dashboard/formations">
                Créer une formation
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/engineer/dashboard/events">
                Créer un événement
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Demandes traitées</p>
              <p className="text-xl font-semibold">{profile?.stats?.totalHandled ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Résolues</p>
              <p className="text-xl font-semibold">{profile?.stats?.resolvedCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Feedbacks</p>
              <p className="text-xl font-semibold">
                {profile?.stats?.totalFeedbacks ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Note moyenne</p>
              <p className="text-xl font-semibold">
                {(profile?.stats?.averageRating ?? 0).toFixed(1)} ⭐
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Quick Links */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-dashed hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="text-base">Mes formations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Créez et gérez vos formations
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/engineer/dashboard/formations">
                Accéder aux formations
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="text-base">Mes événements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Créez et gérez vos événements
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/engineer/dashboard/events">
                Accéder aux événements
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="text-base">Mon profil</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Modifiez vos informations personnelles
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/engineer/profile">
                Modifier mon profil
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

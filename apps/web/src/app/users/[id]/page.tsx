'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type PublicUserProfile = {
  id: string;
  role: 'GUEST' | 'BUYER' | 'SUPPLIER' | 'AGRI_ENGINEER' | 'ADMIN';
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  country?: string;
  speciality?: string;
  createdAt: string;
};

export default function PublicUserProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-user-profile', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/users/${id}`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Utilisateur introuvable');
      return payload;
    },
  });

  const user: PublicUserProfile | undefined = data?.user;

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="container py-10 min-h-screen">
          <div className="h-56 rounded-3xl bg-muted animate-pulse" />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <Navbar />
        <main className="container py-20 min-h-screen text-center">
          <h1 className="text-2xl font-bold">Profil introuvable</h1>
          <p className="mt-2 text-muted-foreground">Ce profil n&apos;est pas disponible.</p>
          <Button asChild className="mt-6">
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </main>
        <Footer />
      </>
    );
  }

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur';
  const isSpecialist = user.role === 'AGRI_ENGINEER';

  return (
    <>
      <Navbar />
      <main className="container py-10 min-h-screen">
        <Card className="rounded-3xl">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-3xl">{fullName}</CardTitle>
                  {isSpecialist ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Spécialiste
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isSpecialist ? 'Ingénieur agronome' : 'Membre TunAgri'}
                </p>
              </div>
              {isSpecialist ? (
                <Button asChild>
                  <Link href={`/specialists/${user.id}`}>Voir le profil spécialiste</Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {user.speciality ? <p><span className="font-medium text-foreground">Spécialité:</span> {user.speciality}</p> : null}
            {(user.city || user.country) ? (
              <p>
                <span className="font-medium text-foreground">Localisation:</span> {[user.city, user.country].filter(Boolean).join(', ')}
              </p>
            ) : null}
            {user.bio ? <p className="whitespace-pre-wrap">{user.bio}</p> : <p>Ce membre n&apos;a pas encore ajouté de bio.</p>}
            <p>Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-TN')}</p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}

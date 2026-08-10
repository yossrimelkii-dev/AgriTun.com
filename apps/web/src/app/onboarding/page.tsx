'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const PROFESSIONALS = [
  { value: 'AGRICULTEUR', label: 'Agriculteur', desc: 'Producteur ou exploitant agricole' },
  { value: 'FOURNISSEUR', label: 'Fournisseur', desc: 'Entreprise qui fournit des produits ou services' },
  { value: 'SPECIALIST', label: 'Spécialiste', desc: 'Expert métier, conseiller ou technicien' },
  { value: 'CENTRE_DE_FORMATION', label: 'Centre de formation', desc: 'Structure de formation ou école' },
] as const;

const onboardingSchema = z
  .object({
    firstName: z.string().min(1, 'Le nom est obligatoire').max(100),
    lastName: z.string().min(1, 'Le prénom est obligatoire').max(100),
    professional: z.enum(['AGRICULTEUR', 'FOURNISSEUR', 'SPECIALIST', 'CENTRE_DE_FORMATION']),
    phoneNumber: z.string().min(1, 'Le numéro de téléphone est obligatoire').max(30),
    companyName: z.string().max(255).optional(),
    email: z.string().email('Email invalide').max(255).optional().or(z.literal('')),
    location: z.string().max(300).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.professional !== 'AGRICULTEUR' && !data.companyName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyName'],
        message: 'Le nom de la société est obligatoire pour ce profil professionnel',
      });
    }
  });

type OnboardingInput = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isActive, setIsActive] = useState<boolean | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { professional: 'AGRICULTEUR' },
  });

  const professional = watch('professional');
  const requiresCompany = professional !== 'AGRICULTEUR';

  useEffect(() => {
    let mounted = true;

    async function loadMode() {
      try {
        const res = await fetch('/api/site-settings/onboarding', { cache: 'no-store' });
        const data = await res.json();
        if (!mounted) return;
        setIsActive(Boolean(data?.onboardingActive));
      } catch {
        if (mounted) setIsActive(false);
      }
    }

    loadMode();

    return () => {
      mounted = false;
    };
  }, []);

  const heroCopy = useMemo(() => {
    switch (professional) {
      case 'FOURNISSEUR':
        return 'Préparez votre espace fournisseur en quelques minutes.';
      case 'SPECIALIST':
        return 'Présentez votre expertise et vos services.';
      case 'CENTRE_DE_FORMATION':
        return 'Créez votre profil de centre de formation.';
      default:
        return 'Commencez votre parcours en tant qu’agriculteur.';
    }
  }, [professional]);

  async function onSubmit(data: OnboardingInput) {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Une erreur est survenue');
        return;
      }

      setSuccess('Votre demande d’onboarding a été envoyée avec succès. Notre équipe va la traiter rapidement.');
      setTimeout(() => {
        router.push('/');
      }, 1800);
    } catch {
      setError('Erreur réseau, veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (isActive === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background py-10 px-4 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Chargement du processus d&apos;onboarding...</div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background py-10 px-4 flex items-center justify-center">
        <Card className="w-full max-w-xl border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>Onboarding désactivé</CardTitle>
            <CardDescription>
              L&apos;administrateur a désactivé le processus d&apos;onboarding pour le moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground text-center">
            Le formulaire d&apos;inscription classique reste disponible tant que l&apos;onboarding n&apos;est pas activé.
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/register">Aller à l&apos;inscription</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Onboarding</p>
          <Image 
            src="/agritun.png" 
            alt="TunAgri Logo" 
            width={210} 
            height={210} 
            priority 
            className="mx-auto"
          />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Bienvenue sur le processus d&apos;intégration</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {heroCopy}
          </p>
        </div>

        <Card className="overflow-hidden border shadow-lg">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle>Remplissez vos informations</CardTitle>
            <CardDescription>
              Les champs nom, prénom, profession et téléphone sont obligatoires. Le nom de société est requis pour les fournisseurs, spécialistes et centres de formation.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 pt-6">
              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              {success && <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700">{success}</div>}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom <span className="text-destructive">*</span></Label>
                  <Input id="firstName" placeholder="Votre prénom" {...register('firstName')} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom <span className="text-destructive">*</span></Label>
                  <Input id="lastName" placeholder="Votre nom" {...register('lastName')} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Profession <span className="text-destructive">*</span></Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {PROFESSIONALS.map((item) => (
                    <label
                      key={item.value}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        professional === item.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-muted-foreground/40'
                      }`}
                    >
                      <input type="radio" value={item.value} {...register('professional')} className="sr-only" />
                      <div className="space-y-1">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.professional && <p className="text-xs text-destructive">{errors.professional.message}</p>}
              </div>

              {requiresCompany && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom de la société <span className="text-destructive">*</span></Label>
                  <Input id="companyName" placeholder="Nom de votre société" {...register('companyName')} />
                  {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Téléphone <span className="text-destructive">*</span></Label>
                  <Input id="phoneNumber" type="tel" placeholder="+212 6XX XXX XXX" {...register('phoneNumber')} />
                  {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-muted-foreground">(optionnel)</span></Label>
                  <Input id="email" type="email" placeholder="vous@exemple.com" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input id="location" placeholder="Ville, adresse, ou zone d'activité" {...register('location')} />
                {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t bg-muted/20 py-6">
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Envoi en cours...' : 'Envoyer ma demande'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Vous pouvez revenir à <Link href="/" className="text-primary hover:underline">l&apos;accueil</Link> à tout moment.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

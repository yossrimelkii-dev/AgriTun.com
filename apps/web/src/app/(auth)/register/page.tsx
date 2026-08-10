'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { useI18n } from '@/components/providers/locale-provider';
import { BrandLogo } from '@/components/layout/brand-logo';

function createRegisterSchema(specialityRequiredMessage: string) {
  return z
    .object({
      email: z.string().email().max(255),
      password: z.string().min(8).max(128),
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      phoneNumber: z.string().min(1).max(20),
      role: z.enum(['BUYER', 'SUPPLIER', 'AGRI_ENGINEER', 'TRAINING_CENTER']).default('BUYER'),
      speciality: z.string().max(160).optional(),
      companyName: z.string().max(255).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.role === 'AGRI_ENGINEER' && !data.speciality?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['speciality'],
          message: specialityRequiredMessage,
        });
      }
      if (data.role === 'SUPPLIER' && !data.companyName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['companyName'],
          message: 'Le nom de la société est obligatoire pour un fournisseur',
        });
      }
      if (data.role === 'TRAINING_CENTER' && !data.companyName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['companyName'],
          message: 'Le nom de la société est obligatoire pour un centre de formation',
        });
      }
    });
}

type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>;

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingMode, setCheckingMode] = useState(true);

  const registerSchema = createRegisterSchema(t('authRegister.specialityRequired'));

  const { register: registerField, handleSubmit, formState: { errors }, watch } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'BUYER' },
  });

  const selectedRole = watch('role');

  useEffect(() => {
    let mounted = true;

    async function checkOnboardingMode() {
      try {
        const res = await fetch('/api/site-settings/onboarding', { cache: 'no-store' });
        const data = await res.json();

        if (!mounted) return;

        if (data?.onboardingActive) {
          router.replace('/onboarding');
          return;
        }
      } catch {
        // If the check fails, keep registration available rather than blocking users.
      } finally {
        if (mounted) setCheckingMode(false);
      }
    }

    checkOnboardingMode();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function onSubmit(data: RegisterInput) {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || t('authRegister.registerError'));
        return;
      }

      router.push(
        data.role === 'SUPPLIER'
          ? '/dashboard/onboarding'
          : data.role === 'TRAINING_CENTER'
            ? '/dashboard/overview'
          : data.role === 'AGRI_ENGINEER'
            ? '/engineer/profile'
            : '/'
      );
    } catch {
      setError(t('authRegister.networkError'));
    } finally {
      setLoading(false);
    }
  }

  if (checkingMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-8">
        <div className="text-sm text-muted-foreground">Vérification du mode d&apos;inscription...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center">
            <BrandLogo href="/" className="pointer-events-none" imageClassName="h-40 w-40 sm:h-44 sm:w-44" />
          </div>
          <CardDescription>{t('authRegister.subtitle')}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Role selection */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <label
                className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedRole === 'BUYER' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <input type="radio" value="BUYER" {...registerField('role')} className="sr-only" />
                <span className="text-2xl mb-1">🛒</span>
                <span className="text-sm font-medium">{t('authRegister.buyer')}</span>
              </label>
              <label
                className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedRole === 'SUPPLIER' ? 'border-secondary bg-secondary/5' : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <input type="radio" value="SUPPLIER" {...registerField('role')} className="sr-only" />
                <span className="text-2xl mb-1">🏭</span>
                <span className="text-sm font-medium">{t('authRegister.supplier')}</span>
              </label>
              <label
                className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedRole === 'AGRI_ENGINEER' ? 'border-emerald-500 bg-emerald-50/60' : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <input type="radio" value="AGRI_ENGINEER" {...registerField('role')} className="sr-only" />
                <span className="text-2xl mb-1">🌱</span>
                <span className="text-xs font-medium text-center">{t('authRegister.engineer')}</span>
              </label>
              <label
                className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedRole === 'TRAINING_CENTER' ? 'border-indigo-500 bg-indigo-50/60' : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <input type="radio" value="TRAINING_CENTER" {...registerField('role')} className="sr-only" />
                <span className="text-2xl mb-1">🏫</span>
                <span className="text-xs font-medium text-center">Centre de formation</span>
              </label>
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('authRegister.firstName')}</Label>
                <Input id="firstName" {...registerField('firstName')} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('authRegister.lastName')}</Label>
                <Input id="lastName" {...registerField('lastName')} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('authRegister.email')}</Label>
              <Input id="email" type="email" placeholder={t('authRegister.emailPlaceholder')} {...registerField('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Phone - Required for all */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                Téléphone <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="phoneNumber" 
                type="tel" 
                placeholder="+212 6XX XXX XXX" 
                {...registerField('phoneNumber')} 
              />
              {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('authRegister.password')}</Label>
              <Input id="password" type="password" placeholder="••••••••" {...registerField('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {/* Speciality - Required for AGRI_ENGINEER */}
            {selectedRole === 'AGRI_ENGINEER' && (
              <div className="space-y-2">
                <Label htmlFor="speciality">
                  {t('authRegister.speciality')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="speciality"
                  placeholder={t('authRegister.specialityPlaceholder')}
                  {...registerField('speciality')}
                />
                {errors.speciality && <p className="text-xs text-destructive">{errors.speciality.message}</p>}
              </div>
            )}

            {/* Company Name - Required for SUPPLIER and TRAINING_CENTER */}
            {(selectedRole === 'SUPPLIER' || selectedRole === 'TRAINING_CENTER') && (
              <div className="space-y-2">
                <Label htmlFor="companyName">
                  Nom de la Société <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  placeholder="Nom de votre entreprise"
                  {...registerField('companyName')}
                />
                {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('authRegister.submitting') : t('authRegister.submit')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t('authRegister.hasAccount')}{' '}
              <Link href="/login" className="text-primary hover:underline">
                {t('authRegister.login')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

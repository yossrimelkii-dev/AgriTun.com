'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { loginSchema, type LoginInput } from '@agrimed/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { useI18n } from '@/components/providers/locale-provider';
import { BrandLogo } from '@/components/layout/brand-logo';

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Only accept in-app paths to prevent open-redirect abuse.
  const rawNext = searchParams.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || t('authLogin.loginError'));
        return;
      }

      // Refresh navbar auth state
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });

      // Honor the ?next= return URL when the user was redirected mid-flow.
      if (next) {
        router.push(next);
      } else if (result.user.role === 'SUPPLIER') {
        router.push(result.user.supplierId ? '/dashboard/overview' : '/dashboard/onboarding');
      } else if (result.user.role === 'AGRI_ENGINEER') {
        router.push('/engineer/profile');
      } else if (result.user.role === 'TRAINING_CENTER') {
        router.push('/engineer/dashboard');
      } else if (result.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch {
      setError(t('authLogin.networkError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center">
            <BrandLogo href="/" className="pointer-events-none" imageClassName="h-40 w-40 sm:h-44 sm:w-44" />
          </div>
          <CardDescription>{t('authLogin.subtitle')}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('authLogin.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('authLogin.emailPlaceholder')}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('authLogin.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('authLogin.submitting') : t('authLogin.submit')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t('authLogin.noAccount')}{' '}
              <Link href="/register" className="text-primary hover:underline">
                {t('authLogin.createAccount')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
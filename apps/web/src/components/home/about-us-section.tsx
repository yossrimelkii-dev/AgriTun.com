'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/providers/locale-provider';

export function AboutUsSection() {
  const { t } = useI18n();

  return (
    <section className="bg-muted/40 py-12">
      <div className="container grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('aboutSection.label')}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{t('aboutSection.title')}</h2>
          <p className="mt-4 text-sm text-muted-foreground leading-6">
            {t('aboutSection.paragraph1')}
          </p>
          <p className="mt-3 text-sm text-muted-foreground leading-6">
            {t('aboutSection.paragraph2')}
          </p>
          <div className="mt-5">
            <Button asChild>
              <Link href="/register">{t('aboutSection.cta')}</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">500+</p>
              <p className="text-xs text-muted-foreground">{t('aboutSection.products')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">120+</p>
              <p className="text-xs text-muted-foreground">{t('aboutSection.suppliers')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">24/7</p>
              <p className="text-xs text-muted-foreground">{t('aboutSection.support')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">19%</p>
              <p className="text-xs text-muted-foreground">{t('aboutSection.vat')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

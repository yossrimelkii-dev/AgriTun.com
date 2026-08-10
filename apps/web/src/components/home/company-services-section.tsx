'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeCheck, BarChart3, Handshake, Headset, ShieldCheck, Truck } from 'lucide-react';
import { useI18n } from '@/components/providers/locale-provider';

const services = [
  {
    id: 'b2b',
    icon: Handshake,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'delivery',
    icon: Truck,
    tone: 'bg-sky-50 text-sky-700',
  },
  {
    id: 'quality',
    icon: ShieldCheck,
    tone: 'bg-indigo-50 text-indigo-700',
  },
  {
    id: 'support',
    icon: Headset,
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    tone: 'bg-violet-50 text-violet-700',
  },
  {
    id: 'trust',
    icon: BadgeCheck,
    tone: 'bg-teal-50 text-teal-700',
  },
];

export function CompanyServicesSection() {
  const { t } = useI18n();

  return (
    <section className="container py-12">
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('servicesSection.label')}</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">{t('servicesSection.title')}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t('servicesSection.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => {
          const Icon = service.icon;
          const title = t(`servicesSection.${service.id}.title`);
          const description = t(`servicesSection.${service.id}.description`);
          return (
            <Card key={service.id} className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-base">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${service.tone}`}>
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

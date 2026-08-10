'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/providers/locale-provider';

type SupplierItem = {
  _id: string;
  companyName: string;
  slug: string;
  logo?: string;
  sector: string;
  description?: string;
  addresses?: Array<{ city?: string; wilaya?: string }>;
  stats?: { totalProducts?: number; totalOrders?: number; profileViews?: number };
};

export function SuppliersHorizontalList() {
  const { t } = useI18n();

  const sectorLabel = (sector: string) =>
    sector === 'MEDICAL'
      ? t('suppliersSection.sectorMedical')
      : sector === 'AGRICULTURAL'
        ? t('suppliersSection.sectorAgricultural')
        : t('suppliersSection.sectorBoth');

  const { data, isLoading } = useQuery({
    queryKey: ['home-suppliers'],
    queryFn: async () => {
      const res = await fetch('/api/suppliers?limit=12');
      if (!res.ok) throw new Error('Failed to load suppliers');
      return res.json();
    },
  });

  const suppliers: SupplierItem[] = data?.suppliers ?? [];

  return (
    <section className="container py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('suppliersSection.label')}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{t('suppliersSection.title')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t('suppliersSection.subtitle')}
          </p>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <Link href="/suppliers">{t('suppliersSection.viewAll')}</Link>
        </Button>
      </div>

      <div className="-mx-1 overflow-x-auto pb-2" dir="ltr">
        <div className="flex gap-4 px-1 min-w-max snap-x snap-mandatory" dir="ltr">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[210px] w-[300px] rounded-3xl border bg-muted/50 animate-pulse snap-start" />
              ))
            : suppliers.map((supplier) => {
                const hq = supplier.addresses?.find((a) => a.wilaya) || supplier.addresses?.[0];
                return (
                  <Card key={supplier._id} className="w-[300px] shrink-0 snap-start overflow-hidden" dir="ltr">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary overflow-hidden">
                          {supplier.logo ? (
                            <Image src={supplier.logo} alt={supplier.companyName} width={56} height={56} sizes="56px" className="h-full w-full object-cover" />
                          ) : (
                            <span>{supplier.sector === 'MEDICAL' ? '🏥' : '🌾'}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold leading-tight line-clamp-2">{supplier.companyName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{sectorLabel(supplier.sector)}</p>
                          {hq?.wilaya ? <p className="text-xs text-muted-foreground">{hq.wilaya}</p> : null}
                        </div>
                      </div>

                      {supplier.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-3">{supplier.description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('suppliersSection.verifiedFallback')}</p>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-center text-sm">
                        <div className="rounded-2xl bg-muted/60 p-3">
                          <p className="text-lg font-semibold">{supplier.stats?.totalProducts || 0}</p>
                          <p className="text-[11px] text-muted-foreground">{t('suppliersSection.products')}</p>
                        </div>
                        <div className="rounded-2xl bg-muted/60 p-3">
                          <p className="text-lg font-semibold">{supplier.stats?.totalOrders || 0}</p>
                          <p className="text-[11px] text-muted-foreground">{t('suppliersSection.orders')}</p>
                        </div>
                      </div>

                      <Button asChild className="w-full">
                        <Link href={`/suppliers/${supplier.slug}`}>{t('suppliersSection.viewProfile')}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </div>
    </section>
  );
}
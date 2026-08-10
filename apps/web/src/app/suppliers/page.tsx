'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useI18n } from '@/components/providers/locale-provider';

interface SupplierItem {
  _id: string;
  companyName: string;
  slug: string;
  logo?: string;
  sector: string;
  description?: string;
  addresses?: Array<{ city?: string; wilaya?: string }>;
  stats?: { totalProducts?: number; totalOrders?: number; profileViews?: number };
  userRole?: string;
}

export default function SuppliersPage() {
  const [sector, setSector] = useState('');
  const { t } = useI18n();
  
  const getSectorLabel = (s: string) =>
    s === 'MEDICAL' ? t('suppliers.medicalSector') : s === 'AGRICULTURAL' ? t('suppliers.agriculturalSector') : '🔄 ' + t('suppliers.allSectors');

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', sector],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sector) params.set('sector', sector);
      const res = await fetch(`/api/suppliers?${params}`);
      return res.json();
    },
  });

  const suppliers: SupplierItem[] = data?.suppliers || [];

  const sortedSuppliers = useMemo(() => {
    const rolePriority: Record<string, number> = {
      SUPER_SUPPLIER: 0,
      SUPPLIER_PRIME: 1,
      SUPPLIER: 2,
    };

    return [...suppliers].sort((a, b) => {
      const aPriority = rolePriority[a.userRole || ''] ?? 99;
      const bPriority = rolePriority[b.userRole || ''] ?? 99;

      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.companyName.localeCompare(b.companyName, 'fr');
    });
  }, [suppliers]);

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('suppliers.heading')}</h1>
          <p className="text-muted-foreground">
            {t('suppliers.description')}
          </p>
        </div>

        {/* Sector filter */}
        <div className="flex gap-2 mb-8">
          {[
            { value: '', label: t('suppliers.allSectors') },
            { value: 'MEDICAL', label: t('suppliers.medicalSector') },
            { value: 'AGRICULTURAL', label: t('suppliers.agriculturalSector') },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={sector === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSector(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : sortedSuppliers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏭</p>
            <p className="text-lg font-medium mb-2">{t('suppliers.noSuppliers')}</p>
            <p className="text-muted-foreground">{t('suppliers.tryFilter')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedSuppliers.map((supplier) => {
              const hq = supplier.addresses?.find((a) => a.wilaya) || supplier.addresses?.[0];
              const isSuperSupplier = supplier.userRole === 'SUPER_SUPPLIER';
              const isSupplierPrime = supplier.userRole === 'SUPPLIER_PRIME';
              return (
                <Link key={supplier._id} href={`/suppliers/${supplier.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                          {supplier.logo ? (
                            <img src={supplier.logo} alt="" className="w-14 h-14 rounded-lg object-cover" />
                          ) : (
                            supplier.sector === 'MEDICAL' ? '🏥' : '🌾'
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-lg truncate">{supplier.companyName}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              {getSectorLabel(supplier.sector)}
                            </span>
                            {isSuperSupplier && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                                💎 Diamant
                              </span>
                            )}
                            {isSupplierPrime && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                                🥇 Gold
                              </span>
                            )}
                            {hq?.wilaya && <span>· {hq.wilaya}</span>}
                          </div>
                        </div>
                      </div>

                      {supplier.description && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                          {supplier.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                        <span>{supplier.stats?.totalProducts || 0} {t('suppliers.products')}</span>
                        <span>{supplier.stats?.totalOrders || 0} {t('suppliers.orders')}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

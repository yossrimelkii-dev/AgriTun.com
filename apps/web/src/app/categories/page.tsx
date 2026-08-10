'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BadgeCheck, Boxes, FlaskConical, HeartPulse, Leaf, Sprout } from 'lucide-react';

const sectorIcons: Record<string, any> = {
  MEDICAL: HeartPulse,
  AGRICULTURAL: Sprout,
  BOTH: Boxes,
};

const sectorLabels: Record<string, string> = {
  MEDICAL: 'Médical',
  AGRICULTURAL: 'Agricole',
  BOTH: 'Les deux',
};

function getCategoryIcon(category: { sector?: string; depth?: number }) {
  if (category.sector === 'MEDICAL') {
    return category.depth && category.depth > 0 ? FlaskConical : HeartPulse;
  }
  if (category.sector === 'AGRICULTURAL') {
    return category.depth && category.depth > 0 ? Leaf : Sprout;
  }
  return Boxes;
}

export default function CategoriesPage() {
  const [sector, setSector] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['public-categories', sector],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('all', 'true');
      if (sector) params.set('sector', sector);
      const res = await fetch(`/api/categories?${params}`);
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    },
  });

  const categories = data?.categories || [];
  const rootCategories = useMemo(() => categories.filter((c: any) => !c.parentId), [categories]);
  const childCounts = useMemo(() => {
    const counts = new Map<string, number>();
    categories.forEach((cat: any) => {
      if (cat.parentId) {
        const id = cat.parentId.toString();
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    });
    return counts;
  }, [categories]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-b">
          <div className="container py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground mb-4">
                <BadgeCheck className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Catégories vérifiées et organisées
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Explorez nos catégories médicales et agricoles
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Parcourez les catégories disponibles et accédez directement aux produits correspondants.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-10">
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { value: '', label: 'Toutes', icon: Boxes },
              { value: 'MEDICAL', label: 'Équipement des animaux', icon: HeartPulse },
              { value: 'AGRICULTURAL', label: 'Agricole', icon: Sprout },
              { value: 'BOTH', label: 'Les deux', icon: BadgeCheck },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant={sector === opt.value ? 'default' : 'outline'}
                onClick={() => setSector(opt.value)}
              >
                <span className="inline-flex items-center gap-2">
                  {(() => {
                    const Icon = opt.value ? sectorIcons[opt.value] : opt.icon;
                    return <Icon className="h-4 w-4" strokeWidth={1.8} />;
                  })()}
                  {opt.label}
                </span>
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : rootCategories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune catégorie trouvée</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {rootCategories.map((cat: any) => {
                const Icon = getCategoryIcon(cat);
                const childCount = childCounts.get(cat._id.toString()) || 0;

                return (
                  <Link key={cat._id} href={`/products?category=${cat.slug}`}>
                    <Card className="h-full hover:shadow-lg transition-all duration-300 border-border/60 hover:border-primary/30 group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                            <Icon className="h-6 w-6" strokeWidth={1.8} />
                          </div>
                          <span className="text-xs rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                            {sectorLabels[cat.sector] || cat.sector}
                          </span>
                        </div>
                        <h2 className="text-lg font-semibold mb-1">{cat.name}</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          {cat.slug}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {childCount} sous-catégorie{childCount > 1 ? 's' : ''}
                          </span>
                          <span className="text-primary font-medium group-hover:underline">
                            Voir les produits
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

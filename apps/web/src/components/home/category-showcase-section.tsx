"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Bug, FlaskConical, Leaf, Sprout } from 'lucide-react';
import { useI18n } from '@/components/providers/locale-provider';

const showcaseCategories = [
  {
    id: 'pesticides',
    href: '/products?category=pesticides',
    image:
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80',
    icon: Bug,
    tone: 'from-emerald-600 to-lime-500',
  },
  {
    id: 'engrais',
    href: '/products?category=engrais-fertilisants',
    image:
      'https://images.unsplash.com/photo-1595351298020-038700609878?auto=format&fit=crop&w=1200&q=80',
    icon: FlaskConical,
    tone: 'from-amber-600 to-orange-500',
  },
  {
    id: 'semences',
    href: '/products?category=semences-plants',
    image:
      'https://images.pexels.com/photos/772808/pexels-photo-772808.jpeg?auto=compress&cs=tinysrgb&w=1200',
    icon: Sprout,
    tone: 'from-teal-600 to-green-500',
  },
  {
    id: 'divers',
    href: '/products?category=divers',
    image:
      'https://images.unsplash.com/photo-1438109491414-7198515b166b?auto=format&fit=crop&w=1200&q=80',
    icon: Leaf,
    tone: 'from-sky-600 to-indigo-500',
  },
];

export function CategoryShowcaseSection() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState(showcaseCategories[0].id);

  const getCategoryText = (id: string, field: 'name' | 'description' | 'longDescription', fallback: string) =>
    t(`categoryShowcase.${id}.${field}`, fallback);

  const selectedCategory = useMemo(
    () => showcaseCategories.find((item) => item.id === selectedId) ?? showcaseCategories[0],
    [selectedId]
  );

  const selectedName = getCategoryText(selectedCategory.id, 'name', selectedCategory.id);
  const selectedDescription = getCategoryText(selectedCategory.id, 'description', '');
  const selectedLongDescription = getCategoryText(selectedCategory.id, 'longDescription', '');

  return (
    <section className="py-14 bg-background" dir="ltr">
      <div className="container grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
        <div className="relative overflow-hidden rounded-2xl border bg-card min-h-[320px]">
          <img
            src={selectedCategory.image}
            alt={selectedName}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/45 to-black/20" />
          <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-8 text-white">
            <div>
              <p className="text-[11px] tracking-[0.2em] uppercase text-white/80">{t('categoryShowcase.label')}</p>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold leading-tight">{selectedName}</h2>
              <p className="mt-2 text-sm text-white/85">{selectedDescription}</p>
              <p className="mt-3 max-w-lg text-sm text-white/90">
                {selectedLongDescription}
              </p>
            </div>

            <Link
              href={selectedCategory.href}
              className="mt-6 inline-flex w-fit items-center rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 transition"
            >
              {t('categoryShowcase.discover')}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-3 md:p-4">
          <div className="space-y-2">
            {showcaseCategories.map((item) => {
              const Icon = item.icon;
              const itemName = getCategoryText(item.id, 'name', item.id);
              const itemDescription = getCategoryText(item.id, 'description', '');
              const isActive = item.id === selectedCategory.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50/80 shadow-sm'
                      : 'border-border bg-background hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-white bg-gradient-to-r ${item.tone}`}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </span>

                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{itemName}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{itemDescription}</p>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="mt-2 inline-block text-[11px] font-semibold tracking-wide text-emerald-700">
                      {t('categoryShowcase.selected')}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

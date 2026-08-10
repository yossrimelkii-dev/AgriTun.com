'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { buttonVariants } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { useI18n } from '@/components/providers/locale-provider';

interface HeroSlide {
  _id: string;
  title: string;
  description?: string;
  kind: 'PRODUCT' | 'EVENT';
  imageUrl?: string;
  ctaLabel: string;
  linkUrl: string;
}

const AUTO_SCROLL_MS = 3600;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export function HeroSection() {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const thumbStripRef = useRef<HTMLDivElement | null>(null);

  const { data } = useQuery({
    queryKey: ['hero-slides'],
    queryFn: async () => {
      const res = await fetch('/api/hero-slides', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load hero slides');
      return res.json();
    },
  });

  const slides: HeroSlide[] = useMemo(() => data?.slides?.slice(0, 12) || [], [data]);
  const activeSlide = slides.length ? slides[mod(activeIndex, slides.length)] : undefined;

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => mod(current + 1, slides.length));
    }, AUTO_SCROLL_MS);

    return () => window.clearInterval(timer);
  }, [slides.length, isPaused]);

  useEffect(() => {
    const thumb = thumbRefs.current[activeIndex];
    const strip = thumbStripRef.current;
    if (!thumb || !strip) return;
    // Scroll only the horizontal strip — never the window/page.
    const target = thumb.offsetLeft - strip.clientWidth / 2 + thumb.offsetWidth / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [activeIndex]);

  if (!slides.length) {
    return (
      <section className="relative min-h-[58svh] overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 sm:min-h-[60svh] md:min-h-[62svh]">
        <div className="flex min-h-[58svh] w-full items-center px-0 py-6 sm:min-h-[60svh] md:min-h-[62svh] md:py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto flex w-full max-w-4xl flex-col justify-center rounded-3xl border bg-background/70 px-6 py-8 text-center shadow-xl backdrop-blur md:px-10 md:py-12"
          >
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              {t('hero.fallbackTitlePrefix')}{' '}
              <span className="text-primary">{t('hero.medical')}</span> &{' '}
              <span className="text-secondary">{t('hero.agricultural')}</span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('hero.fallbackDesc')}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/products" className={buttonVariants({ size: 'lg' })}>
                {t('hero.exploreProducts')}
              </Link>
              <Link href="/suppliers" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                {t('hero.becomeSupplier')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[58svh] overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 sm:min-h-[60svh] md:min-h-[62svh]">
      <div className="flex min-h-[58svh] w-full items-stretch px-0 py-0 sm:min-h-[60svh] md:min-h-[62svh]">
        <div
          className="relative flex w-full overflow-hidden rounded-none border-0 bg-card/70 shadow-2xl backdrop-blur md:rounded-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative min-h-[58svh] w-full sm:min-h-[60svh] md:min-h-[62svh]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeSlide?._id}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                className="absolute inset-0"
              >
                {activeSlide?.imageUrl ? (
                  <Image
                    src={activeSlide.imageUrl}
                    alt={activeSlide.title}
                    fill
                    priority={activeIndex === 0}
                    sizes="100vw"
                    className="object-cover object-[center_25%] sm:object-center"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/35 via-secondary/25 to-emerald-300/25" />
                )}
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/25" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.14),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.16),_transparent_36%)]" />

            <div className="relative z-10 flex min-h-[58svh] flex-col justify-between p-4 sm:p-6 md:p-8 sm:min-h-[60svh] md:min-h-[62svh]">
              <div className="max-w-4xl space-y-3 text-white md:space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
                    {activeSlide.kind === 'PRODUCT' ? t('hero.product') : t('hero.event')}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-black/20 px-3 py-1 backdrop-blur-sm">
                    {slides.length > 1 ? `${activeIndex + 1} / ${slides.length}` : '1 / 1'}
                  </span>
                </div>

                <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4 shadow-xl backdrop-blur-md md:space-y-3 md:max-w-3xl md:rounded-3xl md:p-5">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
                    {activeSlide.title}
                  </h1>
                  <p className="max-w-2xl text-xs leading-5 text-white/85 sm:text-sm md:text-base md:leading-6 line-clamp-3">
                    {activeSlide.description || t('hero.promoDefaultDesc')}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1 sm:gap-3 sm:pt-2">
                    <Link
                      href={activeSlide.linkUrl}
                      className={buttonVariants({
                        size: 'sm',
                        className: 'bg-white text-slate-900 hover:bg-white/90 sm:h-11 sm:px-5 sm:py-3 sm:text-base',
                      })}
                    >
                      {activeSlide.ctaLabel || t('hero.view')}
                    </Link>

                    <Link
                      href={activeSlide.kind === 'EVENT' ? '/events' : '/products'}
                      className={buttonVariants({
                        size: 'sm',
                        variant: 'outline',
                        className: 'border-white/40 bg-black/20 text-white hover:bg-white/15 sm:h-11 sm:px-5 sm:py-3 sm:text-base',
                      })}
                    >
                      {activeSlide.kind === 'EVENT' ? t('hero.event') : t('hero.exploreProducts')}
                    </Link>
                  </div>
                </div>
              </div>

              {slides.length > 1 ? (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="mb-2 flex flex-col items-center justify-center gap-1 text-center text-white/80 md:flex-row md:gap-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] md:text-xs">
                      {t('hero.promotionsTitle')}
                    </p>
                    <p className="hidden text-xs md:block">{t('hero.promotionsSubtitle')}</p>
                  </div>

                  <div
                    ref={thumbStripRef}
                    className="flex justify-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-3"
                  >
                    {slides.map((slide, index) => {
                      const isActive = index === activeIndex;

                      return (
                        <button
                          key={slide._id}
                          ref={(node) => {
                            thumbRefs.current[index] = node;
                          }}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          className={`group relative w-24 shrink-0 overflow-hidden rounded-xl border text-left transition-all duration-300 md:w-32 md:rounded-2xl ${
                            isActive
                              ? 'border-white/80 ring-2 ring-white/70 ring-offset-2 ring-offset-black/30'
                              : 'border-white/20 hover:border-white/50'
                          }`}
                          aria-current={isActive ? 'true' : 'false'}
                        >
                          <div className="relative h-14 md:h-16">
                            {slide.imageUrl ? (
                              <Image
                                src={slide.imageUrl}
                                alt={slide.title}
                                fill
                                sizes="(min-width: 768px) 128px, 96px"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-primary/35 via-secondary/25 to-emerald-300/25" />
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                            <div className="absolute left-2 right-2 bottom-2 space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/85">
                                <span className="inline-flex rounded-full bg-black/50 px-2 py-0.5 backdrop-blur-sm">
                                  {slide.kind === 'PRODUCT' ? t('hero.product') : t('hero.event')}
                                </span>
                                {isActive ? (
                                  <span className="inline-flex rounded-full bg-emerald-500 px-2 py-0.5 text-white shadow-sm">
                                    Actif
                                  </span>
                                ) : null}
                              </div>
                              <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                                {slide.title}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

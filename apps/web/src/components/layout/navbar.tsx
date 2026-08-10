'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/stores/cart';
import { useI18n } from '@/components/providers/locale-provider';
import { BrandLogo } from '@/components/layout/brand-logo';
import type { Locale } from '@/lib/i18n/config';
import {
  ChevronDown,
  Menu,
  X,
  MessageCircle,
  Search,
  LayoutDashboard,
  LogOut,
  ShoppingCart,
  ShoppingBag,
  Heart,
  UserCircle2,
  Settings2,
  Languages,
} from 'lucide-react';

interface MeUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  supplierId?: string;
}

export function Navbar() {
  const { t, locale, setLocale, dir } = useI18n();
  const itemCount = useCartStore((s) => s.getItemCount());
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  // Simple in-memory caches to avoid repeated fetches
  const suppliersCache = useRef<{ ts: number; data: any[] } | null>(null);
  const centersCache = useRef<{ ts: number; data: any[] } | null>(null);
  const specialistsCache = useRef<{ ts: number; data: any[] } | null>(null);
  const productsCache = useRef<{ ts: number; data: any[] } | null>(null);
  const eventsCache = useRef<{ ts: number; data: any[] } | null>(null);
  const formationsCache = useRef<{ ts: number; data: any[] } | null>(null);
  const [cacheReady, setCacheReady] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  const user: MeUser | null = data?.user ?? null;

  // Close dropdown on outside click and set mounted flag
  useEffect(() => {
    setIsMounted(true);
    
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    function handleScroll() {
      setIsScrolled(window.scrollY > 8);
    }

    handleScroll();
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    queryClient.setQueryData(['auth-me'], { user: null });
    setMenuOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  }

  const dashboardLink =
    user?.role === 'ADMIN' ? '/admin' :
    user?.role === 'SUPPLIER' || user?.role === 'SUPPLIER_PRIME' || user?.role === 'SUPER_SUPPLIER' || user?.role === 'TRAINING_CENTER' ? '/dashboard/overview' :
    user?.role === 'AGRI_ENGINEER' ? '/engineer/profile' :
    '/account';

  const getText = (...parts: Array<unknown>) =>
    parts
      .flatMap((part) => {
        if (typeof part === 'string') return [part];
        if (typeof part === 'number') return [String(part)];
        return [];
      })
      .join(' ')
      .toLowerCase();

  const cacheFetch = async (url: string, fallbackKey: string) => {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.[fallbackKey] || json?.items || json?.products || [];
  };

  useEffect(() => {
    let mounted = true;

    async function loadCaches() {
      try {
        const [suppliers, centers, specialists, products, events, formations] = await Promise.all([
          cacheFetch('/api/suppliers?limit=200', 'suppliers'),
          cacheFetch('/api/training-centers?limit=200', 'trainingCenters'),
          cacheFetch('/api/specialists?limit=200', 'specialists'),
          cacheFetch('/api/products?limit=300', 'items'),
          cacheFetch('/api/events?limit=200', 'events'),
          cacheFetch('/api/formations?limit=200', 'formations'),
        ]);

        if (!mounted) return;

        suppliersCache.current = { ts: Date.now(), data: suppliers };
        centersCache.current = { ts: Date.now(), data: centers };
        specialistsCache.current = { ts: Date.now(), data: specialists };
        productsCache.current = { ts: Date.now(), data: products };
        eventsCache.current = { ts: Date.now(), data: events };
        formationsCache.current = { ts: Date.now(), data: formations };
      } catch (error) {
        console.warn('Navbar cache prefetch failed, falling back to empty local search:', error);
      } finally {
        if (mounted) setCacheReady(true);
      }
    }

    loadCaches();

    return () => {
      mounted = false;
    };
  }, []);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    }

    router.push(`/products${params.toString() ? `?${params.toString()}` : ''}`);

  }

  const isRtl = dir === 'rtl';
  const primaryNavItems = [
    { href: '/events', label: t('navbar.events') },
    { href: '/formations', label: t('navbar.formations') },
    { href: '/suppliers', label: t('navbar.suppliers') },
    { href: '/specialists', label: t('navbar.specialists') },
    { href: '/training-centers', label: t('navbar.trainingCenters') },
  ];

  // Debounced multi-resource instant search for dropdown
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    const term = searchTerm.trim();
    let mounted = true;
    setSearchLoading(true);

    const id = setTimeout(async () => {
      try {
        const q = term.toLowerCase();
        if (!cacheReady) return;

        const suppliers = suppliersCache.current?.data ?? [];
        const centers = centersCache.current?.data ?? [];
        const specialists = specialistsCache.current?.data ?? [];
        const products = productsCache.current?.data ?? [];
        const events = eventsCache.current?.data ?? [];
        const formations = formationsCache.current?.data ?? [];

        const productHits = products.filter((p: any) => getText(p.name, p.title, p.slug, p.categoryName, p.supplierName, p.sector).includes(q)).slice(0, 6);
        const suppliersFiltered = suppliers.filter((s: any) => getText(s.companyName, s.description, s.sector).includes(q)).slice(0, 4);
        const centersFiltered = centers.filter((c: any) => getText(c.firstName, c.lastName, c.speciality, c.email).includes(q)).slice(0, 4);
        const specialistsFiltered = specialists.filter((sp: any) => getText(sp.profile?.firstName, sp.profile?.lastName, sp.profile?.speciality, sp.email).includes(q)).slice(0, 4);
        const eventsFiltered = events.filter((event: any) => getText(event.title, event.description, event.organizer, event.specialist?.firstName, event.specialist?.lastName).includes(q)).slice(0, 4);
        const formationsFiltered = formations.filter((formation: any) => getText(formation.title, formation.description, formation.organizer, formation.specialist?.firstName, formation.specialist?.lastName).includes(q)).slice(0, 4);

        if (!mounted) return;
        setSearchResults({ products: productHits, suppliers: suppliersFiltered, centers: centersFiltered, specialists: specialistsFiltered, events: eventsFiltered, formations: formationsFiltered });
      } catch (err) {
        console.error('Instant search error', err);
        setSearchResults({ products: [], suppliers: [], centers: [], specialists: [], events: [], formations: [] });
      } finally {
        if (mounted) setSearchLoading(false);
      }
    }, 220);

    return () => {
      mounted = false;
      clearTimeout(id);
    };
  }, [searchTerm, cacheReady]);

  // Keyboard navigation for instant search
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [flatItems, setFlatItems] = useState<Array<{ href: string; label: string }>>([]);

  useEffect(() => {
    if (!searchResults) {
      setFlatItems([]);
      setActiveIndex(null);
      return;
    }
    const items: Array<{ href: string; label: string }> = [];
    (searchResults.products || []).forEach((p: any) => items.push({ href: `/products/${p.slug || p.id || ''}`, label: p._formatted?.name || p.name || p.title }));
    (searchResults.suppliers || []).forEach((s: any) => items.push({ href: `/suppliers/${s.slug || s._id}`, label: s.companyName }));
    (searchResults.centers || []).forEach((c: any) => items.push({ href: `/training-centers/${c.id}`, label: `${c.firstName} ${c.lastName}` }));
    (searchResults.specialists || []).forEach((sp: any) => items.push({ href: `/specialists/${sp._id || sp.id}`, label: `${sp.profile?.firstName || ''} ${sp.profile?.lastName || ''}` }));
    (searchResults.events || []).forEach((event: any) => items.push({ href: `/events/${event._id}`, label: event.title }));
    (searchResults.formations || []).forEach((formation: any) => items.push({ href: `/formations/${formation._id}`, label: formation.title }));
    setFlatItems(items);
    setActiveIndex(items.length ? 0 : null);
  }, [searchResults]);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!flatItems.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i === null ? 0 : Math.min(flatItems.length - 1, i + 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i === null ? 0 : Math.max(0, i - 1)));
    } else if (e.key === 'Enter') {
      if (activeIndex !== null && flatItems[activeIndex]) {
        router.push(flatItems[activeIndex].href);
        setSearchFocused(false);
        setSearchResults(null);
      }
    } else if (e.key === 'Escape') {
      setSearchFocused(false);
      setSearchResults(null);
    }
  }

  function handleSelectSearchResult(href: string) {
    setSearchFocused(false);
    setSearchResults(null);
    router.push(href);
  }

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 ${isScrolled ? 'bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/45' : 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'}`}>
      <div className="container flex h-16 items-center gap-3 lg:gap-4">
        {/* Logo */}
        <BrandLogo
          href="/"
          className={`shrink-0 ${isRtl ? 'md:mr-3 lg:mr-5 xl:mr-7' : 'md:-ml-10 lg:-ml-16 xl:-ml-20'}`}
          imageClassName="h-24 w-24 sm:h-28 sm:w-28"
        />

        {/* Large Search / Filter Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className={`group hidden md:flex ${searchFocused ? 'md:flex-1 md:mx-2 lg:mx-3' : 'md:flex-1 md:max-w-3xl md:mx-2 lg:mx-4'} items-center gap-2 rounded-[2.25rem] border border-white/40 px-2.5 py-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur-md supports-[backdrop-filter]:bg-background/50 transition-all duration-300 ease-out ${isScrolled ? 'bg-background/25' : 'bg-background/55'} focus-within:border-emerald-300/70 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.10)] focus-within:bg-background/75`}
        >
          <div className="relative flex-1 min-w-0">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors duration-300 group-focus-within:text-emerald-600 ${isRtl ? 'right-3' : 'left-3'}`} strokeWidth={1.8} />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('navbar.searchPlaceholder')}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              onKeyDown={handleInputKeyDown}
              className={`h-9 border-0 shadow-none bg-transparent placeholder:text-muted-foreground/90 focus-visible:ring-0 transition-all duration-300 ${isRtl ? 'pr-9' : 'pl-9'}`}
            />

            {/* Instant search dropdown */}
            {searchFocused && searchTerm && (
              <div className="absolute left-0 right-0 mt-2 z-50 rounded-xl border bg-background shadow-lg overflow-hidden">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">{searchLoading ? t('navbar.searching') : t('navbar.searchResults')}</div>
                    <div className="text-xs text-muted-foreground">{searchTerm ? `"${searchTerm}"` : ''}</div>
                  </div>

                  {searchLoading && (
                    <div className="py-6 text-center text-sm">{t('navbar.searching')}</div>
                  )}

                  {!searchLoading && searchResults && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(() => {
                        let cursor = 0;
                        const nextIndex = () => cursor++;

                        return (
                          <>
                            <div>
                              <h4 className="text-xs font-semibold mb-2">Produits</h4>
                              <div className="space-y-1">
                                {searchResults.products?.length ? (
                                  searchResults.products.map((p: any) => {
                                    const index = nextIndex();
                                    return (
                                      <Link
                                        key={p.id || p._id || p.objectID || p.slug}
                                        href={`/products/${p.slug || p.id || ''}`}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelectSearchResult(`/products/${p.slug || p.id || ''}`)}
                                        className={`block px-2 py-1 rounded hover:bg-muted transition-colors text-sm ${activeIndex === index ? 'bg-muted' : ''}`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">🧪</div>
                                          <div className="flex-1">
                                            <div className="font-medium line-clamp-1" dangerouslySetInnerHTML={{ __html: p._formatted?.name || p.name || p.title }} />
                                            <div className="text-xs text-muted-foreground">{p.supplierName || p.supplier || ''}</div>
                                          </div>
                                        </div>
                                      </Link>
                                    );
                                  })
                                ) : (
                                  <div className="text-sm text-muted-foreground">Aucun produit</div>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold mb-2">Fournisseurs / Centres / Spécialistes</h4>
                              <div className="space-y-1">
                                {(searchResults.suppliers?.length || 0) > 0 && searchResults.suppliers.map((s: any) => {
                                  const index = nextIndex();
                                  return (
                                    <Link
                                      key={s.slug || s._id}
                                      href={`/suppliers/${s.slug || s._id}`}
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleSelectSearchResult(`/suppliers/${s.slug || s._id}`)}
                                      className={`block px-2 py-1 rounded hover:bg-muted transition-colors text-sm ${activeIndex === index ? 'bg-muted' : ''}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">🏬</div>
                                        <div className="flex-1">
                                          <div className="font-medium">{s.companyName}</div>
                                          <div className="text-xs text-muted-foreground">{s.sector || ''}</div>
                                        </div>
                                      </div>
                                    </Link>
                                  );
                                })}

                                {(searchResults.centers?.length || 0) > 0 && searchResults.centers.map((c: any) => {
                                  const index = nextIndex();
                                  return (
                                    <Link
                                      key={c.id}
                                      href={`/training-centers/${c.id}`}
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleSelectSearchResult(`/training-centers/${c.id}`)}
                                      className={`block px-2 py-1 rounded hover:bg-muted transition-colors text-sm ${activeIndex === index ? 'bg-muted' : ''}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">🏫</div>
                                        <div className="flex-1">
                                          <div className="font-medium">{`${c.firstName} ${c.lastName}`}</div>
                                          <div className="text-xs text-muted-foreground">{c.speciality}</div>
                                        </div>
                                      </div>
                                    </Link>
                                  );
                                })}

                                {(searchResults.specialists?.length || 0) > 0 && searchResults.specialists.map((sp: any) => {
                                  const index = nextIndex();
                                  return (
                                    <Link
                                      key={sp._id || sp.id}
                                      href={`/specialists/${sp._id || sp.id}`}
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleSelectSearchResult(`/specialists/${sp._id || sp.id}`)}
                                      className={`block px-2 py-1 rounded hover:bg-muted transition-colors text-sm ${activeIndex === index ? 'bg-muted' : ''}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">👨‍🌾</div>
                                        <div className="flex-1">
                                          <div className="font-medium">{`${sp.profile?.firstName || ''} ${sp.profile?.lastName || ''}`.trim()}</div>
                                          <div className="text-xs text-muted-foreground">{sp.profile?.speciality || ''}</div>
                                        </div>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold mb-2">Événements / Formations</h4>
                              <div className="space-y-1">
                                {(searchResults.events?.length || 0) > 0 && searchResults.events.map((event: any) => {
                                  const index = nextIndex();
                                  return (
                                    <Link
                                      key={event._id}
                                      href={`/events/${event._id}`}
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleSelectSearchResult(`/events/${event._id}`)}
                                      className={`block px-2 py-1 rounded hover:bg-muted transition-colors text-sm ${activeIndex === index ? 'bg-muted' : ''}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">📅</div>
                                        <div className="flex-1">
                                          <div className="font-medium line-clamp-1">{event.title}</div>
                                          <div className="text-xs text-muted-foreground">{event.organizer || ''}</div>
                                        </div>
                                      </div>
                                    </Link>
                                  );
                                })}

                                {(searchResults.formations?.length || 0) > 0 && searchResults.formations.map((formation: any) => {
                                  const index = nextIndex();
                                  return (
                                    <Link
                                      key={formation._id}
                                      href={`/formations/${formation._id}`}
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleSelectSearchResult(`/formations/${formation._id}`)}
                                      className={`block px-2 py-1 rounded hover:bg-muted transition-colors text-sm ${activeIndex === index ? 'bg-muted' : ''}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">🎓</div>
                                        <div className="flex-1">
                                          <div className="font-medium line-clamp-1">{formation.title}</div>
                                          <div className="text-xs text-muted-foreground">{formation.organizer || ''}</div>
                                        </div>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div className="mt-3 text-right">
                    <Link href={`/search?q=${encodeURIComponent(searchTerm)}`} className="text-sm text-primary font-medium">Voir tous les résultats</Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="outline"
            className="h-9 rounded-3xl px-4 border-slate-200/80 bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-emerald-300 hover:shadow-sm active:scale-[0.98] transition-all duration-300 ease-out"
          >
            {t('navbar.searchButton')}
          </Button>
        </form>

        {/* Actions */}
        <div className={`ms-auto hidden shrink-0 items-center md:flex ${searchFocused ? 'w-[260px] gap-1' : 'gap-2 lg:gap-3'}`}>
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" strokeWidth={1.8} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </Button>

          <div className={`hidden sm:flex items-center gap-2 transition-all duration-300 ${searchFocused ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/events">{t('navbar.events')}</Link>
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/formations">{t('navbar.formations')}</Link>
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/suppliers">{t('navbar.suppliers')}</Link>
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/specialists">{t('navbar.specialists')}</Link>
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/training-centers">{t('navbar.trainingCenters')}</Link>
            </Button>
          </div>

          <div className={`${searchFocused ? 'flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-300 ml-2' : 'hidden sm:flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-300'}`}>
            <Languages className="h-4 w-4 text-muted-foreground" />
            <select
              aria-label={t('navbar.language')}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="bg-transparent text-sm outline-none"
            >
              <option value="fr">FR</option>
              <option value="en">EN</option>
              <option value="ar">AR</option>
            </select>
          </div>

          {isMounted && user ? (
            <Button variant="ghost" size="icon" asChild className={`${searchFocused ? 'inline-flex transition-all duration-300' : 'hidden sm:inline-flex transition-all duration-300'}`}>
              <Link href="/messages" aria-label="Messages">
                <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
              </Link>
            </Button>
          ) : null}

          {isMounted && user ? (
            <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                  <span className={`hidden sm:inline font-medium transition-opacity duration-300 ${searchFocused ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{user.firstName}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                </button>

              {menuOpen && (
                <div className={`absolute mt-2 w-56 rounded-lg border bg-background shadow-lg py-1 z-50 ${isRtl ? 'left-0' : 'right-0'}`}>
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {user.role}
                    </span>
                  </div>
                  <Link
                    href={dashboardLink}
                    className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      {user.role === 'SUPPLIER' || user.role === 'SUPPLIER_PRIME' || user.role === 'SUPER_SUPPLIER' || user.role === 'TRAINING_CENTER' ? (
                        <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />
                      ) : user.role === 'ADMIN' ? (
                        <Settings2 className="h-4 w-4" strokeWidth={1.8} />
                      ) : (
                        <UserCircle2 className="h-4 w-4" strokeWidth={1.8} />
                      )}
                      {user.role === 'AGRI_ENGINEER'
                        ? t('navbar.engineerProfile')
                        : user.role === 'SUPPLIER' || user.role === 'SUPPLIER_PRIME' || user.role === 'SUPER_SUPPLIER' || user.role === 'TRAINING_CENTER'
                        ? 'Dashboard'
                        : t('navbar.myAccount')}
                    </span>
                  </Link>
                  {user.role === 'AGRI_ENGINEER' && (
                    <Link href="/engineer/dashboard" className="block px-4 py-2 text-sm hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>
                      <span className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />
                        {t('navbar.engineerDashboard')}
                      </span>
                    </Link>
                  )}
                  {user.role === 'BUYER' && (
                    <>
                      <Link href="/account/orders" className="block px-4 py-2 text-sm hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>
                        <span className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
                          {t('navbar.myOrders')}
                        </span>
                      </Link>
                      <Link href="/account/wishlist" className="block px-4 py-2 text-sm hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>
                        <span className="flex items-center gap-2">
                          <Heart className="h-4 w-4" strokeWidth={1.8} />
                          {t('navbar.favorites')}
                        </span>
                      </Link>
                    </>
                  )}
                  <div className="border-t my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" strokeWidth={1.8} />
                      {t('navbar.logout')}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : isMounted ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">{t('navbar.login')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">{t('navbar.register')}</Link>
              </Button>
            </>
          ) : null}
        </div>

        {/* Mobile menu button */}
        <div className="relative ml-auto flex shrink-0 items-center md:hidden" ref={mobileMenuRef}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="h-10 w-10"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {mobileMenuOpen ? (
            <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} top-12 z-50 w-[min(92vw,22rem)] rounded-2xl border bg-white p-4 shadow-2xl`}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {primaryNavItems.map((item) => (
                    <Button key={item.href} variant="outline" className="justify-start" asChild>
                      <Link href={item.href} onClick={() => setMobileMenuOpen(false)}>
                        {item.label}
                      </Link>
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2 rounded-full border px-3 py-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <select
                    aria-label={t('navbar.language')}
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as Locale)}
                    className="w-full bg-transparent text-sm outline-none"
                  >
                    <option value="fr">FR</option>
                    <option value="en">EN</option>
                    <option value="ar">AR</option>
                  </select>
                </div>

                {isMounted && user ? (
                  <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" className="justify-start" asChild>
                      <Link href="/messages" onClick={() => setMobileMenuOpen(false)}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Messages
                      </Link>
                    </Button>
                    <Button variant="outline" className="justify-start" asChild>
                      <Link href={dashboardLink} onClick={() => setMobileMenuOpen(false)}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {user.role === 'AGRI_ENGINEER'
                          ? t('navbar.engineerProfile')
                          : user.role === 'SUPPLIER' || user.role === 'SUPPLIER_PRIME' || user.role === 'SUPER_SUPPLIER' || user.role === 'TRAINING_CENTER'
                          ? 'Dashboard'
                          : t('navbar.myAccount')}
                      </Link>
                    </Button>
                    <Button variant="secondary" className="justify-start" asChild>
                      <Link href="/cart" onClick={() => setMobileMenuOpen(false)}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Cart {itemCount > 0 ? `(${itemCount})` : ''}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" asChild>
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)}>{t('navbar.login')}</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/register" onClick={() => setMobileMenuOpen(false)}>{t('navbar.register')}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

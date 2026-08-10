'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProductCard } from '@/components/products/product-card';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useI18n } from '@/components/providers/locale-provider';

interface SupplierEvent {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  eventDate: string;
  organizer: string;
  allowParticipation: boolean;
  stats?: { participants?: number };
}

export default function SupplierProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const coverMapRef = useRef<HTMLDivElement | null>(null);
  const coverMapInstanceRef = useRef<any>(null);
  const coverMarkerRef = useRef<any>(null);
  const coverInfoWindowRef = useRef<any>(null);
  const [coverMapError, setCoverMapError] = useState(false);
  const popupMapRef = useRef<HTMLDivElement | null>(null);
  const popupMapInstanceRef = useRef<any>(null);
  const popupMarkerRef = useRef<any>(null);
  const popupInfoWindowRef = useRef<any>(null);
  const [popupMapError, setPopupMapError] = useState(false);

  const normalizePhone = (value?: string) => (value || '').replace(/[^\d+]/g, '');
  const buildWhatsAppHref = (value?: string) => {
    const digits = normalizePhone(value).replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : null;
  };
  const buildEmailHref = (value?: string) => {
    if (!value) return null;
    const subject = encodeURIComponent(`Message from TunAgri - ${supplier?.companyName || ''}`);
    const body = encodeURIComponent(`Hello ${supplier?.companyName || ''},\n\nI would like to contact you through TunAgri.`);
    return `mailto:${value}?subject=${subject}&body=${body}`;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['supplier', slug],
    queryFn: async () => {
      const res = await fetch(`/api/suppliers/${slug}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  const supplier = data?.supplier;
  const products = data?.products || [];
  const events: SupplierEvent[] = data?.events || [];
  const [isMapPreviewOpen, setIsMapPreviewOpen] = useState(false);

  const hq = supplier?.addresses?.find((a: any) => a.isHeadquarters) || supplier?.addresses?.[0];
  const coverImage = supplier?.coverImage || supplier?.banner || supplier?.bannerImage || supplier?.heroImage || supplier?.logo || '';
  const logoImage = supplier?.logo || '';
  const whatsappNumber = supplier?.socialLinks?.whatsapp || '';
  const contactEmail = supplier?.socialLinks?.email || supplier?.socialLinks?.contactEmail || supplier?.contactEmail || supplier?.email || '';
  const whatsappHref = buildWhatsAppHref(whatsappNumber);
  const emailHref = buildEmailHref(contactEmail);
  const location = supplier?.settings?.location;
  const hasLocation = typeof location?.lat === 'number' && typeof location?.lng === 'number';
  const mapOpenUrl = hasLocation
    ? `https://maps.google.com/?q=${encodeURIComponent(`${location.lat},${location.lng}`)}`
    : null;
  const mapDirectionsUrl = hasLocation
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${location.lat},${location.lng}`)}&travelmode=driving`
    : null;
  const safeSupplierName = (supplier?.companyName || 'Store')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const markerTitle = `${supplier?.companyName || 'Store'} — ${t('supplierDetail.pointOfSaleLocation')}`;
  const markerInfoWindowHtml = `
    <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
      ${logoImage
        ? `<img src="${logoImage}" alt="${safeSupplierName}" style="width:30px;height:30px;border-radius:9999px;object-fit:cover;border:1px solid #e5e7eb;" />`
        : '<div style="width:30px;height:30px;border-radius:9999px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;border:1px solid #d1fae5;">🏬</div>'}
      <div>
        <div style="font-weight:700;line-height:1.2;">${safeSupplierName}</div>
        <div style="line-height:1.2;color:#4b5563;">🏪 ${t('supplierDetail.pointOfSaleLocation')}</div>
      </div>
    </div>
  `;

  useEffect(() => {
    if (!hasLocation) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setCoverMapError(true);
      return;
    }

    const ensureCoverMap = () => {
      if (!(window as any).google?.maps || !coverMapRef.current) return;

      const lat = Number(location?.lat);
      const lng = Number(location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setCoverMapError(true);
        return;
      }

      const center = { lat, lng };

      if (!coverMapInstanceRef.current) {
        coverMapInstanceRef.current = new (window as any).google.maps.Map(coverMapRef.current, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'none',
          disableDoubleClickZoom: true,
          draggable: false,
          scrollwheel: false,
          keyboardShortcuts: false,
          clickableIcons: false,
        });
      } else {
        coverMapInstanceRef.current.setCenter(center);
        coverMapInstanceRef.current.setZoom(16);
      }

      const markerIcon = logoImage
        ? {
            url: logoImage,
            scaledSize: new (window as any).google.maps.Size(44, 44),
          }
        : undefined;

      if (!coverMarkerRef.current) {
        coverMarkerRef.current = new (window as any).google.maps.Marker({
          position: center,
          map: coverMapInstanceRef.current,
          title: markerTitle,
          icon: markerIcon,
        });
      } else {
        coverMarkerRef.current.setMap(coverMapInstanceRef.current);
        coverMarkerRef.current.setPosition(center);
        coverMarkerRef.current.setTitle(markerTitle);
        if (markerIcon) {
          coverMarkerRef.current.setIcon(markerIcon);
        }
      }

      if (!coverInfoWindowRef.current) {
        coverInfoWindowRef.current = new (window as any).google.maps.InfoWindow({
          content: markerInfoWindowHtml,
        });
      } else {
        coverInfoWindowRef.current.setContent(markerInfoWindowHtml);
      }

      coverInfoWindowRef.current.open({
        map: coverMapInstanceRef.current,
        anchor: coverMarkerRef.current,
      });

      (window as any).google.maps.event.clearInstanceListeners(coverMapInstanceRef.current);
      (window as any).google.maps.event.clearInstanceListeners(coverMarkerRef.current);

      coverMapInstanceRef.current.addListener('click', () => setIsMapPreviewOpen(true));
      coverMarkerRef.current.addListener('click', () => {
        coverInfoWindowRef.current?.open({
          map: coverMapInstanceRef.current,
          anchor: coverMarkerRef.current,
        });
        setIsMapPreviewOpen(true);
      });

      setCoverMapError(false);
    };

    if ((window as any).google?.maps) {
      ensureCoverMap();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="supplier-maps-sdk"]');

    if (existing) {
      existing.addEventListener('load', ensureCoverMap);
      existing.addEventListener('error', () => setCoverMapError(true));
      return () => {
        existing.removeEventListener('load', ensureCoverMap);
      };
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'supplier-maps-sdk';
    script.onload = ensureCoverMap;
    script.onerror = () => setCoverMapError(true);
    document.head.appendChild(script);
  }, [hasLocation, location?.lat, location?.lng, logoImage, markerInfoWindowHtml, markerTitle]);

  useEffect(() => {
    if (!isMapPreviewOpen || !hasLocation) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setPopupMapError(true);
      return;
    }

    const ensureMap = () => {
      if (!(window as any).google?.maps || !popupMapRef.current) return;

      const lat = Number(location?.lat);
      const lng = Number(location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setPopupMapError(true);
        return;
      }

      const center = { lat, lng };

      if (!popupMapInstanceRef.current) {
        popupMapInstanceRef.current = new (window as any).google.maps.Map(popupMapRef.current, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
      } else {
        popupMapInstanceRef.current.setCenter(center);
        popupMapInstanceRef.current.setZoom(16);
      }

      const markerIcon = logoImage
        ? {
            url: logoImage,
            scaledSize: new (window as any).google.maps.Size(44, 44),
          }
        : undefined;

      if (!popupMarkerRef.current) {
        popupMarkerRef.current = new (window as any).google.maps.Marker({
          position: center,
          map: popupMapInstanceRef.current,
          title: markerTitle,
          icon: markerIcon,
        });
      } else {
        popupMarkerRef.current.setMap(popupMapInstanceRef.current);
        popupMarkerRef.current.setPosition(center);
        popupMarkerRef.current.setTitle(markerTitle);
        if (markerIcon) popupMarkerRef.current.setIcon(markerIcon);
      }

      if (!popupInfoWindowRef.current) {
        popupInfoWindowRef.current = new (window as any).google.maps.InfoWindow({
          content: markerInfoWindowHtml,
        });
      } else {
        popupInfoWindowRef.current.setContent(markerInfoWindowHtml);
      }

      popupInfoWindowRef.current.open({
        map: popupMapInstanceRef.current,
        anchor: popupMarkerRef.current,
      });

      popupMarkerRef.current.addListener('click', () => {
        popupInfoWindowRef.current?.open({
          map: popupMapInstanceRef.current,
          anchor: popupMarkerRef.current,
        });
      });

      setPopupMapError(false);
    };

    if ((window as any).google?.maps) {
      ensureMap();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="supplier-maps-sdk"]');

    if (existing) {
      existing.addEventListener('load', ensureMap);
      existing.addEventListener('error', () => setPopupMapError(true));
      return () => {
        existing.removeEventListener('load', ensureMap);
      };
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'supplier-maps-sdk';
    script.onload = ensureMap;
    script.onerror = () => setPopupMapError(true);
    document.head.appendChild(script);
  }, [hasLocation, isMapPreviewOpen, location?.lat, location?.lng, logoImage, markerInfoWindowHtml, markerTitle]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
          <div className="h-48 bg-muted animate-pulse rounded-lg mb-8" />
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </main>
      </>
    );
  }

  if (error || !supplier) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-20 text-center min-h-screen">
          <h1 className="text-2xl font-bold mb-4">{t('supplierDetail.notFoundTitle')}</h1>
          <p className="text-muted-foreground">{t('supplierDetail.notFoundDescription')}</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        {/* Supplier Header */}
        <div className="relative overflow-hidden rounded-3xl mb-10 bg-slate-100 border border-border shadow-sm">
          <div
            className={`h-52 sm:h-64 bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-500 relative ${hasLocation ? 'cursor-zoom-in' : ''}`}
            onClick={() => {
              if (hasLocation) setIsMapPreviewOpen(true);
            }}
            role={hasLocation ? 'button' : undefined}
            aria-label={hasLocation ? 'Open location map preview' : undefined}
            title={hasLocation ? 'Click to preview map location' : undefined}
          >
            {hasLocation ? (
              <>
                <div ref={coverMapRef} className="h-full w-full" />
                {coverMapError && (
                  <div className="absolute inset-0 grid place-items-center bg-black/35 text-white text-sm text-center px-4">
                    Unable to load map preview.
                  </div>
                )}
                <span className="absolute top-3 left-3 text-[11px] bg-emerald-600/95 text-white px-2.5 py-1 rounded-full border border-emerald-500 shadow-sm">
                  📍 {supplier.companyName} — {t('supplierDetail.pointOfSaleLocation')}
                </span>
                {mapOpenUrl && (
                  <a
                    href={mapOpenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-3 right-3 text-[11px] bg-white/95 hover:bg-white text-slate-800 px-2.5 py-1 rounded-full border shadow-sm"
                  >
                    {t('supplierDetail.openInMap')}
                  </a>
                )}
              </>
            ) : coverImage ? (
              <img
                src={coverImage}
                alt={supplier.companyName}
                className="h-full w-full object-cover opacity-75 mix-blend-overlay"
              />
            ) : null}
          </div>

          <div className="px-6 sm:px-8 pb-8 -mt-12 sm:-mt-16 relative">
            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
              <div className="relative shrink-0">
                <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-3xl border-4 border-white bg-white shadow-xl overflow-hidden flex items-center justify-center">
                  {logoImage ? (
                    <img src={logoImage} alt={supplier.companyName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-5xl">{supplier.sector === 'MEDICAL' ? '🏥' : '🌾'}</div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 rounded-full bg-white shadow-md px-2.5 py-1 text-[11px] font-semibold text-muted-foreground border">
                  {supplier.isVerified ? t('supplierDetail.verifiedBadge') : t('supplierDetail.pendingBadge')}
                </div>
              </div>

              <div className="flex-1 lg:pb-2">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{supplier.companyName}</h1>
                  {supplier.isVerified && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      {t('supplierDetail.verifiedBadge')}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mb-3">
                  {supplier.sector === 'MEDICAL' ? t('supplierDetail.medicalSector') : t('supplierDetail.agriculturalSector')}
                  {hq ? ` • ${hq.city}, ${hq.wilaya}` : ''}
                </p>
                {supplier.description && <p className="text-sm max-w-3xl leading-6">{supplier.description}</p>}

                <div className="mt-5 flex flex-wrap gap-3">
                  {supplier.socialLinks?.phone && (
                    <a
                      href={`tel:${normalizePhone(supplier.socialLinks.phone)}`}
                      className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted transition-colors"
                    >
                      📞 {supplier.socialLinks.phone}
                    </a>
                  )}
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-green-100 transition-colors"
                    >
                      💬 {whatsappNumber}
                    </a>
                  )}
                  {emailHref && (
                    <a
                      href={emailHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100 transition-colors"
                    >
                      ✉️ {contactEmail}
                    </a>
                  )}
                </div>
              </div>
            </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-8">
            {[
              { label: t('supplierDetail.statsProducts'), value: supplier.stats?.totalProducts ?? products.length },
              { label: t('supplierDetail.statsOrders'), value: supplier.stats?.totalOrders ?? 0 },
              { label: t('supplierDetail.statsAverageRating'), value: `⭐ ${supplier.stats?.averageRating?.toFixed(1) || t('supplierDetail.notAvailable')}` },
              { label: t('supplierDetail.statsReviews'), value: supplier.stats?.totalReviews ?? 0 },
              { label: t('supplierDetail.statsResponseRate'), value: `${supplier.stats?.responseRate ?? 0}%` },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-white/70 rounded-2xl p-4 border border-white/60 shadow-sm backdrop-blur-sm">
                <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Certifications */}
        {supplier.certifications?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-3">{t('supplierDetail.certifications')}</h2>
            <div className="flex gap-3">
              {supplier.certifications.map((cert: any, i: number) => (
                <span
                  key={i}
                  className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full"
                >
                  🏅 {cert.name} — {cert.issuer} ({cert.year})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Events */}
        <div className="mb-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{t('supplierDetail.eventsHeading')} ({events.length})</h2>
              <p className="text-sm text-muted-foreground">{t('supplierDetail.eventsSubtitle')}</p>
            </div>
          </div>

          {events.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center border rounded-2xl bg-muted/20">
              {t('supplierDetail.noEvents')}
            </p>
          ) : (
            <div className={events.length === 1 ? 'w-full' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'}>
              {events.map((event) => (
                <article
                  key={event._id}
                  className={`group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    events.length === 1 ? 'relative lg:grid lg:grid-cols-[1.35fr_1fr] lg:min-h-[480px]' : ''
                  }`}
                >
                  <div className={`relative overflow-hidden bg-muted ${events.length === 1 ? 'h-72 lg:h-full' : 'h-44'}`}>
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-lime-400/20" />
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
                      {new Date(event.eventDate).toLocaleDateString()}
                    </div>
                    {events.length === 1 && (
                      <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm backdrop-blur-sm">
                        ✨ Featured event
                      </div>
                    )}
                  </div>

                  <div className={`space-y-3 ${events.length === 1 ? 'p-6 sm:p-8 lg:flex lg:flex-col lg:justify-center lg:pr-36' : 'p-4'}`}>
                    <h3 className={`font-semibold ${events.length === 1 ? 'text-3xl sm:text-4xl leading-tight' : 'text-base sm:text-lg line-clamp-1'}`}>
                      {event.title}
                    </h3>
                    <p className={`text-sm text-muted-foreground ${events.length === 1 ? 'max-w-2xl text-base sm:text-lg leading-7 line-clamp-5' : 'line-clamp-2'}`}>
                      {event.description || t('supplierDetail.eventFallbackDescription')}
                    </p>

                    <div className={`space-y-1 text-xs text-muted-foreground ${events.length === 1 ? 'text-sm sm:text-base' : ''}`}>
                      <p>🏢 {event.organizer}</p>
                      <p>👥 {event.stats?.participants || 0} {t('supplierDetail.eventParticipants')}</p>
                    </div>

                    <div className={`pt-1 flex ${events.length === 1 ? 'justify-end lg:absolute lg:bottom-6 lg:right-6 lg:pt-0' : 'justify-end'}`}>
                      <Link
                        href={`/events/${event._id}`}
                        className={`inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 ${
                          events.length === 1 ? 'px-5 py-3 text-sm sm:text-base shadow-sm' : ''
                        }`}
                      >
                        {t('supplierDetail.viewEvent')} →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Products */}
        <div>
          <h2 className="text-xl font-bold mb-4">
            {t('supplierDetail.productsHeading')} ({products.length})
          </h2>
          {products.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              {t('supplierDetail.noProducts')}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product: any) => (
                <ProductCard key={product._id} product={product} showWholesalePrice={false} />
              ))}
            </div>
          )}
        </div>

        {isMapPreviewOpen && hasLocation && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] p-4 sm:p-8"
            onClick={() => setIsMapPreviewOpen(false)}
          >
            <div
              className="max-w-5xl mx-auto bg-white rounded-2xl border shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h3 className="text-sm sm:text-base font-semibold">
                  📍 {supplier.companyName} — {t('supplierDetail.pointOfSaleLocation')}
                </h3>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded border bg-white hover:bg-muted"
                  onClick={() => setIsMapPreviewOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="relative">
                <div ref={popupMapRef} className="w-full h-[60vh]" />
                {popupMapError && (
                  <div className="absolute inset-0 grid place-items-center bg-black/35 text-white text-sm text-center px-4">
                    Unable to load interactive map preview.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 items-center justify-end px-4 py-3 border-t bg-muted/20">
                {mapOpenUrl && (
                  <a
                    href={mapOpenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-muted"
                  >
                    {t('supplierDetail.openInMap')}
                  </a>
                )}
                {mapDirectionsUrl && (
                  <a
                    href={mapDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                  >
                    Get directions
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

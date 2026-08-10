"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FormationsList from './formations-list';

interface SpecialistProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  speciality: string;
  avatarUrl: string;
  bio: string;
  workSummary: string;
  cvUrl: string;
  location?: {
    lat?: number;
    lng?: number;
    label?: string;
  } | null;
  stats: {
    totalHandled: number;
    resolvedCount: number;
    totalFeedbacks: number;
    averageRating: number;
  };
}

interface WorkItem {
  id: string;
  title: string;
  speciality: string;
  engineerRecommendation: string;
  status: string;
  rating: number | null;
  updatedAt: string;
}

export default function SpecialistProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const popupMapRef = useRef<HTMLDivElement | null>(null);
  const popupMapInstanceRef = useRef<any>(null);
  const popupMarkerRef = useRef<any>(null);
  const popupInfoWindowRef = useRef<any>(null);
  const [mapError, setMapError] = useState(false);
  const [popupMapError, setPopupMapError] = useState(false);
  const [isMapPreviewOpen, setIsMapPreviewOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['specialist', id],
    queryFn: async () => {
      const res = await fetch(`/api/specialists/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: Boolean(id),
  });

  const specialist: SpecialistProfile | undefined = data?.specialist;
  const recentWorks: WorkItem[] = data?.recentWorks ?? [];
  const hasLocation = typeof specialist?.location?.lat === 'number' && typeof specialist?.location?.lng === 'number';
  const specialistName = `${specialist?.firstName || 'Specialist'} ${specialist?.lastName || ''}`.trim();

  useEffect(() => {
    if (!hasLocation || !mapRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError(true);
      return;
    }

    const ensureMap = () => {
      if (!(window as any).google?.maps || !mapRef.current) return;

      const lat = Number(specialist?.location?.lat);
      const lng = Number(specialist?.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setMapError(true);
        return;
      }

      const center = { lat, lng };

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new (window as any).google.maps.Map(mapRef.current, {
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
        mapInstanceRef.current.setCenter(center);
        mapInstanceRef.current.setZoom(16);
      }

      if (!markerRef.current) {
        markerRef.current = new (window as any).google.maps.Marker({
          position: center,
          map: mapInstanceRef.current,
          title: specialistName,
        });
      } else {
        markerRef.current.setMap(mapInstanceRef.current);
        markerRef.current.setPosition(center);
        markerRef.current.setTitle(specialistName);
      }

      const infoHtml = `
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
          <div style="width:30px;height:30px;border-radius:9999px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;border:1px solid #d1fae5;">👨‍🌾</div>
          <div>
            <div style="font-weight:700;line-height:1.2;">${specialistName}</div>
            <div style="line-height:1.2;color:#4b5563;">📍 ${specialist?.location?.label || specialist?.speciality || 'Spécialiste'}</div>
          </div>
        </div>
      `;

      if (!infoWindowRef.current) {
        infoWindowRef.current = new (window as any).google.maps.InfoWindow({ content: infoHtml });
      } else {
        infoWindowRef.current.setContent(infoHtml);
      }

      infoWindowRef.current.open({ map: mapInstanceRef.current, anchor: markerRef.current });
      setMapError(false);
    };

    if ((window as any).google?.maps) {
      ensureMap();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="specialist-maps-sdk"]');
    if (existing) {
      existing.addEventListener('load', ensureMap);
      existing.addEventListener('error', () => setMapError(true));
      return () => existing.removeEventListener('load', ensureMap);
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'specialist-maps-sdk';
    script.onload = ensureMap;
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, [hasLocation, specialist?.location?.lat, specialist?.location?.lng, specialist?.location?.label, specialist?.speciality, specialistName]);

  useEffect(() => {
    if (!isMapPreviewOpen || !hasLocation) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setPopupMapError(true);
      return;
    }

    const ensureMap = () => {
      if (!(window as any).google?.maps || !popupMapRef.current) return;

      const lat = Number(specialist?.location?.lat);
      const lng = Number(specialist?.location?.lng);
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

      const markerIcon = specialist?.avatarUrl
        ? { url: specialist.avatarUrl, scaledSize: new (window as any).google.maps.Size(44, 44) }
        : undefined;

      if (!popupMarkerRef.current) {
        popupMarkerRef.current = new (window as any).google.maps.Marker({
          position: center,
          map: popupMapInstanceRef.current,
          title: specialistName,
          icon: markerIcon,
        });
      } else {
        popupMarkerRef.current.setMap(popupMapInstanceRef.current);
        popupMarkerRef.current.setPosition(center);
        popupMarkerRef.current.setTitle(specialistName);
        if (markerIcon) popupMarkerRef.current.setIcon(markerIcon);
      }

      const infoHtml = `
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
          ${specialist?.avatarUrl
            ? `<img src="${specialist.avatarUrl}" alt="${specialistName}" style="width:30px;height:30px;border-radius:9999px;object-fit:cover;border:1px solid #e5e7eb;" />`
            : '<div style="width:30px;height:30px;border-radius:9999px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;border:1px solid #d1fae5;">👨‍🌾</div>'}
          <div>
            <div style="font-weight:700;line-height:1.2;">${specialistName}</div>
            <div style="line-height:1.2;color:#4b5563;">📍 ${specialist?.location?.label || specialist?.speciality || 'Spécialiste'}</div>
          </div>
        </div>
      `;

      if (!popupInfoWindowRef.current) {
        popupInfoWindowRef.current = new (window as any).google.maps.InfoWindow({ content: infoHtml });
      } else {
        popupInfoWindowRef.current.setContent(infoHtml);
      }

      popupInfoWindowRef.current.open({ map: popupMapInstanceRef.current, anchor: popupMarkerRef.current });

      popupMarkerRef.current.addListener('click', () => {
        popupInfoWindowRef.current?.open({ map: popupMapInstanceRef.current, anchor: popupMarkerRef.current });
      });

      setPopupMapError(false);
    };

    if ((window as any).google?.maps) {
      ensureMap();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="specialist-maps-sdk"]');

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
    script.dataset.googleMaps = 'specialist-maps-sdk';
    script.onload = ensureMap;
    script.onerror = () => setPopupMapError(true);
    document.head.appendChild(script);
  }, [isMapPreviewOpen, hasLocation, specialist?.location?.lat, specialist?.location?.lng, specialist?.avatarUrl, specialistName]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="container py-8 min-h-screen">
          <div className="h-56 rounded-3xl bg-muted animate-pulse" />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !specialist) {
    return (
      <>
        <Navbar />
        <main className="container py-20 min-h-screen text-center">
          <h1 className="text-2xl font-bold">Spécialiste introuvable</h1>
          <p className="mt-2 text-muted-foreground">
            Ce profil n&apos;existe pas ou n&apos;est pas encore publié.
          </p>
          <Button asChild className="mt-6">
            <Link href="/specialists">Retour à la liste</Link>
          </Button>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        {/* Specialist Header */}
        <div className="relative overflow-hidden rounded-3xl mb-10 bg-slate-100 border border-border shadow-sm">
          <div
            className={`h-52 sm:h-64 bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-500 relative ${hasLocation ? 'cursor-zoom-in' : ''}`}
            onClick={() => { if (hasLocation) setIsMapPreviewOpen(true); }}
            role={hasLocation ? 'button' : undefined}
            aria-label={hasLocation ? 'Open location map preview' : undefined}
            title={hasLocation ? 'Click to preview map location' : undefined}
          >
            {hasLocation ? (
              <>
                <div ref={mapRef} className="h-full w-full" />
                {mapError && (
                  <div className="absolute inset-0 grid place-items-center bg-black/35 text-white text-sm text-center px-4">
                    Unable to load map preview.
                  </div>
                )}
                <span className="absolute top-3 left-3 text-[11px] bg-emerald-600/95 text-white px-2.5 py-1 rounded-full border border-emerald-500 shadow-sm">
                  👨‍🌾 {specialistName} — {specialist.speciality || 'Spécialiste'}
                </span>
              </>
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-500" />
            )}
          </div>

          <div className="px-6 sm:px-8 pb-8 -mt-12 sm:-mt-16 relative">
            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
              <div className="relative shrink-0">
                <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-3xl border-4 border-white bg-white shadow-xl overflow-hidden flex items-center justify-center">
                  <div className="text-6xl sm:text-8xl font-bold text-emerald-700">
                    {(specialist.firstName?.[0] ?? 'S')}{specialist.lastName?.[0] ?? ''}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6 flex-1">
                <div>
                  <p className="text-sm uppercase tracking-wide text-emerald-700 font-medium">Ingénieur agronome</p>
                  <h1 className="mt-1 text-3xl font-bold">
                    {specialist.firstName} {specialist.lastName}
                  </h1>
                  <p className="mt-1 text-muted-foreground">{specialist.speciality || 'Spécialiste agricole'}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{specialist.email}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={`/account/agri-help?engineerId=${specialist.id}`}>
                      Contacter ce spécialiste
                    </Link>
                  </Button>
                  {specialist.cvUrl && (
                    <Button asChild variant="outline">
                      <a href={specialist.cvUrl} target="_blank" rel="noreferrer">
                        Ouvrir le CV
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <Link href="/specialists">Tous les spécialistes</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {[
            { label: 'Demandes traitées', value: specialist.stats.totalHandled },
            { label: 'Demandes résolues', value: specialist.stats.resolvedCount },
            { label: 'Feedback reçus', value: specialist.stats.totalFeedbacks },
            { label: 'Note moyenne', value: `${specialist.stats.averageRating.toFixed(1)} ⭐` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border bg-card p-4 text-center">
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardHeader>
              <CardTitle>Présentation professionnelle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
              {specialist.bio ? (
                <p>{specialist.bio}</p>
              ) : (
                <p>Ce spécialiste n&apos;a pas encore ajouté de biographie détaillée.</p>
              )}
              {specialist.workSummary ? (
                <p className="text-foreground">{specialist.workSummary}</p>
              ) : (
                <p>Le résumé de ses travaux techniques sera affiché ici.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CV et coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Spécialité</p>
                <p className="font-medium">{specialist.speciality || 'Non renseignée'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Email</p>
                <p className="font-medium">{specialist.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">CV</p>
                {specialist.cvUrl ? (
                  <a className="font-medium text-primary underline" href={specialist.cvUrl} target="_blank" rel="noreferrer">
                    Télécharger / consulter
                  </a>
                ) : (
                  <p className="font-medium">Aucun CV publié</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold">Réalisations / Événements</h2>
          {recentWorks.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center border rounded-2xl bg-muted/20">Aucune réalisation publiée pour le moment.</p>
          ) : (
            <div className={recentWorks.length === 1 ? 'w-full' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'}>
              {recentWorks.map((work) => (
                <article
                  key={work.id}
                  className={`group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${recentWorks.length === 1 ? 'relative lg:grid lg:grid-cols-[1.35fr_1fr] lg:min-h-[480px]' : ''}`}
                >
                  <div className={`relative overflow-hidden bg-muted ${recentWorks.length === 1 ? 'h-72 lg:h-full' : 'h-44'}`}>
                    <div className="h-full w-full bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-lime-400/20" />
                    <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
                      {new Date(work.updatedAt).toLocaleDateString()}
                    </div>
                    {recentWorks.length === 1 && (
                      <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm backdrop-blur-sm">
                        ✨ Featured
                      </div>
                    )}
                  </div>

                  <div className={`space-y-3 ${recentWorks.length === 1 ? 'p-6 sm:p-8 lg:flex lg:flex-col lg:justify-center lg:pr-36' : 'p-4'}`}>
                    <h3 className={`font-semibold ${recentWorks.length === 1 ? 'text-3xl sm:text-4xl leading-tight' : 'text-base sm:text-lg line-clamp-1'}`}>{work.title}</h3>
                    <p className={`text-sm text-muted-foreground ${recentWorks.length === 1 ? 'max-w-2xl text-base sm:text-lg leading-7 line-clamp-5' : 'line-clamp-2'}`}>{work.engineerRecommendation || ''}</p>

                    <div className={`space-y-1 text-xs text-muted-foreground ${recentWorks.length === 1 ? 'text-sm sm:text-base' : ''}`}>
                      <p>Spécialité: {work.speciality}</p>
                      <p>Statut: {work.status}</p>
                      <p>Note: {work.rating ? `${work.rating} ⭐` : 'Sans note'}</p>
                    </div>

                    <div className={`pt-1 flex ${recentWorks.length === 1 ? 'justify-end lg:absolute lg:bottom-6 lg:right-6 lg:pt-0' : 'justify-end'}`}>
                      <a href="#" className={`inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 ${recentWorks.length === 1 ? 'px-5 py-3 text-sm sm:text-base shadow-sm' : ''}`}>Voir →</a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Formations by this specialist */}
        <section className="mt-8">
          <h2 className="text-xl font-bold">Formations</h2>
          <FormationsList specialistId={specialist.id} />
        </section>
      </main>
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
              <h3 className="text-sm sm:text-base font-semibold">📍 {specialistName} — {specialist.speciality || 'Spécialiste'}</h3>
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
              {/* No external map links provided for specialists currently */}
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}

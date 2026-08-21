"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FormationsList from '../../specialists/[id]/formations-list';

interface TrainingCenterProfile {
  id: string;
  email: string;
  badge?: { type?: string; isActive?: boolean };
  profile?: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    bio?: string;
    workSummary?: string;
    speciality?: string;
    cvUrl?: string;
    location?: { lat?: number; lng?: number; label?: string } | null;
  };
}

export default function TrainingCenterProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const [mapError, setMapError] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['training-center-detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/training-centers/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: Boolean(id),
  });

  const center: TrainingCenterProfile | undefined = data?.trainingCenter;
  const location = center?.profile?.location;
  const hasLocation = typeof location?.lat === 'number' && typeof location?.lng === 'number';
  const centerName = `${center?.profile?.firstName || 'Centre'} ${center?.profile?.lastName || ''}`.trim();

  useEffect(() => {
    if (!hasLocation || !mapRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError(true);
      return;
    }

    const ensureMap = () => {
      if (!(window as any).google?.maps || !mapRef.current) return;

      const lat = Number(location?.lat);
      const lng = Number(location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setMapError(true);
        return;
      }

      const centerPoint = { lat, lng };

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new (window as any).google.maps.Map(mapRef.current, {
          center: centerPoint,
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
        mapInstanceRef.current.setCenter(centerPoint);
        mapInstanceRef.current.setZoom(16);
      }

      if (!markerRef.current) {
        markerRef.current = new (window as any).google.maps.Marker({
          position: centerPoint,
          map: mapInstanceRef.current,
          title: centerName,
        });
      }

      const infoHtml = `
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
          <div style="width:30px;height:30px;border-radius:9999px;background:#eef2ff;display:flex;align-items:center;justify-content:center;border:1px solid #c7d2fe;">🏫</div>
          <div>
            <div style="font-weight:700;line-height:1.2;">${centerName}</div>
            <div style="line-height:1.2;color:#4b5563;">📍 ${location?.label || center?.profile?.speciality || 'Centre de formation'}</div>
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

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="training-center-maps-sdk"]');
    if (existing) {
      existing.addEventListener('load', ensureMap);
      existing.addEventListener('error', () => setMapError(true));
      return () => existing.removeEventListener('load', ensureMap);
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'training-center-maps-sdk';
    script.onload = ensureMap;
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, [hasLocation, location?.lat, location?.lng, location?.label, center?.profile?.speciality, centerName]);

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

  if (error || !center) {
    return (
      <>
        <Navbar />
        <main className="container py-20 min-h-screen text-center">
          <h1 className="text-2xl font-bold">Centre de formation introuvable</h1>
          <p className="mt-2 text-muted-foreground">Ce profil n&apos;existe pas ou n&apos;est pas encore publié.</p>
          <Button asChild className="mt-6">
            <Link href="/training-centers">Retour à la liste</Link>
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
        <div className="relative overflow-hidden rounded-3xl mb-10 bg-slate-100 border border-border shadow-sm">
          <div
            className="h-52 sm:h-64 bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-500 relative"
          >
            {hasLocation ? (
              <>
                <div ref={mapRef} className="h-full w-full" />
                {mapError && (
                  <div className="absolute inset-0 grid place-items-center bg-black/35 text-white text-sm text-center px-4">
                    Unable to load map preview.
                  </div>
                )}
                <span className="absolute top-3 left-3 text-[11px] bg-indigo-600/95 text-white px-2.5 py-1 rounded-full border border-indigo-500 shadow-sm">
                  🏫 {centerName} — {center.profile?.speciality || 'Centre de formation'}
                </span>
              </>
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-500" />
            )}
          </div>

          <div className="px-6 sm:px-8 pb-8 -mt-12 sm:-mt-16 relative">
            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
              <div className="relative shrink-0">
                <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-3xl border-4 border-white bg-white shadow-xl overflow-hidden flex items-center justify-center">
                  {center.profile?.avatarUrl ? (
                    <img src={center.profile.avatarUrl} alt={centerName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-6xl sm:text-8xl font-bold text-indigo-700">🏫</div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-6 flex-1">
                <div>
                  <p className="text-sm uppercase tracking-wide text-indigo-700 font-medium">Centre de formation</p>
                  <h1 className="mt-1 text-3xl font-bold">{centerName}</h1>
                  <p className="mt-1 text-muted-foreground">{center.profile?.speciality || 'Formation, accompagnement et événements professionnels'}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{center.email}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={`/messages?to=${center.id}`}>
                      Contacter ce centre
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="#formations">Voir les formations</Link>
                  </Button>
                  {center.profile?.cvUrl ? (
                    <Button variant="outline" asChild>
                      <a href={center.profile.cvUrl} target="_blank" rel="noreferrer">Portfolio</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <Card className="overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">À propos</h2>
              <p className="text-muted-foreground leading-7">
                {center.profile?.bio || center.profile?.workSummary || 'Ce centre de formation partage ses programmes, ses sessions à venir et ses événements professionnels.'}
              </p>
              {location?.label ? (
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium">📍 Localisation</p>
                  <p className="text-sm text-muted-foreground">{location.label}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Statistiques</h2>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-2xl bg-muted/60 p-4">
                  <p className="text-2xl font-semibold">—</p>
                  <p className="text-xs text-muted-foreground">Avis</p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-4">
                  <p className="text-2xl font-semibold">—</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-4">
                  <p className="text-2xl font-semibold">—</p>
                  <p className="text-xs text-muted-foreground">Participants</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="formations" className="mt-10">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Formations du centre</h2>
            <p className="text-muted-foreground">Programmes et sessions publiées par ce centre de formation.</p>
          </div>
          <FormationsList specialistId={center.id} />
        </section>
      </main>
      <Footer />
    </>
  );
}
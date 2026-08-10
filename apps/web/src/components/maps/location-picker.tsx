'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type LocationValue = {
  lat?: number;
  lng?: number;
};

interface LocationPickerProps {
  value: LocationValue;
  onChange: (next: { lat: number; lng: number }) => void;
  className?: string;
  markerTitle?: string;
  markerSubtitle?: string;
}

const DEFAULT_CENTER = { lat: 34.0, lng: 9.0 };

export function LocationPicker({ value, onChange, className = '', markerTitle, markerSubtitle }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: number; lng: number }>>([]);

  const center = useMemo(() => {
    if (Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng))) {
      return { lat: Number(value.lat), lng: Number(value.lng) };
    }
    return DEFAULT_CENTER;
  }, [value.lat, value.lng]);

  const hasSelection = Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng));

  const markerTitleText = markerTitle?.trim() || 'Spécialiste';
  const markerSubtitleText = markerSubtitle?.trim() || 'Localisation';
  const markerInitials = markerTitleText
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'SP';

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const markerInfoWindowHtml = `
    <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
      <div style="width:30px;height:30px;border-radius:9999px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;border:1px solid #d1fae5;font-weight:700;color:#065f46;">${escapeHtml(markerInitials)}</div>
      <div>
        <div style="font-weight:700;line-height:1.2;">${escapeHtml(markerTitleText)}</div>
        <div style="line-height:1.2;color:#4b5563;">📍 ${escapeHtml(markerSubtitleText)}</div>
      </div>
    </div>
  `;

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError(true);
      return;
    }

    if ((window as any).google?.maps) {
      setIsReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="location-picker-sdk"]');
    if (existing) {
      const handleLoad = () => setIsReady(true);
      const handleError = () => setMapError(true);
      existing.addEventListener('load', handleLoad);
      existing.addEventListener('error', handleError);
      return () => {
        existing.removeEventListener('load', handleLoad);
        existing.removeEventListener('error', handleError);
      };
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'location-picker-sdk';
    script.onload = () => setIsReady(true);
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isReady || !mapRef.current || !(window as any).google?.maps) return;

    const googleMaps = (window as any).google.maps;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new googleMaps.Map(mapRef.current, {
        center,
        zoom: hasSelection ? 15 : 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
      });
      geocoderRef.current = new googleMaps.Geocoder();

      mapInstanceRef.current.addListener('click', (event: any) => {
        const nextLat = event?.latLng?.lat?.();
        const nextLng = event?.latLng?.lng?.();
        if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
        onChange({ lat: nextLat, lng: nextLng });
      });
    } else {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(hasSelection ? 15 : 6);
    }

    if (!markerRef.current) {
      markerRef.current = new googleMaps.Marker({
        map: mapInstanceRef.current,
        position: center,
        draggable: true,
        title: markerTitleText,
      });

      markerRef.current.addListener('dragend', (event: any) => {
        const nextLat = event?.latLng?.lat?.();
        const nextLng = event?.latLng?.lng?.();
        if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
        onChange({ lat: nextLat, lng: nextLng });
        infoWindowRef.current?.open({ map: mapInstanceRef.current, anchor: markerRef.current });
      });
    } else {
      markerRef.current.setMap(mapInstanceRef.current);
      markerRef.current.setPosition(center);
      markerRef.current.setTitle(markerTitleText);
    }

    if (!infoWindowRef.current) {
      infoWindowRef.current = new googleMaps.InfoWindow({
        content: markerInfoWindowHtml,
      });
    } else {
      infoWindowRef.current.setContent(markerInfoWindowHtml);
    }

    infoWindowRef.current.open({ map: mapInstanceRef.current, anchor: markerRef.current });

    googleMaps.event.clearInstanceListeners(markerRef.current);
    markerRef.current.addListener('click', () => {
      infoWindowRef.current?.open({ map: mapInstanceRef.current, anchor: markerRef.current });
    });
    markerRef.current.addListener('dragend', (event: any) => {
      const nextLat = event?.latLng?.lat?.();
      const nextLng = event?.latLng?.lng?.();
      if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
      onChange({ lat: nextLat, lng: nextLng });
      infoWindowRef.current?.open({ map: mapInstanceRef.current, anchor: markerRef.current });
    });
  }, [center, hasSelection, isReady, markerInfoWindowHtml, markerTitleText, onChange]);

  const setPickedLocation = (lat: number, lng: number, zoom = 15) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.panTo({ lat, lng });
    map.setZoom(zoom);

    if (!markerRef.current) {
      markerRef.current = new (window as any).google.maps.Marker({
        map,
        position: { lat, lng },
        draggable: true,
        title: markerTitleText,
      });
      markerRef.current.addListener('dragend', (event: any) => {
        const nextLat = event?.latLng?.lat?.();
        const nextLng = event?.latLng?.lng?.();
        if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
        onChange({ lat: nextLat, lng: nextLng });
        infoWindowRef.current?.open({ map, anchor: markerRef.current });
      });
    } else {
      markerRef.current.setPosition({ lat, lng });
      markerRef.current.setTitle(markerTitleText);
    }

    if (!infoWindowRef.current) {
      infoWindowRef.current = new (window as any).google.maps.InfoWindow({
        content: markerInfoWindowHtml,
      });
    } else {
      infoWindowRef.current.setContent(markerInfoWindowHtml);
    }

    infoWindowRef.current.open({ map, anchor: markerRef.current });

    onChange({ lat, lng });
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      let results: Array<{ display_name: string; lat: number; lng: number }> = [];

      const geocoder = geocoderRef.current;
      if (geocoder) {
        try {
          const geocodeResults = await new Promise<any[]>((resolve, reject) => {
            geocoder.geocode({ address: query, region: 'tn' }, (items: any[], status: string) => {
              if (status === 'OK' && Array.isArray(items)) {
                resolve(items);
                return;
              }
              if (status === 'ZERO_RESULTS') {
                resolve([]);
                return;
              }
              reject(new Error(status));
            });
          });

          results = geocodeResults.slice(0, 5).map((item: any) => ({
            display_name: String(item.formatted_address || ''),
            lat: Number(item.geometry?.location?.lat?.()),
            lng: Number(item.geometry?.location?.lng?.()),
          }));
        } catch {
          results = [];
        }
      }

      if (results.length === 0) {
        try {
          const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=tn,dz,ma,ly&q=${encodeURIComponent(query)}`, {
            headers: { Accept: 'application/json' },
          });

          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (Array.isArray(fallbackData)) {
              results = fallbackData.slice(0, 5).map((item: any) => ({
                display_name: String(item.display_name || ''),
                lat: Number(item.lat),
                lng: Number(item.lon),
              }));
            }
          }
        } catch {
          results = [];
        }
      }

      results = results.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
      setSearchResults(results);

      if (results.length === 0) {
        setSearchError('NO_RESULTS');
      }
    } catch {
      setSearchResults([]);
      setSearchError('SEARCH_FAILED');
    } finally {
      setSearchLoading(false);
    }
  };

  if (mapError) {
    return (
      <div className={`rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground ${className}`}>
        La carte n’est pas disponible pour le moment. Vous pouvez enregistrer le reste du profil et réessayer plus tard.
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-3 space-y-2">
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSearch();
              }
            }}
            placeholder="Rechercher une adresse ou un lieu..."
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={searchLoading}
            className="h-10 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-60"
          >
            {searchLoading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>

        {searchError === 'NO_RESULTS' && <p className="text-xs text-muted-foreground">Aucun résultat trouvé.</p>}
        {searchError === 'SEARCH_FAILED' && <p className="text-xs text-destructive">La recherche a échoué, réessayez.</p>}

        {searchResults.length > 0 && (
          <div className="max-h-40 overflow-auto rounded-md border bg-background">
            {searchResults.map((result, index) => (
              <button
                key={`${result.lat}-${result.lng}-${index}`}
                type="button"
                className="w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                onClick={() => {
                  setPickedLocation(result.lat, result.lng);
                  setSearchQuery(result.display_name);
                  setSearchResults([]);
                  setSearchError(null);
                }}
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Cliquez sur la carte ou déplacez le repère pour choisir votre localisation.</span>
        {hasSelection ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700">
            Position enregistrée
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium">Aucune position sélectionnée</span>
        )}
      </div>
      <div ref={mapRef} className="h-[320px] w-full overflow-hidden rounded-2xl border bg-muted/20" />
      {!isReady && <p className="mt-2 text-xs text-muted-foreground">Chargement de la carte...</p>}
    </div>
  );
}
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/providers/locale-provider';

type CompanyForm = {
  companyName: string;
  description: string;
  city: string;
  wilaya: string;
  addressLine: string;
  postalCode: string;
  website: string;
  linkedin: string;
  facebook: string;
  phone: string;
  whatsapp: string;
  mapLat: string;
  mapLng: string;
};

const DEFAULT_MAP_CENTER = { lat: 36.8065, lng: 10.1815 }; // Tunis

function SupplierLocationPicker({
  apiKey,
  initialLat,
  initialLng,
  supplierName,
  supplierLogo,
  t,
  onLocationChange,
}: {
  apiKey?: string;
  initialLat?: number;
  initialLng?: number;
  supplierName?: string;
  supplierLogo?: string;
  t: (key: string) => string;
  onLocationChange: (coords: { lat: number; lng: number }) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: number; lng: number }>>([]);

  const markerTitle = supplierName?.trim() ? `${supplierName.trim()} — Point de vente Agri` : 'Point de vente Agri';

  const buildInfoWindowHtml = () => {
    const safeName = (supplierName || 'Point de vente Agri')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const logoHtml = supplierLogo
      ? `<img src="${supplierLogo}" alt="${safeName}" style="width:32px;height:32px;border-radius:9999px;object-fit:cover;border:1px solid #e5e7eb;" />`
      : '<div style="width:32px;height:32px;border-radius:9999px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;border:1px solid #d1fae5;">🏬</div>';

    return `<div style="display:flex;align-items:center;gap:8px;font-size:12px;"><span>${logoHtml}</span><div><div style="font-weight:700;line-height:1.2;">${safeName}</div><div style="color:#4b5563;line-height:1.2;">📍 Point de vente Agri</div></div></div>`;
  };

  const markerIcon =
    supplierLogo && typeof window !== 'undefined' && (window as any).google?.maps?.Size
      ? {
          url: supplierLogo,
          scaledSize: new (window as any).google.maps.Size(44, 44),
        }
      : undefined;

  const center = useMemo(() => {
    if (typeof initialLat === 'number' && typeof initialLng === 'number') {
      return { lat: initialLat, lng: initialLng };
    }
    return DEFAULT_MAP_CENTER;
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (!apiKey) {
      setLoadError('missing-key');
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="supplier-settings"]');

    const initialize = () => {
      if (!(window as any).google?.maps || !mapRef.current || mapInstanceRef.current) return;

      const map = new (window as any).google.maps.Map(mapRef.current, {
        center,
        zoom: typeof initialLat === 'number' && typeof initialLng === 'number' ? 16 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      mapInstanceRef.current = map;
      geocoderRef.current = new (window as any).google.maps.Geocoder();
      infoWindowRef.current = new (window as any).google.maps.InfoWindow({
        content: buildInfoWindowHtml(),
      });

      if (typeof initialLat === 'number' && typeof initialLng === 'number') {
        markerRef.current = new (window as any).google.maps.Marker({
          position: { lat: initialLat, lng: initialLng },
          map,
          title: markerTitle,
          icon: markerIcon,
        });
        infoWindowRef.current?.setContent(buildInfoWindowHtml());
        infoWindowRef.current?.open({ map, anchor: markerRef.current });
      }

      clickListenerRef.current = map.addListener('click', (event: any) => {
        const lat = event?.latLng?.lat?.();
        const lng = event?.latLng?.lng?.();
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        if (!markerRef.current) {
          markerRef.current = new (window as any).google.maps.Marker({
            position: { lat, lng },
            map,
            title: markerTitle,
            icon: markerIcon,
          });
        } else {
          markerRef.current.setPosition({ lat, lng });
        }

        infoWindowRef.current?.setContent(buildInfoWindowHtml());
        infoWindowRef.current?.open({ map, anchor: markerRef.current });

        onLocationChange({ lat, lng });
      });

      setReady(true);
    };

    if ((window as any).google?.maps) {
      initialize();
      return;
    }

    if (existing) {
      existing.addEventListener('load', initialize);
      existing.addEventListener('error', () => setLoadError('load-failed'));
      return () => {
        existing.removeEventListener('load', initialize);
      };
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'supplier-settings';
    script.onload = initialize;
    script.onerror = () => setLoadError('load-failed');
    document.head.appendChild(script);

    return () => {
      if (clickListenerRef.current && (window as any).google?.maps?.event?.removeListener) {
        (window as any).google.maps.event.removeListener(clickListenerRef.current);
      }
    };
  }, [apiKey, center, initialLat, initialLng, markerTitle, supplierLogo, onLocationChange]);

  if (loadError === 'missing-key') {
    return <p className="text-sm text-amber-700">Google Maps API key is missing.</p>;
  }

  if (loadError === 'load-failed') {
    return <p className="text-sm text-destructive">Unable to load Google Maps.</p>;
  }

  const setPickedLocation = (lat: number, lng: number, zoom = 16) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.panTo({ lat, lng });
    map.setZoom(zoom);
    if (!markerRef.current) {
      markerRef.current = new (window as any).google.maps.Marker({
        position: { lat, lng },
        map,
        title: markerTitle,
        icon: markerIcon,
      });
    } else {
      markerRef.current.setPosition({ lat, lng });
    }

    infoWindowRef.current?.setContent(buildInfoWindowHtml());
    infoWindowRef.current?.open({ map, anchor: markerRef.current });

    onLocationChange({ lat, lng });
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const geocoder = geocoderRef.current;
      let results: Array<{ display_name: string; lat: number; lng: number }> = [];

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

          results = geocodeResults.slice(0, 5).map((result: any) => ({
            display_name: result.formatted_address as string,
            lat: Number(result.geometry?.location?.lat?.()),
            lng: Number(result.geometry?.location?.lng?.()),
          }));
        } catch {
          results = [];
        }
      }

      // Fallback: OpenStreetMap/Nominatim when Google geocoder fails/denies/no-results.
      if (results.length === 0) {
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=tn,dz,ma,ly&q=${encodeURIComponent(query)}`;
          const fallbackRes = await fetch(nominatimUrl, {
            headers: {
              Accept: 'application/json',
            },
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
          // Keep empty results; handled below.
        }
      }

      results = results.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('NO_RESULTS');
      }
    } catch {
      setSearchError('SEARCH_FAILED');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSearch();
              }
            }}
            placeholder={t('dashboardSettings.mapSearchPlaceholder')}
          />
          <Button type="button" variant="outline" disabled={searchLoading} onClick={() => void handleSearch()}>
            {searchLoading ? t('dashboardSettings.mapSearchLoading') : t('dashboardSettings.mapSearchButton')}
          </Button>
        </div>

        {searchError === 'NO_RESULTS' && (
          <p className="text-xs text-muted-foreground">{t('dashboardSettings.mapSearchNoResults')}</p>
        )}
        {searchError === 'SEARCH_FAILED' && (
          <p className="text-xs text-destructive">{t('dashboardSettings.mapSearchError')}</p>
        )}

        {searchResults.length > 0 && (
          <div className="max-h-44 overflow-auto rounded-md border bg-background">
            {searchResults.map((result, idx) => {
              const lat = Number(result.lat);
              const lng = Number(result.lng);
              return (
                <button
                  key={`${result.lat}-${result.lng}-${idx}`}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-b-0"
                  onClick={() => {
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                    setPickedLocation(lat, lng);
                    setSearchResults([]);
                    setSearchQuery(result.display_name);
                    setSearchError(null);
                  }}
                >
                  {result.display_name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div ref={mapRef} className="h-72 w-full rounded-lg border" />
      {!ready && <p className="text-xs text-muted-foreground">Loading map...</p>}
    </div>
  );
}

export default function DashboardSettingsPage() {
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-settings'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/settings');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const supplier = data?.supplier;
  const supplierSlug = typeof supplier?.slug === 'string' ? supplier.slug : '';
  const publicProfileUrl = supplierSlug ? `/suppliers/${encodeURIComponent(supplierSlug)}` : null;
  const hq = supplier?.addresses?.[0] || {};

  const [company, setCompany] = useState<CompanyForm>({
    companyName: '',
    description: '',
    city: '',
    wilaya: '',
    addressLine: '',
    postalCode: '',
    website: '',
    linkedin: '',
    facebook: '',
    phone: '',
    whatsapp: '',
    mapLat: '',
    mapLng: '',
  });
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [initDone, setInitDone] = useState(false);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Sync form state when data loads
  if (supplier && !initDone) {
    setCompany({
      companyName: supplier.companyName || '',
      description: supplier.description || '',
      city: hq.city || '',
      wilaya: hq.wilaya || '',
      addressLine: hq.addressLine || '',
      postalCode: hq.postalCode || '',
      website: supplier.socialLinks?.website || '',
      linkedin: supplier.socialLinks?.linkedin || '',
      facebook: supplier.socialLinks?.facebook || '',
      phone: supplier.socialLinks?.phone || '',
      whatsapp: supplier.socialLinks?.whatsapp || '',
      mapLat: typeof supplier.settings?.location?.lat === 'number' ? String(supplier.settings.location.lat) : '',
      mapLng: typeof supplier.settings?.location?.lng === 'number' ? String(supplier.settings.location.lng) : '',
    });
    setSettings({
      notifyNewOrder: supplier.settings?.notifyNewOrder ?? true,
      notifyLowStock: supplier.settings?.notifyLowStock ?? true,
      autoConfirmOrders: supplier.settings?.autoConfirmOrders ?? false,
      showPhonePublicly: supplier.settings?.showPhonePublicly ?? false,
    });
    setInitDone(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-settings'] });
      toast({ title: t('dashboardSettings.settingsSaved') });
    },
    onError: () => {
      toast({ title: t('dashboardSettings.settingsError') });
    },
  });

  function saveCompanyInfo(e: React.FormEvent) {
    e.preventDefault();
    const lat = Number(company.mapLat);
    const lng = Number(company.mapLng);
    const hasLocation = company.mapLat.trim() !== '' && company.mapLng.trim() !== '';

    const locationPayload = hasLocation && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null;

    saveMutation.mutate({
      companyName: company.companyName,
      description: company.description,
      address: {
        city: company.city,
        wilaya: company.wilaya,
        addressLine: company.addressLine,
        postalCode: company.postalCode,
      },
      socialLinks: {
        website: company.website,
        linkedin: company.linkedin,
        facebook: company.facebook,
        phone: company.phone,
        whatsapp: company.whatsapp,
      },
      location: locationPayload,
    });
  }

  function saveNotifications(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate({ settings });
  }

  async function copyGoogleBusinessPayload() {
    const payload = [
      `${t('dashboardSettings.companyName')}: ${company.companyName || supplier?.companyName || ''}`,
      `${t('dashboardSettings.address')}: ${company.addressLine || ''}`,
      `${t('dashboardSettings.city')}: ${company.city || ''}`,
      `${t('dashboardSettings.wilaya')}: ${company.wilaya || ''}`,
      `${t('dashboardSettings.phone')}: ${company.phone || ''}`,
      `Latitude: ${company.mapLat || ''}`,
      `Longitude: ${company.mapLng || ''}`,
      `${t('dashboardSettings.website')}: ${company.website || ''}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      toast({ title: t('dashboardSettings.googleBusinessCopied') });
    } catch {
      toast({ title: t('dashboardSettings.settingsError') });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboardSettings.heading')}</h1>
        <p className="text-muted-foreground">{t('dashboardSettings.subtitle')}</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Public profile preview */}
        <Card>
          <CardHeader><CardTitle>{t('dashboardSettings.publicProfileTitle')}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{t('dashboardSettings.publicProfileDescription')}</p>
            {publicProfileUrl ? (
              <Button asChild variant="outline" size="sm">
                <Link href={publicProfileUrl} target="_blank" rel="noopener noreferrer">
                  {t('dashboardSettings.previewPublicProfile')}
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{t('dashboardSettings.publicProfileUnavailable')}</p>
            )}
          </CardContent>
        </Card>

        {/* Company info */}
        <Card>
          <CardHeader><CardTitle>{t('dashboardSettings.companyInfo')}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveCompanyInfo} className="space-y-4">
              <div>
                <Label>{t('dashboardSettings.companyName')}</Label>
                <Input
                  value={company.companyName ?? ''}
                  onChange={(e) => setCompany((f) => ({ ...f, companyName: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t('dashboardSettings.description')}</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={company.description ?? ''}
                  onChange={(e) => setCompany((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t('dashboardSettings.descriptionPlaceholder')}
                  maxLength={1000}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dashboardSettings.city')}</Label>
                  <Input
                    value={company.city ?? ''}
                    onChange={(e) => setCompany((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>{t('dashboardSettings.wilaya')}</Label>
                  <Input
                    value={company.wilaya ?? ''}
                    onChange={(e) => setCompany((f) => ({ ...f, wilaya: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dashboardSettings.address')}</Label>
                  <Input
                    value={company.addressLine ?? ''}
                    onChange={(e) => setCompany((f) => ({ ...f, addressLine: e.target.value }))}
                    placeholder={t('dashboardSettings.addressPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('dashboardSettings.postalCode')}</Label>
                  <Input
                    value={company.postalCode ?? ''}
                    onChange={(e) => setCompany((f) => ({ ...f, postalCode: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dashboardSettings.phone')}</Label>
                  <Input
                    value={company.phone ?? ''}
                    onChange={(e) => setCompany((f) => ({ ...f, phone: e.target.value }))}
                    placeholder={t('dashboardSettings.phonePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('dashboardSettings.whatsapp')}</Label>
                  <Input
                    value={company.whatsapp ?? ''}
                    onChange={(e) => setCompany((f) => ({ ...f, whatsapp: e.target.value }))}
                    placeholder={t('dashboardSettings.whatsappPlaceholder')}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <Label className="text-sm font-semibold mb-3 block">{t('dashboardSettings.links')}</Label>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('dashboardSettings.website')}</Label>
                    <Input
                      value={company.website ?? ''}
                      onChange={(e) => setCompany((f) => ({ ...f, website: e.target.value }))}
                      placeholder={t('dashboardSettings.websitePlaceholder')}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('dashboardSettings.linkedin')}</Label>
                      <Input
                        value={company.linkedin ?? ''}
                        onChange={(e) => setCompany((f) => ({ ...f, linkedin: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('dashboardSettings.facebook')}</Label>
                      <Input
                        value={company.facebook ?? ''}
                        onChange={(e) => setCompany((f) => ({ ...f, facebook: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4 mt-4">
                <div>
                  <Label className="text-sm font-semibold">{t('dashboardSettings.pointOfSaleLocation')}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{t('dashboardSettings.pointOfSaleLocationHelp')}</p>
                </div>

                <SupplierLocationPicker
                  apiKey={googleMapsApiKey}
                  t={t}
                  initialLat={company.mapLat ? Number(company.mapLat) : undefined}
                  initialLng={company.mapLng ? Number(company.mapLng) : undefined}
                  supplierName={company.companyName || supplier?.companyName}
                  supplierLogo={supplier?.logo}
                  onLocationChange={({ lat, lng }) => {
                    setCompany((f) => ({ ...f, mapLat: String(lat), mapLng: String(lng) }));
                  }}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Latitude</Label>
                    <Input
                      value={company.mapLat}
                      onChange={(e) => setCompany((f) => ({ ...f, mapLat: e.target.value }))}
                      placeholder="36.8065"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Longitude</Label>
                    <Input
                      value={company.mapLng}
                      onChange={(e) => setCompany((f) => ({ ...f, mapLng: e.target.value }))}
                      placeholder="10.1815"
                    />
                  </div>
                </div>

                {company.mapLat && company.mapLng && (
                  <div className="space-y-2">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(`${company.mapLat},${company.mapLng}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline"
                    >
                      {t('dashboardSettings.openInMap')}
                    </a>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyGoogleBusinessPayload}
                      >
                        {t('dashboardSettings.copyGoogleBusinessData')}
                      </Button>
                      <Button asChild type="button" variant="outline" size="sm">
                        <a
                          href={`https://www.google.com/business/`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t('dashboardSettings.openGoogleBusiness')}
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('dashboardSettings.googleBusinessNote')}
                    </p>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? t('dashboardSettings.saving') : t('dashboardSettings.save')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader><CardTitle>{t('dashboardSettings.notifications')}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveNotifications} className="space-y-3">
              {[
                { key: 'notifyNewOrder', label: t('dashboardSettings.notifyNewOrder') },
                { key: 'notifyLowStock', label: t('dashboardSettings.notifyLowStock') },
                { key: 'autoConfirmOrders', label: t('dashboardSettings.autoConfirmOrders') },
                { key: 'showPhonePublicly', label: t('dashboardSettings.showPhonePublicly') },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[item.key] ?? false}
                    onChange={(e) => setSettings((s) => ({ ...s, [item.key]: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
              <Button type="submit" disabled={saveMutation.isPending} className="mt-2">
                {saveMutation.isPending ? t('dashboardSettings.saving') : t('dashboardSettings.save')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subscription info */}
        <Card>
          <CardHeader><CardTitle>{t('dashboardSettings.subscription')}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div>
                <p className="font-bold">{supplier?.subscription?.planName || t('dashboardSettings.freePlan')}</p>
                <p className="text-sm text-muted-foreground">
                  {supplier?.subscription?.maxProducts
                    ? `${supplier.subscription.maxProducts} ${t('dashboardSettings.maxProducts')}`
                    : t('dashboardSettings.basicFeatures')}
                  {supplier?.subscription?.featuredSlots
                    ? `, ${supplier.subscription.featuredSlots} ${t('dashboardSettings.featuredSlots')}`
                    : ''}
                </p>
                {supplier?.subscription?.endDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('dashboardSettings.expiresOn')} {new Date(supplier.subscription.endDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-GB' : 'ar-TN')}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/abonnements">Voir les plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Verification status */}
        <Card>
          <CardHeader><CardTitle>{t('dashboardSettings.verification')}</CardTitle></CardHeader>
          <CardContent>
            <div className={`flex items-center gap-3 p-4 rounded-lg ${
              supplier?.isVerified ? 'bg-green-50' : 'bg-yellow-50'
            }`}>
              <span className="text-2xl">{supplier?.isVerified ? '✅' : '⏳'}</span>
              <div>
                <p className="font-medium">
                  {supplier?.isVerified ? t('dashboardSettings.verified') : t('dashboardSettings.pending')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {supplier?.isVerified
                    ? t('dashboardSettings.verifiedDesc')
                    : t('dashboardSettings.pendingDesc')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Location {
  lat: number;
  lng: number;
  label?: string;
}

interface LocationPickerProps {
  value?: Location | null;
  onChange: (location: Location | null) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export function LocationPicker({ value, onChange, label = 'Localisation', required = false, error }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;

    // Load Leaflet dynamically
    const loadMap = async () => {
      try {
        // @ts-ignore
        if (!window.L) {
          const link = document.createElement('link');
          link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
          document.head.appendChild(link);

          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
          script.onload = initializeMap;
          document.body.appendChild(script);
        } else {
          initializeMap();
        }
      } catch (err) {
        console.error('Failed to load map library:', err);
      }
    };

    const initializeMap = () => {
      // @ts-ignore
      const L = window.L;
      if (!mapRef.current && mapContainerRef.current) {
        // Set icon path for Leaflet markers
        // @ts-ignore
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // @ts-ignore
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView([33.5731, -7.5898], 13);

        // @ts-ignore
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapRef.current);

        // Add click handler to map
        mapRef.current.on('click', (e: any) => {
          addMarker(e.latlng.lat, e.latlng.lng);
        });

        // If there's already a value, center on it
        if (value) {
          mapRef.current.setView([value.lat, value.lng], 13);
          addMarker(value.lat, value.lng, value.label);
        }
      }
    };

    loadMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showMap, value]);

  const addMarker = (lat: number, lng: number, label?: string) => {
    // @ts-ignore
    const L = window.L;
    if (!L || !mapRef.current) return;

    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }

    // @ts-ignore
    markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
    onChange({ lat, lng, label });
  };

  const handleSearch = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!searchInput.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}&limit=1`
      );
      const results = await response.json();

      if (results.length > 0) {
        const { lat, lon, display_name } = results[0];
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);

        if (mapRef.current) {
          mapRef.current.setView([latNum, lonNum], 13);
        }
        addMarker(latNum, lonNum, display_name);
        setSearchInput('');
      } else {
        console.warn('Aucun résultat trouvé pour:', searchInput);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setSearchInput('');
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  };

  return (
    <div className="space-y-2 w-full">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {!showMap ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowMap(true)}
        >
          📍 {value ? `Localisation définie (${value.lat.toFixed(4)}, ${value.lng.toFixed(4)})` : 'Définir la localisation'}
        </Button>
      ) : (
        <div className="border rounded-lg bg-muted/50 w-full overflow-hidden">
          {/* Search Bar Section */}
          <div className="p-4 pb-3 flex gap-2 bg-muted/50 border-b">
            <Input
              type="text"
              placeholder="Rechercher une adresse..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleSearch}
              disabled={isLoading || !searchInput.trim()}
              size="sm"
              className="flex-shrink-0"
            >
              {isLoading ? '...' : '🔍'}
            </Button>
          </div>

          {/* Map Container - Properly constrained */}
          <div className="relative w-full" style={{ height: '300px' }}>
            <div
              ref={mapContainerRef}
              className="absolute inset-0 w-full h-full bg-background"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          </div>

          {/* Info and Action Buttons Section */}
          <div className="p-4 pt-3 bg-muted/50 border-t space-y-3">
            {/* Coordinates Display */}
            {value && (
              <div className="p-2 bg-background rounded border text-xs text-muted-foreground">
                📍 Lat: {value.lat.toFixed(6)}, Lng: {value.lng.toFixed(6)}
                {value.label && <div className="mt-1">📌 {value.label}</div>}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMap(false)}
                className="flex-1"
              >
                Fermer
              </Button>
              {value && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleClear}
                  className="flex-1"
                >
                  Effacer
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

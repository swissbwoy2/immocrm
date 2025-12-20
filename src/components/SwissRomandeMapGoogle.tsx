import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { getLocationCoords, findLocation } from '@/data/swissRomandeLocations';
import { getRegionBoundaries } from '@/data/swissRegionsBoundaries';

// Coordonnées des régions de Suisse Romande
const REGIONS_DATA: Record<string, { center: { lat: number; lng: number }; zoom: number; color: string }> = {
  'Genève': { center: { lat: 46.2044, lng: 6.1432 }, zoom: 11, color: '#ef4444' },
  'Lausanne': { center: { lat: 46.5197, lng: 6.6323 }, zoom: 11, color: '#f97316' },
  'Lausanne et région': { center: { lat: 46.5197, lng: 6.6323 }, zoom: 10, color: '#f97316' },
  'Vaud': { center: { lat: 46.5197, lng: 6.6323 }, zoom: 9, color: '#f97316' },
  'Fribourg': { center: { lat: 46.8065, lng: 7.1598 }, zoom: 10, color: '#eab308' },
  'Neuchâtel': { center: { lat: 46.9920, lng: 6.9319 }, zoom: 10, color: '#22c55e' },
  'Valais': { center: { lat: 46.3259, lng: 7.6096 }, zoom: 9, color: '#3b82f6' },
  'Jura': { center: { lat: 47.3667, lng: 7.0862 }, zoom: 10, color: '#8b5cf6' },
  'Nyon': { center: { lat: 46.3833, lng: 6.2396 }, zoom: 11, color: '#ec4899' },
  'Nyon et région': { center: { lat: 46.3833, lng: 6.2396 }, zoom: 11, color: '#ec4899' },
  'Morges': { center: { lat: 46.5115, lng: 6.4984 }, zoom: 11, color: '#14b8a6' },
  'Yverdon': { center: { lat: 46.7785, lng: 6.6411 }, zoom: 11, color: '#06b6d4' },
  'Montreux': { center: { lat: 46.4312, lng: 6.9106 }, zoom: 11, color: '#a855f7' },
  'Vevey': { center: { lat: 46.4629, lng: 6.8432 }, zoom: 11, color: '#f43f5e' },
  'Sion': { center: { lat: 46.2339, lng: 7.3601 }, zoom: 11, color: '#10b981' },
  'Lavaux': { center: { lat: 46.4900, lng: 6.7500 }, zoom: 12, color: '#10b981' },
  'Riviera': { center: { lat: 46.4500, lng: 6.8500 }, zoom: 11, color: '#f59e0b' },
  'Chablais': { center: { lat: 46.3200, lng: 6.9500 }, zoom: 11, color: '#ef4444' },
  'Ouest-lausannois': { center: { lat: 46.5300, lng: 6.5500 }, zoom: 12, color: '#ec4899' },
  'Gros-de-Vaud': { center: { lat: 46.6500, lng: 6.6200 }, zoom: 11, color: '#14b8a6' },
  'Nord-vaudois': { center: { lat: 46.7800, lng: 6.5000 }, zoom: 10, color: '#6366f1' },
};

const MARKER_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

function getFlexibleCoords(regionName: string | null | undefined): { center: { lat: number; lng: number }; zoom: number; color: string } | null {
  if (!regionName) return null;

  if (REGIONS_DATA[regionName]) {
    return REGIONS_DATA[regionName];
  }

  const coords = getLocationCoords(regionName);
  if (coords) {
    const location = findLocation(regionName);
    let color = '#6366f1';

    if (location?.parent && REGIONS_DATA[location.parent]) {
      color = REGIONS_DATA[location.parent].color;
    } else if (location?.name && REGIONS_DATA[location.name]) {
      color = REGIONS_DATA[location.name].color;
    }

    return { center: { lat: coords[1], lng: coords[0] }, zoom: 11, color };
  }

  const normalizedRegion = regionName.toLowerCase();
  for (const [key, data] of Object.entries(REGIONS_DATA)) {
    if (normalizedRegion.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedRegion)) {
      return data;
    }
  }

  return null;
}

function parseRegions(regionString: string | null | undefined): string[] {
  if (!regionString) return [];
  return regionString.split(',').map(r => r.trim()).filter(Boolean);
}

interface Client {
  id: string;
  region_recherche?: string | null;
  budget_max?: number | null;
  type_recherche?: string | null;
  pieces?: number | null;
}

interface SwissRomandeMapProps {
  clients?: Client[];
  client?: Client | null;
  onRegionClick?: (region: string) => void;
  className?: string;
}

export function SwissRomandeMapGoogle({ clients = [], client = null, onRegionClick, className }: SwissRomandeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const dataLayerRef = useRef<google.maps.Data | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const { isLoaded, isLoading, error: mapsError } = useGoogleMapsLoader();

  const isSingleClientMode = !!client;
  const clientRegions = parseRegions(client?.region_recherche);

  const validClientRegions = useMemo(() => {
    if (!isSingleClientMode) return [];
    return clientRegions
      .map((region, index) => ({
        region,
        data: getFlexibleCoords(region),
        color: MARKER_COLORS[index % MARKER_COLORS.length],
      }))
      .filter(r => r.data !== null) as { region: string; data: { center: { lat: number; lng: number }; zoom: number; color: string }; color: string }[];
  }, [clientRegions, isSingleClientMode]);

  const regionStats = useMemo(() => {
    if (isSingleClientMode) return {};

    const stats: Record<string, { count: number; avgBudget: number; types: string[]; avgPieces: number }> = {};

    clients.forEach(c => {
      const region = c.region_recherche;
      if (!region) return;

      if (!stats[region]) {
        stats[region] = { count: 0, avgBudget: 0, types: [], avgPieces: 0 };
      }

      stats[region].count++;
      if (c.budget_max) {
        stats[region].avgBudget = (stats[region].avgBudget * (stats[region].count - 1) + c.budget_max) / stats[region].count;
      }
      if (c.type_recherche && !stats[region].types.includes(c.type_recherche)) {
        stats[region].types.push(c.type_recherche);
      }
      if (c.pieces) {
        stats[region].avgPieces = (stats[region].avgPieces * (stats[region].count - 1) + c.pieces) / stats[region].count;
      }
    });

    return stats;
  }, [clients, isSingleClientMode]);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

    try {
      let initialCenter = { lat: 46.5, lng: 6.8 };
      let initialZoom = 8;

      if (isSingleClientMode && validClientRegions.length === 1) {
        initialCenter = validClientRegions[0].data.center;
        initialZoom = validClientRegions[0].data.zoom;
      }

      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
          { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
        ],
      });

      infoWindowRef.current = new google.maps.InfoWindow();
      dataLayerRef.current = new google.maps.Data();
      dataLayerRef.current.setMap(mapRef.current);

      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing Google Map:', error);
      setMapError("Erreur d'initialisation de la carte");
    }
  }, [isLoaded, isSingleClientMode, validClientRegions]);

  // Update region boundaries
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !dataLayerRef.current) return;

    // Clear existing features
    dataLayerRef.current.forEach(feature => {
      dataLayerRef.current!.remove(feature);
    });

    if (isSingleClientMode && clientRegions.length > 0) {
      const boundaries = getRegionBoundaries(clientRegions);

      boundaries.forEach(boundary => {
        if (boundary.geometry.type === 'Polygon') {
          const coords = boundary.geometry.coordinates[0].map(
            (coord: number[]) => ({ lat: coord[1], lng: coord[0] })
          );

          dataLayerRef.current!.add({
            geometry: new google.maps.Data.Polygon([coords]),
            properties: { name: boundary.properties.name, color: boundary.properties.color },
          });
        }
      });

      dataLayerRef.current.setStyle(feature => ({
        fillColor: feature.getProperty('color') as string || '#6366f1',
        fillOpacity: 0.15,
        strokeColor: feature.getProperty('color') as string || '#6366f1',
        strokeWeight: 3,
        strokeOpacity: 0.8,
      }));
    }
  }, [mapLoaded, isSingleClientMode, clientRegions]);

  // Add markers
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const getDensityColor = (count: number): string => {
      if (count === 0) return '#6b7280';
      if (count <= 2) return '#22c55e';
      if (count <= 5) return '#f59e0b';
      return '#ef4444';
    };

    if (isSingleClientMode) {
      // Single client mode - show markers for each region
      validClientRegions.forEach(({ region, data, color }) => {
        const marker = new google.maps.Marker({
          position: data.center,
          map: mapRef.current!,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 20,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          title: region,
        });

        marker.addListener('click', () => {
          infoWindowRef.current!.setContent(`
            <div style="padding: 12px; min-width: 200px;">
              <h4 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: ${color};">${region}</h4>
              <div style="font-size: 13px; color: #666;">
                <p style="margin: 4px 0;"><strong>Budget:</strong> ${client?.budget_max?.toLocaleString() || 'Non défini'} CHF</p>
                <p style="margin: 4px 0;"><strong>Type:</strong> ${client?.type_recherche || 'Non défini'}</p>
                <p style="margin: 4px 0;"><strong>Pièces:</strong> ${client?.pieces || 'Non défini'}</p>
              </div>
            </div>
          `);
          infoWindowRef.current!.open(mapRef.current!, marker);
        });

        markersRef.current.push(marker);
      });

      // Fit bounds if multiple regions
      if (validClientRegions.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        validClientRegions.forEach(({ data }) => {
          bounds.extend(data.center);
        });
        mapRef.current.fitBounds(bounds, 60);
      }
    } else {
      // Multi-client mode
      Object.entries(regionStats).forEach(([region, stats]) => {
        const regionData = REGIONS_DATA[region];
        if (!regionData) return;

        const marker = new google.maps.Marker({
          position: regionData.center,
          map: mapRef.current!,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 18,
            fillColor: getDensityColor(stats.count),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          label: {
            text: stats.count.toString(),
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '14px',
          },
          title: region,
        });

        marker.addListener('click', () => {
          onRegionClick?.(region);
          mapRef.current!.panTo(regionData.center);
          mapRef.current!.setZoom(regionData.zoom);
          
          infoWindowRef.current!.setContent(`
            <div style="padding: 8px; min-width: 180px;">
              <strong style="font-size: 14px;">${region}</strong>
              <div style="margin-top: 8px; font-size: 12px;">
                <div>👥 <strong>${stats.count}</strong> client${stats.count > 1 ? 's' : ''}</div>
                <div>💰 Budget moy: <strong>${Math.round(stats.avgBudget).toLocaleString()} CHF</strong></div>
                <div>🏠 Pièces moy: <strong>${stats.avgPieces.toFixed(1)}</strong></div>
              </div>
            </div>
          `);
          infoWindowRef.current!.open(mapRef.current!, marker);
        });

        markersRef.current.push(marker);
      });

      // Add empty region markers
      Object.entries(REGIONS_DATA).forEach(([region, data]) => {
        if (regionStats[region]) return;

        const marker = new google.maps.Marker({
          position: data.center,
          map: mapRef.current!,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#d1d5db',
            fillOpacity: 0.7,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          label: {
            text: '0',
            color: '#6b7280',
            fontWeight: 'bold',
            fontSize: '12px',
          },
          title: region,
        });

        marker.addListener('click', () => {
          infoWindowRef.current!.setContent(`
            <div style="padding: 8px;">
              <strong>${region}</strong>
              <div style="margin-top: 4px; color: #22c55e; font-size: 12px;">
                ✨ Opportunité
              </div>
            </div>
          `);
          infoWindowRef.current!.open(mapRef.current!, marker);
        });

        markersRef.current.push(marker);
      });
    }
  }, [mapLoaded, regionStats, isSingleClientMode, validClientRegions, client, onRegionClick]);

  const resetView = () => {
    if (!mapRef.current) return;

    if (isSingleClientMode && validClientRegions.length > 0) {
      if (validClientRegions.length === 1) {
        mapRef.current.panTo(validClientRegions[0].data.center);
        mapRef.current.setZoom(validClientRegions[0].data.zoom);
      } else {
        const bounds = new google.maps.LatLngBounds();
        validClientRegions.forEach(({ data }) => {
          bounds.extend(data.center);
        });
        mapRef.current.fitBounds(bounds, 60);
      }
    } else {
      mapRef.current.panTo({ lat: 46.5, lng: 6.8 });
      mapRef.current.setZoom(8);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Chargement de Google Maps...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (mapsError || mapError) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-[400px] text-destructive gap-2">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{mapsError || mapError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {isSingleClientMode ? 'Zones de recherche' : 'Répartition des clients'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={resetView} className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {isSingleClientMode && clientRegions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {clientRegions.map((region, index) => (
              <span
                key={region}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${MARKER_COLORS[index % MARKER_COLORS.length]}20`,
                  color: MARKER_COLORS[index % MARKER_COLORS.length],
                }}
              >
                {region}
              </span>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapContainerRef} className="w-full h-[400px] rounded-b-lg" />
      </CardContent>
    </Card>
  );
}

export default SwissRomandeMapGoogle;

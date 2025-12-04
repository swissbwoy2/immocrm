import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getLocationCoords, findLocation } from '@/data/swissRomandeLocations';
import { getRegionBoundaries, swissRegionsBoundaries } from '@/data/swissRegionsBoundaries';
// Coordonnées des régions de Suisse Romande (fallback + couleurs)
const REGIONS_DATA: Record<string, { center: [number, number]; zoom: number; color: string }> = {
  'Genève': { center: [6.1432, 46.2044], zoom: 11, color: '#ef4444' },
  'Lausanne': { center: [6.6323, 46.5197], zoom: 11, color: '#f97316' },
  'Lausanne et région': { center: [6.6323, 46.5197], zoom: 10, color: '#f97316' },
  'Vaud': { center: [6.6323, 46.5197], zoom: 9, color: '#f97316' },
  'Fribourg': { center: [7.1598, 46.8065], zoom: 10, color: '#eab308' },
  'Neuchâtel': { center: [6.9319, 46.9920], zoom: 10, color: '#22c55e' },
  'Valais': { center: [7.6096, 46.3259], zoom: 9, color: '#3b82f6' },
  'Jura': { center: [7.0862, 47.3667], zoom: 10, color: '#8b5cf6' },
  'Nyon': { center: [6.2396, 46.3833], zoom: 11, color: '#ec4899' },
  'Nyon et région': { center: [6.2396, 46.3833], zoom: 11, color: '#ec4899' },
  'Morges': { center: [6.4984, 46.5115], zoom: 11, color: '#14b8a6' },
  'Yverdon': { center: [6.6411, 46.7785], zoom: 11, color: '#06b6d4' },
  'Montreux': { center: [6.9106, 46.4312], zoom: 11, color: '#a855f7' },
  'Vevey': { center: [6.8432, 46.4629], zoom: 11, color: '#f43f5e' },
  'Sion': { center: [7.3601, 46.2339], zoom: 11, color: '#10b981' },
  'Lavaux': { center: [6.7500, 46.4900], zoom: 12, color: '#10b981' },
  'Riviera': { center: [6.8500, 46.4500], zoom: 11, color: '#f59e0b' },
  'Chablais': { center: [6.9500, 46.3200], zoom: 11, color: '#ef4444' },
  'Ouest-lausannois': { center: [6.5500, 46.5300], zoom: 12, color: '#ec4899' },
  'Gros-de-Vaud': { center: [6.6200, 46.6500], zoom: 11, color: '#14b8a6' },
  'Nord-vaudois': { center: [6.5000, 46.7800], zoom: 10, color: '#6366f1' },
};

// Palette de couleurs pour les marqueurs multiples
const MARKER_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

// Fonction pour obtenir les coordonnées avec matching flexible
function getFlexibleCoords(regionName: string | null | undefined): { center: [number, number]; zoom: number; color: string } | null {
  if (!regionName) return null;
  
  // 1. Match exact dans REGIONS_DATA
  if (REGIONS_DATA[regionName]) {
    return REGIONS_DATA[regionName];
  }
  
  // 2. Utiliser le système de matching flexible
  const coords = getLocationCoords(regionName);
  if (coords) {
    // Trouver la couleur la plus proche
    const location = findLocation(regionName);
    let color = '#6366f1'; // default
    
    if (location?.parent && REGIONS_DATA[location.parent]) {
      color = REGIONS_DATA[location.parent].color;
    } else if (location?.name && REGIONS_DATA[location.name]) {
      color = REGIONS_DATA[location.name].color;
    }
    
    return { center: coords, zoom: 11, color };
  }
  
  // 3. Essayer de matcher partiellement avec les clés existantes
  const normalizedRegion = regionName.toLowerCase();
  for (const [key, data] of Object.entries(REGIONS_DATA)) {
    if (normalizedRegion.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedRegion)) {
      return data;
    }
  }
  
  return null;
}

// Parse multiple regions from comma-separated string
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

// Hook pour récupérer le token Mapbox
function useMapboxToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) throw error;
        if (data?.token) {
          setToken(data.token);
        } else {
          setError('Token Mapbox non configuré');
        }
      } catch (err) {
        console.error('Error fetching Mapbox token:', err);
        setError('Impossible de récupérer le token Mapbox');
      } finally {
        setLoading(false);
      }
    }
    
    fetchToken();
  }, []);

  return { token, loading, error };
}

export function SwissRomandeMap({ clients = [], client = null, onRegionClick, className }: SwissRomandeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const { token: mapboxToken, loading: tokenLoading, error: tokenError } = useMapboxToken();

  // Mode client unique ou multi-clients
  const isSingleClientMode = !!client;
  const clientRegions = parseRegions(client?.region_recherche);

  // Get all valid region coordinates for single client mode
  const validClientRegions = React.useMemo(() => {
    if (!isSingleClientMode) return [];
    return clientRegions
      .map((region, index) => ({
        region,
        data: getFlexibleCoords(region),
        color: MARKER_COLORS[index % MARKER_COLORS.length]
      }))
      .filter(r => r.data !== null) as { region: string; data: { center: [number, number]; zoom: number; color: string }; color: string }[];
  }, [clientRegions, isSingleClientMode]);

  // Calculer les stats par région (mode multi-clients)
  const regionStats = React.useMemo(() => {
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

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      // Déterminer le centre et zoom initial
      let initialCenter: [number, number] = [6.8, 46.5];
      let initialZoom = 8;

      if (isSingleClientMode && validClientRegions.length > 0) {
        if (validClientRegions.length === 1) {
          initialCenter = validClientRegions[0].data.center;
          initialZoom = validClientRegions[0].data.zoom;
        }
        // For multiple regions, we'll fit bounds after map loads
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: initialCenter,
        zoom: initialZoom,
        pitch: 0,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: false }),
        'top-right'
      );

      map.current.on('load', () => {
        // Add GeoJSON source for all region boundaries
        map.current!.addSource('swiss-regions', {
          type: 'geojson',
          data: swissRegionsBoundaries as GeoJSON.FeatureCollection
        });

        // Add fill layer (semi-transparent)
        map.current!.addLayer({
          id: 'region-fill',
          type: 'fill',
          source: 'swiss-regions',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0
          }
        });

        // Add outline layer
        map.current!.addLayer({
          id: 'region-outline',
          type: 'line',
          source: 'swiss-regions',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 0,
            'line-opacity': 0
          }
        });

        setMapLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('Erreur de chargement de la carte');
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Erreur d\'initialisation de la carte');
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, [mapboxToken, isSingleClientMode]);

  // Update region boundaries when selected regions change
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    
    if (isSingleClientMode && clientRegions.length > 0) {
      // Get boundaries for selected regions
      const boundaries = getRegionBoundaries(clientRegions);
      const boundaryNames = boundaries.map(b => b.properties.name);
      
      // Create filter for selected regions
      const filter: mapboxgl.FilterSpecification = boundaryNames.length > 0
        ? ['in', ['get', 'name'], ['literal', boundaryNames]]
        : ['==', ['get', 'name'], ''];
      
      // Update fill layer
      map.current.setFilter('region-fill', filter);
      map.current.setPaintProperty('region-fill', 'fill-opacity', 0.15);
      
      // Update outline layer
      map.current.setFilter('region-outline', filter);
      map.current.setPaintProperty('region-outline', 'line-width', 3);
      map.current.setPaintProperty('region-outline', 'line-opacity', 0.8);
    } else {
      // Hide boundaries in multi-client mode or when no regions
      map.current.setPaintProperty('region-fill', 'fill-opacity', 0);
      map.current.setPaintProperty('region-outline', 'line-width', 0);
      map.current.setPaintProperty('region-outline', 'line-opacity', 0);
    }
  }, [mapLoaded, isSingleClientMode, clientRegions]);

  // Ajouter les marqueurs
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (isSingleClientMode) {
      // Mode client unique - afficher plusieurs marqueurs pour chaque région
      validClientRegions.forEach(({ region, data, color }, index) => {
        const el = document.createElement('div');
        el.style.cssText = `
          width: 48px;
          height: 48px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          cursor: pointer;
        `;
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
          .setHTML(`
            <div style="padding: 12px; min-width: 200px;">
              <h4 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: ${color};">${region}</h4>
              <div style="font-size: 13px; color: #666;">
                <p style="margin: 4px 0;"><strong>Budget:</strong> ${client?.budget_max?.toLocaleString() || 'Non défini'} CHF</p>
                <p style="margin: 4px 0;"><strong>Type:</strong> ${client?.type_recherche || 'Non défini'}</p>
                <p style="margin: 4px 0;"><strong>Pièces:</strong> ${client?.pieces || 'Non défini'}</p>
              </div>
            </div>
          `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat(data.center)
          .setPopup(popup)
          .addTo(map.current!);

        el.addEventListener('mouseenter', () => popup.addTo(map.current!));
        el.addEventListener('mouseleave', () => popup.remove());
        
        markersRef.current.push(marker);
      });

      // Fit bounds to show all markers if multiple regions
      if (validClientRegions.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        validClientRegions.forEach(({ data }) => {
          bounds.extend(data.center);
        });
        map.current.fitBounds(bounds, { 
          padding: 60,
          maxZoom: 11,
          duration: 1000
        });
      }
    } else {
      // Mode multi-clients
      const getDensityColor = (count: number): string => {
        if (count === 0) return '#6b7280';
        if (count <= 2) return '#22c55e';
        if (count <= 5) return '#f59e0b';
        return '#ef4444';
      };

      Object.entries(regionStats).forEach(([region, stats]) => {
        const regionData = REGIONS_DATA[region];
        if (!regionData) return;

        const el = document.createElement('div');
        el.style.cssText = `
          background: ${getDensityColor(stats.count)};
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          transition: transform 0.2s;
        `;
        el.textContent = stats.count.toString();
        el.onmouseenter = () => { el.style.transform = 'scale(1.2)'; };
        el.onmouseleave = () => { el.style.transform = 'scale(1)'; };

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="padding: 8px; min-width: 180px;">
            <strong style="font-size: 14px;">${region}</strong>
            <div style="margin-top: 8px; font-size: 12px;">
              <div>👥 <strong>${stats.count}</strong> client${stats.count > 1 ? 's' : ''}</div>
              <div>💰 Budget moy: <strong>${Math.round(stats.avgBudget).toLocaleString()} CHF</strong></div>
              <div>🏠 Pièces moy: <strong>${stats.avgPieces.toFixed(1)}</strong></div>
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat(regionData.center)
          .setPopup(popup)
          .addTo(map.current!);

        el.onclick = () => {
          onRegionClick?.(region);
          map.current?.flyTo({
            center: regionData.center,
            zoom: regionData.zoom,
            duration: 1000,
          });
        };

        markersRef.current.push(marker);
      });

      // Marqueurs grisés pour régions vides
      Object.entries(REGIONS_DATA).forEach(([region, data]) => {
        if (regionStats[region]) return;

        const el = document.createElement('div');
        el.style.cssText = `
          background: #d1d5db;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 5px rgba(0,0,0,0.2);
          opacity: 0.7;
        `;
        el.textContent = '0';

        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
          <div style="padding: 8px;">
            <strong>${region}</strong>
            <div style="margin-top: 4px; color: #22c55e; font-size: 12px;">
              ✨ Opportunité
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat(data.center)
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }
  }, [mapLoaded, regionStats, isSingleClientMode, validClientRegions, client, onRegionClick]);

  const resetView = () => {
    if (!map.current) return;
    
    if (isSingleClientMode && validClientRegions.length > 0) {
      if (validClientRegions.length === 1) {
        map.current.flyTo({
          center: validClientRegions[0].data.center,
          zoom: validClientRegions[0].data.zoom,
          duration: 1000
        });
      } else {
        const bounds = new mapboxgl.LngLatBounds();
        validClientRegions.forEach(({ data }) => {
          bounds.extend(data.center);
        });
        map.current.fitBounds(bounds, { 
          padding: 60,
          maxZoom: 11,
          duration: 1000
        });
      }
    } else {
      map.current.flyTo({
        center: [6.8, 46.5],
        zoom: 8,
        duration: 1000
      });
    }
  };

  if (tokenLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (tokenError || mapError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Carte non disponible
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{tokenError || mapError}</p>
          <p className="text-xs text-muted-foreground mt-2">Configurez le secret MAPBOX_PUBLIC_TOKEN</p>
        </CardContent>
      </Card>
    );
  }

  // En mode client unique, ne pas afficher si aucune région valide
  if (isSingleClientMode && validClientRegions.length === 0) {
    return null;
  }

  // Generate title for single client mode
  const mapTitle = isSingleClientMode 
    ? validClientRegions.length === 1 
      ? `Localisation: ${validClientRegions[0].region}`
      : `Localisations (${validClientRegions.length})`
    : 'Répartition des clients';

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-5 h-5" />
            {mapTitle}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={resetView}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        {/* Show region badges in single client mode with multiple regions */}
        {isSingleClientMode && validClientRegions.length > 1 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {validClientRegions.map(({ region, color }) => (
              <span 
                key={region}
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: color }}
              >
                {region}
              </span>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={mapContainer} 
          className="w-full h-64 rounded-b-lg"
        />
      </CardContent>
    </Card>
  );
}

export default SwissRomandeMap;

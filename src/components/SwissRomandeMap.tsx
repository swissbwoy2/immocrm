import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Régions de Suisse romande avec leurs coordonnées approximatives
const REGIONS_DATA: Record<string, { center: [number, number]; zoom: number; color: string }> = {
  'Genève': { center: [6.1432, 46.2044], zoom: 11, color: '#3b82f6' },
  'Lausanne et région': { center: [6.6323, 46.5197], zoom: 11, color: '#8b5cf6' },
  'Nyon et région': { center: [6.2398, 46.3833], zoom: 11, color: '#06b6d4' },
  'Lavaux': { center: [6.7500, 46.4900], zoom: 12, color: '#10b981' },
  'Riviera': { center: [6.8500, 46.4500], zoom: 11, color: '#f59e0b' },
  'Chablais': { center: [6.9500, 46.3200], zoom: 11, color: '#ef4444' },
  'Ouest lausannois': { center: [6.5500, 46.5300], zoom: 12, color: '#ec4899' },
  'Gros-de-Vaud': { center: [6.6200, 46.6500], zoom: 11, color: '#14b8a6' },
  'Nord-vaudois': { center: [6.5000, 46.7800], zoom: 10, color: '#6366f1' },
  'Fribourg': { center: [7.1598, 46.8065], zoom: 11, color: '#84cc16' },
  'Valais': { center: [7.3600, 46.2300], zoom: 9, color: '#f97316' },
  'Neuchâtel': { center: [6.9310, 46.9920], zoom: 11, color: '#a855f7' },
  'Jura': { center: [7.0872, 47.3667], zoom: 10, color: '#22c55e' },
};

interface Client {
  id: string;
  region_recherche?: string | null;
  budget_max?: number | null;
  type_recherche?: string | null;
  pieces?: number | null;
  date_ajout?: string | null;
  created_at?: string | null;
}

interface SwissRomandeMapProps {
  clients: Client[];
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

export function SwissRomandeMap({ clients, onRegionClick, className }: SwissRomandeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Récupérer le token via l'edge function
  const { token: mapboxToken, loading: tokenLoading, error: tokenError } = useMapboxToken();

  // Calculer les stats par région
  const regionStats = React.useMemo(() => {
    const stats: Record<string, { count: number; avgBudget: number; types: Record<string, number>; avgPieces: number }> = {};
    
    clients.forEach(client => {
      const region = client.region_recherche;
      if (!region) return;
      
      if (!stats[region]) {
        stats[region] = { count: 0, avgBudget: 0, types: {}, avgPieces: 0 };
      }
      
      stats[region].count++;
      stats[region].avgBudget += client.budget_max || 0;
      
      const type = client.type_recherche || 'Non spécifié';
      stats[region].types[type] = (stats[region].types[type] || 0) + 1;
      
      stats[region].avgPieces += client.pieces || 0;
    });
    
    // Calculer les moyennes
    Object.keys(stats).forEach(region => {
      if (stats[region].count > 0) {
        stats[region].avgBudget = Math.round(stats[region].avgBudget / stats[region].count);
        stats[region].avgPieces = Math.round(stats[region].avgPieces / stats[region].count * 10) / 10;
      }
    });
    
    return stats;
  }, [clients]);

  // Obtenir la couleur selon la densité
  const getDensityColor = (count: number): string => {
    if (count === 0) return '#6b7280'; // gray
    if (count <= 2) return '#22c55e'; // green - opportunité
    if (count <= 5) return '#f59e0b'; // orange - demande moyenne
    return '#ef4444'; // red - forte demande
  };

  // Initialiser la carte une fois le token disponible
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [6.8, 46.5], // Centre de la Suisse romande
        zoom: 8,
        pitch: 0,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: false }),
        'top-right'
      );

      map.current.on('load', () => {
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
  }, [mapboxToken]);

  // Ajouter les marqueurs quand la carte est chargée
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // Supprimer les anciens marqueurs
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Ajouter un marqueur par région avec des clients
    Object.entries(regionStats).forEach(([region, stats]) => {
      const regionData = REGIONS_DATA[region];
      if (!regionData) return;

      const el = document.createElement('div');
      el.className = 'region-marker';
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
            <div>💰 Budget moy: <strong>${stats.avgBudget.toLocaleString()} CHF</strong></div>
            <div>🏠 Pièces moy: <strong>${stats.avgPieces}</strong></div>
            <div style="margin-top: 4px; color: #666;">
              ${Object.entries(stats.types).map(([type, count]) => `${type}: ${count}`).join(', ')}
            </div>
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat(regionData.center)
        .setPopup(popup)
        .addTo(map.current!);

      el.onclick = () => {
        setSelectedRegion(region);
        onRegionClick?.(region);
        map.current?.flyTo({
          center: regionData.center,
          zoom: regionData.zoom,
          duration: 1000,
        });
      };

      markersRef.current.push(marker);
    });

    // Ajouter des marqueurs grisés pour les régions sans clients
    Object.entries(REGIONS_DATA).forEach(([region, data]) => {
      if (regionStats[region]) return; // Déjà affiché

      const el = document.createElement('div');
      el.className = 'region-marker-empty';
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
            ✨ Opportunité ! Aucun client dans cette région
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat(data.center)
        .setPopup(popup)
        .addTo(map.current!);

      el.onclick = () => {
        setSelectedRegion(region);
        onRegionClick?.(region);
      };

      markersRef.current.push(marker);
    });

  }, [mapLoaded, regionStats, onRegionClick]);

  // Réinitialiser la vue
  const resetView = () => {
    setSelectedRegion(null);
    map.current?.flyTo({
      center: [6.8, 46.5],
      zoom: 8,
      duration: 1000,
    });
  };

  // État de chargement
  if (tokenLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Carte Suisse Romande
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <div className="text-center text-muted-foreground">
              <Loader2 className="w-12 h-12 mx-auto mb-2 animate-spin opacity-50" />
              <p>Chargement de la carte...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Erreur de token ou de carte
  if (tokenError || mapError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Carte Suisse Romande
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{tokenError || mapError}</p>
              <p className="text-sm mt-2">
                Configurez le token Mapbox dans les paramètres
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Carte Suisse Romande
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedRegion && (
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-muted"
                onClick={resetView}
              >
                {selectedRegion} ✕
              </Badge>
            )}
          </div>
        </div>
        
        {/* Légende */}
        <div className="flex flex-wrap gap-3 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
            <span>1-2 clients</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
            <span>3-5 clients</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
            <span>6+ clients</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#d1d5db]"></div>
            <span>Opportunité</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapContainer} 
          className="w-full h-[400px] rounded-lg overflow-hidden"
        />
        
        {/* Stats rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold">{Object.keys(regionStats).length}</p>
            <p className="text-xs text-muted-foreground">Régions actives</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold">{clients.length}</p>
            <p className="text-xs text-muted-foreground">Total clients</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold">
              {Object.keys(REGIONS_DATA).length - Object.keys(regionStats).length}
            </p>
            <p className="text-xs text-muted-foreground">Opportunités</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold">
              {Math.max(...Object.values(regionStats).map(s => s.count), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Max par région</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

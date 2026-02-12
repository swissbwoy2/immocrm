import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Clock, Navigation, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { AddressLink } from '@/components/AddressLink';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CoursierCarte() {
  const { user } = useAuth();
  const { isLoaded, isLoading: mapsLoading, isFallback, retry } = useGoogleMapsLoader();
  const [coursierId, setCoursierId] = useState<string | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data: coursierData } = await supabase
        .from('coursiers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (coursierData) setCoursierId(coursierData.id);

      const { data } = await supabase
        .from('visites')
        .select('*, offres(pieces, surface, prix)')
        .or(`statut_coursier.eq.en_attente${coursierData ? `,coursier_id.eq.${coursierData.id}` : ''}`)
        .gte('date_visite', new Date().toISOString())
        .order('date_visite', { ascending: true });

      setMissions(data || []);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMissions = missions.filter(m => {
    if (filter === 'available') return m.statut_coursier === 'en_attente';
    if (filter === 'mine') return m.coursier_id === coursierId && m.statut_coursier === 'accepte';
    return true;
  });

  const initMap = useCallback(async () => {
    if (!mapRef.current || !isLoaded || !window.google?.maps) return;

    try {
      const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
      await google.maps.importLibrary("marker");

      const map = new Map(mapRef.current, {
        center: { lat: 46.52, lng: 6.63 }, // Lausanne
        zoom: 10,
        mapId: 'coursier-missions-map',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;
      geocoderRef.current = new google.maps.Geocoder();

      geocodeAndPlaceMarkers();
    } catch (err) {
      console.error('[CoursierCarte] Map init error:', err);
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && !loading) initMap();
  }, [isLoaded, loading, initMap]);

  useEffect(() => {
    if (mapInstanceRef.current && geocoderRef.current) {
      geocodeAndPlaceMarkers();
    }
  }, [filteredMissions]);

  const geocodeAndPlaceMarkers = async () => {
    if (!mapInstanceRef.current || !geocoderRef.current) return;

    // Clear old markers
    markersRef.current.forEach(m => (m.map = null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    for (const mission of filteredMissions) {
      if (!mission.adresse) continue;
      try {
        const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoderRef.current!.geocode(
            { address: mission.adresse + ', Suisse' },
            (results, status) => {
              if (status === 'OK' && results) resolve(results);
              else reject(status);
            }
          );
        });

        const pos = result[0].geometry.location;
        const isAvailable = mission.statut_coursier === 'en_attente';

        const pinEl = document.createElement('div');
        pinEl.className = 'flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg cursor-pointer';
        pinEl.style.backgroundColor = isAvailable ? '#22c55e' : '#f59e0b';
        pinEl.style.borderColor = isAvailable ? '#16a34a' : '#d97706';
        pinEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`;

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstanceRef.current!,
          position: pos,
          content: pinEl,
          title: mission.adresse,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="max-width:240px;font-family:system-ui">
              <p style="font-weight:600;margin:0 0 4px">${mission.adresse}</p>
              <p style="color:#666;font-size:13px;margin:0 0 8px">${format(new Date(mission.date_visite), "EEE dd MMM 'à' HH:mm", { locale: fr })}</p>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mission.adresse)}" 
                 target="_blank" rel="noopener" 
                 style="color:#2563eb;font-size:13px;text-decoration:none">
                📍 Itinéraire
              </a>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current!, marker);
          setSelectedId(mission.id);
        });

        markersRef.current.push(marker);
        bounds.extend(pos);
        hasPoints = true;
      } catch {
        // Geocoding failed for this address, skip
      }
    }

    if (hasPoints) {
      mapInstanceRef.current.fitBounds(bounds);
      if (filteredMissions.length === 1) {
        mapInstanceRef.current.setZoom(14);
      }
    }
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          icon={MapPin}
          title="Carte des missions"
          subtitle="Visualisez les missions sur la carte et planifiez vos trajets"
        />

        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les missions</SelectItem>
              <SelectItem value="available">Disponibles</SelectItem>
              <SelectItem value="mine">Mes missions</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filteredMissions.length} mission(s)</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '500px' }}>
          {/* Liste compacte */}
          <div className="lg:col-span-1 space-y-3 overflow-y-auto max-h-[600px]">
            {filteredMissions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <MapPin className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucune mission à afficher</p>
                </CardContent>
              </Card>
            ) : (
              filteredMissions.map(m => (
                <Card
                  key={m.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedId === m.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedId(m.id)}
                >
                  <CardContent className="pt-4 pb-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <AddressLink address={m.adresse} className="text-sm font-medium" truncate />
                      <Badge className={m.statut_coursier === 'en_attente'
                        ? 'bg-green-500/10 text-green-600 border-green-500/30 text-xs'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs'
                      }>
                        {m.statut_coursier === 'en_attente' ? 'Dispo' : 'En cours'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(m.date_visite), "EEE dd MMM 'à' HH:mm", { locale: fr })}
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(m.adresse)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      <Navigation className="h-3 w-3" />
                      Itinéraire
                    </a>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Carte */}
          <div className="lg:col-span-2">
            <Card className="h-full min-h-[500px]">
              <CardContent className="p-0 h-full">
                {mapsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-3 text-muted-foreground">Chargement de la carte...</span>
                  </div>
                ) : isFallback ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
                    <AlertTriangle className="h-10 w-10 text-amber-500" />
                    <p className="text-muted-foreground text-center">Carte non disponible</p>
                    <Button variant="outline" onClick={retry}>Réessayer</Button>
                  </div>
                ) : (
                  <div ref={mapRef} className="w-full h-full rounded-xl" style={{ minHeight: '500px' }} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

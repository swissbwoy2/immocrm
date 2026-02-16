import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Navigation, Loader2, AlertTriangle, Route, RotateCcw, ExternalLink } from 'lucide-react';
import { AddressLink } from '@/components/AddressLink';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StatusConfig {
  [key: string]: { label: string; className: string };
}

interface Mission {
  id: string;
  adresse: string;
  date_visite: string;
  date_visite_fin?: string | null;
  [key: string]: any;
}

interface OptimizedRoute {
  order: number[];
  legs: { duration: string; distance: string }[];
  directionsResult: google.maps.DirectionsResult;
}

interface VisitesMapViewProps {
  missions: Mission[];
  loading: boolean;
  statusField: string;
  statusConfig: StatusConfig;
  filterOptions?: { value: string; label: string }[];
  filter?: string;
  onFilterChange?: (value: string) => void;
}

export function VisitesMapView({
  missions,
  loading,
  statusField,
  statusConfig,
  filterOptions,
  filter,
  onFilterChange,
}: VisitesMapViewProps) {
  const { isLoaded, isLoading: mapsLoading, isFallback, retry } = useGoogleMapsLoader();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const displayMissions = optimizedRoute
    ? optimizedRoute.order.map(i => missions[i])
    : missions;

  const initMap = useCallback(async () => {
    if (!mapRef.current || !isLoaded || !window.google?.maps) return;
    try {
      const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
      await google.maps.importLibrary("marker");

      const map = new Map(mapRef.current, {
        center: { lat: 46.52, lng: 6.63 },
        zoom: 10,
        mapId: 'visites-map',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;
      geocoderRef.current = new google.maps.Geocoder();
      geocodeAndPlaceMarkers();
    } catch (err) {
      console.error('[VisitesMapView] Map init error:', err);
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && !loading) initMap();
  }, [isLoaded, loading, initMap]);

  useEffect(() => {
    if (mapInstanceRef.current && geocoderRef.current && !optimizedRoute) {
      geocodeAndPlaceMarkers();
    }
  }, [missions, optimizedRoute]);

  const geocodeAndPlaceMarkers = async () => {
    if (!mapInstanceRef.current || !geocoderRef.current) return;

    markersRef.current.forEach(m => (m.map = null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    for (const mission of missions) {
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
        const statusValue = mission[statusField] || '';
        const config = statusConfig[statusValue] || { label: statusValue, className: 'bg-muted text-muted-foreground' };

        const pinEl = document.createElement('div');
        pinEl.className = 'flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg cursor-pointer';
        pinEl.style.backgroundColor = '#2563eb';
        pinEl.style.borderColor = '#1d4ed8';
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
              <p style="color:#666;font-size:13px;margin:0 0 4px">${config.label}</p>
              <p style="color:#666;font-size:13px;margin:0 0 8px">${format(new Date(mission.date_visite), "EEE dd MMM", { locale: fr })} ${mission.date_visite_fin ? `de ${format(new Date(mission.date_visite), "HH:mm")} à ${format(new Date(mission.date_visite_fin), "HH:mm")}` : `à ${format(new Date(mission.date_visite), "HH:mm")}`}</p>
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
        // skip
      }
    }

    if (hasPoints) {
      mapInstanceRef.current.fitBounds(bounds);
      if (missions.length === 1) {
        mapInstanceRef.current.setZoom(14);
      }
    }
  };

  const optimizeRoute = async () => {
    if (missions.length < 2 || !isLoaded) return;
    setIsOptimizing(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const origin = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserPosition(origin);

      const addresses = missions.filter(m => m.adresse).map(m => m.adresse + ', Suisse');
      if (addresses.length < 2) { setIsOptimizing(false); return; }

      const directionsService = new google.maps.DirectionsService();
      const lastAddress = addresses[addresses.length - 1];
      const waypointAddresses = addresses.slice(0, -1);

      const result = await directionsService.route({
        origin,
        destination: lastAddress,
        waypoints: waypointAddresses.map(addr => ({ location: addr, stopover: true })),
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      if (result.routes?.[0]) {
        const route = result.routes[0];
        const waypointOrder = route.waypoint_order || [];
        const fullOrder = [...waypointOrder, addresses.length - 1];

        const legs = route.legs.map(leg => ({
          duration: leg.duration?.text || '',
          distance: leg.distance?.text || '',
        }));

        markersRef.current.forEach(m => (m.map = null));
        markersRef.current = [];

        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
        }
        const renderer = new google.maps.DirectionsRenderer({
          map: mapInstanceRef.current!,
          directions: result,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#2563eb',
            strokeWeight: 5,
            strokeOpacity: 0.8,
          },
        });
        directionsRendererRef.current = renderer;

        setOptimizedRoute({ order: fullOrder, legs, directionsResult: result });
      }
    } catch (err: any) {
      console.error('[VisitesMapView] Route optimization error:', err);
      if (err.code === 1) {
        alert('Veuillez autoriser la géolocalisation pour optimiser votre trajet.');
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const resetRoute = () => {
    setOptimizedRoute(null);
    setUserPosition(null);
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    if (mapInstanceRef.current && geocoderRef.current) {
      geocodeAndPlaceMarkers();
    }
  };

  const launchGoogleMapsRoute = () => {
    if (!optimizedRoute || !userPosition) return;
    const orderedMissions = optimizedRoute.order.map(i => missions[i]).filter(m => m.adresse);
    if (orderedMissions.length === 0) return;

    const destination = encodeURIComponent(orderedMissions[orderedMissions.length - 1].adresse);
    const waypoints = orderedMissions.slice(0, -1).map(m => encodeURIComponent(m.adresse)).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userPosition.lat},${userPosition.lng}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">{missions.length} visite(s)</Badge>

        {!optimizedRoute ? (
          <Button
            variant="default"
            size="sm"
            onClick={optimizeRoute}
            disabled={missions.length < 2 || !isLoaded || isOptimizing}
            className="gap-2"
          >
            {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
            {isOptimizing ? 'Calcul en cours...' : 'Optimiser mon trajet'}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={launchGoogleMapsRoute} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Lancer l'itinéraire
            </Button>
            <Button variant="outline" size="sm" onClick={resetRoute} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '500px' }}>
        {/* Liste */}
        <div className="lg:col-span-1 space-y-3 overflow-y-auto max-h-[600px]">
          {displayMissions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <MapPin className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucune visite à afficher</p>
              </CardContent>
            </Card>
          ) : (
            displayMissions.map((m, idx) => {
              const legInfo = optimizedRoute?.legs[idx];
              const statusValue = m[statusField] || '';
              const config = statusConfig[statusValue] || { label: statusValue, className: 'bg-muted text-muted-foreground' };

              return (
                <Card
                  key={m.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedId === m.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedId(m.id)}
                >
                  <CardContent className="pt-4 pb-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {optimizedRoute && (
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                        )}
                        <AddressLink address={m.adresse} className="text-sm font-medium" truncate />
                      </div>
                      <Badge className={`${config.className} text-xs`}>
                        {config.label}
                      </Badge>
                    </div>

                    {legInfo && (
                      <div className="flex items-center gap-2 text-xs font-medium text-primary">
                        <Navigation className="h-3 w-3" />
                        {idx === 0 ? 'Depuis votre position' : `Depuis étape ${idx}`} — {legInfo.duration} ({legInfo.distance})
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(m.date_visite), "EEE dd MMM", { locale: fr })}{' '}
                      {m.date_visite_fin
                        ? `de ${format(new Date(m.date_visite), "HH:mm")} à ${format(new Date(m.date_visite_fin), "HH:mm")}`
                        : `à ${format(new Date(m.date_visite), "HH:mm")}`
                      }
                    </div>
                    {!optimizedRoute && (
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
                    )}
                  </CardContent>
                </Card>
              );
            })
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
  );
}

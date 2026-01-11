import { useEffect, useRef, useState, useCallback } from 'react';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { MapPin, Loader2 } from 'lucide-react';

interface Annonce {
  id: string;
  slug: string | null;
  titre: string;
  prix: number;
  type_transaction: string;
  latitude: number | null;
  longitude: number | null;
  ville: string;
  code_postal: string;
  surface_habitable: number | null;
  nombre_pieces: number | null;
  photos_annonces_publiques?: { url: string; est_principale: boolean }[];
}

interface PublicAnnoncesMapProps {
  annonces: Annonce[];
  onAnnonceClick?: (annonceId: string, slug: string | null) => void;
  hoveredAnnonceId?: string | null;
  onMarkerHover?: (annonceId: string | null) => void;
}

const formatPrice = (prix: number, type: string): string => {
  const formatted = new Intl.NumberFormat('fr-CH', { 
    maximumFractionDigits: 0 
  }).format(prix);
  return type === 'location' ? `${formatted}/mois` : formatted;
};

export function PublicAnnoncesMap({ 
  annonces, 
  onAnnonceClick,
  hoveredAnnonceId,
  onMarkerHover
}: PublicAnnoncesMapProps) {
  const { isLoaded, isLoading, isFallback } = useGoogleMapsLoader();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Filter annonces with valid coordinates
  const annoncesWithCoords = annonces.filter(
    a => a.latitude !== null && a.longitude !== null
  );

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 46.8, lng: 7.0 }, // Suisse romande center
      zoom: 9,
      mapId: 'public-annonces-map',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();
    setMapReady(true);

    return () => {
      mapInstanceRef.current = null;
      infoWindowRef.current = null;
      setMapReady(false);
    };
  }, [isLoaded]);

  // Create price marker element
  const createMarkerElement = useCallback((annonce: Annonce, isHovered: boolean) => {
    const container = document.createElement('div');
    container.className = `
      px-2 py-1 rounded-lg font-semibold text-xs cursor-pointer
      transition-all duration-200 shadow-md
      ${isHovered 
        ? 'bg-primary text-primary-foreground scale-110 z-50' 
        : 'bg-background text-foreground border border-border hover:bg-primary hover:text-primary-foreground'
      }
    `;
    container.innerHTML = `CHF ${formatPrice(annonce.prix, annonce.type_transaction)}`;
    return container;
  }, []);

  // Create/update markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const existingMarkerIds = new Set(markersRef.current.keys());
    const currentAnnonceIds = new Set(annoncesWithCoords.map(a => a.id));

    // Remove markers for annonces no longer in the list
    existingMarkerIds.forEach(id => {
      if (!currentAnnonceIds.has(id)) {
        const marker = markersRef.current.get(id);
        if (marker) {
          marker.map = null;
          markersRef.current.delete(id);
        }
      }
    });

    // Create or update markers
    annoncesWithCoords.forEach(annonce => {
      const isHovered = hoveredAnnonceId === annonce.id;
      const existingMarker = markersRef.current.get(annonce.id);

      if (existingMarker) {
        // Update existing marker content
        existingMarker.content = createMarkerElement(annonce, isHovered);
        if (isHovered) {
          existingMarker.zIndex = 1000;
        } else {
          existingMarker.zIndex = 1;
        }
      } else {
        // Create new marker
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: annonce.latitude!, lng: annonce.longitude! },
          content: createMarkerElement(annonce, isHovered),
          title: annonce.titre,
        });

        // Click handler
        marker.addListener('click', () => {
          const photo = annonce.photos_annonces_publiques?.find(p => p.est_principale)?.url 
            || annonce.photos_annonces_publiques?.[0]?.url;

          const infoContent = `
            <div style="max-width: 250px; cursor: pointer;" id="info-${annonce.id}">
              ${photo ? `<img src="${photo}" alt="${annonce.titre}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : ''}
              <h3 style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${annonce.titre}</h3>
              <p style="font-weight: 700; color: hsl(var(--primary)); margin-bottom: 4px;">
                CHF ${formatPrice(annonce.prix, annonce.type_transaction)}
              </p>
              <p style="font-size: 12px; color: #666;">
                ${annonce.nombre_pieces ? `${annonce.nombre_pieces} pièces` : ''}
                ${annonce.nombre_pieces && annonce.surface_habitable ? ' • ' : ''}
                ${annonce.surface_habitable ? `${annonce.surface_habitable} m²` : ''}
              </p>
              <p style="font-size: 12px; color: #666;">${annonce.code_postal} ${annonce.ville}</p>
            </div>
          `;

          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(infoContent);
            infoWindowRef.current.open(map, marker);

            // Add click listener to info window content after it's rendered
            google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
              const infoEl = document.getElementById(`info-${annonce.id}`);
              if (infoEl) {
                infoEl.addEventListener('click', () => {
                  onAnnonceClick?.(annonce.id, annonce.slug);
                });
              }
            });
          }
        });

        // Hover handlers
        marker.content?.addEventListener?.('mouseenter', () => {
          onMarkerHover?.(annonce.id);
        });
        marker.content?.addEventListener?.('mouseleave', () => {
          onMarkerHover?.(null);
        });

        markersRef.current.set(annonce.id, marker);
      }
    });

    // Fit bounds to markers
    if (annoncesWithCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      annoncesWithCoords.forEach(a => {
        bounds.extend({ lat: a.latitude!, lng: a.longitude! });
      });
      map.fitBounds(bounds, 50);

      // Don't zoom in too much
      const listener = google.maps.event.addListener(map, 'idle', () => {
        const zoom = map.getZoom();
        if (zoom && zoom > 15) {
          map.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }, [mapReady, annoncesWithCoords, hoveredAnnonceId, createMarkerElement, onAnnonceClick, onMarkerHover]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full w-full bg-muted rounded-xl flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
          <p className="text-sm">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  // Fallback state
  if (isFallback || !isLoaded) {
    return (
      <div className="h-full w-full bg-muted rounded-xl flex items-center justify-center">
        <div className="text-center text-muted-foreground p-4">
          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Carte non disponible</p>
          <p className="text-sm mt-1">
            {annoncesWithCoords.length} annonce{annoncesWithCoords.length !== 1 ? 's' : ''} avec coordonnées
          </p>
        </div>
      </div>
    );
  }

  // No geocoded annonces
  if (annoncesWithCoords.length === 0) {
    return (
      <div className="h-full w-full bg-muted rounded-xl flex items-center justify-center">
        <div className="text-center text-muted-foreground p-4">
          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Aucune annonce géolocalisée</p>
          <p className="text-sm mt-1">Les annonces n'ont pas de coordonnées GPS</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="h-full w-full rounded-xl overflow-hidden" />
  );
}

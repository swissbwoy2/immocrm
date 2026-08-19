import { useEffect, useRef, useState, useMemo } from 'react';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { MapPin, Loader2 } from 'lucide-react';
import { externalListingPlaceholderHtml } from '@/components/public/ExternalListingPlaceholder';


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
  /** Annonce sourcée : lien externe d'origine */
  lien_annonce?: string | null;
  /** true si le clic peut ouvrir la fiche interne */
  allowInternalDetail?: boolean;
}

interface PublicAnnoncesMapProps {
  annonces: Annonce[];
  onAnnonceClick?: (annonceId: string, slug: string | null) => void;
  hoveredAnnonceId?: string | null;
  onMarkerHover?: (annonceId: string | null) => void;
  searchCenter?: { lat: number; lng: number } | null;
  radiusKm?: number;
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
  onMarkerHover,
  searchCenter,
  radiusKm = 20
}: PublicAnnoncesMapProps) {
  const { isLoaded, isLoading, isFallback } = useGoogleMapsLoader();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Filter annonces with valid numeric coordinates (values may arrive as strings from the DB)
  const annoncesWithCoords = useMemo(() => {
    return annonces
      .map((a) => {
        const lat = a.latitude === null || a.latitude === undefined ? NaN : Number(a.latitude);
        const lng = a.longitude === null || a.longitude === undefined ? NaN : Number(a.longitude);
        return { annonce: a, lat, lng };
      })
      .filter(
        ({ lat, lng }) =>
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          Math.abs(lat) <= 90 &&
          Math.abs(lng) <= 180 &&
          !(lat === 0 && lng === 0)
      );
  }, [annonces]);

  // Initialize map with error handling
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 46.8, lng: 7.0 }, // Suisse romande center
        zoom: 9,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();
      setMapReady(true);
      setMapError(false);
    } catch (error) {
      console.error('Error initializing Google Map:', error);
      setMapError(true);
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      mapInstanceRef.current = null;
      infoWindowRef.current = null;
      setMapReady(false);
    };
  }, [isLoaded]);


  // Draw search radius circle
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    // Remove existing circle
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    // Draw new circle if we have a search center
    if (searchCenter) {
      circleRef.current = new google.maps.Circle({
        map: mapInstanceRef.current,
        center: searchCenter,
        radius: radiusKm * 1000, // Convert km to meters
        strokeColor: 'hsl(221.2, 83.2%, 53.3%)',
        strokeOpacity: 0.4,
        strokeWeight: 2,
        fillColor: 'hsl(221.2, 83.2%, 53.3%)',
        fillOpacity: 0.08,
        clickable: false,
      });

      // Center map on search location if no annonces
      if (annonces.length === 0) {
        mapInstanceRef.current.setCenter(searchCenter);
        mapInstanceRef.current.setZoom(11);
      }
    }
  }, [mapReady, searchCenter, radiusKm, annonces.length]);




  // Create/update markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const existingMarkerIds = new Set(markersRef.current.keys());
    const currentAnnonceIds = new Set(annoncesWithCoords.map(e => e.annonce.id));

    // Remove markers for annonces no longer in the list
    existingMarkerIds.forEach(id => {
      if (!currentAnnonceIds.has(id)) {
        const marker = markersRef.current.get(id);
        if (marker) {
          (marker as google.maps.Marker).setMap(null);
          markersRef.current.delete(id);
        }
      }
    });

    // Create or update markers
    annoncesWithCoords.forEach(({ annonce, lat, lng }) => {
      const isHovered = hoveredAnnonceId === annonce.id;
      const position = { lat, lng };
      const existingMarker = markersRef.current.get(annonce.id) as google.maps.Marker | undefined;

      if (existingMarker) {
        existingMarker.setPosition(position);
        existingMarker.setZIndex(isHovered ? 1000 : 1);
        const icon = existingMarker.getIcon() as google.maps.Symbol | undefined;
        if (icon && typeof icon === 'object' && 'path' in icon) {
          existingMarker.setIcon({ ...icon, fillColor: isHovered ? 'hsl(142, 72%, 29%)' : 'hsl(142, 65%, 38%)' });
        }
        return;
      }


      const showInfoWindow = () => {
        const isExternal = !!annonce.lien_annonce && !annonce.allowInternalDetail;
        const photo = isExternal
          ? undefined
          : annonce.photos_annonces_publiques?.find(p => p.est_principale)?.url
            || annonce.photos_annonces_publiques?.[0]?.url;

        const infoContent = `
          <div style="max-width: 250px; cursor: pointer;" id="info-${annonce.id}">
            ${isExternal ? externalListingPlaceholderHtml(120) : (photo ? `<img src="${photo}" alt="${annonce.titre}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : '')}

            <h3 style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${annonce.titre}</h3>
            <p style="font-weight: 700; margin-bottom: 4px;">
              CHF ${formatPrice(annonce.prix, annonce.type_transaction)}
            </p>
            <p style="font-size: 12px; color: #666;">
              ${annonce.nombre_pieces ? `${annonce.nombre_pieces} pièces` : ''}
              ${annonce.nombre_pieces && annonce.surface_habitable ? ' • ' : ''}
              ${annonce.surface_habitable ? `${annonce.surface_habitable} m²` : ''}
            </p>
            <p style="font-size: 12px; color: #666;">${annonce.code_postal} ${annonce.ville}</p>
            ${annonce.lien_annonce && !annonce.allowInternalDetail ? '<p style="font-size: 11px; color: #16a34a; margin-top: 6px; font-weight: 600;">Voir l\'annonce d\'origine ↗</p>' : ''}
          </div>
        `;

        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(map, markersRef.current.get(annonce.id));

          google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
            const infoEl = document.getElementById(`info-${annonce.id}`);
            if (infoEl) {
              infoEl.addEventListener('click', () => {
                if (annonce.lien_annonce && !annonce.allowInternalDetail) {
                  window.open(annonce.lien_annonce, '_blank', 'noopener,noreferrer');
                  return;
                }
                onAnnonceClick?.(annonce.id, annonce.slug);
              });
            }
          });
        }
      };

      const label = annonce.prix
        ? new Intl.NumberFormat('fr-CH', { notation: 'compact', maximumFractionDigits: 0 }).format(annonce.prix)
        : '•';

      const marker = new google.maps.Marker({
        map,
        position,
        title: annonce.titre,
        zIndex: isHovered ? 1000 : 1,
        label: { text: label, color: '#ffffff', fontSize: '11px', fontWeight: '600' },
        icon: {
          path: 'M -22,-12 H 22 a 6,6 0 0 1 6,6 v 0 a 6,6 0 0 1 -6,6 H -22 a 6,6 0 0 1 -6,-6 v 0 a 6,6 0 0 1 6,-6 z',
          fillColor: isHovered ? 'hsl(142, 72%, 29%)' : 'hsl(142, 65%, 38%)',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 1,
          labelOrigin: new google.maps.Point(0, -6),
        },
      });


      marker.addListener('click', showInfoWindow);
      marker.addListener('mouseover', () => onMarkerHover?.(annonce.id));
      marker.addListener('mouseout', () => onMarkerHover?.(null));

      markersRef.current.set(annonce.id, marker);
    });

    // Fit bounds to markers
    if (annoncesWithCoords.length === 1) {
      const { lat, lng } = annoncesWithCoords[0];
      map.setCenter({ lat, lng });
      map.setZoom(14);
    } else if (annoncesWithCoords.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      annoncesWithCoords.forEach(({ lat, lng }) => bounds.extend({ lat, lng }));
      // Clamp max zoom without breaking the fit
      map.setOptions({ maxZoom: 15 });
      map.fitBounds(bounds, 60);
      const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
        map.setOptions({ maxZoom: undefined });
      });
      void listener;
    }
  }, [mapReady, annoncesWithCoords, hoveredAnnonceId, onAnnonceClick, onMarkerHover]);


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

  // Fallback or error state
  if (isFallback || !isLoaded || mapError) {
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

  // No geocoded annonces - still show the map with search area
  if (annoncesWithCoords.length === 0 && !searchCenter) {
    return (
      <div className="h-full w-full bg-muted flex items-center justify-center">
        <div className="text-center text-muted-foreground p-4">
          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Aucune annonce géolocalisée</p>
          <p className="text-sm mt-1">Les annonces n'ont pas de coordonnées GPS</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="h-full w-full" />
  );
}

import { useEffect, useRef, useState } from 'react';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { MapPin, Loader2, Navigation, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AnnonceLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  ville: string;
  code_postal: string;
  afficher_adresse_exacte?: boolean;
  prix?: number;
  type_transaction?: string;
}

export function AnnonceLocationMap({
  latitude,
  longitude,
  address,
  ville,
  code_postal,
  afficher_adresse_exacte = true,
  prix,
  type_transaction
}: AnnonceLocationMapProps) {
  const { isLoaded, isLoading, isFallback } = useGoogleMapsLoader();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
  const [geocodedPosition, setGeocodedPosition] = useState<{ lat: number; lng: number } | null>(null);

  const fullAddress = `${address}, ${code_postal} ${ville}, Suisse`;

  // Geocode address if no coordinates provided
  useEffect(() => {
    if (!isLoaded || isFallback) return;

    const lat = latitude === null || latitude === undefined ? NaN : Number(latitude);
    const lng = longitude === null || longitude === undefined ? NaN : Number(longitude);
    const valid =
      Number.isFinite(lat) && Number.isFinite(lng) &&
      Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
      !(lat === 0 && lng === 0);

    if (valid) {
      setGeocodedPosition({ lat, lng });
      return;
    }

    // Try to geocode the address
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: fullAddress, region: 'ch' }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        setGeocodedPosition({ lat: location.lat(), lng: location.lng() });
      } else {
        setGeocodedPosition(null);
      }
    });
  }, [isLoaded, isFallback, latitude, longitude, fullAddress]);


  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !geocodedPosition) return;

    const zoomLevel = afficher_adresse_exacte ? 15 : 13;
    
    const map = new google.maps.Map(mapRef.current, {
      center: geocodedPosition,
      zoom: zoomLevel,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;
    map.setCenter(geocodedPosition);

    // Create marker only if showing exact address
    if (afficher_adresse_exacte) {
      markerRef.current = new google.maps.Marker({
        map,
        position: geocodedPosition,
        title: address,
      });
    } else {
      // Show approximate area with a circle
      new google.maps.Circle({
        map,
        center: geocodedPosition,
        radius: 500, // 500 meters
        strokeColor: 'hsl(var(--primary))',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: 'hsl(var(--primary))',
        fillOpacity: 0.15,
      });
    }

    return () => {
      if (markerRef.current) {
        if ('setMap' in markerRef.current) {
          (markerRef.current as google.maps.Marker).setMap(null);
        } else {
          (markerRef.current as google.maps.marker.AdvancedMarkerElement).map = null;
        }
        markerRef.current = null;
      }
      mapInstanceRef.current = null;
    };
  }, [isLoaded, geocodedPosition, afficher_adresse_exacte, prix, type_transaction, address]);

  const openGoogleMapsDirections = () => {
    const destination = geocodedPosition 
      ? `${geocodedPosition.lat},${geocodedPosition.lng}`
      : encodeURIComponent(fullAddress);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 mb-3 animate-spin" />
          <p className="text-sm">Chargement de la carte...</p>
        </div>
      </Card>
    );
  }

  // Fallback state - no map available
  if (isFallback || !isLoaded) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center text-center">
          <MapPin className="h-12 w-12 text-primary mb-3" />
          <h3 className="font-semibold mb-2">Localisation</h3>
          <p className="text-muted-foreground mb-4">
            {afficher_adresse_exacte ? fullAddress : `${code_postal} ${ville}`}
          </p>
          <Button onClick={openGoogleMapsDirections} variant="outline">
            <Navigation className="h-4 w-4 mr-2" />
            Itinéraire Google Maps
          </Button>
        </div>
      </Card>
    );
  }

  // No coordinates and geocoding failed
  if (!geocodedPosition) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-2">Localisation</h3>
          <p className="text-muted-foreground mb-4">
            {afficher_adresse_exacte ? fullAddress : `${code_postal} ${ville}`}
          </p>
          <Button onClick={openGoogleMapsDirections} variant="outline">
            <Navigation className="h-4 w-4 mr-2" />
            Voir sur Google Maps
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden border">
        <div ref={mapRef} className="h-[350px] w-full" />
        
        {/* Overlay button */}
        <div className="absolute bottom-4 left-4">
          <Button 
            onClick={openGoogleMapsDirections} 
            size="sm"
            className="shadow-lg"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Itinéraire
          </Button>
        </div>

        {/* Open in new tab */}
        <div className="absolute bottom-4 right-4">
          <Button 
            onClick={openGoogleMapsDirections}
            variant="secondary"
            size="sm"
            className="shadow-lg"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Google Maps
          </Button>
        </div>
      </div>

      {/* Address info */}
      <div className="flex items-start gap-3 text-sm">
        <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          {afficher_adresse_exacte ? (
            <p className="font-medium">{fullAddress}</p>
          ) : (
            <>
              <p className="font-medium">{code_postal} {ville}</p>
              <p className="text-muted-foreground text-xs">Adresse exacte communiquée sur demande</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
/**
 * Recherche de localités suisses via Google Places / Geocoding (API JS déjà chargée
 * par useGoogleMapsLoader avec la clé Google Maps configurée en secret).
 */

export interface LocaliteSuggestion {
  value: string;
  label: string;
  kind: 'ville' | 'npa' | 'canton';
  placeId?: string;
}

const cleanName = (raw: string) =>
  raw
    .replace(/,\s*(Suisse|Switzerland|Schweiz|Svizzera)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Autocomplétion Google Places restreinte à la Suisse (communes, quartiers, NPA). */
export function searchLocalitesGoogle(query: string): Promise<LocaliteSuggestion[]> {
  return new Promise((resolve, reject) => {
    const g = (window as any).google;
    if (!g?.maps?.places?.AutocompleteService) {
      reject(new Error('places_unavailable'));
      return;
    }
    const service = new g.maps.places.AutocompleteService();
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'ch' },
        types: ['(regions)'],
        language: 'fr',
      },
      (predictions: any[], status: string) => {
        const S = g.maps.places.PlacesServiceStatus;
        if (status === S.ZERO_RESULTS) {
          resolve([]);
          return;
        }
        if (status !== S.OK || !predictions) {
          reject(new Error(`places_status_${status}`));
          return;
        }
        const out: LocaliteSuggestion[] = predictions.map((p) => {
          const main = cleanName(p.structured_formatting?.main_text || p.description);
          const isNpa = /^\d{4}$/.test(main);
          const isCanton = (p.types || []).includes('administrative_area_level_1');
          return {
            value: main,
            label: `${main} (${isNpa ? 'NPA' : isCanton ? 'canton' : 'ville'})`,
            kind: isNpa ? 'npa' : isCanton ? 'canton' : 'ville',
            placeId: p.place_id,
          };
        });
        // dédoublonnage
        const seen = new Set<string>();
        resolve(out.filter((o) => (seen.has(o.value.toLowerCase()) ? false : seen.add(o.value.toLowerCase()))));
      },
    );
  });
}

/** Géocode une localité suisse -> coordonnées. */
export function geocodeLocalite(name: string): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve, reject) => {
    const g = (window as any).google;
    if (!g?.maps?.Geocoder) {
      reject(new Error('geocoder_unavailable'));
      return;
    }
    new g.maps.Geocoder().geocode(
      { address: `${name}, Suisse`, region: 'CH', componentRestrictions: { country: 'CH' } },
      (results: any[], status: string) => {
        if (status === 'ZERO_RESULTS') return resolve(null);
        if (status !== 'OK' || !results?.length) return reject(new Error(`geocoder_status_${status}`));
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      },
    );
  });
}

function reverseLocality(lat: number, lng: number): Promise<string | null> {
  return new Promise((resolve) => {
    const g = (window as any).google;
    if (!g?.maps?.Geocoder) return resolve(null);
    new g.maps.Geocoder().geocode({ location: { lat, lng }, language: 'fr' }, (results: any[], status: string) => {
      if (status !== 'OK' || !results?.length) return resolve(null);
      for (const r of results) {
        const comp = (r.address_components || []).find((c: any) =>
          c.types.includes('locality') || c.types.includes('postal_town'),
        );
        if (comp) return resolve(cleanName(comp.long_name));
      }
      resolve(null);
    });
  });
}

/**
 * Communes réellement voisines : anneaux de points autour du centre,
 * reverse-geocodés pour récupérer les localités environnantes.
 */
export async function findNeighbourLocalites(
  center: { lat: number; lng: number },
  exclude: string[] = [],
  maxResults = 12,
): Promise<string[]> {
  const excluded = new Set(exclude.map((e) => e.toLowerCase()));
  const points: { lat: number; lng: number }[] = [];
  const rings = [4, 8, 14]; // km
  for (const km of rings) {
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const dLat = (km / 111) * Math.cos(angle);
      const dLng = (km / (111 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle);
      points.push({ lat: center.lat + dLat, lng: center.lng + dLng });
    }
  }

  const names = await Promise.all(points.map((p) => reverseLocality(p.lat, p.lng)));
  const out: string[] = [];
  for (const n of names) {
    if (!n) continue;
    const k = n.toLowerCase();
    if (excluded.has(k)) continue;
    excluded.add(k);
    out.push(n);
    if (out.length >= maxResults) break;
  }
  return out;
}

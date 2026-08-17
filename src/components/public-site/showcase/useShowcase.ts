import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ShowcaseItem {
  id: string;
  titre: string | null;
  type_bien: string | null;
  adresse: string | null;
  prix: number | null;
  pieces: number | null;
  surface: number | null;
  etage: string | null;
  lien_annonce: string | null;
  medias_galerie: unknown;
  date_envoi?: string | null;
  date_visite?: string | null;
}

const asArray = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v
    .map((m) => (typeof m === 'string' ? m : (m as { url?: string })?.url))
    .filter((u): u is string => typeof u === 'string' && u.length > 0);
};

export const galleryUrls = (item: ShowcaseItem) => asArray(item.medias_galerie);

export function useShowcase() {
  const [offres, setOffres] = useState<ShowcaseItem[]>([]);
  const [visites, setVisites] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [o, v] = await Promise.all([
        supabase.rpc('get_public_showcase_offres'),
        supabase.rpc('get_public_showcase_visites'),
      ]);
      if (cancelled) return;
      setOffres(((o.data as ShowcaseItem[]) || []).filter((i) => i.titre || i.adresse));
      setVisites(((v.data as ShowcaseItem[]) || []).filter((i) => i.titre || i.adresse));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { offres, visites, loading };
}

// --- Link preview image (OpenGraph) with in-memory cache -------------------
const previewCache = new Map<string, Promise<string | null>>();

function fetchPreviewImage(url: string): Promise<string | null> {
  const cached = previewCache.get(url);
  if (cached) return cached;
  const p = supabase.functions
    .invoke('get-link-preview', { body: { url } })
    .then(({ data, error }) => (error ? null : ((data as { image_url?: string })?.image_url ?? null)))
    .catch(() => null);
  previewCache.set(url, p);
  return p;
}

export function usePreviewImage(item: ShowcaseItem): string | null {
  const gallery = galleryUrls(item);
  const direct = gallery[0] ?? null;
  const [img, setImg] = useState<string | null>(direct);

  useEffect(() => {
    if (direct) {
      setImg(direct);
      return;
    }
    if (!item.lien_annonce) return;
    let cancelled = false;
    fetchPreviewImage(item.lien_annonce).then((u) => {
      if (!cancelled) setImg(u);
    });
    return () => {
      cancelled = true;
    };
  }, [direct, item.lien_annonce]);

  return img;
}

export const villeFromAdresse = (adresse?: string | null): string => {
  if (!adresse) return '';
  const parts = adresse.split(',').map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1] || '';
  return last.replace(/^\d{4}\s*/, '');
};

export const formatPrix = (prix?: number | null) =>
  prix == null ? '' : `${new Intl.NumberFormat('fr-CH').format(Number(prix))} CHF`;

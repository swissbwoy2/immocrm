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
  /** Annonce native (publiée sur notre portail) : contenu et images nous appartiennent */
  is_native?: boolean;
  type_transaction?: string | null;
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
  const [annonces, setAnnonces] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [o, v, a] = await Promise.all([
        supabase.rpc('get_public_showcase_offres'),
        supabase.rpc('get_public_showcase_visites'),
        supabase.rpc('get_public_showcase_annonces' as never),
      ]);
      if (cancelled) return;
      setOffres(((o.data as ShowcaseItem[]) || []).filter((i) => i.titre || i.adresse));
      setVisites(((v.data as ShowcaseItem[]) || []).filter((i) => i.titre || i.adresse));
      setAnnonces(
        (((a.data as ShowcaseItem[]) || []) as ShowcaseItem[])
          .filter((i) => i.titre || i.adresse)
          .map((i) => ({ ...i, is_native: true })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { offres, visites, annonces, loading };
}


// --- Link preview image (OpenGraph) with batched public fetch --------------
const previewCache = new Map<string, string | null>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    const urls = Array.from(pending).slice(0, 20);
    if (urls.length === 0) return;
    urls.forEach((u) => pending.delete(u));
    try {
      const { data } = await supabase.functions.invoke('get-public-showcase-preview', {
        body: { urls },
      });
      const previews = (data as { previews?: Record<string, { image_url?: string | null }> })?.previews || {};
      urls.forEach((u) => previewCache.set(u, previews[u]?.image_url ?? null));
    } catch {
      urls.forEach((u) => previewCache.set(u, null));
    }
    listeners.forEach((l) => l());
    if (pending.size > 0) scheduleFlush();
  }, 120);
}

/**
 * Aperçu image de l'annonce source.
 * `enabled = false` (visiteur public) → aucune image tierce n'est affichée ni récupérée.
 */
export function usePreviewImage(item: ShowcaseItem, enabled = true): string | null {
  const gallery = galleryUrls(item);
  const direct = enabled ? gallery[0] ?? null : null;
  const link = enabled ? item.lien_annonce : null;
  const [img, setImg] = useState<string | null>(direct ?? (link ? previewCache.get(link) ?? null : null));

  useEffect(() => {
    if (!enabled) {
      setImg(null);
      return;
    }
    if (direct) {
      setImg(direct);
      return;
    }
    if (!link) return;
    if (previewCache.has(link)) {
      setImg(previewCache.get(link) ?? null);
      return;
    }
    const notify = () => {
      if (previewCache.has(link)) setImg(previewCache.get(link) ?? null);
    };
    listeners.add(notify);
    pending.add(link);
    scheduleFlush();
    return () => {
      listeners.delete(notify);
    };
  }, [direct, link, enabled]);

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

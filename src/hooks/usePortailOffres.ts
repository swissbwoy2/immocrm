import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortailOffre {
  id: string;
  titre: string | null;
  type_bien: string | null;
  pieces: number | null;
  surface: number | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  prix: number | null;
  etage: string | null;
  lien_annonce: string | null;
  medias_galerie: any;
  date_envoi: string | null;
  disponibilite?: string | null;
}

export const galerieUrls = (medias: any): string[] => {
  if (!medias) return [];
  const arr = Array.isArray(medias) ? medias : [];
  return arr
    .map((m: any) => (typeof m === 'string' ? m : m?.url || m?.src || m?.image_url))
    .filter((u: any) => typeof u === 'string' && /^https?:\/\//.test(u));
};

/** Offres déjà diffusées, exposées comme annonces publiques (aucune donnée client). */
export function usePortailOffres() {
  return useQuery({
    queryKey: ['portail-offres'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PortailOffre[]> => {
      const { data, error } = await supabase.rpc('list_public_offres' as any);
      if (error) throw error;
      return (data || []) as PortailOffre[];
    },
  });
}

/** Aperçus (og:image) des liens sources, pour les offres sans galerie. */
export function useOffresPreviews(urls: string[]) {
  const key = urls.slice(0, 60).sort().join('|');
  return useQuery({
    queryKey: ['portail-offres-previews', key],
    enabled: urls.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<Record<string, string>> => {
      const list = urls.slice(0, 60);
      const chunks: string[][] = [];
      for (let i = 0; i < list.length; i += 20) chunks.push(list.slice(i, i + 20));
      const out: Record<string, string> = {};
      for (const chunk of chunks) {
        const { data, error } = await supabase.functions.invoke('get-public-showcase-preview', {
          body: { urls: chunk },
        });
        if (error) {
          console.error('[Portail] Aperçu des liens indisponible:', error.message);
          continue;
        }
        Object.entries((data as any)?.previews || {}).forEach(([u, p]: any) => {
          if (p?.image_url) out[u] = p.image_url;
        });
      }
      return out;
    },
  });
}

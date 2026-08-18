import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardBanner {
  id: string;
  image_url: string;
  lien_url: string | null;
  titre: string | null;
  texte: string | null;
  actif: boolean;
  afficher_overlay?: boolean | null;
}

/** Récupère la bannière publicitaire active du dashboard client (la plus récente). */
export function useDashboardBanner() {
  const [banner, setBanner] = useState<DashboardBanner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('dashboard_banners')
          .select('id, image_url, lien_url, titre, texte, actif, afficher_overlay')
          .eq('actif', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (alive) setBanner((data as DashboardBanner) || null);
      } catch (e) {
        console.warn('[useDashboardBanner]', e);
        if (alive) setBanner(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { banner, loading };
}

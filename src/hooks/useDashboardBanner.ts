import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardBanner {
  id: string;
  image_url: string;
  lien_url: string | null;
  lien_ios?: string | null;
  lien_android?: string | null;
  titre: string | null;
  texte: string | null;
  actif: boolean;
  afficher_overlay?: boolean | null;
}

/** Détecte l'OS mobile de l'utilisateur. */
export function detectMobileOS(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
  // iPadOS 13+ se présente comme un Mac tactile
  if (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

/**
 * Résout le lien à ouvrir au clic sur la bannière.
 * - Si lien_ios / lien_android sont renseignés → détection de l'OS.
 * - Sinon → lien_url simple pour tout le monde.
 */
export function resolveBannerLink(banner: Pick<DashboardBanner, 'lien_url' | 'lien_ios' | 'lien_android'>): string {
  const ios = banner.lien_ios?.trim() || '';
  const android = banner.lien_android?.trim() || '';
  const simple = banner.lien_url?.trim() || '';

  if (ios || android) {
    const os = detectMobileOS();
    if (os === 'ios' && ios) return ios;
    if (os === 'android' && android) return android;
    return ios || android || simple;
  }
  return simple;
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
          .select('id, image_url, lien_url, lien_ios, lien_android, titre, texte, actif, afficher_overlay')
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

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidatCriteres } from '@/hooks/useCandidatCriteres';

const SteevePublicChat = lazy(() => import('@/components/public-site/SteevePublicChat').then((m) => ({ default: m.SteevePublicChat })));

/** Critères du candidat en une phrase, envoyée seulement s'il le demande (« Cherche selon mes critères »). */
function criteresPhrase(row: ReturnType<typeof useCandidatCriteres>['data']): string | null {
  if (!row) return null;
  const parts = [
    row.type_recherche === 'Acheter' ? 'à acheter' : 'à louer',
    row.type_bien || null,
    row.pieces_recherche ? `${row.pieces_recherche} pièces` : null,
    row.region_recherche ? `à ${row.region_recherche}` : null,
    row.budget_max ? `budget ${Number(row.budget_max).toLocaleString('de-CH')} CHF max` : null,
  ].filter(Boolean);
  return parts.length > 1 ? parts.join(', ') : null;
}

/**
 * Steeve pour les candidats connectés : le même assistant que sur le site (recherche d'offres, explications,
 * activation du mandat), avec leurs critères à portée de clic. Aucune donnée de leur compte n'est transmise
 * sans qu'ils l'écrivent ou cliquent sur la suggestion.
 */
export function SteeveCandidatChat() {
  const { user } = useAuth();
  const { data } = useCandidatCriteres();
  const [prenom, setPrenom] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    supabase.from('profiles').select('prenom').eq('id', user.id).maybeSingle().then(({ data: p }) => {
      if (active) setPrenom((p as { prenom?: string | null } | null)?.prenom ?? null);
    });
    return () => { active = false; };
  }, [user?.id]);
  const candidat = useMemo(
    () => (user?.id ? { userId: user.id, prenom, criteres: criteresPhrase(data) } : null),
    [user?.id, prenom, data],
  );
  if (!candidat) return null;
  return (
    <Suspense fallback={null}>
      <SteevePublicChat key={candidat.userId} candidat={candidat} />
    </Suspense>
  );
}

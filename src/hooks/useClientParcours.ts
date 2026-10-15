import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { resolveClientParcours, type ClientParcours } from '@/lib/journey';

/**
 * Parcours du client connecté, chargé une seule fois par utilisateur et partagé
 * entre le menu latéral et la barre du bas. En cas d'erreur : 'location' (comportement historique).
 */
const cache = new Map<string, Promise<ClientParcours>>();
const resolved = new Map<string, ClientParcours>();

export function loadClientParcours(userId: string): Promise<ClientParcours> {
  const existing = cache.get(userId);
  if (existing) return existing;
  const p = (async () => {
    try {
      const [{ data: prof }, { data: client }] = await Promise.all([
        supabase.from('profiles').select('parcours_type').eq('id', userId).maybeSingle(),
        supabase.from('clients').select('id, user_id, type_recherche, journey_type').eq('user_id', userId).maybeSingle(),
      ]);
      let pp: { id: string; client_id: string | null; user_id: string | null } | null = null;
      const { data: byUser } = await supabase.from('purchase_projects').select('id, client_id, user_id').eq('user_id', userId).maybeSingle();
      pp = byUser as any;
      if (!pp && client?.id) {
        const { data: byClient } = await supabase.from('purchase_projects').select('id, client_id, user_id').eq('client_id', client.id).maybeSingle();
        pp = byClient as any;
      }
      const value = resolveClientParcours(client as any, pp, (prof as any)?.parcours_type ?? null);
      resolved.set(userId, value);
      return value;
    } catch {
      cache.delete(userId);
      return 'location' as ClientParcours;
    }
  })();
  cache.set(userId, p);
  return p;
}

export function useClientParcours(enabled = true): ClientParcours | null {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [value, setValue] = useState<ClientParcours | null>(() => (userId ? resolved.get(userId) ?? null : null));

  useEffect(() => {
    if (!enabled || !userId) { setValue(null); return; }
    let alive = true;
    const known = resolved.get(userId);
    if (known) setValue(known);
    loadClientParcours(userId).then((v) => { if (alive) setValue(v); });
    return () => { alive = false; };
  }, [enabled, userId]);

  return value;
}

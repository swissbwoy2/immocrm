import { supabase } from '@/integrations/supabase/client';

/** Nombre de réservations actives (hors desiste/refuse) par créneau — une seule requête. */
export async function fetchCreneauxReservations(ids: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (!ids.length) return out;
  const { data, error } = await (supabase.rpc as any)('get_creneaux_reservations', { _creneau_ids: ids });
  if (error) { console.error('[creneaux] comptage', error); return out; }
  (data ?? []).forEach((r: { creneau_id: string; reservations: number }) => { out[r.creneau_id] = r.reservations; });
  return out;
}

export const isCreneauFull = (reservations: number, capacite?: number | null) =>
  capacite != null && reservations >= capacite;

export const capaciteLabel = (reservations: number, capacite?: number | null) =>
  capacite != null ? `${reservations} / ${capacite}` : `${reservations} réservation(s)`;

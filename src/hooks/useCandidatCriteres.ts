import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MandatFormData, initialFormData } from '@/components/mandat/types';

export type CandidatCriteresRow = {
  user_id: string;
  type_recherche: string;
  type_bien: string | null;
  pieces_recherche: string | null;
  region_recherche: string | null;
  budget_max: number | null;
  nombre_occupants: number | null;
  date_entree_souhaitee: string | null;
  souhaits_particuliers: string | null;
  decouverte_agence: string | null;
  details: Record<string, any> | null;
};

/** Même validation que l'étape « Critères de recherche » de /nouveau-mandat. */
export function isCriteresComplete(d: Partial<MandatFormData>): boolean {
  const base = !!(d.decouverte_agence && d.type_bien && (d.budget_max ?? 0) > 0);
  if (d.type_bien === 'Local commercial') {
    return base && !!((d.surface_souhaitee ?? 0) > 0 && d.affectation_commerciale && d.etage_souhaite);
  }
  return base && !!d.pieces_recherche;
}

export function rowToFormData(row: CandidatCriteresRow | null | undefined): MandatFormData {
  if (!row) return { ...initialFormData };
  return {
    ...initialFormData,
    ...(row.details ?? {}),
    type_recherche: row.type_recherche || 'Louer',
    type_bien: row.type_bien ?? '',
    pieces_recherche: row.pieces_recherche ?? '',
    region_recherche: row.region_recherche ?? '',
    budget_max: Number(row.budget_max ?? 0),
    nombre_occupants: Number(row.nombre_occupants ?? 0),
    souhaits_particuliers: row.souhaits_particuliers ?? '',
    decouverte_agence: row.decouverte_agence ?? '',
  } as MandatFormData;
}

const DETAIL_KEYS = [
  'animaux', 'instrument_musique', 'vehicules', 'numero_plaques', 'apport_personnel',
  'location_type', 'raison_sociale', 'numero_ide', 'chiffre_affaires', 'type_exploitation',
  'nombre_employes', 'surface_souhaitee', 'etage_souhaite', 'affectation_commerciale', 'besoins_commerciaux',
] as const;

/** Pré-remplit le brouillon local de /nouveau-mandat sans écraser ce que le candidat y a déjà saisi. */
export function prefillNouveauMandat(d: MandatFormData) {
  try {
    const KEY = 'mandat_form_data';
    const existing = JSON.parse(localStorage.getItem(KEY) || '{}');
    const crit: Record<string, any> = {
      type_recherche: d.type_recherche, type_bien: d.type_bien, pieces_recherche: d.pieces_recherche,
      region_recherche: d.region_recherche, budget_max: d.budget_max, nombre_occupants: d.nombre_occupants,
      souhaits_particuliers: d.souhaits_particuliers, decouverte_agence: d.decouverte_agence,
    };
    DETAIL_KEYS.forEach((k) => { crit[k] = (d as any)[k]; });
    const merged = { ...existing };
    Object.entries(crit).forEach(([k, v]) => {
      const cur = existing[k];
      if (cur === undefined || cur === '' || cur === 0 || cur === null) merged[k] = v;
    });
    if (!merged.journey) merged.journey = d.type_recherche === 'Acheter' ? 'purchase' : 'rental';
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch { /* ignore */ }
}

export function useCandidatCriteres() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['candidat-criteres', user?.id];
  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('candidat_criteres')
        .select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as CandidatCriteresRow | null;
    },
  });

  const save = async (d: MandatFormData, dateEntree: string) => {
    if (!user?.id) throw new Error('Non connecté');
    const details: Record<string, any> = {};
    DETAIL_KEYS.forEach((k) => { details[k] = (d as any)[k]; });
    const { error } = await (supabase.from as any)('candidat_criteres').upsert({
      user_id: user.id,
      type_recherche: d.type_recherche || 'Louer',
      type_bien: d.type_bien || null,
      pieces_recherche: d.pieces_recherche || null,
      region_recherche: d.region_recherche || null,
      budget_max: d.budget_max || null,
      nombre_occupants: d.nombre_occupants || null,
      date_entree_souhaitee: dateEntree || null,
      souhaits_particuliers: d.souhaits_particuliers || null,
      decouverte_agence: d.decouverte_agence || null,
      details,
    }, { onConflict: 'user_id' });
    if (error) throw error;
    prefillNouveauMandat(d);
    await qc.invalidateQueries({ queryKey: key });
  };

  const formData = rowToFormData(query.data);
  return { ...query, formData, complete: !!query.data && isCriteresComplete(formData), save };
}

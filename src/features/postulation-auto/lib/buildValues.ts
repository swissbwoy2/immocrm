import { supabase } from '@/integrations/supabase/client';

const fmtDate = (d?: string | null) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Zurich' });
};

const fmtMoney = (n?: number | null) => (n === null || n === undefined || n === '' as never ? '' : `CHF ${Number(n).toLocaleString('fr-CH')}`);

/** Extrait "1200 Genève" d'une adresse complète si possible */
export function extractNpaVille(adresse?: string | null): string {
  if (!adresse) return '';
  const m = adresse.match(/(\d{4})\s+([^,]+)/);
  if (m) return `${m[1]} ${m[2]}`.trim();
  const parts = adresse.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export interface BuildValuesResult {
  values: Record<string, string>;
  clientNom: string;
}

/**
 * Construit les valeurs à injecter dans le formulaire.
 * RÈGLE STRICTE : email_contact / tel_contact = TOUJOURS l'agent connecté.
 */
export async function buildPostulationValues(params: {
  clientId: string;
  offreId?: string | null;
  agentUserId: string;
  lieu?: string;
}): Promise<BuildValuesResult> {
  const { clientId, offreId, agentUserId, lieu } = params;

  const { data: client } = await supabase
    .from('clients')
    .select('id, user_id, date_naissance, nationalite, type_permis, etat_civil, situation_familiale, profession, employeur, revenus_mensuels, adresse, nombre_occupants, animaux')
    .eq('id', clientId)
    .maybeSingle();

  let clientProfile: any = null;
  if (client?.user_id) {
    const { data } = await supabase
      .from('profiles')
      .select('prenom, nom, email, telephone')
      .eq('id', client.user_id)
      .maybeSingle();
    clientProfile = data;
  }

  const { data: candidates } = await supabase
    .from('client_candidates')
    .select('*')
    .eq('client_id', clientId)
    .limit(5);

  const co: any = (candidates ?? []).find((c: any) => c.type === 'conjoint' || c.type === 'colocataire') ?? (candidates ?? [])[0] ?? null;

  let offre: any = null;
  if (offreId) {
    const { data } = await supabase
      .from('offres')
      .select('adresse, prix, pieces, etage, disponibilite, lien_annonce')
      .eq('id', offreId)
      .maybeSingle();
    offre = data;
  }

  const { data: agent } = await supabase
    .from('profiles')
    .select('prenom, nom, email, telephone')
    .eq('id', agentUserId)
    .maybeSingle();

  const revenusMensuels = Number(client?.revenus_mensuels ?? 0) || 0;
  const lieuSignature = lieu ?? 'Genève';
  const dateJour = fmtDate(new Date().toISOString());

  const values: Record<string, string> = {
    prenom: clientProfile?.prenom ?? '',
    nom: clientProfile?.nom ?? '',
    date_naissance: fmtDate(client?.date_naissance),
    etat_civil: client?.etat_civil ?? client?.situation_familiale ?? '',
    nationalite: client?.nationalite ?? '',
    permis: client?.type_permis ?? '',
    adresse_actuelle: client?.adresse ?? '',
    npa_ville_actuelle: extractNpaVille(client?.adresse),
    profession: client?.profession ?? '',
    employeur: client?.employeur ?? '',
    lieu_travail: '',
    revenus_mensuels: fmtMoney(client?.revenus_mensuels),
    revenus_annuels: revenusMensuels ? fmtMoney(revenusMensuels * 12) : '',
    regie_actuelle: '',
    motif: '',
    nb_personnes: client?.nombre_occupants ? String(client.nombre_occupants) : '',
    animaux: client?.animaux === true ? 'Oui' : client?.animaux === false ? 'Non' : '',
    fumeur: 'Non',
    date_entree_souhaitee: offre?.disponibilite ?? '',

    // RÈGLE STRICTE : coordonnées de l'agent/admin connecté
    email_contact: agent?.email ?? '',
    tel_contact: agent?.telephone ?? '',
    co_email_contact: agent?.email ?? '',
    co_tel_contact: agent?.telephone ?? '',

    bien_adresse: offre?.adresse ?? '',
    bien_npa_ville: extractNpaVille(offre?.adresse),
    bien_ville: extractNpaVille(offre?.adresse).replace(/^\d{4}\s*/, ''),
    bien_etage: offre?.etage ?? '',
    bien_pieces: offre?.pieces ? String(offre.pieces) : '',
    bien_loyer: fmtMoney(offre?.prix),
    bien_charges: '',
    bien_loyer_brut: fmtMoney(offre?.prix),
    date_visite: '',

    co_prenom: co?.prenom ?? '',
    co_nom: co?.nom ?? '',
    co_date_naissance: fmtDate(co?.date_naissance),
    co_etat_civil: co?.etat_civil ?? '',
    co_nationalite: co?.nationalite ?? '',
    co_permis: co?.type_permis ?? co?.permis ?? '',
    co_adresse_actuelle: co?.adresse ?? client?.adresse ?? '',
    co_npa_ville_actuelle: extractNpaVille(co?.adresse ?? client?.adresse),
    co_profession: co?.profession ?? '',
    co_employeur: co?.employeur ?? '',
    co_lieu_travail: '',
    co_revenus: fmtMoney(co?.revenus_mensuels),

    lieu: lieuSignature,
    date_du_jour: dateJour,
    lieu_et_date: `${lieuSignature}, ${dateJour}`,
  };

  return {
    values,
    clientNom: `${clientProfile?.prenom ?? ''} ${clientProfile?.nom ?? ''}`.trim(),
  };
}

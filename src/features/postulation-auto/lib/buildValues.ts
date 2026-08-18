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

/** Numéro suisse au format national avec le 0 initial (021 634 28 39). */
export function formatPhoneCH(tel?: string | null): string {
  if (!tel) return '';
  const t = String(tel).trim();
  const m = t.match(/^(?:\+41|0041)\s*(.*)$/);
  if (m) {
    const rest = m[1].trim();
    return rest.startsWith('0') ? rest : `0${rest}`;
  }
  return t;
}

export interface BuildValuesResult {
  values: Record<string, string>;
  clientNom: string;
  /** Offre réellement utilisée (résolue automatiquement si non fournie) */
  offreId: string | null;
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
    .select('id, user_id, date_naissance, nationalite, type_permis, etat_civil, situation_familiale, profession, employeur, revenus_mensuels, adresse, nombre_occupants, animaux, secteur_activite, gerance_actuelle, motif_changement, date_engagement')
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

  // Offre : si aucune n'est fournie, on prend automatiquement la plus récente du client
  const offreSelect = 'id, adresse, prix, pieces, etage, disponibilite, lien_annonce, contact_gerance, created_at';
  let offre: any = null;
  if (offreId) {
    const { data } = await supabase.from('offres').select(offreSelect).eq('id', offreId).maybeSingle();
    offre = data;
  }
  if (!offre) {
    const { data } = await supabase
      .from('offres')
      .select(offreSelect)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    offre = data;
  }
  const resolvedOffreId: string | null = offre?.id ?? null;

  const { data: agent } = await supabase
    .from('profiles')
    .select('prenom, nom, email, telephone')
    .eq('id', agentUserId)
    .maybeSingle();

  // Date de la visite liée (si une visite existe pour ce client / cette offre)
  let dateVisite = '';
  if (resolvedOffreId) {
    const { data: visite } = await supabase
      .from('visites')
      .select('date_visite')
      .eq('offre_id', resolvedOffreId)
      .order('date_visite', { ascending: false })
      .limit(1)
      .maybeSingle();
    dateVisite = fmtDate(visite?.date_visite as any);
  }


  const revenusMensuels = Number(client?.revenus_mensuels ?? 0) || 0;
  const lieuSignature = lieu ?? 'Genève';
  const dateJour = fmtDate(new Date().toISOString());
  const agentTel = formatPhoneCH(agent?.telephone);

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
    lieu_travail: client?.secteur_activite ?? '',
    revenus_mensuels: fmtMoney(client?.revenus_mensuels),
    revenus_annuels: revenusMensuels ? fmtMoney(revenusMensuels * 12) : '',
    regie_actuelle: client?.gerance_actuelle ?? offre?.contact_gerance ?? '',
    motif: client?.motif_changement ?? '',
    nb_personnes: client?.nombre_occupants ? String(client.nombre_occupants) : '',
    animaux: client?.animaux === true ? 'Oui' : client?.animaux === false ? 'Non' : '',
    fumeur: 'Non',
    date_entree_souhaitee: offre?.disponibilite ?? fmtDate(client?.date_engagement) ?? '',

    // RÈGLE STRICTE : coordonnées de l'agent/admin connecté
    email_contact: agent?.email ?? '',
    tel_contact: agentTel,
    co_email_contact: agent?.email ?? '',
    co_tel_contact: agentTel,

    bien_adresse: offre?.adresse ?? '',
    bien_npa_ville: extractNpaVille(offre?.adresse),
    bien_ville: extractNpaVille(offre?.adresse).replace(/^\d{4}\s*/, ''),
    bien_etage: offre?.etage != null ? String(offre.etage) : '',
    bien_pieces: offre?.pieces != null ? String(offre.pieces) : '',
    bien_loyer: fmtMoney(offre?.prix),
    bien_charges: '',
    bien_loyer_brut: fmtMoney(offre?.prix),
    date_visite: dateVisite,

    co_prenom: co?.prenom ?? '',
    co_nom: co?.nom ?? '',
    co_date_naissance: fmtDate(co?.date_naissance),
    co_etat_civil: co?.etat_civil ?? co?.situation_familiale ?? '',
    co_nationalite: co?.nationalite ?? '',
    co_permis: co?.type_permis ?? co?.permis ?? '',
    co_adresse_actuelle: co?.adresse ?? client?.adresse ?? '',
    co_npa_ville_actuelle: extractNpaVille(co?.adresse ?? client?.adresse),
    co_profession: co?.profession ?? '',
    co_employeur: co?.employeur ?? '',
    co_lieu_travail: co?.secteur_activite ?? '',
    co_revenus: fmtMoney(co?.revenus_mensuels),

    lieu: lieuSignature,
    date_du_jour: dateJour,
    lieu_et_date: `${lieuSignature}, ${dateJour}`,
  };

  // ---- Alias de clés utilisées par certains modèles (lookup pur, déterministe) ----
  const aliases: Record<string, string> = {
    revenus: values.revenus_mensuels,
    revenu: values.revenus_mensuels,
    salaire: values.revenus_mensuels,
    bien_loyer_net: values.bien_loyer,
    loyer: values.bien_loyer,
    loyer_net: values.bien_loyer,
    charges: values.bien_charges,
    date_entree: values.date_entree_souhaitee,
    ville_bien: values.bien_ville,
    npa_ville_bien: values.bien_npa_ville,
    adresse_bien: values.bien_adresse,
    pieces: values.bien_pieces,
    etage: values.bien_etage,
    co_revenus_mensuels: values.co_revenus,
    nombre_personnes: values.nb_personnes,
    email: values.email_contact,
    telephone: values.tel_contact,
    tel: values.tel_contact,
  };
  for (const [k, v] of Object.entries(aliases)) {
    if (!values[k]) values[k] = v ?? '';
  }

  return {
    values,
    offreId: resolvedOffreId,
    clientNom: `${clientProfile?.prenom ?? ''} ${clientProfile?.nom ?? ''}`.trim(),
  };
}

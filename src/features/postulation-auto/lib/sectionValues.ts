import { supabase } from '@/integrations/supabase/client';
import { extractNpaVille, formatPhoneCH } from './buildValues';
import type { FormulaireChamp } from '../types';
import { SIGNATURE_KEY } from '../keys';

export type Section = 'principal' | 'conjoint' | 'garant';

const fmtDate = (d?: string | null) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Zurich' });
};

const fmtMoney = (n?: number | string | null) => {
  const v = Number(n);
  return n === null || n === undefined || n === '' || isNaN(v) ? '' : `CHF ${v.toLocaleString('fr-CH')}`;
};

/** Clés dont la valeur ne dépend PAS de la section (bien, contact agent, signature). */
const COMMUN_PREFIXES = ['bien_'];
const COMMUN_KEYS = new Set([
  'email_contact', 'tel_contact', 'lieu', 'date_du_jour', 'lieu_et_date',
  'date_visite', 'date_entree_souhaitee',
]);

export interface SectionedValues {
  principal: Record<string, string>;
  conjoint: Record<string, string>;
  garant: Record<string, string>;
  commun: Record<string, string>;
  hasConjoint: boolean;
  hasGarant: boolean;
  offreId: string | null;
  clientNom: string;
}

function personValues(p: any, fallbackAdresse?: string | null): Record<string, string> {
  if (!p) return {};
  const revenus = Number(p.revenus_mensuels ?? 0) || 0;
  return {
    prenom: p.prenom ?? '',
    nom: p.nom ?? '',
    date_naissance: fmtDate(p.date_naissance),
    etat_civil: p.etat_civil ?? p.situation_familiale ?? '',
    nationalite: p.nationalite ?? '',
    permis: p.type_permis ?? p.permis ?? '',
    adresse_actuelle: p.adresse ?? fallbackAdresse ?? '',
    npa_ville_actuelle: extractNpaVille(p.adresse ?? fallbackAdresse),
    profession: p.profession ?? '',
    employeur: p.employeur ?? '',
    lieu_travail: p.lieu_travail ?? p.secteur_activite ?? '',
    revenus_mensuels: fmtMoney(p.revenus_mensuels),
    revenus_annuels: revenus ? fmtMoney(revenus * 12) : '',
    regie_actuelle: p.gerance_actuelle ?? '',
    motif: p.motif_changement ?? '',
    nb_personnes: p.nombre_occupants ? String(p.nombre_occupants) : '',
    animaux: p.animaux === true ? 'Oui' : p.animaux === false ? 'Non' : '',
    fumeur: p.fumeur === true ? 'Oui' : 'Non',
  };
}

/**
 * Résolution déterministe des valeurs, par SECTION.
 * RÈGLE STRICTE : email_contact / tel_contact = TOUJOURS l'agent connecté.
 */
export async function buildSectionedValues(params: {
  clientId: string;
  offreId?: string | null;
  agentUserId: string;
  lieu?: string;
}): Promise<SectionedValues> {
  const { clientId, offreId, agentUserId, lieu } = params;

  const { data: client } = await supabase
    .from('clients')
    .select('id, user_id, date_naissance, nationalite, type_permis, etat_civil, situation_familiale, profession, employeur, revenus_mensuels, adresse, nombre_occupants, animaux, secteur_activite, gerance_actuelle, motif_changement, date_engagement')
    .eq('id', clientId)
    .maybeSingle();

  let profile: any = null;
  if (client?.user_id) {
    const { data } = await supabase.from('profiles').select('prenom, nom, email, telephone').eq('id', client.user_id).maybeSingle();
    profile = data;
  }

  const { data: candidates } = await supabase
    .from('client_candidates')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(10);

  const list = candidates ?? [];
  const isGarant = (c: any) => String(c.type ?? '').toLowerCase().includes('garant');
  const conjointRow = list.find((c: any) => !isGarant(c)) ?? null;
  const garantRow = list.find(isGarant) ?? null;

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

  const { data: agent } = await supabase
    .from('profiles')
    .select('prenom, nom, email, telephone')
    .eq('id', agentUserId)
    .maybeSingle();

  let dateVisite = '';
  if (offre?.id) {
    const { data: visite } = await supabase
      .from('visites')
      .select('date_visite')
      .eq('offre_id', offre.id)
      .order('date_visite', { ascending: false })
      .limit(1)
      .maybeSingle();
    dateVisite = fmtDate(visite?.date_visite as any);
  }

  const lieuSignature = lieu ?? 'Genève';
  const dateJour = fmtDate(new Date().toISOString());

  const principal = {
    ...personValues({ ...client, ...profile }),
    regie_actuelle: client?.gerance_actuelle ?? offre?.contact_gerance ?? '',
  };

  const commun: Record<string, string> = {
    email_contact: agent?.email ?? '',
    tel_contact: formatPhoneCH(agent?.telephone),
    bien_adresse: offre?.adresse ?? '',
    bien_npa_ville: extractNpaVille(offre?.adresse),
    bien_ville: extractNpaVille(offre?.adresse).replace(/^\d{4}\s*/, ''),
    bien_etage: offre?.etage != null ? String(offre.etage) : '',
    bien_pieces: offre?.pieces != null ? String(offre.pieces) : '',
    bien_loyer: fmtMoney(offre?.prix),
    bien_loyer_brut: fmtMoney(offre?.prix),
    bien_charges: '',
    date_visite: dateVisite,
    date_entree_souhaitee: offre?.disponibilite ?? fmtDate(client?.date_engagement) ?? '',
    lieu: lieuSignature,
    date_du_jour: dateJour,
    lieu_et_date: `${lieuSignature}, ${dateJour}`,
  };

  return {
    principal,
    conjoint: conjointRow ? personValues(conjointRow, client?.adresse) : {},
    garant: garantRow ? personValues(garantRow, client?.adresse) : {},
    commun,
    hasConjoint: !!conjointRow,
    hasGarant: !!garantRow,
    offreId: offre?.id ?? null,
    clientNom: `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim(),
  };
}

/** Valeur d'un champ selon sa clé et sa section. Vide si la donnée est absente. */
export function resolveSectionValue(sv: SectionedValues, cleRaw: string, sectionRaw?: string | null): string {
  if (!cleRaw || cleRaw === SIGNATURE_KEY) return '';
  let cle = cleRaw;
  let section: Section = (['principal', 'conjoint', 'garant'].includes(String(sectionRaw)) ? sectionRaw : 'principal') as Section;
  if (cle.startsWith('co_')) {
    cle = cle.slice(3);
    if (section === 'principal') section = 'conjoint';
  }
  if (cle === 'revenus') cle = 'revenus_mensuels';
  if (COMMUN_KEYS.has(cle) || COMMUN_PREFIXES.some((p) => cle.startsWith(p))) return sv.commun[cle] ?? '';
  const bucket = section === 'conjoint' ? sv.conjoint : section === 'garant' ? sv.garant : sv.principal;
  return bucket[cle] ?? '';
}

/** Prépare les valeurs par champ (id) et par nom de champ PDF. */
export function resolveChampValues(champs: FormulaireChamp[], sv: SectionedValues) {
  const byId: Record<string, string> = {};
  const byName: Record<string, string> = {};
  for (const c of champs) {
    const v = resolveSectionValue(sv, c.cle_champ, (c as any).section);
    byId[c.id] = v;
    if (c.nom_champ_pdf) byName[c.nom_champ_pdf] = v;
  }
  return { byId, byName };
}

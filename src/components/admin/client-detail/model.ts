/**
 * Fiche client admin (/admin/clients/:id) : types partagés, libellés et calculs purs.
 * Aucune requête ici : l'état et les appels restent dans la page.
 */
import { chfSuisse } from '@/components/stats/statsFormat';

export interface Client {
  id: string;
  user_id: string;
  agent_id?: string;
  type_contrat?: string;
  pieces?: number;
  budget_max?: number;
  revenus_mensuels?: number;
  charges_mensuelles?: number;
  autres_credits?: boolean;
  apport_personnel?: number;
  commission_split?: number;
  secteur_activite?: string;
  etat_avancement?: string;
  priorite?: string;
  note_agent?: string;
  statut?: string;
  nationalite?: string;
  type_permis?: string;
  residence?: string;
  garanties?: string;
  region_recherche?: string;
  situation_familiale?: string;
  situation_financiere?: string;
  profession?: string;
  type_bien?: string;
  source_revenus?: string;
  anciennete_mois?: number;
  created_at?: string;
  date_ajout?: string;
  date_naissance?: string;
  adresse?: string;
  etat_civil?: string;
  gerance_actuelle?: string;
  contact_gerance?: string;
  loyer_actuel?: number;
  depuis_le?: string;
  pieces_actuel?: number;
  motif_changement?: string;
  employeur?: string;
  date_engagement?: string;
  charges_extraordinaires?: boolean;
  montant_charges_extra?: number;
  poursuites?: boolean;
  curatelle?: boolean;
  souhaits_particuliers?: string;
  nombre_occupants?: number;
  utilisation_logement?: string;
  animaux?: boolean;
  instrument_musique?: boolean;
  vehicules?: boolean;
  numero_plaques?: string;
  decouverte_agence?: string;
  type_recherche?: string;
  // Contract fields
  mandat_pdf_url?: string | null;
  mandat_signature_data?: string | null;
  mandat_date_signature?: string | null;
  demande_mandat_id?: string | null;
  // AbaNinja fields
  abaninja_client_uuid?: string | null;
  abaninja_invoice_id?: string | null;
  abaninja_invoice_ref?: string | null;
  journey_type?: string | null;
  refund_status?: string | null;
  mandate_pause_days?: number | null;
  mandate_paused_at?: string | null;
  cancellation_requested_at?: string | null;
  relance_count?: number | null;
  derniere_relance_at?: string | null;
}

export interface Profile {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  actif?: boolean;
  last_seen_at?: string | null;
  is_online?: boolean | null;
}

export interface Agent {
  id: string;
  profile: Profile;
}

/** Onglets de la fiche (lien profond : ?tab=…). */
export type FicheTab = 'apercu' | 'recherche' | 'dossier' | 'documents' | 'offres' | 'candidatures' | 'mandat' | 'activite';
export const FICHE_TABS: FicheTab[] = ['apercu', 'recherche', 'dossier', 'documents', 'offres', 'candidatures', 'mandat', 'activite'];

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

/** « CHF 2'400 » (vide → « Non renseigné » si demandé). */
export function chf(v: unknown, empty = 'Non renseigné'): string {
  if (v === null || v === undefined || v === '') return empty;
  const n = Number(v);
  if (!Number.isFinite(n)) return empty;
  return chfSuisse(n, Number.isInteger(n) ? 0 : 2);
}

// Configuration des statuts de visite à venir
export const VISITE_A_VENIR_STATUT: Record<string, { label: string; tone: Tone }> = {
  proposee: { label: 'Proposée', tone: 'muted' },
  planifiee: { label: 'Planifiée', tone: 'primary' },
  confirmee: { label: 'Confirmée', tone: 'success' },
  deleguee: { label: 'Déléguée', tone: 'neutral' },
  a_deleguer: { label: 'À déléguer', tone: 'warning' },
};

export const getStatutLabel = (statut: string) => {
  const labels: Record<string, string> = {
    'envoyee': 'Envoyée',
    'vue': 'Vue',
    'interessé': 'Intéressé',
    'interesse': 'Intéressé',
    'souhaite_postuler': 'Souhaite postuler',
    'offre_envisagee': "Offre d'achat envisagée",
    'visite_prevue': 'Visite prévue',
    'visite_effectuee': 'Visite effectuée',
    'candidature_deposee': 'Candidature déposée',
    'acceptee': 'Acceptée',
    'refusee': 'Refusée',
    'annulee': 'Annulée',
  };
  return labels[statut] || statut;
};

/** Ton de pastille d'une offre (équivalent des anciennes variantes de Badge). */
export const getStatutTone = (statut: string): Tone => {
  if (['acceptee', 'visite_effectuee'].includes(statut)) return 'success';
  if (statut === 'refusee' || statut === 'annulee') return 'danger';
  if (['interessé', 'visite_prevue', 'candidature_deposee'].includes(statut)) return 'primary';
  return 'neutral';
};

export const getCandidatureStatutLabel = (statut: string) => {
  const labels: Record<string, string> = {
    'en_attente': 'En attente',
    'candidature_deposee': 'Dossier envoyé',
    'acceptee': 'Acceptée',
    'refusee': 'Refusée',
    'bail_conclu': 'Client confirme',
    'attente_bail': 'Validation régie',
    'bail_recu': 'Bail reçu',
    'signature_planifiee': 'Date choisie',
    'signature_effectuee': 'Bail signé',
    'etat_lieux_fixe': 'EDL fixé',
    'cles_remises': 'Clés remises',
  };
  return labels[statut] || statut;
};

export const getCandidatureStatutTone = (statut: string): Tone => {
  if (['acceptee', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(statut)) return 'success';
  if (statut === 'refusee') return 'danger';
  return 'muted';
};

export const getDocTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'fiche_salaire': '💰 Fiche salaire',
    'extrait_poursuites': '📋 Extrait poursuites',
    'piece_identite': '🪪 Pièce ID',
    'attestation_domicile': '🏠 Attestation domicile',
    'rc_menage': '🛡️ RC Ménage',
    'contrat_travail': '📝 Contrat travail',
    'attestation_employeur': '👔 Attestation employeur',
    'copie_bail': '📋 Copie bail',
    'attestation_garantie_loyer': '🔐 Garantie loyer',
    'dossier_complet': '📎 Dossier complet',
    'autre': '📄 Autre'
  };
  return labels[type] || '📄 Autre';
};

export const formatFileSize = (bytes: number | null | undefined) => {
  if (bytes === null || bytes === undefined) return '';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

export const calculateAnciennete = (dateEngagement?: string) => {
  if (!dateEngagement) return null;
  const now = new Date();
  const engagement = new Date(dateEngagement);
  const months = (now.getFullYear() - engagement.getFullYear()) * 12 + (now.getMonth() - engagement.getMonth());
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return years > 0 ? `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois` : `${remainingMonths} mois`;
};

/**
 * Pièces obligatoires du dossier principal (mêmes règles que CandidateDocumentsSection
 * pour le dossier client : type exact, documents sans candidate_id).
 */
const PIECES_OBLIGATOIRES = [
  { type: 'fiche_salaire', label: 'Fiches de salaire (3)', count: 3 },
  { type: 'extrait_poursuites', label: 'Extrait des poursuites', count: 1 },
  { type: 'piece_identite', label: "Pièce d'identité", count: 1 },
  { type: 'attestation_domicile', label: 'Attestation de domicile', count: 1 },
  { type: 'contrat_travail', label: 'Contrat de travail', count: 1 },
  { type: 'rc_menage', label: 'RC Ménage', count: 1 },
];

export function dossierPrincipalStatus(documents: any[]) {
  const counts: Record<string, number> = {};
  documents.filter((d) => !d.candidate_id).forEach((d) => {
    const t = d.type_document || 'autre';
    counts[t] = (counts[t] || 0) + 1;
  });
  const manquantes = PIECES_OBLIGATOIRES.filter((p) => (counts[p.type] || 0) < p.count).map((p) => p.label);
  const total = PIECES_OBLIGATOIRES.length;
  const complete = total - manquantes.length;
  return { complete, total, pct: Math.round((complete / total) * 100), manquantes };
}

// Lecture du dossier d'un client pour Steeve.
// Règle : chaque fonction reçoit l'identifiant du client de la conversation, jamais une valeur venue du modèle.
// Données minimales : ni revenus, ni numéros de pièces, ni coordonnées de tiers (gérance, concierge, locataire).
// deno-lint-ignore-file no-explicit-any
import { getMandatDates, MANDAT_DURATION_DAYS, REFUND_ELIGIBILITY_DAY } from './mandate.ts';

export type Db = any;

const BUYER_TYPE_VALUES = new Set(['acheter', 'achat', 'purchase', 'purchase_search']);
const norm = (v?: string | null) => (v || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');

export interface Dossier {
  clientId: string;
  userId: string | null;
  prenom: string | null;
  journey: 'location' | 'achat';
  purchaseProjectId: string | null;
  purchaseProject: Record<string, any> | null;
  client: Record<string, any>;
  demande: Record<string, any> | null;
  persons: { id: string; type: string; label: string }[];
  agentName: string | null;
}

const PERSON_TYPE_LABELS: Record<string, string> = {
  garant: 'garant',
  colocataire: 'colocataire',
  co_debiteur: 'codébiteur',
  signataire_solidaire: 'signataire solidaire',
};

export async function loadDossier(db: Db, clientId: string): Promise<Dossier | null> {
  const { data: client } = await db
    .from('clients')
    .select('id, user_id, agent_id, statut, type_recherche, journey_type, type_bien, pieces, budget_max, region_recherche, nombre_occupants, souhaits_particuliers, mandat_date_signature, date_ajout, created_at, mandate_pause_days, mandate_paused_at, mandate_official_end_date, mandat_renewal_count, refund_status, refund_eligible, refund_requested_at, cancellation_requested_at, demande_mandat_id, extrait_poursuites_date_emission')
    .eq('id', clientId)
    .maybeSingle();
  if (!client) return null;

  const [{ data: profile }, { data: projects }, { data: people }, { data: demande }] = await Promise.all([
    client.user_id
      ? db.from('profiles').select('prenom').eq('id', client.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from('purchase_projects')
      .select('id, statut, statut_mandat, statut_acompte, montant_acompte, date_signature_mandat, date_paiement_acompte, duree_progression_jours, date_fin_progression, conditions_renouvellement, conditions_resiliation, conditions_remboursement')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1),
    db.from('client_candidates').select('id, type, prenom, nom').eq('client_id', clientId),
    client.demande_mandat_id
      ? db.from('demandes_mandat').select('statut, montant_acompte, date_paiement, type_recherche, created_at').eq('id', client.demande_mandat_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const project = (projects || [])[0] ?? null;
  let agentName: string | null = null;
  if (client.agent_id) {
    const { data: agent } = await db.from('agents').select('user_id').eq('id', client.agent_id).maybeSingle();
    if (agent?.user_id) {
      const { data: ap } = await db.from('profiles').select('prenom').eq('id', agent.user_id).maybeSingle();
      agentName = ap?.prenom?.trim() || null;
    }
  }

  const buyer = BUYER_TYPE_VALUES.has(norm(client.type_recherche))
    || norm(client.journey_type) === 'purchase_search'
    || !!project?.id;

  return {
    clientId,
    userId: client.user_id ?? null,
    prenom: profile?.prenom?.trim() || null,
    journey: buyer ? 'achat' : 'location',
    purchaseProjectId: buyer ? project?.id ?? null : null,
    purchaseProject: buyer ? project : null,
    client,
    demande: demande ?? null,
    persons: (people || []).map((p: any) => {
      const name = `${p.prenom || ''} ${p.nom || ''}`.trim();
      const role = PERSON_TYPE_LABELS[p.type] || p.type;
      return { id: p.id, type: p.type, label: name ? `${name} (${role})` : role };
    }),
    agentName,
  };
}

// Pièces attendues : mêmes listes que la page « Mes documents » (src/pages/client/Documents.tsx).
interface RequiredItem { label: string; types: string[]; min: number; optional?: boolean }

const RENTAL_REQUIRED: RequiredItem[] = [
  { label: "Pièce d'identité ou permis de séjour", types: ['piece_identite', 'permis_sejour'], min: 1 },
  { label: '3 dernières fiches de salaire', types: ['fiche_salaire', 'fiche_salaire_1', 'fiche_salaire_2', 'fiche_salaire_3'], min: 3 },
  { label: 'Contrat de travail', types: ['contrat_travail'], min: 1 },
  { label: 'Extrait des poursuites (moins de 3 mois)', types: ['extrait_poursuites'], min: 1 },
  { label: "Attestation de l'employeur", types: ['attestation_employeur'], min: 1, optional: true },
  { label: 'Attestation de domicile', types: ['attestation_domicile'], min: 1, optional: true },
  { label: 'Assurance RC ménage', types: ['rc_menage'], min: 1, optional: true },
];

const PURCHASE_REQUIRED: RequiredItem[] = [
  { label: "Pièce d'identité", types: ['piece_identite'], min: 1 },
  { label: 'Extrait des poursuites', types: ['extrait_poursuites'], min: 1 },
  { label: 'Certificat de salaire annuel', types: ['certificat_salaire'], min: 1 },
  { label: '3 dernières fiches de salaire', types: ['fiche_salaire_1', 'fiche_salaire_2', 'fiche_salaire_3', 'fiche_salaire'], min: 3 },
  { label: 'Contrat de travail', types: ['contrat_travail'], min: 1 },
  { label: 'Relevé bancaire des fonds propres', types: ['releve_bancaire_fonds_propres'], min: 1 },
  { label: 'Dernière décision de taxation', types: ['decision_taxation'], min: 1 },
  { label: 'Accord de transmission aux partenaires financiers', types: ['accord_transmission'], min: 1 },
  { label: 'Consentement au traitement des données financières', types: ['consentement_donnees'], min: 1 },
  { label: 'Permis de séjour (si applicable)', types: ['permis_sejour'], min: 1, optional: true },
  { label: 'Attestation employeur (si nécessaire)', types: ['attestation_employeur'], min: 1, optional: true },
];

function docStatusLabel(statut?: string | null): string {
  const s = norm(statut);
  if (s === 'valide' || s === 'validé') return 'validé par l’équipe';
  if (s === 'refuse' || s === 'refusé') return 'refusé, à remplacer';
  return 'reçu, pas encore vérifié';
}

export async function documentsStatus(db: Db, dossier: Dossier) {
  const { data: docs } = await db
    .from('documents')
    .select('id, type_document, nom, statut, candidate_id, date_upload, created_at')
    .eq('client_id', dossier.clientId)
    .order('created_at', { ascending: false })
    .limit(200);
  const { data: requests } = await db
    .from('document_requests')
    .select('document_type, document_label, candidate_id, note, created_at')
    .eq('client_id', dossier.clientId)
    .eq('status', 'pending');

  const list = docs || [];
  const required = dossier.journey === 'achat' ? PURCHASE_REQUIRED : RENTAL_REQUIRED;
  const people = [{ id: null as string | null, label: 'Client principal' }, ...dossier.persons.map((p) => ({ id: p.id as string | null, label: p.label }))];

  const parPersonne = people.map((person) => {
    const own = list.filter((d: any) => (d.candidate_id ?? null) === person.id);
    const items = required
      // Pièces facultatives : listées pour le client principal seulement.
      .filter((it) => person.id === null || !it.optional)
      .map((it) => {
        const count = own.filter((d: any) => it.types.includes(d.type_document)).length;
        return {
          piece: it.label,
          deposees: count,
          attendues: it.min,
          statut: count >= it.min ? 'complet' : it.optional ? 'facultatif, absent' : 'manquant',
        };
      });
    return { personne: person.label, pieces: items };
  });

  let poursuites: string | null = null;
  const emission = dossier.client.extrait_poursuites_date_emission;
  if (emission) {
    const ageDays = Math.floor((Date.now() - new Date(emission).getTime()) / 86400000);
    poursuites = ageDays > 90
      ? `Extrait des poursuites émis le ${emission} : plus de 3 mois, à renouveler.`
      : `Extrait des poursuites émis le ${emission} : valable (moins de 3 mois).`;
  }

  return {
    parcours: dossier.journey,
    par_personne: parPersonne,
    extrait_poursuites: poursuites,
    demandes_de_l_agent_en_attente: (requests || []).map((r: any) => ({
      piece: r.document_label || r.document_type,
      personne: r.candidate_id ? dossier.persons.find((p) => p.id === r.candidate_id)?.label ?? 'personne liée' : 'client principal',
      note: r.note || null,
      demandee_le: (r.created_at || '').slice(0, 10),
    })),
    derniers_documents: list.slice(0, 15).map((d: any) => ({
      type: d.type_document,
      fichier: d.nom,
      etat: docStatusLabel(d.statut),
      personne: d.candidate_id ? dossier.persons.find((p) => p.id === d.candidate_id)?.label ?? 'personne liée' : 'client principal',
      depose_le: (d.date_upload || d.created_at || '').slice(0, 10),
    })),
  };
}

const OFFER_STATUS_LABEL: Record<string, string> = {
  envoyee: 'envoyée, en attente de ta réponse',
  vue: 'vue',
  interesse: 'tu es intéressé(e)',
  visite_planifiee: 'visite planifiée',
  visite_confirmee: 'visite confirmée',
  visite_effectuee: 'visite effectuée',
  souhaite_postuler: 'tu souhaites postuler (demande transmise à ton agent)',
  candidature_deposee: 'candidature déposée',
  acceptee: 'acceptée',
  refusee: 'refusée',
};

export async function offers(db: Db, clientId: string, opts: { status?: string; limit?: number }) {
  let q = db
    .from('offres')
    .select('id, titre, adresse, prix, pieces, surface, etage, disponibilite, statut, date_envoi, lien_annonce')
    .eq('client_id', clientId)
    .or('statut.is.null,statut.neq.doublon')
    .order('date_envoi', { ascending: false })
    .limit(Math.min(Math.max(opts.limit ?? 8, 1), 15));
  if (opts.status) q = q.eq('statut', opts.status);
  const { data } = await q;
  return (data || []).map((o: any) => ({
    id: o.id,
    adresse: o.adresse,
    titre: o.titre || null,
    loyer_ou_prix_chf: o.prix,
    pieces: o.pieces,
    surface_m2: o.surface,
    etage: o.etage,
    disponibilite: o.disponibilite,
    statut: OFFER_STATUS_LABEL[o.statut] || o.statut,
    envoyee_le: (o.date_envoi || '').slice(0, 10),
    annonce: o.lien_annonce || null,
  }));
}

const VISIT_STATUS_LABEL: Record<string, string> = {
  proposee: 'proposée',
  planifiee: 'planifiée',
  confirmee: 'confirmée',
  effectuee: 'effectuée',
  annulee: 'annulée',
  refusee: 'refusée',
  en_attente: 'en attente',
};

function zurich(dateIso: string | null | undefined): string | null {
  if (!dateIso) return null;
  return new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateIso));
}

export async function visits(db: Db, clientId: string, scope: 'a_venir' | 'passees' | 'toutes', now: Date) {
  let q = db
    .from('visites')
    .select('id, adresse, date_visite, statut, est_deleguee, client_decision, offre_id')
    .eq('client_id', clientId)
    .or('statut.is.null,statut.neq.annulee')
    .limit(10);
  if (scope === 'a_venir') q = q.gte('date_visite', now.toISOString()).order('date_visite', { ascending: true });
  else if (scope === 'passees') q = q.lt('date_visite', now.toISOString()).order('date_visite', { ascending: false });
  else q = q.order('date_visite', { ascending: false });
  const { data } = await q;
  return (data || []).map((v: any) => ({
    adresse: v.adresse,
    date: zurich(v.date_visite),
    statut: VISIT_STATUS_LABEL[v.statut] || v.statut,
    visite_deleguee: !!v.est_deleguee,
    ta_decision: v.client_decision === 'interesse' ? 'intéressé(e)' : v.client_decision === 'refuse' ? 'pas intéressé(e)' : null,
  }));
}

const APPLICATION_STATUS_LABEL: Record<string, string> = {
  en_attente: 'déposée, en attente de réponse de la régie',
  demande_postulation: 'demande de postulation reçue, dossier en préparation par ton agent',
  acceptee: 'acceptée par la régie',
  refusee: 'refusée par la régie',
  retenu_bailleur: 'dossier retenu par le bailleur',
  attente_bail: 'en attente du bail',
  bail_recu: 'bail reçu',
  signature_planifiee: 'signature planifiée',
  signature_effectuee: 'bail signé',
  bail_conclu: 'bail conclu',
  etat_lieux_fixe: 'état des lieux fixé',
  cles_remises: 'clés remises',
};

const JOB_STATUS_LABEL: Record<string, string> = {
  queued: 'dossier en file de préparation',
  processing: 'dossier en cours de vérification',
  ready: 'dossier prêt, en attente d’envoi par ton agent',
  blocked: 'dossier bloqué : il manque des éléments',
  failed: 'vérification à refaire par l’équipe',
  completed: 'dossier traité',
};

export async function applications(db: Db, clientId: string) {
  const [{ data: cands }, { data: jobs }] = await Promise.all([
    db.from('candidatures').select('id, offre_id, statut, date_depot, created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(10),
    db.from('postulation_jobs').select('offre_id, status, ai_result, updated_at').eq('client_id', clientId).order('updated_at', { ascending: false }).limit(10),
  ]);
  const offerIds = [...new Set([...(cands || []), ...(jobs || [])].map((r: any) => r.offre_id).filter(Boolean))];
  const addresses: Record<string, string> = {};
  if (offerIds.length) {
    const { data: offs } = await db.from('offres').select('id, adresse').in('id', offerIds);
    for (const o of offs || []) addresses[o.id] = o.adresse;
  }
  const blockers = (ai: any): string[] | null => {
    if (!ai || typeof ai !== 'object') return null;
    const raw = ai.missing ?? ai.manquants ?? ai.missing_documents ?? ai.blocking_reasons ?? null;
    if (!Array.isArray(raw)) return null;
    return raw.slice(0, 8).map((x: any) => (typeof x === 'string' ? x : x?.label || x?.type || JSON.stringify(x)).slice(0, 120));
  };
  return {
    candidatures: (cands || []).map((c: any) => ({
      bien: addresses[c.offre_id] || null,
      statut: APPLICATION_STATUS_LABEL[c.statut] || c.statut,
      deposee_le: (c.date_depot || '').slice(0, 10) || null,
    })),
    preparation_des_dossiers: (jobs || []).map((j: any) => ({
      bien: addresses[j.offre_id] || null,
      etat: JOB_STATUS_LABEL[j.status] || j.status,
      elements_manquants: j.status === 'blocked' ? blockers(j.ai_result) : null,
    })),
  };
}

export function mandate(dossier: Dossier, now: Date) {
  const c = dossier.client;
  if (dossier.journey === 'achat') {
    // Mandat d'achat : conditions saisies par l'équipe sur le projet d'achat (texte validé, repris tel quel).
    const pp = dossier.purchaseProject || {};
    return {
      parcours: 'achat',
      statut_client: c.statut,
      statut_du_projet: pp.statut ?? null,
      statut_du_mandat: pp.statut_mandat ?? null,
      acompte: { statut: pp.statut_acompte ?? null, montant_chf: pp.montant_acompte ?? null, paye_le: pp.date_paiement_acompte ? String(pp.date_paiement_acompte).slice(0, 10) : null },
      signe_le: pp.date_signature_mandat ? String(pp.date_signature_mandat).slice(0, 10) : null,
      duree_jours: pp.duree_progression_jours ?? null,
      fin_prevue: pp.date_fin_progression ? String(pp.date_fin_progression).slice(0, 10) : null,
      conditions_de_renouvellement: pp.conditions_renouvellement ?? null,
      conditions_de_resiliation: pp.conditions_resiliation ?? null,
      conditions_de_remboursement: pp.conditions_remboursement ?? null,
    };
  }
  const dates = getMandatDates(c, now);
  const windowOpen = dates.daysSinceSignature >= REFUND_ELIGIBILITY_DAY && dates.daysSinceSignature <= MANDAT_DURATION_DAYS;
  const d = dossier.demande;
  return {
    parcours: dossier.journey,
    statut_client: c.statut,
    demande_de_mandat: d
      ? {
        statut: d.statut,
        acompte_chf: d.montant_acompte ?? null,
        acompte_paye_le: d.date_paiement ? String(d.date_paiement).slice(0, 10) : null,
      }
      : null,
    signe_le: c.mandat_date_signature ? String(c.mandat_date_signature).slice(0, 10) : null,
    jour_du_cycle_en_cours: dates.start ? dates.daysSinceSignature : null,
    jours_restants_dans_le_cycle: dates.start ? dates.daysRemaining : null,
    fin_du_cycle: dates.end ? dates.end.toISOString().slice(0, 10) : null,
    renouvellements_automatiques: dates.renewalCount,
    en_pause_depuis: c.mandate_paused_at ? String(c.mandate_paused_at).slice(0, 10) : null,
    resiliation_demandee_le: c.cancellation_requested_at ? String(c.cancellation_requested_at).slice(0, 10) : null,
    remboursement: {
      statut: c.refund_status === 'pending' ? 'demande enregistrée, en cours de traitement'
        : c.refund_status === 'processed' ? 'remboursement traité'
        : 'aucune demande',
      demande_le: c.refund_requested_at ? String(c.refund_requested_at).slice(0, 10) : null,
      fenetre_de_demande_ouverte: windowOpen,
    },
  };
}

/**
 * Phase du compte :
 *  - « non_active » : demande de mandat en attente ou facture d'activation envoyée, pas encore payée ;
 *  - « paiement_recu » : paiement reçu, activation en cours de finalisation par l'équipe ;
 *  - « en_mandat » : client suivi ;
 *  - « autre » : relogé, arrêté, ou situation inconnue (aucun message d'accueil propre).
 */
export type AccountPhase = 'non_active' | 'paiement_recu' | 'en_mandat' | 'autre';

export function accountPhase(dossier: Dossier): AccountPhase {
  const statut = norm(dossier.client.statut);
  if (['stoppe', 'reloge'].includes(statut)) return 'autre';
  const demande = norm(dossier.demande?.statut);
  if (['actif', 'suspendu'].includes(statut)) return 'en_mandat';
  if (demande === 'paye') return 'paiement_recu';
  if (['en_attente', 'facture_envoyee'].includes(demande)) return 'non_active';
  if (demande === 'active' && statut !== 'inactif') return 'en_mandat';
  if (statut === 'en_attente') return 'non_active';
  return 'autre';
}

/** Montant de l'acompte inscrit au dossier (location : demande de mandat ; achat : projet), ou null. */
export function depositAmount(dossier: Dossier): number | null {
  const raw = dossier.journey === 'achat' ? dossier.purchaseProject?.montant_acompte : dossier.demande?.montant_acompte;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Résumé compact remis à Steeve à chaque passage (le détail passe par les outils). */
export async function overview(db: Db, dossier: Dossier, now: Date) {
  const c = dossier.client;
  const [docs, offs, nextVisits, apps] = await Promise.all([
    documentsStatus(db, dossier),
    db.from('offres').select('statut').eq('client_id', dossier.clientId).or('statut.is.null,statut.neq.doublon'),
    visits(db, dossier.clientId, 'a_venir', now),
    applications(db, dossier.clientId),
  ]);
  const offerCounts: Record<string, number> = {};
  for (const o of offs.data || []) {
    const label = OFFER_STATUS_LABEL[o.statut] || o.statut;
    offerCounts[label] = (offerCounts[label] || 0) + 1;
  }
  const missing = docs.par_personne.flatMap((p) => p.pieces.filter((i) => i.statut === 'manquant').map((i) => `${i.piece} — ${p.personne}`));
  return {
    date_et_heure: zurich(now.toISOString()),
    client: { prenom: dossier.prenom, agent: dossier.agentName, parcours: dossier.journey, statut: c.statut },
    criteres: {
      type_de_bien: c.type_bien ?? null,
      pieces: c.pieces ?? null,
      budget_max_chf: c.budget_max ?? null,
      region: c.region_recherche ?? null,
      occupants: c.nombre_occupants ?? null,
      souhaits: c.souhaits_particuliers ?? null,
    },
    personnes_du_dossier: dossier.persons.map((p) => p.label),
    mandat: mandate(dossier, now),
    pieces_manquantes: missing,
    demandes_de_pieces_en_attente: docs.demandes_de_l_agent_en_attente,
    extrait_poursuites: docs.extrait_poursuites,
    offres_par_statut: offerCounts,
    prochaines_visites: nextVisits.slice(0, 3),
    candidatures: apps.candidatures.slice(0, 5),
    preparation_des_dossiers: apps.preparation_des_dossiers.slice(0, 5),
  };
}

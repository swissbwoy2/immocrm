/**
 * Modèle des notifications, commun à tous les espaces (admin, agent, client, apporteur, propriétaire) :
 * fonctions pures, sans requête. Range chaque notification par thème, détermine si elle attend une action
 * (« À traiter maintenant »), donne le libellé du bouton d'action et classe la notification dans un groupe de jours.
 * Le rôle par défaut est « admin » : l'appel sans rôle garde exactement le comportement historique de l'admin.
 */
import type React from 'react';
import {
  AlarmClock, AlertTriangle, Award, Bell, BellRing, CalendarCheck, CalendarDays, CalendarX, Coins, FileCheck,
  FilePlus2, FileSignature, FileText, Handshake, HardHat, Heart, Hourglass, Home, KeyRound, Mail, MessageCircle,
  PartyPopper, PenLine, Phone, RefreshCw, Share2, ShieldAlert, UserCheck, UserMinus, UserPlus, Users, Video, XCircle,
} from 'lucide-react';

export type NotificationRole = 'admin' | 'agent' | 'client' | 'apporteur' | 'proprietaire';

export type Theme =
  | 'clients' | 'messages' | 'visites' | 'offres' | 'candidatures' | 'mandats'
  | 'recommandations' | 'biens' | 'alertes' | 'autres';

type Notif = { type: string; read?: boolean; metadata?: Record<string, any> | null };

const LIBELLES_THEME: Record<Theme, string> = {
  clients: 'Clients & activations',
  messages: 'Messages',
  visites: 'Visites',
  offres: 'Offres',
  candidatures: 'Candidatures & baux',
  mandats: 'Mandats & documents',
  recommandations: 'Recommandations & commissions',
  biens: 'Mes biens',
  alertes: 'Alertes',
  autres: 'Autres',
};

const LIBELLES_THEME_ROLE: Partial<Record<NotificationRole, Partial<Record<Theme, string>>>> = {
  client: { clients: 'Mon compte & mon agent', candidatures: 'Candidatures & bail', mandats: 'Mandat & documents' },
  proprietaire: { clients: 'Mon compte', mandats: 'Mandats & documents' },
  apporteur: { clients: 'Mon compte' },
};

const ORDRE_THEMES: Record<NotificationRole, Theme[]> = {
  admin: ['clients', 'messages', 'visites', 'candidatures', 'mandats', 'alertes', 'autres'],
  agent: ['clients', 'messages', 'visites', 'candidatures', 'mandats', 'alertes', 'autres'],
  client: ['offres', 'visites', 'messages', 'candidatures', 'mandats', 'clients', 'alertes', 'autres'],
  apporteur: ['recommandations', 'messages', 'clients', 'mandats', 'alertes', 'autres'],
  proprietaire: ['biens', 'messages', 'visites', 'candidatures', 'mandats', 'clients', 'alertes', 'autres'],
};

/** Thèmes proposés dans le filtre, dans l'ordre et avec les libellés du rôle. */
export function getThemes(role: NotificationRole = 'admin'): { key: Theme; label: string }[] {
  return ORDRE_THEMES[role].map((key) => ({ key, label: LIBELLES_THEME_ROLE[role]?.[key] ?? LIBELLES_THEME[key] }));
}

/** Thèmes de l'admin (liste historique). */
export const THEMES: { key: Theme; label: string }[] = getThemes('admin');

const base = (type: string) => type.replace(/_admin$/, '');

const estRecommandation = (t: string) =>
  t === 'new_referral' || t.startsWith('referral') || t.startsWith('commission') || t.includes('recommandation') || t.startsWith('apporteur');
const estBienProprietaire = (t: string) =>
  ['new_interet_acheteur', 'new_projet_developpement', 'projet_statut_change', 'offre_status_change'].includes(t)
  || t.startsWith('bien') || t.startsWith('offre_achat') || t.startsWith('estimation') || t.startsWith('projet');
const estOffreClient = (t: string) => ['new_offer', 'offre_recommandee', 'offre_status_change'].includes(t);

export const getNotificationIcon = (type: string): React.ElementType => {
  const t = base(type);
  switch (t) {
    case 'new_client_activated': return UserCheck;
    case 'client_assigned': return Handshake;
    case 'client_removed': return UserMinus;
    case 'new_message': case 'whatsapp_reply': case 'whatsapp_client_reply': return MessageCircle;
    case 'new_offer': case 'offre_recommandee': return Home;
    case 'new_visit': case 'visite_proposee': return CalendarDays;
    case 'visit_reminder': return AlarmClock;
    case 'visit_confirmed': return CalendarCheck;
    case 'visit_refused': return CalendarX;
    case 'visit_delegated': return RefreshCw;
    case 'visite_video': return Video;
    case 'activation_request': return UserPlus;
    case 'nouvelle_demande_mandat': return FilePlus2;
    case 'mandat_relance': return RefreshCw;
    case 'document_request': return FileText;
    case 'dossier_complete': return FileCheck;
    case 'document_signe': return FileSignature;
    case 'badge_earned': return Award;
    case 'coagent_added': case 'coagent_assignment': return Users;
    case 'new_candidature': case 'candidature_deposee': case 'client_souhaite_postuler': return PenLine;
    case 'candidature_acceptee': return PartyPopper;
    case 'candidature_refusee': return XCircle;
    case 'candidature_bail_conclu': case 'bail_conclu': return PenLine;
    case 'candidature_attente_bail': return Hourglass;
    case 'candidature_bail_recu': return Mail;
    case 'candidature_signature_planifiee': case 'date_signature_choisie': return CalendarDays;
    case 'candidature_signature_effectuee': return FileSignature;
    case 'candidature_etat_lieux_fixe': return Home;
    case 'candidature_cles_remises': return KeyRound;
    case 'signature_reminder': case 'etat_lieux_reminder': return BellRing;
    case 'phone_appointment_new': case 'call_missed': case 'call_declined': return Phone;
    case 'new_interet_acheteur': return Heart;
    case 'new_projet_developpement': case 'projet_statut_change': return HardHat;
    case 'new_referral': return Share2;
    default:
      if (estAlerte(type)) return isSevere(type) ? ShieldAlert : AlertTriangle;
      if (t.startsWith('commission')) return Coins;
      if (t.startsWith('referral') || t.includes('recommandation')) return Share2;
      return Bell;
  }
};

/**
 * Libellés de type, réunis depuis les anciennes pages Notifications des cinq espaces.
 * Le client et l'agent gardent leurs libellés propres là où ils différaient de l'admin.
 */
const LIBELLES_TYPE_ROLE: Partial<Record<NotificationRole, Record<string, string>>> = {
  client: {
    new_client_activated: 'Compte activé',
    client_assigned: 'Agent assigné',
  },
  agent: {
    candidature_signature_planifiee: 'Date signature',
  },
};

export const getNotificationTypeName = (type: string, role: NotificationRole = 'admin') => {
  const propre = LIBELLES_TYPE_ROLE[role]?.[type];
  if (propre) return propre;
  switch (type) {
    case 'new_client_activated': return 'Nouveau client';
    case 'client_assigned': return 'Client assigné';
    case 'client_removed': return 'Client retiré';
    case 'new_message': return 'Message';
    case 'new_offer': case 'new_offer_admin': return 'Offre';
    case 'new_visit': case 'new_visit_admin': return 'Visite';
    case 'visit_reminder': return 'Rappel visite';
    case 'visit_confirmed': case 'visit_confirmed_admin': return 'Visite confirmée';
    case 'visit_refused': case 'visit_refused_admin': return 'Visite refusée';
    case 'visit_delegated': return 'Visite déléguée';
    case 'activation_request': return 'Demande activation';
    case 'nouvelle_demande_mandat': return 'Demande mandat';
    case 'document_request': return 'Demande document';
    case 'dossier_complete': return 'Dossier complet';
    case 'badge_earned': return 'Badge';
    case 'coagent_added': case 'coagent_assignment': return 'Co-agent';
    case 'new_candidature': case 'candidature_deposee': return 'Candidature';
    case 'candidature_acceptee': case 'candidature_acceptee_admin': return 'Candidature acceptée';
    case 'candidature_refusee': case 'candidature_refusee_admin': return 'Candidature refusée';
    case 'candidature_bail_conclu': case 'candidature_bail_conclu_admin': return 'Bail conclu';
    case 'candidature_attente_bail': case 'candidature_attente_bail_admin': return 'Attente bail';
    case 'candidature_bail_recu': case 'candidature_bail_recu_admin': return 'Bail reçu';
    case 'candidature_signature_planifiee': case 'candidature_signature_planifiee_admin': return 'Signature planifiée';
    case 'candidature_signature_effectuee': case 'candidature_signature_effectuee_admin': return 'Bail signé';
    case 'candidature_etat_lieux_fixe': case 'candidature_etat_lieux_fixe_admin': return 'État des lieux';
    case 'candidature_cles_remises': case 'candidature_cles_remises_admin': return 'Clés remises';
    case 'signature_reminder': return 'Rappel signature';
    case 'bail_conclu': return 'Bail conclu';
    case 'date_signature_choisie': return 'Date signature';
    // Types des espaces apporteur et propriétaire (sans libellé auparavant).
    case 'new_referral': return 'Recommandation';
    case 'new_interet_acheteur': return 'Intérêt acheteur';
    case 'new_projet_developpement': return 'Projet de développement';
    case 'projet_statut_change': return 'Statut du projet';
    case 'visite_proposee': return 'Visite proposée';
    default:
      if (type.startsWith('commission')) return 'Commission';
      return 'Autre';
  }
};

const MOTS_ALERTE = ['error', 'erreur', 'failed', 'echec', 'echouee', 'expired', 'missing', 'warning', 'alert', 'alerte', 'urgent', 'surveillance', 'scraper'];
const MOTS_SEVERES = ['error', 'erreur', 'failed', 'echec', 'echouee', 'expired', 'urgent'];

function estAlerte(type: string): boolean {
  const t = type.toLowerCase();
  return MOTS_ALERTE.some((m) => t.includes(m));
}
function isSevere(type: string): boolean {
  const t = type.toLowerCase();
  return MOTS_SEVERES.some((m) => t.includes(m));
}

export function themeOf(type: string, role: NotificationRole = 'admin'): Theme {
  const t = base(type);
  if (estAlerte(t)) return 'alertes';
  if (role === 'apporteur' && estRecommandation(t)) return 'recommandations';
  if (role === 'proprietaire' && estBienProprietaire(t)) return 'biens';
  if (role === 'client' && estOffreClient(t)) return 'offres';
  if (['new_client_activated', 'client_assigned', 'client_removed', 'client_updated', 'activation_request', 'coagent_added', 'coagent_assignment', 'new_proprietaire_invited', 'new_meta_lead', 'new_referral', 'client_interesse', 'client_pas_interesse', 'client_offer_response'].includes(t)) return 'clients';
  if (['new_message', 'whatsapp_reply', 'whatsapp_client_reply', 'whatsapp_action', 'call_missed', 'call_declined', 'call_incoming', 'call_invite', 'phone_appointment_new'].includes(t)) return 'messages';
  if (t.startsWith('visit') || t.startsWith('visite') || t === 'new_visit' || t === 'compte_rendu_visite') return 'visites';
  if (t.startsWith('candidature') || t === 'new_candidature' || t === 'client_souhaite_postuler' || t === 'bail_conclu' || t === 'date_signature_choisie' || t === 'signature_reminder' || t === 'etat_lieux_reminder') return 'candidatures';
  if (['nouvelle_demande_mandat', 'mandat_relance', 'document_request', 'dossier_complete', 'document_signe', 'new_offer', 'offre_status_change'].includes(t) || t.startsWith('payslip') || t.startsWith('extrait_poursuites')) return 'mandats';
  return 'autres';
}

/** Types qui attendent une action, par rôle. */
const A_TRAITER: Record<NotificationRole, Set<string>> = {
  admin: new Set([
    'activation_request', 'nouvelle_demande_mandat', 'client_souhaite_postuler', 'new_candidature', 'new_visit',
    'visite_proposee', 'document_request', 'date_signature_choisie', 'phone_appointment_new', 'new_message',
    'whatsapp_reply', 'whatsapp_client_reply', 'inscription_echouee', 'new_meta_lead',
  ]),
  // Agent : proche de l'admin, centré sur ses clients (pas d'activation de comptes ni de leads Meta).
  agent: new Set([
    'client_assigned', 'coagent_assignment', 'client_souhaite_postuler', 'client_interesse', 'client_offer_response',
    'new_candidature', 'new_visit', 'visite_proposee', 'visit_delegated', 'document_request', 'dossier_complete',
    'date_signature_choisie', 'phone_appointment_new', 'new_message', 'whatsapp_reply', 'whatsapp_client_reply',
    'call_missed',
  ]),
  // Client : répondre aux offres, confirmer les visites proposées, fournir les documents, répondre aux messages.
  client: new Set([
    'new_offer', 'offre_recommandee', 'new_visit', 'visite_proposee', 'document_request', 'new_message',
    'whatsapp_reply', 'call_missed',
  ]),
  // Apporteur : messages et demandes de pièces ; les recommandations / commissions qui demandent une action.
  apporteur: new Set(['new_message', 'whatsapp_reply', 'document_request', 'call_missed']),
  // Propriétaire : intérêts et offres d'acheteurs sur ses biens, demandes de visite, documents, messages.
  proprietaire: new Set([
    'new_interet_acheteur', 'visit_requested', 'demande_visite', 'visite_proposee', 'document_request',
    'date_signature_choisie', 'new_message', 'whatsapp_reply', 'call_missed',
  ]),
};

const REPONSES_OFFRE = ['reponse', 'reponse_client', 'client_response', 'response', 'responded', 'repondu', 'statut_client'];

/** Vrai si l'offre reçue par le client porte déjà sa réponse dans les métadonnées. */
function offreRepondue(n: Notif): boolean {
  const m = n.metadata;
  if (!m) return false;
  return REPONSES_OFFRE.some((k) => m[k] !== undefined && m[k] !== null && m[k] !== '' && m[k] !== false);
}

/**
 * Vrai si la notification attend une action du rôle (type d'action, alerte grave, priorité élevée
 * ou `action_required` dans les métadonnées).
 */
export function estATraiter(n: Notif, role: NotificationRole = 'admin'): boolean {
  const prio = String(n.metadata?.priority ?? n.metadata?.severity ?? n.metadata?.niveau ?? '').toLowerCase();
  if (['urgent', 'urgente', 'critical', 'critique', 'high', 'haute'].includes(prio)) return true;
  if (isSevere(n.type)) return true;
  const t = base(n.type);
  if (role !== 'admin' && n.metadata?.action_required === true) return true;
  if (role === 'client' && estOffreClient(t)) return t !== 'offre_status_change' && !offreRepondue(n);
  if (role === 'apporteur' && estRecommandation(t)) {
    return /(a_completer|a_valider|a_facturer|demande|info_requise|action)/.test(t);
  }
  if (role === 'proprietaire' && t.startsWith('offre_achat')) return true;
  return A_TRAITER[role].has(t);
}

/** Libellé du bouton d'ouverture selon le rôle et le thème. */
export function libelleAction(n: Notif, role: NotificationRole = 'admin'): string {
  const a = estATraiter(n, role);
  const t = base(n.type);
  const theme = themeOf(n.type, role);

  if (role === 'client') {
    if (t === 'document_request') return 'Ajouter le document';
    switch (theme) {
      case 'offres': return 'Voir l’offre';
      case 'visites': return a ? 'Confirmer la visite' : 'Voir la visite';
      case 'messages': return a ? 'Répondre' : 'Ouvrir';
      case 'candidatures': return 'Voir ma candidature';
      case 'mandats': return 'Voir mon dossier';
      case 'alertes': return 'Voir l’alerte';
      default: return 'Ouvrir';
    }
  }

  if (role === 'apporteur') {
    if (t === 'document_request') return 'Ajouter le document';
    switch (theme) {
      case 'recommandations': return t.startsWith('commission') ? 'Voir la commission' : 'Voir la recommandation';
      case 'messages': return a ? 'Répondre' : 'Ouvrir';
      case 'alertes': return 'Voir l’alerte';
      default: return 'Ouvrir';
    }
  }

  if (role === 'proprietaire') {
    if (t === 'document_request') return 'Ajouter le document';
    switch (theme) {
      case 'biens':
        if (t === 'new_interet_acheteur') return 'Voir l’intérêt';
        if (t.startsWith('offre_achat') || t === 'offre_status_change') return 'Voir l’offre';
        if (t.includes('projet')) return 'Voir le projet';
        return 'Voir le bien';
      case 'messages': return a ? 'Répondre' : 'Ouvrir';
      case 'visites': return a ? 'Gérer la visite' : 'Voir la visite';
      case 'candidatures': return 'Voir la candidature';
      case 'mandats': return 'Voir le mandat';
      case 'alertes': return 'Voir l’alerte';
      default: return 'Ouvrir';
    }
  }

  // Admin et agent.
  switch (theme) {
    case 'clients':
      if (role === 'agent') return a ? 'Contacter le client' : 'Voir le client';
      return a ? 'Traiter la demande' : 'Voir le client';
    case 'messages': return a ? 'Répondre' : 'Ouvrir';
    case 'visites': return a ? 'Gérer la visite' : 'Voir la visite';
    case 'candidatures': return a ? 'Traiter la candidature' : 'Voir la candidature';
    case 'mandats': return a ? 'Traiter' : 'Voir le dossier';
    case 'alertes': return 'Voir l’alerte';
    default: return 'Ouvrir';
  }
}

export type GroupeJour = 'aujourdhui' | 'hier' | 'semaine' | 'ancien';
export const GROUPES_JOUR: { key: GroupeJour; label: string }[] = [
  { key: 'aujourdhui', label: 'Aujourd’hui' },
  { key: 'hier', label: 'Hier' },
  { key: 'semaine', label: 'Cette semaine' },
  { key: 'ancien', label: 'Plus ancien' },
];

export function groupeJour(iso: string, now = new Date()): GroupeJour {
  const d = new Date(iso);
  const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= debutJour) return 'aujourdhui';
  if (t >= debutJour - 86400000) return 'hier';
  if (t >= debutJour - 6 * 86400000) return 'semaine';
  return 'ancien';
}

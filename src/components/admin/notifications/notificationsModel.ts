/**
 * Modèle des notifications de l'admin : fonctions pures, sans requête.
 * Range chaque notification par thème, détermine si elle attend une action (« À traiter maintenant »)
 * et la classe dans un groupe de jours.
 */
import type React from 'react';
import {
  AlarmClock, AlertTriangle, Award, Bell, BellRing, CalendarCheck, CalendarDays, CalendarX, FileCheck, FilePlus2,
  FileSignature, FileText, Handshake, Hourglass, Home, KeyRound, Mail, MessageCircle, PartyPopper, PenLine, Phone,
  RefreshCw, ShieldAlert, UserCheck, UserMinus, UserPlus, Users, Video, XCircle,
} from 'lucide-react';

export type Theme = 'clients' | 'messages' | 'visites' | 'candidatures' | 'mandats' | 'alertes' | 'autres';

export const THEMES: { key: Theme; label: string }[] = [
  { key: 'clients', label: 'Clients & activations' },
  { key: 'messages', label: 'Messages' },
  { key: 'visites', label: 'Visites' },
  { key: 'candidatures', label: 'Candidatures & baux' },
  { key: 'mandats', label: 'Mandats & documents' },
  { key: 'alertes', label: 'Alertes' },
  { key: 'autres', label: 'Autres' },
];

const base = (type: string) => type.replace(/_admin$/, '');

export const getNotificationIcon = (type: string): React.ElementType => {
  switch (base(type)) {
    case 'new_client_activated': return UserCheck;
    case 'client_assigned': return Handshake;
    case 'client_removed': return UserMinus;
    case 'new_message': case 'whatsapp_reply': case 'whatsapp_client_reply': return MessageCircle;
    case 'new_offer': return Home;
    case 'new_visit': return CalendarDays;
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
    default:
      if (estAlerte(type)) return isSevere(type) ? ShieldAlert : AlertTriangle;
      return Bell;
  }
};

/** Libellés de type d'origine (inchangés). */
export const getNotificationTypeName = (type: string) => {
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
    default: return 'Autre';
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

export function themeOf(type: string): Theme {
  const t = base(type);
  if (estAlerte(t)) return 'alertes';
  if (['new_client_activated', 'client_assigned', 'client_removed', 'client_updated', 'activation_request', 'coagent_added', 'coagent_assignment', 'new_proprietaire_invited', 'new_meta_lead', 'new_referral', 'client_interesse', 'client_pas_interesse', 'client_offer_response'].includes(t)) return 'clients';
  if (['new_message', 'whatsapp_reply', 'whatsapp_client_reply', 'whatsapp_action', 'call_missed', 'call_declined', 'call_incoming', 'call_invite', 'phone_appointment_new'].includes(t)) return 'messages';
  if (t.startsWith('visit') || t.startsWith('visite') || t === 'new_visit' || t === 'compte_rendu_visite') return 'visites';
  if (t.startsWith('candidature') || t === 'new_candidature' || t === 'client_souhaite_postuler' || t === 'bail_conclu' || t === 'date_signature_choisie' || t === 'signature_reminder' || t === 'etat_lieux_reminder') return 'candidatures';
  if (['nouvelle_demande_mandat', 'mandat_relance', 'document_request', 'dossier_complete', 'document_signe', 'new_offer', 'offre_status_change'].includes(t) || t.startsWith('payslip') || t.startsWith('extrait_poursuites')) return 'mandats';
  return 'autres';
}

/** Types qui attendent une action de l'admin. */
const A_TRAITER = new Set([
  'activation_request',
  'nouvelle_demande_mandat',
  'client_souhaite_postuler',
  'new_candidature',
  'new_visit',
  'visite_proposee',
  'document_request',
  'date_signature_choisie',
  'phone_appointment_new',
  'new_message',
  'whatsapp_reply',
  'whatsapp_client_reply',
  'inscription_echouee',
  'new_meta_lead',
]);

/** Vrai si la notification attend une action (type d'action, alerte ou priorité élevée dans les métadonnées). */
export function estATraiter(n: { type: string; metadata?: Record<string, any> | null }): boolean {
  const prio = String(n.metadata?.priority ?? n.metadata?.severity ?? n.metadata?.niveau ?? '').toLowerCase();
  if (['urgent', 'urgente', 'critical', 'critique', 'high', 'haute'].includes(prio)) return true;
  return A_TRAITER.has(base(n.type)) || isSevere(n.type);
}

/** Libellé du bouton d'ouverture selon le thème. */
export function libelleAction(n: { type: string; metadata?: Record<string, any> | null }): string {
  const a = estATraiter(n);
  switch (themeOf(n.type)) {
    case 'clients': return a ? 'Traiter la demande' : 'Voir le client';
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

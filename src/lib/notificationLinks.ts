/**
 * Centralized notification link logic
 * Maps notification types to correct pages for each user role
 */

type UserRole = 'admin' | 'agent' | 'client' | 'apporteur';

export interface NotificationMetadata {
  visite_id?: string;
  conversation_id?: string;
  offre_id?: string;
  candidature_id?: string;
  client_id?: string;
  client_user_id?: string;
  demande_id?: string;
  [key: string]: string | undefined;
}

// Base URL mapping per notification type and role
const NOTIFICATION_ROUTES: Record<string, Partial<Record<UserRole, string>>> = {
  // Visit-related notifications
  visit_reminder: {
    admin: '/admin/calendrier',
    agent: '/agent/visites',
    client: '/client/visites',
  },
  new_visit: {
    admin: '/admin/calendrier',
    agent: '/agent/visites',
    client: '/client/visites',
  },
  new_visit_admin: {
    admin: '/admin/calendrier',
  },
  visit_confirmed: {
    admin: '/admin/calendrier',
    agent: '/agent/visites',
    client: '/client/visites',
  },
  visit_confirmed_admin: {
    admin: '/admin/calendrier',
  },
  visit_refused: {
    admin: '/admin/calendrier',
    agent: '/agent/visites',
    client: '/client/visites',
  },
  visit_refused_admin: {
    admin: '/admin/calendrier',
  },
  visit_delegated: {
    admin: '/admin/calendrier',
    agent: '/agent/visites',
    client: '/client/visites-deleguees',
  },

  // Call notifications (route universelle gérée plus bas pour les appels entrants)
  call_declined: {
    admin: '/admin/messagerie',
    agent: '/agent/messagerie',
    client: '/client/messagerie',
  },
  call_missed: {
    admin: '/admin/messagerie',
    agent: '/agent/messagerie',
    client: '/client/messagerie',
  },

  // Message notifications
  new_message: {
    admin: '/admin/messagerie',
    agent: '/agent/messagerie',
    client: '/client/messagerie',
  },

  // Offer notifications
  new_offer: {
    admin: '/admin/offres-envoyees',
    agent: '/agent/offres-envoyees',
    client: '/client/offres-recues',
  },
  new_offer_admin: {
    admin: '/admin/offres-envoyees',
  },

  // Activation requests
  activation_request: {
    admin: '/admin/demandes-activation',
  },

  // Client notifications
  new_client_activated: {
    admin: '/admin/clients',
    agent: '/agent/mes-clients',
  },
  client_assigned: {
    admin: '/admin/clients',
    agent: '/agent/mes-clients',
  },
  client_removed: {
    admin: '/admin/clients',
    agent: '/agent/mes-clients',
  },

  // Mandat notifications
  nouvelle_demande_mandat: {
    admin: '/admin/mandats',
  },

  // Document notifications
  document_request: {
    admin: '/admin/documents',
    agent: '/agent/documents',
    client: '/client/documents',
  },
  dossier_complete: {
    admin: '/admin/clients',
    agent: '/agent/mes-clients',
    client: '/client/dossier',
  },

  // Candidature notifications
  new_candidature: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_deposee: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_acceptee: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_acceptee_admin: {
    admin: '/admin/candidatures',
  },
  candidature_refusee: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_refusee_admin: {
    admin: '/admin/candidatures',
  },
  candidature_bail_conclu: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_bail_conclu_admin: {
    admin: '/admin/candidatures',
  },
  bail_conclu: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_attente_bail: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_attente_bail_admin: {
    admin: '/admin/candidatures',
  },
  candidature_bail_recu: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_bail_recu_admin: {
    admin: '/admin/candidatures',
  },
  candidature_signature_planifiee: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_signature_planifiee_admin: {
    admin: '/admin/candidatures',
  },
  date_signature_choisie: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_signature_effectuee: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_signature_effectuee_admin: {
    admin: '/admin/candidatures',
  },
  candidature_etat_lieux_fixe: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_etat_lieux_fixe_admin: {
    admin: '/admin/candidatures',
  },
  candidature_cles_remises: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },
  candidature_cles_remises_admin: {
    admin: '/admin/candidatures',
  },
  signature_reminder: {
    admin: '/admin/candidatures',
    agent: '/agent/candidatures',
    client: '/client/mes-candidatures',
  },

  // Co-agent notifications
  coagent_added: {
    admin: '/admin/clients',
    agent: '/agent/mes-clients',
  },
  coagent_assignment: {
    admin: '/admin/clients',
    agent: '/agent/mes-clients',
  },

  // Badge notifications
  badge_earned: {
    agent: '/agent/dashboard',
  },

  // Apporteur notifications
  new_referral: {
    apporteur: '/apporteur/mes-referrals',
  },
  commission_earned: {
    apporteur: '/apporteur/commissions',
  },

  // Offer status / video / client interest
  offre_status_change: {
    client: '/client/offres-recues',
    agent: '/agent/offres-envoyees',
    admin: '/admin/offres-envoyees',
  },
  client_interesse: {
    agent: '/agent/offres-envoyees',
    admin: '/admin/offres-envoyees',
  },
  client_souhaite_postuler: {
    agent: '/agent/postulations',
    admin: '/admin/postulations',
  },
  visite_video: {
    client: '/client/videos-recues',
    agent: '/agent/visites',
    admin: '/admin/calendrier',
  },

  // Document reminders (client side)
  payslip_reminder_soft: { client: '/client/documents' },
  payslip_reminder_insistent: { client: '/client/documents' },
  payslip_reminder_urgent: { client: '/client/documents' },
  extrait_poursuites_missing: { client: '/client/documents' },
  extrait_poursuites_warning: { client: '/client/documents' },
  extrait_poursuites_expired: { client: '/client/documents' },
};

/** Parcours du client connecté ('achat', 'location', ...) — utilisé pour router vers les bons écrans. */
let currentClientParcoursType: string | null = null;

export function setClientParcoursType(parcours: string | null) {
  currentClientParcoursType = parcours;
}

export function getClientParcoursType(): string | null {
  return currentClientParcoursType;
}

/** Remappe les chemins client "location" vers leurs équivalents "achat". */
export function remapClientPathForParcours(path: string, parcours?: string | null): string {
  const p = parcours ?? currentClientParcoursType;
  if (p !== 'achat' || !path.startsWith('/client')) return path;
  if (path.startsWith('/client/offres-recues')) return '/client/biens-proposes';
  if (path.startsWith('/client/videos-recues')) return '/client/biens-selectionnes';
  if (path.startsWith('/client/visites-deleguees')) return '/client/calendrier';
  if (path.startsWith('/client/visites')) return '/client/calendrier';
  if (path.startsWith('/client/mes-candidatures')) return '/client/biens-selectionnes';
  if (path.startsWith('/client/mon-contrat')) return '/client/dossier';
  return path;
}

/**
 * Detect user role from current URL path
 */
export function detectRoleFromPath(pathname: string): UserRole {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/agent')) return 'agent';
  if (pathname.startsWith('/client')) return 'client';
  if (pathname.startsWith('/apporteur')) return 'apporteur';
  return 'client'; // Default fallback
}

function hasQueryParam(params: URLSearchParams, key: string): boolean {
  return params.has(key) && params.get(key)?.trim() !== '';
}

function mergeMetadataIntoQuery(
  path: string,
  query: string | undefined,
  metadata: NotificationMetadata | null | undefined
): string {
  const params = new URLSearchParams(query || '');

  if (
    metadata?.offre_id &&
    !hasQueryParam(params, 'offre') &&
    !hasQueryParam(params, 'offreId')
  ) {
    if (path.includes('/offres-auto')) {
      params.set('offre', metadata.offre_id);
    } else if (path.includes('/offres-recues') || path.includes('/offres-envoyees')) {
      params.set('offreId', metadata.offre_id);
    }
  }

  if (
    metadata?.visite_id &&
    !hasQueryParam(params, 'visiteId') &&
    (path.includes('/calendrier') || path.includes('/visites'))
  ) {
    params.set('visiteId', metadata.visite_id);
  }

  if (
    metadata?.conversation_id &&
    !hasQueryParam(params, 'conversationId') &&
    path.includes('/messagerie')
  ) {
    params.set('conversationId', metadata.conversation_id);
  }

  if (
    metadata?.candidature_id &&
    !hasQueryParam(params, 'candidatureId') &&
    path.includes('/mes-candidatures')
  ) {
    params.set('candidatureId', metadata.candidature_id);
  }

  return params.toString();
}

/**
 * Get the correct notification link based on type, role, and metadata
 */
export function getCorrectNotificationLink(
  notificationType: string,
  currentLink: string | null,
  role: UserRole,
  metadata?: NotificationMetadata | null
): string {
  const stored = currentLink?.trim() || null;

  // 0) Appels : route universelle /appel (existe pour tous les rôles).
  //    Les anciens liens (/messagerie?call=..., /agent/messagerie?call=...)
  //    sont réécrits ici pour ne jamais retomber sur une 404.
  if (notificationType === 'call_incoming' || notificationType === 'call_invite') {
    const q = stored?.includes('?') ? new URLSearchParams(stored.split('?')[1]) : null;
    const conversationId =
      (metadata as any)?.conversationId ||
      metadata?.conversation_id ||
      q?.get('call') ||
      q?.get('conversationId') ||
      '';
    const mode = (metadata as any)?.mode || q?.get('mode') || '';
    if (conversationId) {
      return `/appel?call=${conversationId}&conversationId=${conversationId}${mode ? `&mode=${mode}` : ''}`;
    }
  }


  // 1) The stored link is authoritative: it is generated with the right
  //    deep-link params (?visiteId=, ?offreId=, ?conversationId=, ?offre=...).
  //    We only rewrite it when it targets another role space.
  if (stored && stored.startsWith('/')) {
    const qIndex = stored.indexOf('?');
    const storedPath = qIndex >= 0 ? stored.slice(0, qIndex) : stored;
    const storedQuery = qIndex >= 0 ? stored.slice(qIndex + 1) : '';
    const linkRole = roleOfPath(storedPath);
    const mergedQuery = mergeMetadataIntoQuery(storedPath, storedQuery, metadata);

    if (!linkRole || linkRole === role) {
      const finalPath = role === 'client' ? remapClientPathForParcours(storedPath) : storedPath;
      return mergedQuery ? `${finalPath}?${mergedQuery}` : finalPath;
    }

    // Role mismatch: keep the params but move to the current role's space.
    const mapped = NOTIFICATION_ROUTES[notificationType]?.[role];
    if (mapped) {
      const mappedPath = role === 'client'
        ? remapClientPathForParcours(mapped.split('?')[0])
        : mapped.split('?')[0];
      return mergedQuery ? `${mappedPath}?${mergedQuery}` : mappedPath;
    }
    const swapped = storedPath.replace(/^\/(admin|agent|client|apporteur)/, `/${role}`);
    const finalSwapped = role === 'client' ? remapClientPathForParcours(swapped) : swapped;
    return mergedQuery ? `${finalSwapped}?${mergedQuery}` : finalSwapped;
  }

  // 2) No usable stored link: rebuild one from the type mapping + metadata.
  let baseUrl = NOTIFICATION_ROUTES[notificationType]?.[role] || `/${role}`;
  if (role === 'client') baseUrl = remapClientPathForParcours(baseUrl);

  const params = new URLSearchParams();
  if (metadata) {
    if (metadata.visite_id) params.set('visiteId', metadata.visite_id);
    if (metadata.conversation_id) params.set('conversationId', metadata.conversation_id);
    if (metadata.offre_id) {
      if (baseUrl.includes('/offres-auto')) params.set('offre', metadata.offre_id);
      else params.set('offreId', metadata.offre_id);
    }
    if (metadata.candidature_id) params.set('candidatureId', metadata.candidature_id);
    if (metadata.client_id) params.set('clientId', metadata.client_id);
    if (metadata.client_user_id) params.set('clientId', metadata.client_user_id);
    if (metadata.demande_id) params.set('demandeId', metadata.demande_id);
  }

  const paramsStr = params.toString();
  if (paramsStr) {
    baseUrl += (baseUrl.includes('?') ? '&' : '?') + paramsStr;
  }

  return baseUrl;
}

function roleOfPath(path: string): UserRole | null {
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/agent')) return 'agent';
  if (path.startsWith('/client')) return 'client';
  if (path.startsWith('/apporteur')) return 'apporteur';
  return null;
}


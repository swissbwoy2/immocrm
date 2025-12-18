/**
 * Centralized notification link logic
 * Maps notification types to correct pages for each user role
 */

type UserRole = 'admin' | 'agent' | 'client' | 'apporteur';

interface NotificationMetadata {
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
};

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

/**
 * Get the correct notification link based on type, role, and metadata
 */
export function getCorrectNotificationLink(
  notificationType: string,
  currentLink: string | null,
  role: UserRole,
  metadata?: NotificationMetadata | null
): string {
  // Get the correct base URL for this notification type and role
  const correctBaseUrl = NOTIFICATION_ROUTES[notificationType]?.[role];
  
  // If we have a mapped route, use it; otherwise use the provided link or fallback
  let baseUrl = correctBaseUrl || currentLink || `/${role}`;
  
  // Build query params from metadata
  const params = new URLSearchParams();
  
  if (metadata) {
    if (metadata.visite_id) params.set('visiteId', metadata.visite_id);
    if (metadata.conversation_id) params.set('conversationId', metadata.conversation_id);
    if (metadata.offre_id) params.set('offreId', metadata.offre_id);
    if (metadata.candidature_id) params.set('candidatureId', metadata.candidature_id);
    if (metadata.client_id) params.set('clientId', metadata.client_id);
    if (metadata.client_user_id) params.set('clientId', metadata.client_user_id);
    if (metadata.demande_id) params.set('demandeId', metadata.demande_id);
  }
  
  // Append params to URL if any
  const paramsStr = params.toString();
  if (paramsStr) {
    // Check if URL already has params
    const hasParams = baseUrl.includes('?');
    baseUrl += (hasParams ? '&' : '?') + paramsStr;
  }
  
  return baseUrl;
}

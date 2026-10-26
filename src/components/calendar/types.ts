export interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  status?: string;
  priority?: string;
  agent_id?: string;
  client_id?: string;
  description?: string;
  all_day?: boolean;
  end_date?: string;
  // Co-assignment sharing flags (added client-side)
  is_shared?: boolean;
  shared_by_name?: string | null;
}

export const eventTypeLabels: Record<string, string> = {
  visite: 'Visite',
  rappel: 'Rappel',
  rendez_vous: 'Rendez-vous',
  tache: 'Tâche',
  reunion: 'Réunion',
  signature: 'Signature bail',
  etat_lieux: 'État des lieux',
  rdv_telephonique: 'RDV téléphonique',
  autre: 'Autre',
};

// Version sobre : fond léger /10, texte et bordure fine de la couleur du type (aucun dégradé ni ombre)
export const eventTypeColors: Record<string, string> = {
  visite: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400',
  rappel: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-400',
  rendez_vous: 'bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400',
  tache: 'bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-400',
  reunion: 'bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-400',
  signature: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  etat_lieux: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30 dark:text-cyan-400',
  rdv_telephonique: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30 dark:text-indigo-400',
  autre: 'bg-gray-500/10 text-gray-700 border-gray-500/30 dark:text-gray-400',
};

// Couleurs pour le calendrier mensuel (badges compacts)
export const eventTypeCalendarColors: Record<string, string> = {
  visite: 'bg-blue-500',                               // Visite confirmée par client
  visite_proposee: 'bg-gray-400',                      // Créneau proposé par agent (non confirmé)
  visite_deleguee: 'bg-orange-500 ring-2 ring-orange-500/30', // Visite déléguée (URGENT)
  visite_auto: 'bg-violet-600 ring-2 ring-violet-500/30', // Visite issue d'une offre automatique
  rappel: 'bg-amber-500',
  rendez_vous: 'bg-emerald-500',
  tache: 'bg-orange-500',
  reunion: 'bg-purple-500',
  signature: 'bg-emerald-600',
  etat_lieux: 'bg-cyan-500',
  rdv_telephonique: 'bg-indigo-500',
  autre: 'bg-gray-500',
};

// Étiquettes sobres des événements dans les grilles (fond léger /10, texte et bordure de la couleur du type)
export const eventTypeChipColors: Record<string, string> = {
  visite: 'bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-300',
  visite_proposee: 'bg-muted text-muted-foreground border-border',
  visite_deleguee: 'bg-orange-500/10 text-orange-700 border-orange-500/60 font-semibold dark:text-orange-300',
  visite_auto: 'bg-violet-500/10 text-violet-700 border-violet-500/40 dark:text-violet-300',
  rappel: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300',
  rendez_vous: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300',
  tache: 'bg-orange-500/10 text-orange-700 border-orange-500/25 dark:text-orange-300',
  reunion: 'bg-purple-500/10 text-purple-700 border-purple-500/25 dark:text-purple-300',
  signature: 'bg-emerald-600/10 text-emerald-800 border-emerald-600/30 dark:text-emerald-300',
  etat_lieux: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/25 dark:text-cyan-300',
  rdv_telephonique: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/25 dark:text-indigo-300',
  autre: 'bg-gray-500/10 text-gray-700 border-gray-500/25 dark:text-gray-300',
};

export const DEFAULT_EVENT_CHIP = 'bg-muted text-foreground border-border';

// Labels pour les types de visites
export const visiteSourceLabels: Record<string, string> = {
  proposee_agent: '⏳ Créneau proposé',
  planifiee_client: '✅ Confirmée',
  deleguee: '🔥 Déléguée',
};

export const priorityColors: Record<string, string> = {
  basse: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  normale: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  haute: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
  urgente: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
};

export type ContactType = 
  | 'proprietaire'
  | 'gerant_regie'
  | 'concierge'
  | 'locataire'
  | 'client_potentiel'
  | 'regie'
  | 'notaire'
  | 'autre';

export const contactTypeLabels: Record<ContactType, string> = {
  proprietaire: 'Propriétaire',
  gerant_regie: 'Gérant de régie',
  concierge: 'Concierge',
  locataire: 'Locataire',
  client_potentiel: 'Client potentiel',
  regie: 'Régie',
  notaire: 'Notaire',
  autre: 'Autre',
};

export const contactTypeColors: Record<ContactType, string> = {
  proprietaire: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  gerant_regie: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  concierge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  locataire: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  client_potentiel: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  regie: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  notaire: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  autre: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

export interface Contact {
  id: string;
  agent_id: string;
  contact_type: ContactType;
  civilite: string | null;
  prenom: string | null;
  nom: string;
  email: string | null;
  telephone: string | null;
  telephone_secondaire: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  entreprise: string | null;
  fonction: string | null;
  notes: string | null;
  tags: string[] | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

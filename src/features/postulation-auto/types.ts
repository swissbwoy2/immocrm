export type FormulaireMode = 'overlay' | 'acroform';

export interface FormulaireLocation {
  id: string;
  nom: string;
  fichier_pdf_url: string | null;
  nb_pages: number;
  actif: boolean;
  annexe_pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  /** 'acroform' = remplissage natif par nom de champ ; 'overlay' = coordonnées */
  mode: FormulaireMode;
}

export interface FormulaireChamp {
  id: string;
  formulaire_id: string;
  cle_champ: string;
  /** 1-indexed */
  page: number;
  /** Coordonnées en points PDF, origine EN HAUT À GAUCHE de la page */
  pos_x: number;
  pos_y: number;
  largeur: number;
  hauteur: number;
  taille_police: number;
  alignement: 'left' | 'center' | 'right';
  /** Mode acroform : nom exact du champ dans le PDF */
  nom_champ_pdf?: string | null;
  type_champ?: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'optionlist';
  /** Option à cocher/sélectionner (radio, dropdown) */
  option_valeur?: string | null;
}

export type ChampDraft = Omit<FormulaireChamp, 'id' | 'formulaire_id'> & {
  id: string;
  formulaire_id?: string;
  _new?: boolean;
};

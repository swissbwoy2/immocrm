export interface FormulaireLocation {
  id: string;
  nom: string;
  fichier_pdf_url: string | null;
  nb_pages: number;
  actif: boolean;
  annexe_pdf_url: string | null;
  created_by: string | null;
  created_at: string;
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
}

export type ChampDraft = Omit<FormulaireChamp, 'id' | 'formulaire_id'> & {
  id: string;
  formulaire_id?: string;
  _new?: boolean;
};

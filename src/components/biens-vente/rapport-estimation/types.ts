export interface RapportEstimationData {
  // Marché
  prix_median_secteur: number | null;
  evolution_prix_median_1an: number | null;
  nb_biens_comparables: number | null;
  nb_nouvelles_annonces: number | null;
  donnees_distribution_prix: any | null;

  // Bâtiment
  categorie_ofs: string;
  classification_ofs: string;
  numero_officiel_batiment: string;
  logements_details: LogementDetail[] | null;
  emprise_sol_m2: number | null;
  surface_logement_totale: number | null;

  // Parcelle
  surface_parcelle: number | null;
  egrid: string;
  type_parcelle: string;
  plan_affectation_type: string;
  plan_affectation_nom: string;
  restrictions_parcelle: RestrictionsParcelle | null;

  // Énergie
  source_energie_chauffage: string;
  systeme_chauffage_principal: SystemeEnergie | null;
  systeme_eau_chaude: SystemeEnergie | null;
  systeme_chauffage_supplementaire: SystemeEnergie | null;
  systeme_eau_chaude_supplementaire: SystemeEnergie | null;
  installation_solaire_actuelle: string;
  potentiel_solaire: PotentielSolaire | null;

  // Commodités
  commodites_scores: CommoditesScores | null;
  commodites_details: CommoditeDetail[] | null;

  // Accessibilité
  accessibilite_data: AccessibiliteData | null;

  // Bruit
  bruit_routier_jour: number | null;
  bruit_routier_nuit: number | null;
  bruit_ferroviaire_jour: number | null;
  bruit_ferroviaire_nuit: number | null;

  // Ensoleillement
  ensoleillement_data: EnsoleillementData | null;

  // Permis de construire
  permis_construire: PermisConstruire[] | null;
}

export interface LogementDetail {
  id: string;
  etage: string;
  type: string;
  surface: number;
  pieces: number;
  sdb: number;
  annee_construction: string;
}

export interface RestrictionsParcelle {
  affectant: string[];
  non_affectant: string[];
}

export interface SystemeEnergie {
  generateur: string;
  source: string;
  date_info: string;
}

export interface PotentielSolaire {
  aptitude: string;
  exposition_kwh_m2: number | null;
  surface_toits_m2: number | null;
  exposition_globale_kwh: number | null;
  rendement_electrique_kwh: number | null;
  rendement_thermique_kwh: number | null;
}

export interface CommoditesScores {
  shopping: number | null;
  alimentation: number | null;
  culture_loisirs: number | null;
  restaurants_bars: number | null;
  education: number | null;
  bien_etre: number | null;
  sante: number | null;
  transport: number | null;
  commodites_base: number | null;
}

export interface CommoditeDetail {
  categorie: string;
  nom: string;
  distance_m: number;
}

export interface AccessibiliteData {
  marche: { temps_15min: string; temps_30min: string; temps_45min: string };
  velo: { temps_15min: string; temps_30min: string; temps_45min: string };
  voiture: { temps_5min: string; temps_15min: string; temps_30min: string };
}

export interface EnsoleillementData {
  aujourd_hui: { lever: string; duree: string; coucher: string };
  hiver: { lever: string; duree: string; coucher: string };
  ete: { lever: string; duree: string; coucher: string };
}

export interface PermisConstruire {
  id: string;
  reference: string;
  description: string;
  nature_travaux: string;
  architecte: string;
  date: string;
  statut: string;
}

export const RAPPORT_IMAGE_KEYS = [
  { key: 'cover', label: 'Photo aérienne (couverture)', section: 'Couverture' },
  { key: 'map_localisation', label: 'Carte de localisation', section: 'Localisation' },
  { key: 'map_marche', label: 'Carte de chaleur des prix', section: 'Marché' },
  { key: 'graph_distribution', label: 'Graphique distribution des prix', section: 'Marché' },
  { key: 'map_batiment', label: 'Carte du bâtiment', section: 'Bâtiment' },
  { key: 'map_parcelle', label: 'Carte de la parcelle', section: 'Parcelle' },
  { key: 'map_energie', label: 'Carte énergétique', section: 'Énergie' },
  { key: 'map_commodites', label: 'Carte des commodités', section: 'Commodités' },
  { key: 'map_accessibilite_marche', label: 'Isochrone à pied', section: 'Accessibilité' },
  { key: 'map_accessibilite_velo', label: 'Isochrone vélo', section: 'Accessibilité' },
  { key: 'map_accessibilite_voiture', label: 'Isochrone voiture', section: 'Accessibilité' },
  { key: 'map_bruit_routier_jour', label: 'Bruit routier jour', section: 'Bruit' },
  { key: 'map_bruit_routier_nuit', label: 'Bruit routier nuit', section: 'Bruit' },
  { key: 'map_bruit_ferroviaire_jour', label: 'Bruit ferroviaire jour', section: 'Bruit' },
  { key: 'map_bruit_ferroviaire_nuit', label: 'Bruit ferroviaire nuit', section: 'Bruit' },
  { key: 'map_ensoleillement_1', label: "Ensoleillement aujourd'hui", section: 'Ensoleillement' },
  { key: 'map_ensoleillement_2', label: 'Ensoleillement hiver', section: 'Ensoleillement' },
  { key: 'map_ensoleillement_3', label: 'Ensoleillement été', section: 'Ensoleillement' },
  { key: 'map_permis', label: 'Carte des permis de construire', section: 'Permis' },
] as const;

export type RapportImageKey = typeof RAPPORT_IMAGE_KEYS[number]['key'];

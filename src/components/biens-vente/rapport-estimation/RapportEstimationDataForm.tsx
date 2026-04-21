import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Save, Loader2, BarChart3, Building2, MapPin, Zap, ShoppingBag, Volume2, Sun, FileText } from 'lucide-react';
import { SectionMarche } from './SectionMarche';
import { SectionBatiment } from './SectionBatiment';
import { SectionParcelle } from './SectionParcelle';
import { SectionEnergie } from './SectionEnergie';
import { SectionCommodites } from './SectionCommodites';
import { SectionBruit } from './SectionBruit';
import { SectionEnsoleillement } from './SectionEnsoleillement';
import { SectionPermis } from './SectionPermis';
import { RapportEstimationImages } from './RapportEstimationImages';
import type {
  LogementDetail, RestrictionsParcelle, SystemeEnergie,
  PotentielSolaire, CommoditesScores, EnsoleillementData, PermisConstruire
} from './types';

interface RapportEstimationDataFormProps {
  immeuble: any;
  onUpdate: () => void;
}

const emptySysteme: SystemeEnergie = { generateur: '', source: '', date_info: '' };
const emptyPotentiel: PotentielSolaire = {
  aptitude: '', exposition_kwh_m2: null, surface_toits_m2: null,
  exposition_globale_kwh: null, rendement_electrique_kwh: null, rendement_thermique_kwh: null
};
const emptyEnsoleillement: EnsoleillementData = {
  aujourd_hui: { lever: '', duree: '', coucher: '' },
  hiver: { lever: '', duree: '', coucher: '' },
  ete: { lever: '', duree: '', coucher: '' },
};
const emptyScores: CommoditesScores = {
  shopping: null, alimentation: null, culture_loisirs: null, restaurants_bars: null,
  education: null, bien_etre: null, sante: null, transport: null, commodites_base: null,
};

export function RapportEstimationDataForm({ immeuble, onUpdate }: RapportEstimationDataFormProps) {
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({
    prix_median_secteur: immeuble.prix_median_secteur || '',
    evolution_prix_median_1an: immeuble.evolution_prix_median_1an || '',
    nb_biens_comparables: immeuble.nb_biens_comparables || '',
    nb_nouvelles_annonces: immeuble.nb_nouvelles_annonces || '',
    categorie_ofs: immeuble.categorie_ofs || '',
    classification_ofs: immeuble.classification_ofs || '',
    numero_officiel_batiment: immeuble.numero_officiel_batiment || '',
    emprise_sol_m2: immeuble.emprise_sol_m2 || '',
    surface_logement_totale: immeuble.surface_logement_totale || '',
    surface_parcelle: immeuble.surface_parcelle || '',
    egrid: immeuble.egrid || '',
    type_parcelle: immeuble.type_parcelle || '',
    plan_affectation_type: immeuble.plan_affectation_type || '',
    plan_affectation_nom: immeuble.plan_affectation_nom || '',
    source_energie_chauffage: immeuble.source_energie_chauffage || '',
    installation_solaire_actuelle: immeuble.installation_solaire_actuelle || '',
    bruit_routier_jour: immeuble.bruit_routier_jour || '',
    bruit_routier_nuit: immeuble.bruit_routier_nuit || '',
    bruit_ferroviaire_jour: immeuble.bruit_ferroviaire_jour || '',
    bruit_ferroviaire_nuit: immeuble.bruit_ferroviaire_nuit || '',
  });

  const [logements, setLogements] = useState<LogementDetail[]>(
    Array.isArray(immeuble.logements_details) ? immeuble.logements_details : []
  );
  const [restrictions, setRestrictions] = useState<RestrictionsParcelle>(
    (immeuble.restrictions_parcelle as RestrictionsParcelle) || { affectant: [], non_affectant: [] }
  );
  const [systemeChauffagePrincipal, setSystemeChauffagePrincipal] = useState<SystemeEnergie>(
    (immeuble.systeme_chauffage_principal as SystemeEnergie) || emptySysteme
  );
  const [systemeEauChaude, setSystemeEauChaude] = useState<SystemeEnergie>(
    (immeuble.systeme_eau_chaude as SystemeEnergie) || emptySysteme
  );
  const [systemeChauffageSupp, setSystemeChauffageSupp] = useState<SystemeEnergie>(
    (immeuble.systeme_chauffage_supplementaire as SystemeEnergie) || emptySysteme
  );
  const [systemeEauChaudeSupp, setSystemeEauChaudeSupp] = useState<SystemeEnergie>(
    (immeuble.systeme_eau_chaude_supplementaire as SystemeEnergie) || emptySysteme
  );
  const [potentielSolaire, setPotentielSolaire] = useState<PotentielSolaire>(
    (immeuble.potentiel_solaire as PotentielSolaire) || emptyPotentiel
  );
  const [commoditesScores, setCommoditesScores] = useState<CommoditesScores>(
    (immeuble.commodites_scores as CommoditesScores) || emptyScores
  );
  const [ensoleillementData, setEnsoleillementData] = useState<EnsoleillementData>(
    (immeuble.ensoleillement_data as EnsoleillementData) || emptyEnsoleillement
  );
  const [permis, setPermis] = useState<PermisConstruire[]>(
    Array.isArray(immeuble.permis_construire) ? immeuble.permis_construire : []
  );

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSystemeChange = (key: string, systeme: SystemeEnergie) => {
    switch (key) {
      case 'systeme_chauffage_principal': setSystemeChauffagePrincipal(systeme); break;
      case 'systeme_eau_chaude': setSystemeEauChaude(systeme); break;
      case 'systeme_chauffage_supplementaire': setSystemeChauffageSupp(systeme); break;
      case 'systeme_eau_chaude_supplementaire': setSystemeEauChaudeSupp(systeme); break;
    }
  };

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        prix_median_secteur: formData.prix_median_secteur ? Number(formData.prix_median_secteur) : null,
        evolution_prix_median_1an: formData.evolution_prix_median_1an ? Number(formData.evolution_prix_median_1an) : null,
        nb_biens_comparables: formData.nb_biens_comparables ? Number(formData.nb_biens_comparables) : null,
        nb_nouvelles_annonces: formData.nb_nouvelles_annonces ? Number(formData.nb_nouvelles_annonces) : null,
        categorie_ofs: formData.categorie_ofs || null,
        classification_ofs: formData.classification_ofs || null,
        numero_officiel_batiment: formData.numero_officiel_batiment || null,
        emprise_sol_m2: formData.emprise_sol_m2 ? Number(formData.emprise_sol_m2) : null,
        surface_logement_totale: formData.surface_logement_totale ? Number(formData.surface_logement_totale) : null,
        logements_details: logements.length > 0 ? logements : null,
        surface_parcelle: formData.surface_parcelle ? Number(formData.surface_parcelle) : null,
        egrid: formData.egrid || null,
        type_parcelle: formData.type_parcelle || null,
        plan_affectation_type: formData.plan_affectation_type || null,
        plan_affectation_nom: formData.plan_affectation_nom || null,
        restrictions_parcelle: (restrictions.affectant.length > 0 || restrictions.non_affectant.length > 0) ? restrictions : null,
        source_energie_chauffage: formData.source_energie_chauffage || null,
        installation_solaire_actuelle: formData.installation_solaire_actuelle || null,
        systeme_chauffage_principal: systemeChauffagePrincipal.generateur ? systemeChauffagePrincipal : null,
        systeme_eau_chaude: systemeEauChaude.generateur ? systemeEauChaude : null,
        systeme_chauffage_supplementaire: systemeChauffageSupp.generateur ? systemeChauffageSupp : null,
        systeme_eau_chaude_supplementaire: systemeEauChaudeSupp.generateur ? systemeEauChaudeSupp : null,
        potentiel_solaire: potentielSolaire.aptitude ? potentielSolaire : null,
        commodites_scores: Object.values(commoditesScores).some(v => v !== null) ? commoditesScores : null,
        bruit_routier_jour: formData.bruit_routier_jour ? Number(formData.bruit_routier_jour) : null,
        bruit_routier_nuit: formData.bruit_routier_nuit ? Number(formData.bruit_routier_nuit) : null,
        bruit_ferroviaire_jour: formData.bruit_ferroviaire_jour ? Number(formData.bruit_ferroviaire_jour) : null,
        bruit_ferroviaire_nuit: formData.bruit_ferroviaire_nuit ? Number(formData.bruit_ferroviaire_nuit) : null,
        ensoleillement_data: (ensoleillementData.aujourd_hui.lever || ensoleillementData.hiver.lever || ensoleillementData.ete.lever) ? ensoleillementData : null,
        permis_construire: permis.length > 0 ? permis : null,
      };

      const { error } = await (supabase
        .from('immeubles') as any)
        .update(updateData)
        .eq('id', immeuble.id);

      if (error) throw error;

      toast.success('Données du rapport enregistrées');
      onUpdate();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { key: 'marche', label: 'Marché', icon: BarChart3, component: (
      <SectionMarche data={formData} onChange={handleChange} />
    )},
    { key: 'batiment', label: 'Bâtiment', icon: Building2, component: (
      <SectionBatiment data={formData} logements={logements} onChange={handleChange} onLogementsChange={setLogements} />
    )},
    { key: 'parcelle', label: 'Parcelle', icon: MapPin, component: (
      <SectionParcelle data={formData} restrictions={restrictions} onChange={handleChange} onRestrictionsChange={setRestrictions} />
    )},
    { key: 'energie', label: 'Énergie', icon: Zap, component: (
      <SectionEnergie
        data={formData}
        systemeChauffagePrincipal={systemeChauffagePrincipal}
        systemeEauChaude={systemeEauChaude}
        systemeChauffageSupp={systemeChauffageSupp}
        systemeEauChaudeSupp={systemeEauChaudeSupp}
        potentielSolaire={potentielSolaire}
        onChange={handleChange}
        onSystemeChange={handleSystemeChange}
        onPotentielChange={setPotentielSolaire}
      />
    )},
    { key: 'commodites', label: 'Commodités', icon: ShoppingBag, component: (
      <SectionCommodites scores={commoditesScores} onScoresChange={setCommoditesScores} />
    )},
    { key: 'bruit', label: 'Bruit', icon: Volume2, component: (
      <SectionBruit data={formData} onChange={handleChange} />
    )},
    { key: 'ensoleillement', label: 'Ensoleillement', icon: Sun, component: (
      <SectionEnsoleillement data={ensoleillementData} onChange={setEnsoleillementData} />
    )},
    { key: 'permis', label: 'Permis de construire', icon: FileText, component: (
      <SectionPermis permis={permis} onPermisChange={setPermis} />
    )},
  ];

  return (
    <div className="space-y-4">
      {/* Data sections */}
      {sections.map(({ key, label, icon: Icon, component }) => (
        <Collapsible
          key={key}
          open={openSections[key] || false}
          onOpenChange={() => toggleSection(key)}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-semibold">{label}</span>
            </div>
            <ChevronDown className={`h-5 w-5 transition-transform ${openSections[key] ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="border border-t-0 rounded-b-lg p-4">
            {component}
          </CollapsibleContent>
        </Collapsible>
      ))}

      {/* Images section */}
      <Collapsible
        open={openSections['images'] || false}
        onOpenChange={() => toggleSection('images')}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card border rounded-lg hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-lg">🖼️</span>
            <span className="font-semibold">Images du rapport</span>
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform ${openSections['images'] ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="border border-t-0 rounded-b-lg p-4">
          <RapportEstimationImages
            immeubleId={immeuble.id}
            images={immeuble.rapport_estimation_images}
            onUpdate={onUpdate}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Save button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Enregistrer les données du rapport
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MapPin, 
  Building2, 
  Hammer, 
  Home, 
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  Upload,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreateProjetDeveloppementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proprietaireId: string;
  immeubleId?: string;
  onSuccess?: () => void;
}

const typeProjetOptions = [
  { value: 'vente_terrain', label: 'Vendre mon terrain', icon: MapPin, description: 'Je souhaite vendre mon terrain uniquement' },
  { value: 'construction', label: 'Construire', icon: Building2, description: 'Je souhaite construire sur mon terrain' },
  { value: 'renovation_transformation', label: 'Rénover / Transformer', icon: Hammer, description: 'Je souhaite rénover ou transformer un bâtiment existant' },
  { value: 'demolition_reconstruction', label: 'Démolir et reconstruire', icon: Home, description: 'Je souhaite démolir et reconstruire' },
  { value: 'etude_faisabilite', label: 'Étude de faisabilité', icon: HelpCircle, description: 'Je ne sais pas encore – je souhaite une étude' }
];

const serviceOptions = [
  { value: 'etude_faisabilite_gratuite', label: 'Étude de faisabilité gratuite', description: 'Analyse préliminaire de votre projet' },
  { value: 'estimation_budgetaire', label: 'Estimation budgétaire complète', description: 'Budget détaillé pour votre projet' },
  { value: 'demande_permis', label: 'Demande de permis de construire', description: 'Dossier complet avec architecte', warning: true },
  { value: 'dossier_valorisation', label: 'Dossier complet de valorisation', description: 'Valorisation maximale de votre bien' }
];

const typeConstructionOptions = [
  { value: 'maison_individuelle', label: 'Maison individuelle' },
  { value: 'immeuble_locatif', label: 'Immeuble locatif' },
  { value: 'ppe', label: 'PPE (Propriété par étage)' },
  { value: 'residence_secondaire', label: 'Résidence secondaire' },
  { value: 'autre', label: 'Autre' }
];

const zonesOptions = [
  'Zone villa',
  'Zone mixte',
  'Zone résidentielle',
  'Zone industrielle',
  'Zone agricole',
  'Zone artisanale',
  'Zone centre-ville',
  'Autre'
];

export function CreateProjetDeveloppementDialog({
  open,
  onOpenChange,
  proprietaireId,
  immeubleId,
  onSuccess
}: CreateProjetDeveloppementDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    type_projet: '',
    adresse: '',
    commune: '',
    parcelle_numero: '',
    surface_terrain: '',
    batiment_existant: false,
    cos: '',
    ibus: '',
    isus: '',
    ocus: '',
    zone_affectation: '',
    servitudes_connues: false,
    servitudes_details: '',
    objectifs: '',
    type_construction_souhaitee: '',
    nombre_unites: '',
    delai_realisation: '',
    service_souhaite: ''
  });

  const totalSteps = 5;

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!formData.type_projet;
      case 2: return !!formData.commune;
      case 3: return true; // Documents are optional
      case 4: return !!formData.objectifs;
      case 5: return !!formData.service_souhaite;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projets_developpement')
        .insert({
          proprietaire_id: proprietaireId,
          immeuble_id: immeubleId || null,
          type_projet: formData.type_projet,
          adresse: formData.adresse || null,
          commune: formData.commune,
          parcelle_numero: formData.parcelle_numero || null,
          surface_terrain: formData.surface_terrain ? parseFloat(formData.surface_terrain) : null,
          batiment_existant: formData.batiment_existant,
          cos: formData.cos ? parseFloat(formData.cos) : null,
          ibus: formData.ibus ? parseFloat(formData.ibus) : null,
          isus: formData.isus ? parseFloat(formData.isus) : null,
          ocus: formData.ocus ? parseFloat(formData.ocus) : null,
          zone_affectation: formData.zone_affectation || null,
          servitudes_connues: formData.servitudes_connues,
          servitudes_details: formData.servitudes_details || null,
          objectifs: formData.objectifs,
          type_construction_souhaitee: formData.type_construction_souhaitee || null,
          nombre_unites: formData.nombre_unites ? parseInt(formData.nombre_unites) : null,
          delai_realisation: formData.delai_realisation || null,
          service_souhaite: formData.service_souhaite,
          statut: 'demande_recue'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Projet soumis avec succès !');
      onOpenChange(false);
      if (onSuccess) onSuccess();
      if (data) {
        navigate(`/proprietaire/projets-developpement/${data.id}`);
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error('Erreur lors de la soumission du projet');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Type de projet</h3>
            <p className="text-sm text-muted-foreground">
              Quel type de projet souhaitez-vous réaliser ?
            </p>
            <RadioGroup
              value={formData.type_projet}
              onValueChange={(value) => updateField('type_projet', value)}
              className="space-y-3"
            >
              {typeProjetOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all',
                      formData.type_projet === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
                    <div className={cn(
                      'p-2.5 rounded-lg',
                      formData.type_projet === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    {formData.type_projet === option.value && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </label>
                );
              })}
            </RadioGroup>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Informations parcelle</h3>
              <p className="text-sm text-muted-foreground">
                Renseignez les informations sur votre terrain
              </p>
            </div>

            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input
                    value={formData.adresse}
                    onChange={(e) => updateField('adresse', e.target.value)}
                    placeholder="Rue et numéro"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commune *</Label>
                  <Input
                    value={formData.commune}
                    onChange={(e) => updateField('commune', e.target.value)}
                    placeholder="Ex: Lausanne"
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Numéro de parcelle</Label>
                  <Input
                    value={formData.parcelle_numero}
                    onChange={(e) => updateField('parcelle_numero', e.target.value)}
                    placeholder="Ex: 1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Surface cadastrale (m²)</Label>
                  <Input
                    type="number"
                    value={formData.surface_terrain}
                    onChange={(e) => updateField('surface_terrain', e.target.value)}
                    placeholder="Ex: 500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label>Présence d'un bâtiment</Label>
                  <p className="text-sm text-muted-foreground">Y a-t-il un bâtiment existant ?</p>
                </div>
                <Switch
                  checked={formData.batiment_existant}
                  onCheckedChange={(checked) => updateField('batiment_existant', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Zone de construction</Label>
                <Select
                  value={formData.zone_affectation}
                  onValueChange={(value) => updateField('zone_affectation', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zonesOptions.map((zone) => (
                      <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>COS</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cos}
                    onChange={(e) => updateField('cos', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IBUS</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.ibus}
                    onChange={(e) => updateField('ibus', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ISUS</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.isus}
                    onChange={(e) => updateField('isus', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>OCUS</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.ocus}
                    onChange={(e) => updateField('ocus', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label>Servitudes connues</Label>
                  <p className="text-sm text-muted-foreground">Y a-t-il des servitudes sur ce terrain ?</p>
                </div>
                <Switch
                  checked={formData.servitudes_connues}
                  onCheckedChange={(checked) => updateField('servitudes_connues', checked)}
                />
              </div>

              {formData.servitudes_connues && (
                <div className="space-y-2">
                  <Label>Détails des servitudes</Label>
                  <Textarea
                    value={formData.servitudes_details}
                    onChange={(e) => updateField('servitudes_details', e.target.value)}
                    placeholder="Décrivez les servitudes connues..."
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Documents à joindre</h3>
              <p className="text-sm text-muted-foreground">
                Vous pourrez ajouter vos documents après la création du projet
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                'Extrait cadastral',
                'Plan de zones (communal)',
                'Photos du terrain ou bâtiment',
                'Plans existants',
                'PV de copropriété',
                'Documents succession',
                'Autorisation co-héritiers',
                'Rapport géotechnique'
              ].map((doc) => (
                <div
                  key={doc}
                  className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors"
                >
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">{doc}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Les documents pourront être uploadés après la soumission de votre projet
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Description du projet</h3>
              <p className="text-sm text-muted-foreground">
                Décrivez votre projet et vos intentions
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Objectifs / Intentions *</Label>
                <Textarea
                  value={formData.objectifs}
                  onChange={(e) => updateField('objectifs', e.target.value)}
                  placeholder="Expliquez votre projet, vos intentions, ce que vous souhaitez réaliser..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Type de construction souhaitée</Label>
                <Select
                  value={formData.type_construction_souhaitee}
                  onValueChange={(value) => updateField('type_construction_souhaitee', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeConstructionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre d'unités approximatif</Label>
                  <Input
                    type="number"
                    value={formData.nombre_unites}
                    onChange={(e) => updateField('nombre_unites', e.target.value)}
                    placeholder="Ex: 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Délai de réalisation souhaité</Label>
                  <Input
                    value={formData.delai_realisation}
                    onChange={(e) => updateField('delai_realisation', e.target.value)}
                    placeholder="Ex: 2 ans"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Service souhaité</h3>
              <p className="text-sm text-muted-foreground">
                Quel service souhaitez-vous ?
              </p>
            </div>

            <RadioGroup
              value={formData.service_souhaite}
              onValueChange={(value) => updateField('service_souhaite', value)}
              className="space-y-3"
            >
              {serviceOptions.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all',
                    formData.service_souhaite === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={option.value} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    {option.warning && (
                      <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-warning">
                          La demande de permis de construire nécessite l'intervention d'un architecte partenaire. 
                          Des frais sont à prévoir (CHF 15'000 à 25'000 selon le projet). Un devis vous sera transmis.
                        </p>
                      </div>
                    )}
                  </div>
                  {formData.service_souhaite === option.value && (
                    <Check className="w-5 h-5 text-primary mt-1" />
                  )}
                </label>
              ))}
            </RadioGroup>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Nouveau projet de développement
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 py-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 h-1.5 rounded-full transition-colors',
                i < step ? 'bg-primary' : i === step - 1 ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-1 py-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 1 ? 'Annuler' : 'Précédent'}
          </Button>

          <span className="text-sm text-muted-foreground">
            Étape {step} sur {totalSteps}
          </span>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Soumettre
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

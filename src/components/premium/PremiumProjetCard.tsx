import { motion } from 'framer-motion';
import { 
  MapPin, 
  Calendar, 
  Building2, 
  Hammer, 
  Home, 
  HelpCircle,
  ChevronRight,
  User,
  DollarSign
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProjetDeveloppement {
  id: string;
  type_projet: string;
  statut: string;
  adresse?: string;
  commune?: string;
  parcelle_numero?: string;
  surface_terrain?: number;
  batiment_existant?: boolean;
  budget_previsionnel?: number;
  date_soumission?: string;
  created_at?: string;
}

interface PremiumProjetCardProps {
  projet: ProjetDeveloppement;
  onView: () => void;
  delay?: number;
}

const typeProjetLabels: Record<string, { label: string; icon: typeof Building2; color: string }> = {
  vente_terrain: { label: 'Vente terrain', icon: MapPin, color: 'text-blue-500' },
  construction: { label: 'Construction', icon: Building2, color: 'text-emerald-500' },
  renovation_transformation: { label: 'Rénovation', icon: Hammer, color: 'text-orange-500' },
  demolition_reconstruction: { label: 'Démolition/Reconstruction', icon: Home, color: 'text-red-500' },
  etude_faisabilite: { label: 'Étude de faisabilité', icon: HelpCircle, color: 'text-purple-500' }
};

const statutLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  demande_recue: { label: 'Demande reçue', variant: 'secondary' },
  analyse_en_cours: { label: 'Analyse en cours', variant: 'default' },
  etude_faisabilite_rendue: { label: 'Étude rendue', variant: 'default' },
  planification_permis: { label: 'Planification permis', variant: 'default' },
  devis_transmis: { label: 'Devis transmis', variant: 'default' },
  permis_en_preparation: { label: 'Permis en préparation', variant: 'default' },
  permis_depose: { label: 'Permis déposé', variant: 'default' },
  attente_reponse_cantonale: { label: 'Attente réponse', variant: 'secondary' },
  projet_valide: { label: 'Validé', variant: 'default' },
  projet_refuse: { label: 'Refusé', variant: 'destructive' },
  termine: { label: 'Terminé', variant: 'outline' }
};

export function PremiumProjetCard({ projet, onView, delay = 0 }: PremiumProjetCardProps) {
  const typeConfig = typeProjetLabels[projet.type_projet] || typeProjetLabels.etude_faisabilite;
  const statutConfig = statutLabels[projet.statut] || statutLabels.demande_recue;
  const TypeIcon = typeConfig.icon;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: 'CHF',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
      className="group relative overflow-hidden rounded-xl bg-card border border-border/50 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-4 md:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2.5 rounded-xl bg-gradient-to-br',
              projet.type_projet === 'vente_terrain' && 'from-blue-500/20 to-blue-600/10',
              projet.type_projet === 'construction' && 'from-emerald-500/20 to-emerald-600/10',
              projet.type_projet === 'renovation_transformation' && 'from-orange-500/20 to-orange-600/10',
              projet.type_projet === 'demolition_reconstruction' && 'from-red-500/20 to-red-600/10',
              projet.type_projet === 'etude_faisabilite' && 'from-purple-500/20 to-purple-600/10'
            )}>
              <TypeIcon className={cn('w-5 h-5', typeConfig.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground line-clamp-1">
                {typeConfig.label}
              </h3>
              {projet.commune && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {projet.commune}
                </p>
              )}
            </div>
          </div>
          <Badge variant={statutConfig.variant} className="whitespace-nowrap">
            {statutConfig.label}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          {projet.adresse && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {projet.adresse}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2 text-xs">
            {projet.parcelle_numero && (
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                Parcelle {projet.parcelle_numero}
              </span>
            )}
            {projet.surface_terrain && (
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {projet.surface_terrain.toLocaleString()} m²
              </span>
            )}
            {projet.batiment_existant && (
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                Bâtiment existant
              </span>
            )}
          </div>
        </div>

        {/* Budget if available */}
        {projet.budget_previsionnel && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
            <DollarSign className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Budget prévisionnel</p>
              <p className="font-semibold text-primary">
                {formatCurrency(projet.budget_previsionnel)}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {format(new Date(projet.date_soumission || projet.created_at || new Date()), 'dd MMM yyyy', { locale: fr })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            className="group/btn hover:bg-primary/10"
          >
            Voir détails
            <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  User, Calendar, MessageSquare, Eye, Home, 
  FileText, CheckCircle, XCircle, Clock, Phone
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface InteretAcheteur {
  id: string;
  type_interet: string;
  message: string | null;
  statut: string;
  date_visite: string | null;
  notes_agent: string | null;
  created_at: string;
  client?: {
    prenom: string | null;
    nom: string | null;
    email: string | null;
    telephone: string | null;
  };
  immeuble?: {
    nom: string;
    adresse: string;
    ville: string | null;
  };
}

interface PremiumInteretAcheteurCardProps {
  interet: InteretAcheteur;
  showImmeuble?: boolean;
  onContact?: () => void;
  onUpdateStatut?: (statut: string) => void;
  onClick?: () => void;
}

const TYPE_INTERET_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  interesse: { label: 'Intéressé', icon: Eye, color: 'bg-blue-500/10 text-blue-600' },
  demande_visite: { label: 'Demande de visite', icon: Calendar, color: 'bg-amber-500/10 text-amber-600' },
  demande_brochure: { label: 'Demande brochure', icon: FileText, color: 'bg-purple-500/10 text-purple-600' }
};

const STATUT_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  nouveau: { label: 'Nouveau', variant: 'default' },
  contacte: { label: 'Contacté', variant: 'secondary' },
  visite_planifiee: { label: 'Visite planifiée', variant: 'outline' },
  offre_faite: { label: 'Offre faite', variant: 'default' },
  refuse: { label: 'Refusé', variant: 'destructive' }
};

export function PremiumInteretAcheteurCard({ 
  interet, 
  showImmeuble = false,
  onContact,
  onUpdateStatut,
  onClick
}: PremiumInteretAcheteurCardProps) {
  const typeConfig = TYPE_INTERET_CONFIG[interet.type_interet] || TYPE_INTERET_CONFIG.interesse;
  const statutConfig = STATUT_CONFIG[interet.statut] || STATUT_CONFIG.nouveau;
  const TypeIcon = typeConfig.icon;

  const formatDate = (date: string) => {
    return format(new Date(date), 'd MMM yyyy', { locale: fr });
  };

  return (
    <Card 
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeConfig.color}`}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">
                {interet.client?.prenom} {interet.client?.nom}
              </h3>
              <p className="text-sm text-muted-foreground">{typeConfig.label}</p>
            </div>
          </div>
          
          <Badge variant={statutConfig.variant}>
            {statutConfig.label}
          </Badge>
        </div>

        {/* Immeuble info if showImmeuble */}
        {showImmeuble && interet.immeuble && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 p-2 bg-muted/50 rounded-lg">
            <Home className="w-4 h-4" />
            <span>{interet.immeuble.nom} - {interet.immeuble.adresse}</span>
          </div>
        )}

        {/* Message */}
        {interet.message && (
          <div className="flex items-start gap-2 text-sm mb-3 p-2 bg-muted/30 rounded-lg">
            <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <p className="text-muted-foreground line-clamp-2">{interet.message}</p>
          </div>
        )}

        {/* Visite planifiée */}
        {interet.date_visite && (
          <div className="flex items-center gap-2 text-sm text-primary mb-3">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">
              Visite: {format(new Date(interet.date_visite), 'd MMM yyyy à HH:mm', { locale: fr })}
            </span>
          </div>
        )}

        {/* Date de création */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>Reçu le {formatDate(interet.created_at)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          {interet.client?.telephone && (
            <a 
              href={`tel:${interet.client.telephone}`}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3.5 h-3.5" />
              {interet.client.telephone}
            </a>
          )}

          <div className="flex gap-1 ml-auto">
            {onContact && interet.statut === 'nouveau' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onContact();
                }}
              >
                Contacter
              </Button>
            )}
            
            {onUpdateStatut && interet.statut !== 'refuse' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatut('refuse');
                }}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

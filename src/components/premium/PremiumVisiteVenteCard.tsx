import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, Calendar, Clock, CheckCircle2, XCircle, 
  MessageSquare, Star, Phone, Mail, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface VisiteVente {
  id: string;
  acheteur_nom: string | null;
  acheteur_email: string | null;
  acheteur_telephone: string | null;
  date_visite: string;
  statut: string;
  notes_visite: string | null;
  feedback_acheteur: string | null;
  note_interet: number | null;
  interet_acheteur?: {
    client?: {
      user_id: string;
      profile?: {
        nom: string | null;
        prenom: string | null;
        email: string | null;
        telephone: string | null;
      };
    };
  };
}

interface PremiumVisiteVenteCardProps {
  visite: VisiteVente;
  onUpdateStatut?: (visiteId: string, statut: string) => void;
}

const STATUT_CONFIG = {
  planifiee: { label: 'Planifiée', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: Calendar },
  confirmee: { label: 'Confirmée', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: CheckCircle2 },
  effectuee: { label: 'Effectuée', color: 'bg-green-500/10 text-green-600 border-green-200', icon: Eye },
  annulee: { label: 'Annulée', color: 'bg-red-500/10 text-red-600 border-red-200', icon: XCircle },
  no_show: { label: 'No-show', color: 'bg-gray-500/10 text-gray-600 border-gray-200', icon: XCircle },
};

export function PremiumVisiteVenteCard({ visite, onUpdateStatut }: PremiumVisiteVenteCardProps) {
  const config = STATUT_CONFIG[visite.statut as keyof typeof STATUT_CONFIG] || STATUT_CONFIG.planifiee;
  const StatusIcon = config.icon;

  const visitorName = visite.interet_acheteur?.client?.profile 
    ? `${visite.interet_acheteur.client.profile.prenom || ''} ${visite.interet_acheteur.client.profile.nom || ''}`.trim()
    : visite.acheteur_nom || 'Visiteur';

  const visitorEmail = visite.interet_acheteur?.client?.profile?.email || visite.acheteur_email;
  const visitorPhone = visite.interet_acheteur?.client?.profile?.telephone || visite.acheteur_telephone;

  const isPast = new Date(visite.date_visite) < new Date();

  return (
    <Card className={cn(
      "overflow-hidden transition-all hover:shadow-md",
      visite.statut === 'confirmee' && "border-emerald-200",
      visite.statut === 'effectuee' && visite.note_interet && visite.note_interet >= 4 && "border-green-300 bg-green-50/30"
    )}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Date et heure */}
          <div className="flex-shrink-0 text-center p-3 bg-muted/50 rounded-lg min-w-[80px]">
            <p className="text-2xl font-bold">{format(new Date(visite.date_visite), 'dd', { locale: fr })}</p>
            <p className="text-sm text-muted-foreground">{format(new Date(visite.date_visite), 'MMM', { locale: fr })}</p>
            <p className="text-sm font-medium mt-1">{format(new Date(visite.date_visite), 'HH:mm')}</p>
          </div>

          {/* Infos visiteur */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{visitorName}</span>
              </div>
              <Badge variant="outline" className={config.color}>
                <StatusIcon className="h-3.5 w-3.5 mr-1" />
                {config.label}
              </Badge>
            </div>

            {/* Contact */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {visitorEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {visitorEmail}
                </span>
              )}
              {visitorPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {visitorPhone}
                </span>
              )}
            </div>

            {/* Feedback après visite */}
            {visite.statut === 'effectuee' && (
              <div className="flex items-center gap-4 pt-2">
                {visite.note_interet && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">Intérêt:</span>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "h-4 w-4",
                            i < visite.note_interet! ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                          )} 
                        />
                      ))}
                    </div>
                  </div>
                )}
                {visite.feedback_acheteur && (
                  <div className="flex items-center gap-1 text-sm">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground line-clamp-1">{visite.feedback_acheteur}</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes agent */}
            {visite.notes_visite && (
              <p className="text-sm text-muted-foreground italic mt-2">
                "{visite.notes_visite}"
              </p>
            )}
          </div>

          {/* Actions */}
          {onUpdateStatut && visite.statut === 'planifiee' && !isPast && (
            <div className="flex gap-2 md:flex-col">
              <Button 
                size="sm" 
                variant="outline"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => onUpdateStatut(visite.id, 'confirmee')}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Confirmer
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onUpdateStatut(visite.id, 'annulee')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            </div>
          )}

          {onUpdateStatut && visite.statut === 'confirmee' && isPast && (
            <div className="flex gap-2 md:flex-col">
              <Button 
                size="sm" 
                onClick={() => onUpdateStatut(visite.id, 'effectuee')}
              >
                <Eye className="h-4 w-4 mr-1" />
                Marquer effectuée
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onUpdateStatut(visite.id, 'no_show')}
              >
                No-show
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

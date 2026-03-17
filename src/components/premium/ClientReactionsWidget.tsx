import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Calendar, FileCheck, MessageSquare, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClientReaction {
  id: string;
  adresse: string;
  prix: number | null;
  pieces: number | null;
  surface: number | null;
  statut: string;
  statut_client: string | null;
  date_envoi: string;
  clientName: string;
  client_id: string;
}

interface ClientReactionsWidgetProps {
  reactions: ClientReaction[];
  basePath?: string;
}

const REACTION_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  interesse: { label: 'Intéressé(e)', icon: Heart, variant: 'default', color: 'text-green-600 bg-green-500/10 border-green-500/30' },
  visite_planifiee: { label: 'Visite planifiée', icon: Calendar, variant: 'secondary', color: 'text-blue-600 bg-blue-500/10 border-blue-500/30' },
  candidature_deposee: { label: 'Candidature déposée', icon: FileCheck, variant: 'outline', color: 'text-purple-600 bg-purple-500/10 border-purple-500/30' },
  demande_postulation: { label: 'Demande postulation', icon: FileCheck, variant: 'outline', color: 'text-amber-600 bg-amber-500/10 border-amber-500/30' },
};

export function ClientReactionsWidget({ reactions, basePath = '/agent' }: ClientReactionsWidgetProps) {
  const navigate = useNavigate();

  if (reactions.length === 0) return null;

  return (
    <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-blue-500/5 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-green-600" />
            💚 Réactions clients
          </CardTitle>
          <Badge variant="destructive" className="animate-pulse-soft">
            {reactions.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Offres nécessitant votre attention</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {reactions.slice(0, 5).map(reaction => {
          const config = REACTION_CONFIG[reaction.statut] || REACTION_CONFIG.interesse;
          const Icon = config.icon;

          return (
            <div
              key={reaction.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${config.color}`}
              onClick={() => navigate(`${basePath}/offres-envoyees?offreId=${reaction.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wide">{config.label}</span>
                  </div>
                  <p className="font-medium text-sm truncate">{reaction.adresse}</p>
                  <p className="text-xs opacity-80 mt-0.5">
                    {reaction.pieces && `${reaction.pieces} pcs`}
                    {reaction.surface && ` • ${reaction.surface} m²`}
                    {reaction.prix && ` • ${reaction.prix.toLocaleString()} CHF`}
                  </p>
                  <p className="text-xs font-medium mt-1">👤 {reaction.clientName}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {reactions.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate(`${basePath}/offres-envoyees`)}
          >
            Voir les {reactions.length} réactions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

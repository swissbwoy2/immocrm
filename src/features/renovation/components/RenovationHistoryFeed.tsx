import { useRenovationHistory } from '../hooks/useRenovationHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Clock } from 'lucide-react';

const actionLabels: Record<string, string> = {
  project_created: 'Projet créé',
  status_changed: 'Statut modifié',
  milestone_updated: 'Jalon mis à jour',
  budget_updated: 'Budget modifié',
  incident_created: 'Incident signalé',
  incident_updated: 'Incident mis à jour',
  incident_resolved: 'Incident résolu',
  reservation_updated: 'Réserve mise à jour',
  reservation_resolved: 'Réserve levée',
  project_closed: 'Projet clôturé',
  final_report_generated: 'Dossier final généré',
  warranties_not_applicable: 'Garanties marquées N/A',
  quote_analyzed: 'Devis analysé',
  file_downloaded: 'Fichier téléchargé',
};

interface Props {
  projectId: string;
}

export function RenovationHistoryFeed({ projectId }: Props) {
  const { data, isLoading, error } = useRenovationHistory(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-2 w-2 rounded-full mt-2 shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-24 shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-destructive">
          Erreur lors du chargement de l'historique.
        </CardContent>
      </Card>
    );
  }

  const entries = data?.entries || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" /> Historique ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Aucun événement enregistré</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              L'historique des actions sur ce projet apparaîtra ici.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="border-l-2 border-muted pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {actionLabels[entry.action] || entry.action}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich' })}
                    </span>
                  </div>
                  {entry.new_data && Object.keys(entry.new_data).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {Object.entries(entry.new_data)
                        .filter(([, v]) => v !== null && v !== undefined)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

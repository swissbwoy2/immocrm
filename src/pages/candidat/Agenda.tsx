import { CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { useCandidatCandidatures, statutLabel } from '@/hooks/useCandidatCandidatures';

export default function CandidatAgenda() {
  const { data = [], isLoading } = useCandidatCandidatures();
  return (
    <div className="flex-1 overflow-y-auto">
      <PremiumPageShellV2>
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground">Suivi de vos candidatures</p>
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : data.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Aucun événement pour le moment.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {data.map((c) => (
              <Card key={`${c.source}-${c.id}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{c.adresse}</p>
                    <p className="text-xs text-muted-foreground">Candidature du {c.date ? new Date(c.date).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' }) : '—'}</p>
                  </div>
                  <Badge variant="secondary">{statutLabel(c.statut)}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PremiumPageShellV2>
    </div>
  );
}
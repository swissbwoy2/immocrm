import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Wallet, CheckCircle, Clock, TrendingUp, Timer } from 'lucide-react';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCoursierTime, formatDuration } from '@/hooks/useCoursierTime';
import { CoursierClockCard } from '@/components/coursier/CoursierClockCard';

export default function CoursierHistorique() {
  const time = useCoursierTime();
  const { closedEntries, loading, tarifHoraire, minutesThisMonth, minutesTotal, earningsThisMonth, earningsTotal } = time;

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6 relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
        </div>
        <PremiumPageHeader
          icon={History}
          title="Historique & Gains"
          subtitle={`Temps de travail pointé et gains (${tarifHoraire} CHF/heure)`}
        />

        <CoursierClockCard time={time} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Timer, label: 'Temps ce mois', value: formatDuration(minutesThisMonth), color: 'text-sky-600', bg: 'bg-sky-500/10' },
            { icon: Wallet, label: 'Gains ce mois', value: `${earningsThisMonth.toFixed(0)} CHF`, color: 'text-green-600', bg: 'bg-green-500/10' },
            { icon: Clock, label: 'Temps total', value: formatDuration(minutesTotal), color: 'text-primary', bg: 'bg-primary/10' },
            { icon: TrendingUp, label: 'Gains totaux', value: `${earningsTotal.toFixed(0)} CHF`, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          ].map((kpi, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${kpi.bg}`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sessions de pointage */}
        {closedEntries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune session de travail enregistrée pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {closedEntries.map((entry) => {
              const minutes = entry.duration_minutes || 0;
              const montant = (minutes / 60) * tarifHoraire;
              return (
                <Card key={entry.id} className="border-border/50 hover:shadow-md transition-all">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm capitalize">
                            {format(new Date(entry.started_at), 'EEEE d MMM yyyy', { locale: fr })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.started_at), 'HH:mm')}
                            {entry.ended_at && ` → ${format(new Date(entry.ended_at), 'HH:mm')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="secondary">{formatDuration(minutes)}</Badge>
                        <span className="font-bold text-green-600">{montant.toFixed(2)} CHF</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

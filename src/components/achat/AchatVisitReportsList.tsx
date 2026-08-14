import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Calendar, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { formatCHF } from '@/lib/purchaseFinancing';

interface AchatVisitReportsListProps {
  reports: any[];
  properties: any[];
}

const STATUT_LABEL: Record<string, { label: string; color: string }> = {
  a_analyser:           { label: 'À analyser', color: 'bg-amber-100 text-amber-700' },
  valide_contre_visite: { label: 'Contre-visite recommandée', color: 'bg-primary/10 text-primary' },
  refuse:               { label: 'Écarté', color: 'bg-zinc-100 text-zinc-700' },
  offre_recommandee:    { label: 'Offre recommandée', color: 'bg-emerald-100 text-emerald-700' },
};

export function AchatVisitReportsList({ reports, properties }: AchatVisitReportsListProps) {
  const propMap = new Map(properties.map((p) => [p.id, p]));

  return (
    <Card className="p-6 border-primary/20">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Eye className="h-5 w-5 text-primary" />
        Rapports de visite courtier
      </h2>
      {reports.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Aucun rapport de visite n'a encore été remis. Votre courtier Immo-Rama produit un rapport détaillé
          après chaque visite : état général, points forts/faibles, risques, estimation de prix et recommandation.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const p = propMap.get(r.property_id);
            const s = STATUT_LABEL[r.statut] || { label: r.statut, color: 'bg-zinc-100 text-zinc-700' };
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card/40 p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="font-semibold">{p?.titre || 'Bien'}</div>
                  <Badge className={`border-0 text-xs ${s.color}`}>{s.label}</Badge>
                </div>
                {r.date_visite && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
                    <Calendar className="h-3 w-3" />
                    Visite du {new Date(r.date_visite).toLocaleDateString('fr-CH')}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {r.points_forts && (
                    <Item icon={CheckCircle2} color="text-emerald-600" title="Points forts" content={r.points_forts} />
                  )}
                  {r.points_faibles && (
                    <Item icon={AlertTriangle} color="text-amber-600" title="Points faibles" content={r.points_faibles} />
                  )}
                  {r.risques && (
                    <Item icon={AlertTriangle} color="text-red-600" title="Risques" content={r.risques} />
                  )}
                  {r.estimation_prix > 0 && (
                    <Item icon={TrendingUp} color="text-primary" title="Estimation prix" content={formatCHF(r.estimation_prix)} />
                  )}
                </div>
                {r.recommandation && (
                  <div className="mt-3 text-sm bg-primary/5/50 border border-primary/20 rounded-lg p-3">
                    <span className="font-semibold text-primary">Recommandation : </span>
                    <span className="text-primary">{r.recommandation}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Item({ icon: Icon, color, title, content }: any) {
  return (
    <div className="flex items-start gap-2">
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{title}</div>
        <div className="text-sm">{content}</div>
      </div>
    </div>
  );
}

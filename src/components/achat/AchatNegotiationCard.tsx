import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Handshake, ArrowRight, Calendar } from 'lucide-react';
import { formatCHF } from '@/lib/purchaseFinancing';

interface AchatNegotiationCardProps {
  negotiations: any[];
}

const STATUT_LABEL: Record<string, { label: string; color: string }> = {
  en_preparation:    { label: 'En préparation', color: 'bg-amber-100 text-amber-700' },
  envoyee:           { label: 'Offre envoyée', color: 'bg-primary/10 text-primary' },
  contre_offre:     { label: 'Contre-offre reçue', color: 'bg-primary/10 text-primary' },
  acceptee:          { label: 'Acceptée', color: 'bg-emerald-100 text-emerald-700' },
  refusee:           { label: 'Refusée', color: 'bg-red-100 text-red-700' },
};

export function AchatNegotiationCard({ negotiations }: AchatNegotiationCardProps) {
  return (
    <Card className="p-6 border-primary/20">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Handshake className="h-5 w-5 text-primary" />
        Offre d'achat & négociation
      </h2>
      {negotiations.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Aucune offre d'achat n'a encore été déposée. Lorsque vous identifierez le bon bien, Immo-Rama préparera
          et défendra votre offre.
        </div>
      ) : (
        <div className="space-y-3">
          {negotiations.map((n) => {
            const s = STATUT_LABEL[n.statut] || { label: n.statut, color: 'bg-zinc-100 text-zinc-700' };
            return (
              <div key={n.id} className="rounded-xl border border-border bg-card/40 p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <Badge className={`border-0 text-xs ${s.color}`}>{s.label}</Badge>
                  {n.date_offre && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(n.date_offre).toLocaleDateString('fr-CH')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Offre</div>
                    <div className="font-semibold">{n.montant_offre ? formatCHF(n.montant_offre) : '—'}</div>
                  </div>
                  {n.contre_offre && (
                    <>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Contre-offre</div>
                        <div className="font-semibold">{formatCHF(n.contre_offre)}</div>
                      </div>
                    </>
                  )}
                </div>
                {n.notes && <div className="text-xs text-muted-foreground mt-2">{n.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

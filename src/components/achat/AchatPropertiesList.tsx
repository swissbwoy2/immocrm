import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, MapPin, ExternalLink, Layers, Square, Hash } from 'lucide-react';
import { formatCHF } from '@/lib/purchaseFinancing';

interface AchatPropertiesListProps {
  properties: any[];
}

const STATUT_LABEL: Record<string, { label: string; color: string }> = {
  a_analyser:           { label: 'À analyser', color: 'bg-amber-100 text-amber-700' },
  visite_planifiee:     { label: 'Visite planifiée', color: 'bg-primary/10 text-primary' },
  visite_effectuee:     { label: 'Visite effectuée', color: 'bg-primary/10 text-primary' },
  offre_recommandee:    { label: 'Offre recommandée', color: 'bg-emerald-100 text-emerald-700' },
  refuse:               { label: 'Écarté', color: 'bg-zinc-100 text-zinc-700' },
  offre_envoyee:        { label: 'Offre envoyée', color: 'bg-purple-100 text-purple-700' },
};

export function AchatPropertiesList({ properties }: AchatPropertiesListProps) {
  return (
    <Card className="p-6 border-primary/20">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Home className="h-5 w-5 text-primary" />
        Biens sélectionnés pour votre projet
      </h2>
      {properties.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Aucun bien n'a encore été sélectionné. Votre conseiller ajoutera les biens correspondant à vos critères.
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => {
            const s = STATUT_LABEL[p.statut] || { label: p.statut, color: 'bg-zinc-100 text-zinc-700' };
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card/40 p-4 hover:border-primary/20 transition">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{p.titre || 'Bien sans titre'}</h3>
                      <Badge className={`border-0 text-xs ${s.color}`}>{s.label}</Badge>
                    </div>
                    {p.adresse && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                        <MapPin className="h-3.5 w-3.5" />
                        {[p.adresse, p.npa, p.ville].filter(Boolean).join(', ')}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {p.prix > 0 && <span className="font-semibold text-foreground">{formatCHF(p.prix)}</span>}
                      {p.pieces && <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {p.pieces} pièces</span>}
                      {p.surface && <span className="flex items-center gap-1"><Square className="h-3 w-3" /> {p.surface} m²</span>}
                      {p.etage != null && <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> Étage {p.etage}</span>}
                    </div>
                    {p.prochaine_action && (
                      <div className="text-xs mt-2 text-primary">→ {p.prochaine_action}</div>
                    )}
                  </div>
                  {p.lien_annonce && (
                    <a href={p.lien_annonce} target="_blank" rel="noreferrer"
                       className="text-xs text-primary hover:underline flex items-center gap-1">
                      Annonce <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

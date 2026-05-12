import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Wallet, Building2, Crown, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ProjectionItem {
  clientId: string;
  clientName: string;
  base: number;
  splitAgent: number;
  commissionAgent: number;
  partAgence: number;
  isPrimary: boolean;
}

interface Props {
  items: ProjectionItem[];
  className?: string;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString('fr-CH')} CHF`;

export function AgentFinancialProjection({ items, className }: Props) {
  const [open, setOpen] = useState(false);

  const { totalAgent, totalAgence } = useMemo(() => ({
    totalAgent: items.reduce((s, i) => s + i.commissionAgent, 0),
    totalAgence: items.reduce((s, i) => s + i.partAgence, 0),
  }), [items]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.commissionAgent - a.commissionAgent),
    [items]
  );

  return (
    <div className={cn('space-y-4 animate-fade-in', className)}>
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Projection financière</h2>
        <Badge variant="secondary" className="ml-2">{items.length} dossier{items.length > 1 ? 's' : ''}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="relative overflow-hidden p-6 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-emerald-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Commission projetée agent</p>
              <p className="text-3xl font-bold mt-2 tabular-nums">{fmt(totalAgent)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sur {items.length} dossier{items.length > 1 ? 's' : ''} actif{items.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <Wallet className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-6 border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-background to-violet-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">CA projeté agence</p>
              <p className="text-3xl font-bold mt-2 tabular-nums">{fmt(totalAgence)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Part agence (55% par défaut)
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {items.length > 0 && (
        <Card className="p-4">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setOpen(o => !o)}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Détail par client
            </span>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {open && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="text-left py-2 px-2 font-medium">Client</th>
                    <th className="text-right py-2 px-2 font-medium">Loyer base</th>
                    <th className="text-right py-2 px-2 font-medium">% agent</th>
                    <th className="text-right py-2 px-2 font-medium">Comm. agent</th>
                    <th className="text-right py-2 px-2 font-medium">Part agence</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(item => (
                    <tr key={item.clientId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[180px]">{item.clientName}</span>
                          {item.isPrimary ? (
                            <Badge variant="default" className="h-5 text-[10px] gap-1">
                              <Crown className="h-3 w-3" /> Principal
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 text-[10px]">Co-agent</Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums text-muted-foreground">{fmt(item.base)}</td>
                      <td className="text-right py-2 px-2 tabular-nums">{item.splitAgent}%</td>
                      <td className="text-right py-2 px-2 tabular-nums font-medium text-emerald-600">{fmt(item.commissionAgent)}</td>
                      <td className="text-right py-2 px-2 tabular-nums font-medium text-blue-600">{fmt(item.partAgence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <p className="text-xs text-muted-foreground italic">
        Projection sur les locations, dossiers actifs ≤ 90 jours, hors clients relogés. Modèle&nbsp;: commission = loyer brut sans TVA.
      </p>
    </div>
  );
}

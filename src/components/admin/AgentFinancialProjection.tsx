import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Wallet, Building2, Crown, Users, Coins, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

interface TileProps {
  title: string;
  value: number;
  subtitle: string;
  tooltip: string;
  icon: React.ReactNode;
  accent: string;
  iconBg: string;
  iconColor: string;
}

function Tile({ title, value, subtitle, tooltip, icon, accent, iconBg, iconColor }: TileProps) {
  return (
    <Card className={cn('relative overflow-hidden p-6 border', accent)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-3xl font-bold mt-2 tabular-nums">{fmt(value)}</p>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className={cn('p-3 rounded-xl shrink-0', iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}

export function AgentFinancialProjection({ items, className }: Props) {
  const [open, setOpen] = useState(false);

  const { totalAgent, totalAgence, totalEncaisse, pctAgent, pctAgence } = useMemo(() => {
    const tA = items.reduce((s, i) => s + i.commissionAgent, 0);
    const tAg = items.reduce((s, i) => s + i.partAgence, 0);
    const tE = tA + tAg;
    return {
      totalAgent: tA,
      totalAgence: tAg,
      totalEncaisse: tE,
      pctAgent: tE > 0 ? Math.round((tA / tE) * 100) : 0,
      pctAgence: tE > 0 ? Math.round((tAg / tE) * 100) : 0,
    };
  }, [items]);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile
          title="Commission projetée agent"
          value={totalAgent}
          subtitle={`Sur ${items.length} dossier${items.length > 1 ? 's' : ''} actif${items.length > 1 ? 's' : ''}`}
          tooltip="Part versée à l'agent selon son taux personnel (commission_split). C'est ce qu'il touchera si tous ces dossiers se concrétisent."
          icon={<Wallet className="h-6 w-6" />}
          accent="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-emerald-500/5"
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600"
        />
        <Tile
          title="CA projeté agence"
          value={totalAgence}
          subtitle="Part qui reste après paiement de l'agent"
          tooltip="Part qui reste à l'agence APRÈS avoir payé l'agent. Ce n'est pas le total facturé, c'est la marge brute restante."
          icon={<Building2 className="h-6 w-6" />}
          accent="border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-background to-violet-500/5"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600"
        />
        <Tile
          title="Total encaissé"
          value={totalEncaisse}
          subtitle="Commission totale facturée au client"
          tooltip="Montant total facturé par l'agence (≈ 1 mois de loyer brut par dossier). Total = Commission agent + Part agence."
          icon={<Coins className="h-6 w-6" />}
          accent="border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-amber-500/5"
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
        />
      </div>

      {/* Récapitulatif tabulaire */}
      {totalEncaisse > 0 && (
        <Card className="p-4 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Récapitulatif</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Commission agent</p>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">{fmt(totalAgent)}</p>
              <p className="text-[10px] text-muted-foreground">({pctAgent}%)</p>
            </div>
            <div className="border-x">
              <p className="text-xs text-muted-foreground">Part agence</p>
              <p className="text-lg font-bold text-blue-600 tabular-nums">{fmt(totalAgence)}</p>
              <p className="text-[10px] text-muted-foreground">({pctAgence}%)</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total encaissé</p>
              <p className="text-lg font-bold text-amber-600 tabular-nums">{fmt(totalEncaisse)}</p>
              <p className="text-[10px] text-muted-foreground">(100%)</p>
            </div>
          </div>
        </Card>
      )}

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
        Total encaissé = somme des loyers bruts (1 mois par dossier). Il se répartit entre l'agent et l'agence selon le commission_split.
        Projection sur les locations, dossiers actifs ≤ 90 jours, hors clients relogés. Sans TVA.
      </p>
    </div>
  );
}

import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CandidatGarantInfo } from '@/lib/candidatCriteresMerge';

const yn = (b: boolean | null | undefined) => (b === true ? 'Oui' : b === false ? 'Non' : '—');

/** Bloc « Garant » (déclaré par le candidat) — affichage admin/agent. */
export function CandidatGarantCard({ garant }: { garant: CandidatGarantInfo }) {
  const rows: [string, string][] = [
    ['Nom', garant.garant_nom || '—'],
    ['Lien', garant.garant_lien || '—'],
    ['Revenu net', garant.garant_revenus ? `CHF ${Number(garant.garant_revenus).toLocaleString('fr-CH')}` : '—'],
    ['Permis', garant.garant_permis || '—'],
    ['Poursuites', yn(garant.garant_poursuites)],
    ['Actes de défaut de biens', yn(garant.garant_actes_defaut)],
  ];
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <ShieldCheck className="w-5 h-5 text-primary" /> Garant
          <Badge variant={garant.garant_solvable ? 'default' : 'outline'}>
            Déclaré solvable : {yn(garant.garant_solvable)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}><span className="text-muted-foreground">{k} : </span><span className="font-medium text-foreground">{v}</span></div>
        ))}
      </CardContent>
    </Card>
  );
}

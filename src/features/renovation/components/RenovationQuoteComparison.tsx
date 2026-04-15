import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Props {
  result: {
    comparison: Array<{
      category: string;
      items: Array<{
        designation: string;
        quotes: Array<{
          quote_id: string;
          company_name: string;
          quantity: number | null;
          unit_price: number | null;
          total_price: number | null;
        }>;
        min_total: number;
        max_total: number;
        spread_pct: number;
      }>;
      category_totals: Array<{ quote_id: string; company_name: string; total: number }>;
    }>;
    global_totals: Array<{
      quote_id: string;
      company_name: string;
      amount_ht: number;
      amount_ttc: number;
    }>;
    ai_synthesis: string;
  };
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  demolition: 'Démolition',
  gros_oeuvre: 'Gros œuvre',
  toiture: 'Toiture',
  menuiserie_ext: 'Menuiserie ext.',
  menuiserie_int: 'Menuiserie int.',
  electricite: 'Électricité',
  plomberie: 'Plomberie',
  chauffage_ventilation: 'Chauffage/Ventilation',
  peinture_revetements: 'Peinture/Revêtements',
  architecture: 'Architecture',
  divers: 'Divers',
};

export function RenovationQuoteComparison({ result, onClose }: Props) {
  const companies = result.global_totals.map(t => t.company_name);

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Comparaison des devis</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global totals */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.global_totals.map(t => (
            <Card key={t.quote_id}>
              <CardContent className="py-3">
                <p className="text-sm font-medium">{t.company_name}</p>
                <p className="text-lg font-bold">
                  CHF {t.amount_ttc.toLocaleString('fr-CH')}
                </p>
                <p className="text-xs text-muted-foreground">
                  HT: CHF {t.amount_ht.toLocaleString('fr-CH')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Category comparison table */}
        {result.comparison.map(cat => (
          <div key={cat.category}>
            <h4 className="text-sm font-semibold mb-2">
              {CATEGORY_LABELS[cat.category] || cat.category}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 pr-4">Poste</th>
                    {companies.map(c => (
                      <th key={c} className="text-right py-1 px-2">{c}</th>
                    ))}
                    <th className="text-right py-1 pl-2">Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-1 pr-4 text-xs">{item.designation}</td>
                      {companies.map(companyName => {
                        const entry = item.quotes.find(q => q.company_name === companyName);
                        return (
                          <td key={companyName} className="text-right py-1 px-2 text-xs tabular-nums">
                            {entry?.total_price
                              ? `CHF ${entry.total_price.toLocaleString('fr-CH')}`
                              : '—'}
                          </td>
                        );
                      })}
                      <td className={`text-right py-1 pl-2 text-xs font-medium ${
                        item.spread_pct > 20 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {item.spread_pct > 0 ? `${item.spread_pct}%` : '—'}
                      </td>
                    </tr>
                  ))}
                  {/* Category subtotal */}
                  <tr className="font-medium bg-muted/30">
                    <td className="py-1 pr-4 text-xs">Sous-total</td>
                    {companies.map(companyName => {
                      const entry = cat.category_totals.find(t => t.company_name === companyName);
                      return (
                        <td key={companyName} className="text-right py-1 px-2 text-xs tabular-nums">
                          {entry ? `CHF ${entry.total.toLocaleString('fr-CH')}` : '—'}
                        </td>
                      );
                    })}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* AI Synthesis */}
        {result.ai_synthesis && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <h4 className="text-sm font-semibold mb-2">Synthèse IA</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {result.ai_synthesis}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

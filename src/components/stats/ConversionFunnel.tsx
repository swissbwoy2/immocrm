import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown } from 'lucide-react';

interface FunnelStep {
  label: string;
  count: number;
  color: string;
}

interface ConversionFunnelProps {
  leads: number;
  mandats: number;
  clientsAssignes: number;
  offresEnvoyees: number;
  candidatures: number;
  bailsSignes: number;
  clesRemises: number;
  loading?: boolean;
}

export function ConversionFunnel({
  leads, mandats, clientsAssignes, offresEnvoyees,
  candidatures, bailsSignes, clesRemises, loading
}: ConversionFunnelProps) {
  const steps: FunnelStep[] = useMemo(() => [
    { label: 'Leads', count: leads, color: 'bg-blue-500' },
    { label: 'Mandats signés', count: mandats, color: 'bg-indigo-500' },
    { label: 'Clients assignés', count: clientsAssignes, color: 'bg-violet-500' },
    { label: 'Offres envoyées', count: offresEnvoyees, color: 'bg-purple-500' },
    { label: 'Candidatures', count: candidatures, color: 'bg-pink-500' },
    { label: 'Bails signés', count: bailsSignes, color: 'bg-orange-500' },
    { label: 'Clés remises', count: clesRemises, color: 'bg-green-500' },
  ], [leads, mandats, clientsAssignes, offresEnvoyees, candidatures, bailsSignes, clesRemises]);

  const maxCount = Math.max(...steps.map(s => s.count), 1);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Funnel de conversion</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Funnel de conversion</CardTitle>
        <p className="text-xs text-muted-foreground">Parcours complet Lead → Clés remises (toutes périodes)</p>
      </CardHeader>
      <CardContent className="space-y-1">
        {steps.map((step, i) => {
          const widthPct = Math.max((step.count / maxCount) * 100, 8);
          const prevCount = i > 0 ? steps[i - 1].count : null;
          const convRate = prevCount && prevCount > 0
            ? ((step.count / prevCount) * 100).toFixed(0)
            : null;

          return (
            <div key={step.label}>
              {i > 0 && (
                <div className="flex items-center gap-2 py-1 pl-4">
                  <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {convRate}% de passage
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-32 text-sm font-medium text-right shrink-0">
                  {step.label}
                </div>
                <div className="flex-1 relative">
                  <div
                    className={`${step.color} h-9 rounded-md flex items-center transition-all duration-500`}
                    style={{ width: `${widthPct}%` }}
                  >
                    <span className="text-white text-sm font-bold px-3 whitespace-nowrap">
                      {step.count}
                    </span>
                  </div>
                </div>
                {i > 0 && (
                  <div className="w-16 text-right shrink-0">
                    <span className={`text-xs font-semibold ${
                      Number(convRate) >= 50 ? 'text-green-600' :
                      Number(convRate) >= 20 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {convRate}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Global conversion */}
        <div className="pt-4 border-t mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Taux de conversion global</span>
            <span className="text-lg font-bold text-primary">
              {leads > 0 ? ((clesRemises / leads) * 100).toFixed(1) : '0'}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Lead → Clés remises
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

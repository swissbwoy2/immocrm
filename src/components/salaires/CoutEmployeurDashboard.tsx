import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashBadge, DashEmptyState, DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { FinanceStat, Ligne } from '@/components/admin/finances/FinanceParts';
import { cn } from '@/lib/utils';
import { formatCHF, MOIS_LABELS, MODE_REMUNERATION_LABELS, ModeRemuneration } from '@/lib/swissPayroll';
import { DollarSign, TrendingUp, Users, Receipt } from 'lucide-react';

export default function CoutEmployeurDashboard() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());

  const { data: fiches = [], isLoading } = useQuery({
    queryKey: ['fiches-cout-employeur', selectedYear, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiches_salaire')
        .select('*, employes(prenom, nom, poste, type_permis, is_independant, mode_remuneration)')
        .eq('annee', parseInt(selectedYear))
        .eq('mois', parseInt(selectedMonth))
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });

  // Exclude independants from employer cost totals
  const salariesFiches = fiches.filter((f: any) => (f.mode_remuneration || f.employes?.mode_remuneration) !== 'independant');
  const totalBrut = salariesFiches.reduce((s: number, f: any) => s + (f.salaire_brut || 0), 0);
  const totalNet = salariesFiches.reduce((s: number, f: any) => s + (f.salaire_net || 0), 0);
  const totalCharges = salariesFiches.reduce((s: number, f: any) => s + (f.total_charges_employeur || 0), 0);
  const totalCout = salariesFiches.reduce((s: number, f: any) => s + (f.cout_total_employeur || 0), 0);
  const totalHonoraires = fiches
    .filter((f: any) => (f.mode_remuneration || f.employes?.mode_remuneration) === 'independant')
    .reduce((s: number, f: any) => s + (f.salaire_net || 0), 0);

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const statCards = [
    { title: 'Employés', value: fiches.length.toString(), icon: Users, tone: 'primary' as const },
    { title: 'Total brut (salariés)', value: formatCHF(totalBrut), icon: DollarSign, tone: 'success' as const },
    { title: 'Total charges', value: formatCHF(totalCharges), icon: Receipt, tone: 'warning' as const },
    { title: 'Coût total', value: formatCHF(totalCout + totalHonoraires), icon: TrendingUp, tone: 'primary' as const },
  ];

  const modeBadge = (mode: string) => {
    const label = MODE_REMUNERATION_LABELS[mode as ModeRemuneration] || mode;
    switch (mode) {
      case 'commission': return <DashBadge tone="neutral">{label}</DashBadge>;
      case 'horaire': return <DashBadge tone="neutral">{label}</DashBadge>;
      case 'independant': return <DashBadge tone="neutral">{label}</DashBadge>;
      default: return <DashBadge tone="muted">{label}</DashBadge>;
    }
  };

  return (
    <section className="space-y-4" aria-label="Coût employeur">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Coût employeur</h2>
          <p className="text-sm text-muted-foreground">
            {MOIS_LABELS[parseInt(selectedMonth) - 1]} {selectedYear} · coût total {formatCHF(totalCout + totalHonoraires)}
            {totalHonoraires > 0 && ` dont ${formatCHF(totalHonoraires)} d'honoraires d'indépendants`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-11 rounded-full sm:w-[140px]" aria-label="Mois"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOIS_LABELS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-11 rounded-full sm:w-[110px]" aria-label="Année"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((s) => (
          <FinanceStat key={s.title} icon={s.icon} tone={s.tone} label={s.title} value={s.value} />
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="px-0.5 text-base font-semibold text-foreground">Détail par employé — {MOIS_LABELS[parseInt(selectedMonth) - 1]} {selectedYear}</h3>
        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center">Chargement...</p>
        ) : fiches.length === 0 ? (
          <DashEmptyState icon={Receipt} title="Aucune fiche pour cette période" />
        ) : (
          <>
            {/* Mobile : une carte par employé */}
            <div className="grid gap-3 sm:grid-cols-2 md:hidden">
              {fiches.map((f: any) => {
                const fMode = f.mode_remuneration || f.employes?.mode_remuneration || 'fixe';
                const isIndep = fMode === 'independant';
                return (
                  <article key={f.id} className={cn(DASH_CARD, 'space-y-2 p-4')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-foreground">{f.employes?.prenom} {f.employes?.nom}</p>
                        <p className="truncate text-xs text-muted-foreground">{f.employes?.poste}</p>
                      </div>
                      {modeBadge(fMode)}
                    </div>
                    <div className="space-y-1 rounded-xl bg-muted/40 px-3 py-2">
                      <Ligne label="Brut">{formatCHF(f.salaire_brut || 0)}</Ligne>
                      <Ligne label="Charges empl.">{isIndep ? '—' : formatCHF(f.total_charges_employeur || 0)}</Ligne>
                      <Ligne label="Coût total">{isIndep ? formatCHF(f.salaire_net || 0) : formatCHF(f.cout_total_employeur || 0)}</Ligne>
                    </div>
                  </article>
                );
              })}
              <div className={cn(DASH_CARD, 'space-y-1 p-4 sm:col-span-2')}>
                <p className="text-sm font-semibold">TOTAL</p>
                <Ligne label="Brut">{formatCHF(totalBrut + totalHonoraires)}</Ligne>
                <Ligne label="Charges empl.">{formatCHF(totalCharges)}</Ligne>
                <Ligne label="Coût total">{formatCHF(totalCout + totalHonoraires)}</Ligne>
              </div>
            </div>

            {/* Tablette et PC : tableau */}
            <div className={cn(DASH_CARD, 'hidden overflow-hidden md:block')}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Brut</TableHead>
                      <TableHead className="text-right">Charges empl.</TableHead>
                      <TableHead className="text-right font-bold">Coût total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fiches.map((f: any) => {
                      const fMode = f.mode_remuneration || f.employes?.mode_remuneration || 'fixe';
                      const isIndep = fMode === 'independant';
                      return (
                        <TableRow key={f.id}>
                          <TableCell>
                            <div className="font-medium">{f.employes?.prenom} {f.employes?.nom}</div>
                            <div className="text-xs text-muted-foreground">{f.employes?.poste}</div>
                          </TableCell>
                          <TableCell>{modeBadge(fMode)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono">{formatCHF(f.salaire_brut || 0)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono text-amber-700 dark:text-amber-400">
                            {isIndep ? '—' : formatCHF(f.total_charges_employeur || 0)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono font-bold">
                            {isIndep ? formatCHF(f.salaire_net || 0) : formatCHF(f.cout_total_employeur || 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono">{formatCHF(totalBrut + totalHonoraires)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-amber-700 dark:text-amber-400">{formatCHF(totalCharges)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono">{formatCHF(totalCout + totalHonoraires)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCHF, MOIS_LABELS } from '@/lib/swissPayroll';
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
        .select('*, employes(prenom, nom, poste, type_permis, is_independant)')
        .eq('annee', parseInt(selectedYear))
        .eq('mois', parseInt(selectedMonth))
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });

  const totalBrut = fiches.reduce((s: number, f: any) => s + (f.salaire_brut || 0), 0);
  const totalNet = fiches.reduce((s: number, f: any) => s + (f.salaire_net || 0), 0);
  const totalCharges = fiches.reduce((s: number, f: any) => s + (f.total_charges_employeur || 0), 0);
  const totalCout = fiches.reduce((s: number, f: any) => s + (f.cout_total_employeur || 0), 0);

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const statCards = [
    { title: 'Employés', value: fiches.length.toString(), icon: Users, color: 'text-blue-600' },
    { title: 'Total brut', value: formatCHF(totalBrut), icon: DollarSign, color: 'text-emerald-600' },
    { title: 'Total charges', value: formatCHF(totalCharges), icon: Receipt, color: 'text-orange-600' },
    { title: 'Coût total', value: formatCHF(totalCout), icon: TrendingUp, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MOIS_LABELS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.title}</span>
              </div>
              <p className="text-xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détail par employé — {MOIS_LABELS[parseInt(selectedMonth) - 1]} {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Chargement...</p>
          ) : fiches.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">Aucune fiche pour cette période</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead className="text-right">Brut</TableHead>
                  <TableHead className="text-right">AVS empl.</TableHead>
                  <TableHead className="text-right">AC empl.</TableHead>
                  <TableHead className="text-right">AAP</TableHead>
                  <TableHead className="text-right">LPP empl.</TableHead>
                  <TableHead className="text-right">AF</TableHead>
                  <TableHead className="text-right">Total charges</TableHead>
                  <TableHead className="text-right font-bold">Coût total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fiches.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div className="font-medium">{f.employes?.prenom} {f.employes?.nom}</div>
                      <div className="text-xs text-muted-foreground">{f.employes?.poste}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCHF(f.salaire_brut || 0)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCHF(f.montant_avs_employeur || 0)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCHF(f.montant_ac_employeur || 0)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCHF(f.montant_aap || 0)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCHF(f.montant_lpp_employeur || 0)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCHF(f.montant_af || 0)}</TableCell>
                    <TableCell className="text-right font-mono text-orange-600">{formatCHF(f.total_charges_employeur || 0)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{formatCHF(f.cout_total_employeur || 0)}</TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right font-mono">{formatCHF(totalBrut)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCHF(fiches.reduce((s: number, f: any) => s + (f.montant_avs_employeur || 0), 0))}</TableCell>
                  <TableCell className="text-right font-mono">{formatCHF(fiches.reduce((s: number, f: any) => s + (f.montant_ac_employeur || 0), 0))}</TableCell>
                  <TableCell className="text-right font-mono">{formatCHF(fiches.reduce((s: number, f: any) => s + (f.montant_aap || 0), 0))}</TableCell>
                  <TableCell className="text-right font-mono">{formatCHF(fiches.reduce((s: number, f: any) => s + (f.montant_lpp_employeur || 0), 0))}</TableCell>
                  <TableCell className="text-right font-mono">{formatCHF(fiches.reduce((s: number, f: any) => s + (f.montant_af || 0), 0))}</TableCell>
                  <TableCell className="text-right font-mono text-orange-600">{formatCHF(totalCharges)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCHF(totalCout)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

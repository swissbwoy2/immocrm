import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileDown, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { MOIS_LABELS, formatCHF, MODE_REMUNERATION_LABELS, ModeRemuneration } from '@/lib/swissPayroll';
import FicheSalaireDialog from './FicheSalaireDialog';
import FicheSalairePDFViewer from './FicheSalairePDFViewer';

export default function FichesSalaireList() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFiche, setEditingFiche] = useState<any>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfFiche, setPdfFiche] = useState<any>(null);

  const { data: fiches = [], isLoading } = useQuery({
    queryKey: ['fiches_salaire', selectedYear, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiches_salaire')
        .select('*, employes(prenom, nom, type_permis, is_independant, poste, mode_remuneration)')
        .eq('annee', parseInt(selectedYear))
        .eq('mois', parseInt(selectedMonth))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: employes = [] } = useQuery({
    queryKey: ['employes-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employes')
        .select('id, prenom, nom')
        .eq('statut', 'actif')
        .order('nom');
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fiches_salaire').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiches_salaire'] });
      toast.success('Fiche supprimée');
    },
  });

  const handleNew = () => { setEditingFiche(null); setDialogOpen(true); };
  const handleEdit = (f: any) => { setEditingFiche(f); setDialogOpen(true); };
  const handleViewPdf = (f: any) => { setPdfFiche(f); setPdfViewerOpen(true); };

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const statutBadge = (s: string) => {
    if (s === 'valide') return <Badge className="bg-emerald-100 text-emerald-700">Validé</Badge>;
    if (s === 'paye') return <Badge className="bg-blue-100 text-blue-700">Payé</Badge>;
    return <Badge variant="outline">Brouillon</Badge>;
  };

  const modeBadge = (mode: string) => {
    const label = MODE_REMUNERATION_LABELS[mode as ModeRemuneration] || mode;
    switch (mode) {
      case 'commission': return <Badge className="bg-amber-100 text-amber-700">{label}</Badge>;
      case 'horaire': return <Badge className="bg-sky-100 text-sky-700">{label}</Badge>;
      case 'independant': return <Badge className="bg-purple-100 text-purple-700">{label}</Badge>;
      default: return <Badge variant="secondary">{label}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle>Fiches de salaire</CardTitle>
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
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" /> Nouvelle fiche
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center">Chargement...</p>
        ) : fiches.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            Aucune fiche pour {MOIS_LABELS[parseInt(selectedMonth) - 1]} {selectedYear}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Brut</TableHead>
                <TableHead className="text-right">Déductions</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fiches.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    {f.employes?.prenom} {f.employes?.nom}
                    {f.employes?.poste && <span className="text-muted-foreground text-xs block">{f.employes.poste}</span>}
                  </TableCell>
                  <TableCell>
                    {modeBadge(f.mode_remuneration || f.employes?.mode_remuneration || 'fixe')}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCHF(f.salaire_brut || 0)}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">{formatCHF(f.total_deductions || 0)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCHF(f.salaire_net || 0)}</TableCell>
                  <TableCell>{statutBadge(f.statut)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleViewPdf(f)} title="Voir PDF">
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(f)} title="Modifier">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(f.id)} title="Supprimer">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <FicheSalaireDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        fiche={editingFiche}
        employes={employes}
        defaultMonth={parseInt(selectedMonth)}
        defaultYear={parseInt(selectedYear)}
      />

      <FicheSalairePDFViewer
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
        fiche={pdfFiche}
      />
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileDown, Trash2, Eye, FileText, Wallet, CheckCircle2, Clock, Users } from 'lucide-react';
import { DashBadge, DashEmptyState, DashFilterPills, TodoCard, DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { FinanceStat, NextAction } from '@/components/admin/finances/FinanceParts';
import { dateCH, type ProchaineAction } from '@/components/admin/finances/financeModel';
import { cn } from '@/lib/utils';

type VueFiches = 'brouillon' | 'valide' | 'paye' | 'toutes';
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
  const [vue, setVue] = useState<VueFiches>('toutes');

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
    if (s === 'valide') return <DashBadge tone="primary">Validé</DashBadge>;
    if (s === 'paye') return <DashBadge tone="success">Payé</DashBadge>;
    return <DashBadge tone="warning">Brouillon</DashBadge>;
  };

  const modeBadge = (mode: string) => {
    const label = MODE_REMUNERATION_LABELS[mode as ModeRemuneration] || mode;
    switch (mode) {
      case 'commission': return <DashBadge tone="neutral">{label}</DashBadge>;
      case 'horaire': return <DashBadge tone="neutral">{label}</DashBadge>;
      case 'independant': return <DashBadge tone="neutral">{label}</DashBadge>;
      default: return <DashBadge tone="muted">{label}</DashBadge>;
    }
  };

  // ─── Affichage : fiches du mois rangées par étape (calculs purement visuels) ───
  // Onglet par défaut : ce qui attend une action, choisi une fois après le premier chargement.
  const [vueChoisie, setVueChoisie] = useState(false);
  useEffect(() => {
    if (isLoading || vueChoisie) return;
    const aValider = fiches.some((f: any) => f.statut !== 'valide' && f.statut !== 'paye');
    const aPayer = fiches.some((f: any) => f.statut === 'valide');
    setVue(aValider ? 'brouillon' : aPayer ? 'valide' : 'toutes');
    setVueChoisie(true);
  }, [isLoading, vueChoisie, fiches]);
  const etapeFiche = (f: any): 'brouillon' | 'valide' | 'paye' => (f.statut === 'paye' ? 'paye' : f.statut === 'valide' ? 'valide' : 'brouillon');
  const parEtape = {
    brouillon: fiches.filter((f: any) => etapeFiche(f) === 'brouillon'),
    valide: fiches.filter((f: any) => etapeFiche(f) === 'valide'),
    paye: fiches.filter((f: any) => etapeFiche(f) === 'paye'),
  };
  const liste = vue === 'toutes' ? fiches : parEtape[vue];
  const idsAvecFiche = new Set(fiches.map((f: any) => f.employe_id));
  const sansFiche = employes.filter((e: any) => !idsAvecFiche.has(e.id));
  const totalBrut = fiches.reduce((s: number, f: any) => s + (f.salaire_brut || 0), 0);
  const totalNet = fiches.reduce((s: number, f: any) => s + (f.salaire_net || 0), 0);
  const periodeLabel = `${MOIS_LABELS[parseInt(selectedMonth) - 1]} ${selectedYear}`;

  const prochaine = (f: any): ProchaineAction => {
    switch (etapeFiche(f)) {
      case 'paye': return { texte: f.date_paiement ? `Payée le ${dateCH(f.date_paiement)}` : 'Salaire payé', tone: 'success' };
      case 'valide': return { texte: 'Validée : verser le salaire puis marquer payée', tone: 'primary' };
      default: return { texte: 'Brouillon : vérifier puis valider la fiche', tone: 'warning' };
    }
  };

  const actions = (f: any, compact = false) => (
    <div className={cn('flex gap-2', compact && 'justify-end')}>
      <Button
        variant={etapeFiche(f) === 'paye' ? 'outline' : 'default'}
        className={cn('rounded-full', compact ? 'h-9 w-9 p-0' : 'h-11 flex-1')}
        onClick={() => handleEdit(f)}
        title="Modifier"
        aria-label="Modifier la fiche"
      >
        <Eye className="h-4 w-4" />
        {!compact && <span className="ml-2">{etapeFiche(f) === 'brouillon' ? 'Vérifier et valider' : 'Ouvrir la fiche'}</span>}
      </Button>
      <Button
        variant="outline"
        className={cn('shrink-0 rounded-full p-0', compact ? 'h-9 w-9' : 'h-11 w-11')}
        onClick={() => handleViewPdf(f)}
        title="Voir PDF"
        aria-label="Voir le PDF"
      >
        <FileDown className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        className={cn('shrink-0 rounded-full p-0 text-destructive hover:bg-destructive/10 hover:text-destructive', compact ? 'h-9 w-9' : 'h-11 w-11')}
        onClick={() => deleteMutation.mutate(f.id)}
        title="Supprimer"
        aria-label="Supprimer la fiche"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <section className="space-y-4" aria-label="Fiches de salaire">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Fiches de salaire</h2>
          <p className="text-sm text-muted-foreground">
            {periodeLabel} · {fiches.length} fiche{fiches.length > 1 ? 's' : ''}
            {parEtape.brouillon.length > 0 && ` · ${parEtape.brouillon.length} à valider`}
            {parEtape.valide.length > 0 && ` · ${parEtape.valide.length} à payer`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
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
          <Button onClick={handleNew} className="col-span-2 h-11 gap-2 rounded-full md:h-10">
            <Plus className="h-4 w-4" /> Nouvelle fiche
          </Button>
        </div>
      </div>

      {/* Synthèse du mois */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <FinanceStat icon={FileText} tone="primary" label="Fiches du mois" value={String(fiches.length)} hint={periodeLabel} />
        <FinanceStat icon={Wallet} tone="primary" label="Total brut" value={formatCHF(totalBrut)} />
        <FinanceStat icon={CheckCircle2} tone="success" label="Total net" value={formatCHF(totalNet)} />
        <FinanceStat icon={Clock} tone={parEtape.brouillon.length > 0 ? 'warning' : 'muted'} label="À valider" value={String(parEtape.brouillon.length)} hint={`${parEtape.valide.length} validée(s) à payer`} onClick={() => setVue('brouillon')} active={vue === 'brouillon'} />
      </div>

      {!isLoading && sansFiche.length > 0 && (
        <TodoCard
          icon={Users}
          title={`${sansFiche.length} employé${sansFiche.length > 1 ? 's' : ''} actif${sansFiche.length > 1 ? 's' : ''} sans fiche pour ${periodeLabel}`}
          description={sansFiche.slice(0, 6).map((e: any) => `${e.prenom} ${e.nom}`).join(', ') + (sansFiche.length > 6 ? '…' : '')}
          action={
            <Button onClick={handleNew} className="h-11 gap-2 rounded-full md:h-10">
              <Plus className="h-4 w-4" /> Nouvelle fiche
            </Button>
          }
        />
      )}

      <DashFilterPills
        label="Étapes des fiches"
        value={vue}
        onChange={(v) => setVue(v as VueFiches)}
        options={[
          { key: 'brouillon', label: 'À valider', count: parEtape.brouillon.length },
          { key: 'valide', label: 'Validées', count: parEtape.valide.length },
          { key: 'paye', label: 'Payées', count: parEtape.paye.length },
          { key: 'toutes', label: 'Toutes', count: fiches.length },
        ]}
      />

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Chargement...</p>
      ) : liste.length === 0 ? (
        <DashEmptyState
          icon={FileText}
          title={fiches.length === 0 ? `Aucune fiche pour ${periodeLabel}` : 'Aucune fiche dans cette étape'}
        />
      ) : (
        <>
          {/* Mobile : une carte par fiche */}
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {liste.map((f: any) => (
              <article key={f.id} className={cn(DASH_CARD, 'space-y-3 p-4')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-foreground">{f.employes?.prenom} {f.employes?.nom}</p>
                    {f.employes?.poste && <p className="truncate text-xs text-muted-foreground">{f.employes.poste}</p>}
                  </div>
                  {statutBadge(f.statut)}
                </div>
                <div>{modeBadge(f.mode_remuneration || f.employes?.mode_remuneration || 'fixe')}</div>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                  <div><p className="text-muted-foreground">Brut</p><p className="font-mono text-sm">{formatCHF(f.salaire_brut || 0)}</p></div>
                  <div><p className="text-muted-foreground">Déductions</p><p className="font-mono text-sm text-destructive">{formatCHF(f.total_deductions || 0)}</p></div>
                  <div className="text-right"><p className="text-muted-foreground">Net</p><p className="font-mono text-sm font-semibold">{formatCHF(f.salaire_net || 0)}</p></div>
                </div>
                <NextAction action={prochaine(f)} />
                {actions(f)}
              </article>
            ))}
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
                    <TableHead className="text-right">Déductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Prochaine action</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liste.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        {f.employes?.prenom} {f.employes?.nom}
                        {f.employes?.poste && <span className="text-muted-foreground text-xs block">{f.employes.poste}</span>}
                      </TableCell>
                      <TableCell>
                        {modeBadge(f.mode_remuneration || f.employes?.mode_remuneration || 'fixe')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono">{formatCHF(f.salaire_brut || 0)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-destructive">{formatCHF(f.total_deductions || 0)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono font-semibold">{formatCHF(f.salaire_net || 0)}</TableCell>
                      <TableCell>{statutBadge(f.statut)}</TableCell>
                      <TableCell className="max-w-[220px]"><NextAction action={prochaine(f)} className="text-xs" /></TableCell>
                      <TableCell className="text-right">{actions(f, true)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

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
    </section>
  );
}

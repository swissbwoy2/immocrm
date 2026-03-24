import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { calculateSalary, formatCHF, MOIS_LABELS, isSubjectToSourceTax, DEFAULT_EMPLOYEE_RATES, BAREMES_IMPOT_SOURCE, ModeRemuneration, MODE_REMUNERATION_LABELS } from '@/lib/swissPayroll';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fiche: any | null;
  employes: { id: string; prenom: string; nom: string }[];
  defaultMonth: number;
  defaultYear: number;
}

interface TransactionDetail {
  id: string;
  adresse: string;
  part_agent: number;
  date_transaction: string;
  commission_payee: boolean;
  statut: string;
}

interface MissionCoursier {
  id: string;
  adresse: string;
  date_visite: string;
  montant: number;
  paye_coursier: boolean;
}

const TARIF_COURSIER = 5; // CHF par visite

export default function FicheSalaireDialog({ open, onOpenChange, fiche, employes, defaultMonth, defaultYear }: Props) {
  const queryClient = useQueryClient();
  const [selectedEmployeId, setSelectedEmployeId] = useState<string>('');
  const { register, handleSubmit, setValue, watch, reset } = useForm();

  const mois = watch('mois') || defaultMonth;
  const annee = watch('annee') || defaultYear;

  // Fetch employee data when selected
  const { data: employeData } = useQuery({
    queryKey: ['employe-detail', selectedEmployeId],
    queryFn: async () => {
      if (!selectedEmployeId) return null;
      const { data, error } = await supabase.from('employes').select('*').eq('id', selectedEmployeId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEmployeId,
  });

  const mode: ModeRemuneration = (employeData as any)?.mode_remuneration || 'commission';

  // Fetch transactions for commission mode
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery<TransactionDetail[]>({
    queryKey: ['transactions-commission', selectedEmployeId, mois, annee],
    queryFn: async () => {
      if (!employeData?.user_id) return [];
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', employeData.user_id)
        .single();
      if (!agent) return [];

      const startDate = `${annee}-${String(mois).padStart(2, '0')}-01`;
      const endMonth = Number(mois) === 12 ? 1 : Number(mois) + 1;
      const endYear = Number(mois) === 12 ? Number(annee) + 1 : Number(annee);
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('transactions')
        .select('id, adresse, part_agent, date_transaction, commission_payee, statut')
        .eq('agent_id', agent.id)
        .gte('date_transaction', startDate)
        .lt('date_transaction', endDate)
        .in('statut', ['conclue', 'en_cours']);
      if (error) throw error;
      return (data || []) as TransactionDetail[];
    },
    enabled: !!employeData?.user_id && (mode === 'commission' || mode === 'independant'),
  });

  // Fetch missions for coursier mode
  const { data: missions = [], isLoading: loadingMissions } = useQuery<MissionCoursier[]>({
    queryKey: ['missions-coursier', selectedEmployeId, mois, annee],
    queryFn: async () => {
      if (!employeData?.user_id) return [];
      const { data: coursier } = await supabase
        .from('coursiers')
        .select('id')
        .eq('user_id', employeData.user_id)
        .single();
      if (!coursier) return [];

      const startDate = `${annee}-${String(mois).padStart(2, '0')}-01`;
      const endMonth = Number(mois) === 12 ? 1 : Number(mois) + 1;
      const endYear = Number(mois) === 12 ? Number(annee) + 1 : Number(annee);
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('visites')
        .select('id, adresse, date_visite, paye_coursier')
        .eq('coursier_id', coursier.id)
        .eq('statut_coursier', 'termine')
        .gte('date_visite', startDate)
        .lt('date_visite', endDate);
      if (error) throw error;
      return (data || []).map(v => ({
        id: v.id,
        adresse: v.adresse || 'Adresse N/A',
        date_visite: v.date_visite,
        montant: TARIF_COURSIER,
        paye_coursier: v.paye_coursier || false,
      }));
    },
    enabled: !!employeData?.user_id && mode === 'coursier',
  });

  const totalCommissions = transactions.reduce((s, t) => s + (t.part_agent || 0), 0);
  const totalMissions = missions.reduce((s, m) => s + m.montant, 0);
  const salaireBaseAuto = mode === 'coursier' ? totalMissions : totalCommissions;

  // Pre-fill when employee loaded
  useEffect(() => {
    if (employeData && !fiche) {
      if (mode === 'commission' || mode === 'independant' || mode === 'coursier') {
        setValue('salaire_base', salaireBaseAuto);
      } else if (mode === 'horaire') {
        setValue('salaire_base', 0);
      } else {
        setValue('salaire_base', employeData.salaire_mensuel || 0);
      }
      setValue('taux_avs', DEFAULT_EMPLOYEE_RATES.avs);
      setValue('taux_ac', DEFAULT_EMPLOYEE_RATES.ac);
      setValue('taux_aanp', DEFAULT_EMPLOYEE_RATES.aanp);
      setValue('taux_ijm', DEFAULT_EMPLOYEE_RATES.ijm);
      setValue('taux_lpcfam', DEFAULT_EMPLOYEE_RATES.lpcfam);
      setValue('montant_lpp', 0);
      setValue('taux_impot_source', 0);
      setValue('nombre_heures', 0);
    }
  }, [employeData, fiche, setValue, mode, salaireBaseAuto]);

  // Auto-update salaire_base when commissions/missions change
  useEffect(() => {
    if (!fiche && (mode === 'commission' || mode === 'independant' || mode === 'coursier')) {
      setValue('salaire_base', salaireBaseAuto);
    }
  }, [salaireBaseAuto, mode, fiche, setValue]);

  useEffect(() => {
    if (fiche) {
      setSelectedEmployeId(fiche.employe_id);
      Object.entries(fiche).forEach(([key, value]) => {
        if (value !== null && value !== undefined && key !== 'employes') {
          setValue(key as any, value);
        }
      });
    } else {
      reset();
      setValue('mois', defaultMonth);
      setValue('annee', defaultYear);
    }
  }, [fiche, setValue, reset, defaultMonth, defaultYear]);

  // Hourly calc
  const nombreHeures = Number(watch('nombre_heures')) || 0;
  const tauxHoraire = employeData?.salaire_horaire || 0;
  useEffect(() => {
    if (!fiche && mode === 'horaire') {
      setValue('salaire_base', Math.round(nombreHeures * tauxHoraire * 20) / 20);
    }
  }, [nombreHeures, tauxHoraire, mode, fiche, setValue]);

  // Live calculation
  const watchedFields = watch();
  const calc = calculateSalary({
    salaire_base: Number(watchedFields.salaire_base) || 0,
    absences_payees: Number(watchedFields.absences_payees) || 0,
    heures_supplementaires: Number(watchedFields.heures_supplementaires) || 0,
    primes: Number(watchedFields.primes) || 0,
    taux_avs: Number(watchedFields.taux_avs),
    taux_ac: Number(watchedFields.taux_ac),
    taux_aanp: Number(watchedFields.taux_aanp),
    taux_ijm: Number(watchedFields.taux_ijm),
    taux_lpcfam: Number(watchedFields.taux_lpcfam),
    montant_lpp: Number(watchedFields.montant_lpp) || 0,
    taux_impot_source: Number(watchedFields.taux_impot_source) || 0,
    mode_remuneration: mode,
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const detailCommissions = mode === 'coursier'
        ? missions.map(m => ({
            id: m.id,
            adresse: m.adresse,
            part_agent: m.montant,
            date: m.date_visite,
            payee: m.paye_coursier,
            statut: 'termine',
          }))
        : (mode === 'commission' || mode === 'independant')
        ? transactions.map(t => ({
            id: t.id,
            adresse: t.adresse,
            part_agent: t.part_agent,
            date: t.date_transaction,
            payee: t.commission_payee,
            statut: t.statut,
          }))
        : [];

      const payload = {
        employe_id: selectedEmployeId,
        mois: Number(data.mois),
        annee: Number(data.annee),
        mode_remuneration: mode,
        montant_commissions: mode === 'coursier' ? totalMissions : totalCommissions,
        nombre_heures: Number(data.nombre_heures) || 0,
        taux_horaire_utilise: mode === 'horaire' ? tauxHoraire : 0,
        detail_commissions: detailCommissions,
        salaire_base: calc.salaire_base,
        absences_payees: calc.absences_payees,
        heures_supplementaires: calc.heures_supplementaires,
        primes: calc.primes,
        salaire_brut: calc.salaire_brut,
        taux_avs: Number(data.taux_avs),
        montant_avs: calc.montant_avs,
        taux_ac: Number(data.taux_ac),
        montant_ac: calc.montant_ac,
        taux_aanp: Number(data.taux_aanp),
        montant_aanp: calc.montant_aanp,
        taux_ijm: Number(data.taux_ijm),
        montant_ijm: calc.montant_ijm,
        taux_lpcfam: Number(data.taux_lpcfam),
        montant_lpcfam: calc.montant_lpcfam,
        montant_lpp: Number(data.montant_lpp) || 0,
        taux_impot_source: Number(data.taux_impot_source) || 0,
        montant_impot_source: calc.montant_impot_source,
        total_deductions: calc.total_deductions,
        salaire_net: calc.salaire_net,
        montant_avs_employeur: calc.montant_avs_employeur,
        montant_ac_employeur: calc.montant_ac_employeur,
        montant_aap: calc.montant_aap,
        montant_lpcfam_employeur: calc.montant_lpcfam_employeur,
        montant_lpp_employeur: calc.montant_lpp_employeur,
        montant_af: calc.montant_af,
        total_charges_employeur: calc.total_charges_employeur,
        cout_total_employeur: calc.cout_total_employeur,
        statut: data.statut || 'brouillon',
        notes: data.notes || '',
      };

      if (fiche?.id) {
        const { error } = await supabase.from('fiches_salaire').update(payload).eq('id', fiche.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('fiches_salaire').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiches_salaire'] });
      toast.success(fiche ? 'Fiche modifiée' : 'Fiche créée');
      onOpenChange(false);
    },
    onError: (e) => toast.error('Erreur: ' + (e as Error).message),
  });

  const needsIS = isSubjectToSourceTax(employeData?.type_permis);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {fiche ? 'Modifier la fiche' : 'Nouvelle fiche de salaire'}
            {employeData && (
              <Badge variant="outline" className="ml-2">
                {MODE_REMUNERATION_LABELS[mode] || mode}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
            {/* Period & Employee */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Employé *</Label>
                <Select value={selectedEmployeId} onValueChange={setSelectedEmployeId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {employes.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mois</Label>
                <Select value={watch('mois')?.toString()} onValueChange={(v) => setValue('mois', parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOIS_LABELS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Année</Label>
                <Input type="number" {...register('annee')} />
              </div>
            </div>

            {/* Commission mode: show transactions */}
            {(mode === 'commission' || mode === 'independant') && selectedEmployeId && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  {mode === 'independant' ? 'Honoraires — Affaires conclues' : 'Commissions — Affaires conclues'}
                </h3>
                {loadingTransactions ? (
                  <p className="text-sm text-muted-foreground">Chargement des transactions...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center bg-muted rounded-lg">
                    Aucune affaire conclue pour {MOIS_LABELS[Number(mois) - 1]} {annee}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          {t.commission_payee ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                          )}
                          <div>
                            <span className="font-medium">{t.adresse || 'Adresse N/A'}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {new Date(t.date_transaction).toLocaleDateString('fr-CH')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!t.commission_payee && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                              Sous réserve
                            </Badge>
                          )}
                          <span className="font-mono font-semibold">{formatCHF(t.part_agent || 0)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex justify-between font-semibold">
                        <span>Total commissions ({transactions.length} affaire{transactions.length > 1 ? 's' : ''})</span>
                        <span>{formatCHF(totalCommissions)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Coursier mode: show missions */}
            {mode === 'coursier' && selectedEmployeId && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Missions coursier — Visites terminées
                </h3>
                {loadingMissions ? (
                  <p className="text-sm text-muted-foreground">Chargement des missions...</p>
                ) : missions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center bg-muted rounded-lg">
                    Aucune mission terminée pour {MOIS_LABELS[Number(mois) - 1]} {annee}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {missions.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          {m.paye_coursier ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                          <div>
                            <span className="font-medium">{m.adresse}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {new Date(m.date_visite).toLocaleDateString('fr-CH')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!m.paye_coursier && (
                            <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                              Non payé
                            </Badge>
                          )}
                          <span className="font-mono font-semibold">{formatCHF(m.montant)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex justify-between font-semibold">
                        <span>Total missions ({missions.length} visite{missions.length > 1 ? 's' : ''} × {formatCHF(TARIF_COURSIER)})</span>
                        <span>{formatCHF(totalMissions)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hourly mode: show hours input */}
            {mode === 'horaire' && selectedEmployeId && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Calcul horaire</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Nombre d'heures</Label>
                    <Input type="number" step="0.25" {...register('nombre_heures')} />
                  </div>
                  <div>
                    <Label>Taux horaire</Label>
                    <div className="p-2 bg-muted rounded text-sm font-mono mt-1">
                      {formatCHF(tauxHoraire)}/h
                    </div>
                  </div>
                  <div>
                    <Label>Salaire calculé</Label>
                    <div className="p-2 bg-primary/10 rounded text-sm font-mono font-semibold mt-1">
                      {formatCHF(nombreHeures * tauxHoraire)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gross salary components */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                {mode === 'commission' || mode === 'independant' ? 'Salaire brut (commissions)' : mode === 'coursier' ? 'Salaire brut (missions)' : 'Composants du salaire'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{mode === 'commission' || mode === 'independant' ? 'Total commissions' : mode === 'coursier' ? 'Total missions' : mode === 'horaire' ? 'Salaire horaire calculé' : 'Salaire de base'}</Label>
                  <Input
                    type="number"
                    step="0.05"
                    {...register('salaire_base')}
                    readOnly={mode === 'commission' || mode === 'independant' || mode === 'coursier'}
                    className={mode === 'commission' || mode === 'independant' || mode === 'coursier' ? 'bg-muted' : ''}
                  />
                </div>
                {mode !== 'independant' && (
                  <>
                    <div><Label>Primes / Bonus</Label><Input type="number" step="0.05" {...register('primes')} /></div>
                  </>
                )}
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between font-semibold">
                  <span>Salaire brut</span>
                  <span>{formatCHF(calc.salaire_brut)}</span>
                </div>
              </div>
            </div>

            {/* Deductions — skip for independant */}
            {mode !== 'independant' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">Déductions employé</h3>
                  <p className="text-xs text-muted-foreground">Les taux de cotisations sont fixes et appliqués automatiquement.</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>AVS/AI/APG (%)</Label><Input type="number" step="0.01" value={DEFAULT_EMPLOYEE_RATES.avs} readOnly className="bg-muted cursor-not-allowed" /></div>
                    <div className="col-span-2 flex items-end"><span className="text-sm text-muted-foreground pb-2">= {formatCHF(calc.montant_avs)}</span></div>
                    
                    <div><Label>AC (%)</Label><Input type="number" step="0.01" value={DEFAULT_EMPLOYEE_RATES.ac} readOnly className="bg-muted cursor-not-allowed" /></div>
                    <div className="col-span-2 flex items-end"><span className="text-sm text-muted-foreground pb-2">= {formatCHF(calc.montant_ac)}</span></div>
                    
                    <div><Label>AANP (%)</Label><Input type="number" step="0.01" value={DEFAULT_EMPLOYEE_RATES.aanp} readOnly className="bg-muted cursor-not-allowed" /></div>
                    <div className="col-span-2 flex items-end"><span className="text-sm text-muted-foreground pb-2">= {formatCHF(calc.montant_aanp)}</span></div>
                    
                    <div><Label>IJM (%)</Label><Input type="number" step="0.01" value={DEFAULT_EMPLOYEE_RATES.ijm} readOnly className="bg-muted cursor-not-allowed" /></div>
                    <div className="col-span-2 flex items-end"><span className="text-sm text-muted-foreground pb-2">= {formatCHF(calc.montant_ijm)}</span></div>
                    
                    <div><Label>LPCFam (%)</Label><Input type="number" step="0.01" value={DEFAULT_EMPLOYEE_RATES.lpcfam} readOnly className="bg-muted cursor-not-allowed" /></div>
                    <div className="col-span-2 flex items-end"><span className="text-sm text-muted-foreground pb-2">= {formatCHF(calc.montant_lpcfam)}</span></div>
                    
                    <div><Label>LPP fixe (CHF)</Label><Input type="number" step="0.05" {...register('montant_lpp')} /></div>
                    <div className="col-span-2" />
                  </div>

                  {needsIS && (
                    <div className="p-3 border border-destructive/30 rounded-lg bg-destructive/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-destructive border-destructive/30">
                          Permis {employeData?.type_permis}
                        </Badge>
                        {employeData?.bareme_impot_source && (
                          <Badge variant="secondary">
                            Barème {employeData.bareme_impot_source} — {BAREMES_IMPOT_SOURCE[employeData.bareme_impot_source] || ''}
                          </Badge>
                        )}
                      </div>
                      <Label className="text-destructive">Taux impôt à la source (%)</Label>
                      <Input type="number" step="0.01" {...register('taux_impot_source')} />
                      <p className="text-xs text-muted-foreground">
                        Montant IS: {formatCHF(calc.montant_impot_source)}
                        {!employeData?.bareme_impot_source && ' — ⚠ Barème non défini dans la fiche employé'}
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <div className="flex justify-between font-semibold">
                      <span>Total déductions</span>
                      <span className="text-destructive">- {formatCHF(calc.total_deductions)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex justify-between text-lg font-bold">
                <span>{mode === 'independant' ? 'Honoraires nets' : 'Salaire net'}</span>
                <span>{formatCHF(calc.salaire_net)}</span>
              </div>
            </div>

            {/* Employer charges — skip for independant */}
            {mode !== 'independant' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">Charges employeur (calculées auto)</h3>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">AVS employeur</span><span className="text-right">{formatCHF(calc.montant_avs_employeur)}</span>
                    <span className="text-muted-foreground">AC employeur</span><span className="text-right">{formatCHF(calc.montant_ac_employeur)}</span>
                    <span className="text-muted-foreground">AAP</span><span className="text-right">{formatCHF(calc.montant_aap)}</span>
                    <span className="text-muted-foreground">LPCFam employeur</span><span className="text-right">{formatCHF(calc.montant_lpcfam_employeur)}</span>
                    <span className="text-muted-foreground">LPP employeur</span><span className="text-right">{formatCHF(calc.montant_lpp_employeur)}</span>
                    <span className="text-muted-foreground">Allocations familiales</span><span className="text-right">{formatCHF(calc.montant_af)}</span>
                  </div>
                  <div className="p-3 bg-muted rounded-lg mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Coût total employeur</span>
                      <span>{formatCHF(calc.cout_total_employeur)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Statut</Label>
                <Select value={watch('statut') || 'brouillon'} onValueChange={(v) => setValue('statut', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brouillon">Brouillon</SelectItem>
                    <SelectItem value="valide">Validé</SelectItem>
                    <SelectItem value="paye">Payé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input {...register('notes')} /></div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={mutation.isPending || !selectedEmployeId}>
                {mutation.isPending ? 'Enregistrement...' : fiche ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

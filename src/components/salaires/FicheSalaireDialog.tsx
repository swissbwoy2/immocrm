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
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { calculateSalary, formatCHF, MOIS_LABELS, isSubjectToSourceTax, DEFAULT_EMPLOYEE_RATES } from '@/lib/swissPayroll';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fiche: any | null;
  employes: { id: string; prenom: string; nom: string }[];
  defaultMonth: number;
  defaultYear: number;
}

export default function FicheSalaireDialog({ open, onOpenChange, fiche, employes, defaultMonth, defaultYear }: Props) {
  const queryClient = useQueryClient();
  const [selectedEmployeId, setSelectedEmployeId] = useState<string>('');
  const { register, handleSubmit, setValue, watch, reset } = useForm();

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

  // Pre-fill when employee loaded
  useEffect(() => {
    if (employeData && !fiche) {
      setValue('salaire_base', employeData.salaire_mensuel || 0);
      setValue('taux_avs', DEFAULT_EMPLOYEE_RATES.avs);
      setValue('taux_ac', DEFAULT_EMPLOYEE_RATES.ac);
      setValue('taux_aanp', DEFAULT_EMPLOYEE_RATES.aanp);
      setValue('taux_ijm', DEFAULT_EMPLOYEE_RATES.ijm);
      setValue('taux_lpcfam', DEFAULT_EMPLOYEE_RATES.lpcfam);
      setValue('montant_lpp', 0);
      setValue('taux_impot_source', 0);
    }
  }, [employeData, fiche, setValue]);

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
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        employe_id: selectedEmployeId,
        mois: Number(data.mois),
        annee: Number(data.annee),
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
        // Employer charges
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
          <DialogTitle>{fiche ? 'Modifier la fiche' : 'Nouvelle fiche de salaire'}</DialogTitle>
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

            {/* Gross salary components */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Composants du salaire</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Salaire de base</Label><Input type="number" step="0.05" {...register('salaire_base')} /></div>
                <div><Label>Absences payées (SH)</Label><Input type="number" step="0.05" {...register('absences_payees')} /></div>
                <div><Label>Heures supplémentaires</Label><Input type="number" step="0.05" {...register('heures_supplementaires')} /></div>
                <div><Label>Primes / Bonus</Label><Input type="number" step="0.05" {...register('primes')} /></div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between font-semibold">
                  <span>Salaire brut</span>
                  <span>{formatCHF(calc.salaire_brut)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Deductions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Déductions employé</h3>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Taux AVS/AI/APG (%)</Label><Input type="number" step="0.01" {...register('taux_avs')} /></div>
                <div className="col-span-2 flex items-end"><span className="text-sm text-muted-foreground pb-2">= {formatCHF(calc.montant_avs)}</span></div>
                
                <div><Label>Taux AC (%)</Label><Input type="number" step="0.01" {...register('taux_ac')} /></div>
                <div className="col-span-2 flex items-end"><span className="text-sm text-muted-foreground pb-2">= {formatCHF(calc.montant_ac)}</span></div>
                
                <div><Label>Taux AANP (%)</Label><Input type="number" step="0.01" {...register('taux_aanp')} /></div>
                <div className="col-span-2 flex items-end"><span className="text-sm text-muted-foreground pb-2">= {formatCHF(calc.montant_aanp)}</span></div>
                
                <div><Label>Taux IJM (%)</Label><Input type="number" step="0.01" {...register('taux_ijm')} /></div>
                <div className="col-span-2 flex items-end"><span className="text-sm text-muted-foreground pb-2">= {formatCHF(calc.montant_ijm)}</span></div>
                
                <div><Label>Taux LPCFam (%)</Label><Input type="number" step="0.01" {...register('taux_lpcfam')} /></div>
                <div className="col-span-2 flex items-end"><span className="text-sm text-muted-foreground pb-2">= {formatCHF(calc.montant_lpcfam)}</span></div>
                
                <div><Label>LPP fixe (CHF)</Label><Input type="number" step="0.05" {...register('montant_lpp')} /></div>
                <div className="col-span-2" />
              </div>

              {needsIS && (
                <div className="p-3 border border-destructive/30 rounded-lg bg-destructive/5">
                  <Label className="text-destructive">Taux impôt à la source (%)</Label>
                  <Input type="number" step="0.01" {...register('taux_impot_source')} className="mt-1" />
                  <p className="text-xs text-destructive mt-1">
                    Permis {employeData?.type_permis} — Barème: {employeData?.bareme_impot_source || 'Non défini'}
                    {' '}→ {formatCHF(calc.montant_impot_source)}
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

            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex justify-between text-lg font-bold">
                <span>Salaire net</span>
                <span>{formatCHF(calc.salaire_net)}</span>
              </div>
            </div>

            <Separator />

            {/* Employer charges summary */}
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

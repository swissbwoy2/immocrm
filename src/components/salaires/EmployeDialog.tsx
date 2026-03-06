import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { BAREMES_IMPOT_SOURCE, CANTONS, isSubjectToSourceTax } from '@/lib/swissPayroll';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmployeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employe: any | null;
}

const NATIONALITES = ['Suisse', 'France', 'Italie', 'Allemagne', 'Portugal', 'Espagne', 'Autre'];
const PERMIS = [
  { value: 'Suisse', label: 'Suisse (pas de permis)' },
  { value: 'B', label: 'B - Séjour' },
  { value: 'C', label: 'C - Établissement' },
  { value: 'F', label: 'F - Admission provisoire' },
  { value: 'G', label: 'G - Frontalier' },
  { value: 'L', label: 'L - Séjour de courte durée' },
  { value: 'N', label: 'N - Requérant d\'asile' },
];
const ETATS_CIVILS = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve', 'Séparé(e)'];

export default function EmployeDialog({ open, onOpenChange, employe }: EmployeDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      prenom: '', nom: '', email: '', telephone: '', adresse: '', code_postal: '', ville: '',
      date_naissance: '', nationalite: 'Suisse', type_permis: 'Suisse', etat_civil: 'Célibataire',
      nombre_enfants: 0, avs_number: '', iban: '', banque: '',
      date_engagement: '', taux_activite: 100, salaire_mensuel: 0, salaire_horaire: 0,
      type_contrat: 'fixe', poste: '', canton_travail: 'VD', canton_domicile: 'VD',
      bareme_impot_source: '', is_independant: false, statut: 'actif', notes: '',
    },
  });

  const typePermis = watch('type_permis');
  const isIndependant = watch('is_independant');
  const needsSourceTax = isSubjectToSourceTax(typePermis);

  useEffect(() => {
    if (employe) {
      Object.entries(employe).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          setValue(key as any, value);
        }
      });
    } else {
      reset();
    }
  }, [employe, setValue, reset]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Clean numeric fields
      const cleaned = {
        ...data,
        nombre_enfants: Number(data.nombre_enfants) || 0,
        taux_activite: Number(data.taux_activite) || 100,
        salaire_mensuel: Number(data.salaire_mensuel) || 0,
        salaire_horaire: Number(data.salaire_horaire) || null,
      };

      if (employe?.id) {
        const { error } = await supabase.from('employes').update(cleaned).eq('id', employe.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employes').insert(cleaned);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employes'] });
      toast.success(employe ? 'Employé modifié' : 'Employé ajouté');
      onOpenChange(false);
    },
    onError: (e) => toast.error('Erreur: ' + (e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{employe ? 'Modifier l\'employé' : 'Nouvel employé'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
            {/* Identity */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Identité</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prénom *</Label><Input {...register('prenom', { required: true })} /></div>
                <div><Label>Nom *</Label><Input {...register('nom', { required: true })} /></div>
                <div><Label>Email</Label><Input type="email" {...register('email')} /></div>
                <div><Label>Téléphone</Label><Input {...register('telephone')} /></div>
                <div><Label>Date de naissance</Label><Input type="date" {...register('date_naissance')} /></div>
                <div><Label>N° AVS</Label><Input placeholder="756.XXXX.XXXX.XX" {...register('avs_number')} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Adresse</Label><Input {...register('adresse')} /></div>
                <div><Label>Code postal</Label><Input {...register('code_postal')} /></div>
                <div><Label>Ville</Label><Input {...register('ville')} /></div>
              </div>
            </div>

            {/* Permit & Tax */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Permis & fiscalité</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nationalité</Label>
                  <Select value={watch('nationalite')} onValueChange={(v) => setValue('nationalite', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NATIONALITES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type de permis</Label>
                  <Select value={typePermis} onValueChange={(v) => setValue('type_permis', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERMIS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>État civil</Label>
                  <Select value={watch('etat_civil')} onValueChange={(v) => setValue('etat_civil', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ETATS_CIVILS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nombre d'enfants</Label><Input type="number" min="0" {...register('nombre_enfants')} /></div>
                <div>
                  <Label>Canton domicile</Label>
                  <Select value={watch('canton_domicile')} onValueChange={(v) => setValue('canton_domicile', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CANTONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Canton travail</Label>
                  <Select value={watch('canton_travail')} onValueChange={(v) => setValue('canton_travail', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CANTONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {needsSourceTax && (
                <div>
                  <Label>Barème impôt à la source</Label>
                  <Select value={watch('bareme_impot_source')} onValueChange={(v) => setValue('bareme_impot_source', v)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner le barème" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(BAREMES_IMPOT_SOURCE).map(([code, label]) => (
                        <SelectItem key={code} value={code}>{code} - {label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-destructive mt-1">⚠ Permis {typePermis}: soumis à l'impôt à la source</p>
                </div>
              )}
            </div>

            {/* Employment */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Emploi</h3>
              <div className="flex items-center gap-3">
                <Switch checked={isIndependant} onCheckedChange={(v) => setValue('is_independant', v)} />
                <Label>Agent indépendant (décompte honoraires)</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Poste</Label><Input {...register('poste')} /></div>
                <div>
                  <Label>Type de contrat</Label>
                  <Select value={watch('type_contrat')} onValueChange={(v) => setValue('type_contrat', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixe">Fixe (mensuel)</SelectItem>
                      <SelectItem value="horaire">Horaire</SelectItem>
                      <SelectItem value="independant">Indépendant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Date d'engagement</Label><Input type="date" {...register('date_engagement')} /></div>
                <div><Label>Taux d'activité (%)</Label><Input type="number" min="0" max="100" {...register('taux_activite')} /></div>
                <div><Label>Salaire mensuel (CHF)</Label><Input type="number" step="0.05" {...register('salaire_mensuel')} /></div>
                <div><Label>Salaire horaire (CHF)</Label><Input type="number" step="0.05" {...register('salaire_horaire')} /></div>
              </div>
            </div>

            {/* Bank */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Coordonnées bancaires</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>IBAN</Label><Input placeholder="CH..." {...register('iban')} /></div>
                <div><Label>Banque</Label><Input {...register('banque')} /></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Enregistrement...' : employe ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

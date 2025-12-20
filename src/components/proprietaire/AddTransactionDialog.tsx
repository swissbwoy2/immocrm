import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  immeubleId?: string;
  onSuccess?: () => void;
}

interface FormData {
  immeuble_id: string;
  lot_id: string;
  locataire_id: string;
  categorie: string;
  sous_categorie: string;
  libelle: string;
  date_transaction: string;
  montant: string;
  tiers_nom: string;
  numero_facture: string;
  mode_paiement: string;
  notes: string;
}

const CATEGORIES = [
  { value: 'recette', label: 'Recette', icon: TrendingUp, color: 'text-emerald-600' },
  { value: 'charge_courante', label: 'Charge courante', icon: TrendingDown, color: 'text-destructive' },
  { value: 'charge_entretien', label: 'Entretien', icon: TrendingDown, color: 'text-destructive' },
  { value: 'charge_financiere', label: 'Charge financière', icon: TrendingDown, color: 'text-destructive' },
  { value: 'investissement', label: 'Investissement', icon: TrendingDown, color: 'text-destructive' },
];

const SOUS_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  recette: [
    { value: 'loyer', label: 'Loyer' },
    { value: 'charges_locatives', label: 'Charges locatives' },
    { value: 'parking', label: 'Parking' },
    { value: 'depot_garantie', label: 'Dépôt de garantie' },
    { value: 'autre_recette', label: 'Autre recette' },
  ],
  charge_courante: [
    { value: 'eau', label: 'Eau' },
    { value: 'electricite', label: 'Électricité' },
    { value: 'gaz', label: 'Gaz' },
    { value: 'chauffage', label: 'Chauffage' },
    { value: 'assurance', label: 'Assurance' },
    { value: 'conciergerie', label: 'Conciergerie' },
    { value: 'impots', label: 'Impôts fonciers' },
    { value: 'gerance', label: 'Frais de gérance' },
  ],
  charge_entretien: [
    { value: 'reparation', label: 'Réparation' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'jardinage', label: 'Jardinage' },
    { value: 'nettoyage', label: 'Nettoyage' },
    { value: 'travaux', label: 'Travaux' },
  ],
  charge_financiere: [
    { value: 'interets_hypothecaires', label: 'Intérêts hypothécaires' },
    { value: 'amortissement', label: 'Amortissement' },
    { value: 'frais_bancaires', label: 'Frais bancaires' },
  ],
  investissement: [
    { value: 'renovation', label: 'Rénovation' },
    { value: 'amelioration', label: 'Amélioration' },
    { value: 'equipement', label: 'Équipement' },
  ],
};

const MODES_PAIEMENT = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'carte', label: 'Carte bancaire' },
  { value: 'especes', label: 'Espèces' },
  { value: 'prelevement', label: 'Prélèvement' },
];

export function AddTransactionDialog({
  open,
  onOpenChange,
  immeubleId,
  onSuccess,
}: AddTransactionDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [locataires, setLocataires] = useState<any[]>([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      immeuble_id: immeubleId || '',
      lot_id: '',
      locataire_id: '',
      categorie: 'recette',
      sous_categorie: '',
      libelle: '',
      date_transaction: new Date().toISOString().split('T')[0],
      montant: '',
      tiers_nom: '',
      numero_facture: '',
      mode_paiement: 'virement',
      notes: '',
    },
  });

  const selectedImmeubleId = watch('immeuble_id');
  const selectedCategorie = watch('categorie');
  const selectedLotId = watch('lot_id');

  const isRecette = selectedCategorie === 'recette';

  // Load immeubles on mount
  useEffect(() => {
    const loadImmeubles = async () => {
      if (!user) return;

      const { data: proprio } = await supabase
        .from('proprietaires')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!proprio) return;

      const { data } = await supabase
        .from('immeubles')
        .select('id, nom')
        .eq('proprietaire_id', proprio.id)
        .order('nom');

      setImmeubles(data || []);
    };

    if (open) {
      loadImmeubles();
    }
  }, [open, user]);

  // Load lots when immeuble changes
  useEffect(() => {
    const loadLots = async () => {
      if (!selectedImmeubleId) {
        setLots([]);
        setLocataires([]);
        return;
      }

      const { data } = await supabase
        .from('lots')
        .select('id, reference, designation')
        .eq('immeuble_id', selectedImmeubleId)
        .order('reference');

      setLots(data || []);
    };

    loadLots();
  }, [selectedImmeubleId]);

  // Load locataires when lot changes
  useEffect(() => {
    const loadLocataires = async () => {
      if (!selectedLotId) {
        setLocataires([]);
        return;
      }

      const { data } = await supabase
        .from('locataires_immeuble')
        .select('id, nom, prenom')
        .eq('lot_id', selectedLotId)
        .eq('statut', 'actif')
        .order('nom');

      setLocataires(data || []);
    };

    loadLocataires();
  }, [selectedLotId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        immeuble_id: immeubleId || '',
        lot_id: '',
        locataire_id: '',
        categorie: 'recette',
        sous_categorie: '',
        libelle: '',
        date_transaction: new Date().toISOString().split('T')[0],
        montant: '',
        tiers_nom: '',
        numero_facture: '',
        mode_paiement: 'virement',
        notes: '',
      });
    }
  }, [open, immeubleId, reset]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const montant = parseFloat(data.montant);
      
      const insertData: any = {
        immeuble_id: data.immeuble_id,
        lot_id: data.lot_id || null,
        locataire_id: data.locataire_id || null,
        categorie: data.categorie,
        sous_categorie: data.sous_categorie || null,
        libelle: data.libelle,
        date_transaction: data.date_transaction,
        tiers_nom: data.tiers_nom || null,
        numero_facture: data.numero_facture || null,
        mode_paiement: data.mode_paiement || null,
        notes: data.notes || null,
        statut: 'comptabilise',
      };

      // Set debit or credit based on category
      if (isRecette) {
        insertData.credit = montant;
        insertData.debit = 0;
      } else {
        insertData.debit = montant;
        insertData.credit = 0;
      }

      const { error } = await supabase
        .from('transactions_comptables')
        .insert(insertData);

      if (error) throw error;

      toast.success('Écriture comptable ajoutée');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const availableSousCategories = SOUS_CATEGORIES[selectedCategorie] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Nouvelle écriture comptable
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Immeuble */}
          <div className="space-y-2">
            <Label>Immeuble *</Label>
            <Select
              value={selectedImmeubleId}
              onValueChange={(v) => {
                setValue('immeuble_id', v);
                setValue('lot_id', '');
                setValue('locataire_id', '');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un immeuble" />
              </SelectTrigger>
              <SelectContent>
                {immeubles.map((imm) => (
                  <SelectItem key={imm.id} value={imm.id}>
                    {imm.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lot & Locataire */}
          {lots.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lot</Label>
                <Select
                  value={watch('lot_id')}
                  onValueChange={(v) => {
                    setValue('lot_id', v);
                    setValue('locataire_id', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Général</SelectItem>
                    {lots.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.reference || lot.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {locataires.length > 0 && (
                <div className="space-y-2">
                  <Label>Locataire</Label>
                  <Select
                    value={watch('locataire_id')}
                    onValueChange={(v) => setValue('locataire_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Locataire" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-</SelectItem>
                      {locataires.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.prenom} {loc.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Catégorie & Sous-catégorie */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={selectedCategorie}
                onValueChange={(v) => {
                  setValue('categorie', v);
                  setValue('sous_categorie', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className={cat.color}>{cat.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sous-catégorie</Label>
              <Select
                value={watch('sous_categorie')}
                onValueChange={(v) => setValue('sous_categorie', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSousCategories.map((sc) => (
                    <SelectItem key={sc.value} value={sc.value}>
                      {sc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Libellé */}
          <div className="space-y-2">
            <Label htmlFor="libelle">Libellé *</Label>
            <Input
              id="libelle"
              placeholder="Ex: Loyer janvier 2024"
              {...register('libelle', { required: 'Le libellé est obligatoire' })}
            />
            {errors.libelle && (
              <p className="text-sm text-destructive">{errors.libelle.message}</p>
            )}
          </div>

          {/* Date & Montant */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                {...register('date_transaction', { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="montant">
                Montant (CHF) * {isRecette ? '(crédit)' : '(débit)'}
              </Label>
              <Input
                id="montant"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className={isRecette ? 'text-emerald-600' : 'text-destructive'}
                {...register('montant', { required: 'Le montant est obligatoire' })}
              />
              {errors.montant && (
                <p className="text-sm text-destructive">{errors.montant.message}</p>
              )}
            </div>
          </div>

          {/* Tiers & Facture */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tiers">Tiers</Label>
              <Input
                id="tiers"
                placeholder="Nom du tiers"
                {...register('tiers_nom')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facture">N° facture</Label>
              <Input
                id="facture"
                placeholder="N° facture"
                {...register('numero_facture')}
              />
            </div>
          </div>

          {/* Mode paiement */}
          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <Select
              value={watch('mode_paiement')}
              onValueChange={(v) => setValue('mode_paiement', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES_PAIEMENT.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Notes complémentaires..."
              rows={2}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !selectedImmeubleId}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

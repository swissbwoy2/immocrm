import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Wrench, Camera, X } from 'lucide-react';
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

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  immeubleId?: string;
  onSuccess?: () => void;
}

interface FormData {
  titre: string;
  description: string;
  immeuble_id: string;
  lot_id: string;
  priorite: string;
  categorie: string;
  fournisseur_nom: string;
  montant_devis: string;
  date_intervention_prevue: string;
}

const CATEGORIES = [
  { value: 'plomberie', label: 'Plomberie' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'chauffage', label: 'Chauffage' },
  { value: 'ventilation', label: 'Ventilation' },
  { value: 'toiture', label: 'Toiture' },
  { value: 'facade', label: 'Façade' },
  { value: 'parties_communes', label: 'Parties communes' },
  { value: 'serrurerie', label: 'Serrurerie' },
  { value: 'autre', label: 'Autre' },
];

const PRIORITES = [
  { value: 'urgente', label: 'Urgente', color: 'text-destructive' },
  { value: 'haute', label: 'Haute', color: 'text-orange-600' },
  { value: 'normale', label: 'Normale', color: 'text-muted-foreground' },
  { value: 'basse', label: 'Basse', color: 'text-muted-foreground' },
];

export function CreateTicketDialog({
  open,
  onOpenChange,
  immeubleId,
  onSuccess,
}: CreateTicketDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      titre: '',
      description: '',
      immeuble_id: immeubleId || '',
      lot_id: '',
      priorite: 'normale',
      categorie: '',
      fournisseur_nom: '',
      montant_devis: '',
      date_intervention_prevue: '',
    },
  });

  const selectedImmeubleId = watch('immeuble_id');

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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        titre: '',
        description: '',
        immeuble_id: immeubleId || '',
        lot_id: '',
        priorite: 'normale',
        categorie: '',
        fournisseur_nom: '',
        montant_devis: '',
        date_intervention_prevue: '',
      });
    }
  }, [open, immeubleId, reset]);

  const generateNumeroTicket = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TK-${dateStr}-${randomNum}`;
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('tickets_techniques').insert({
        immeuble_id: data.immeuble_id,
        lot_id: data.lot_id || null,
        titre: data.titre,
        description: data.description || null,
        priorite: data.priorite,
        categorie: data.categorie || null,
        fournisseur_nom: data.fournisseur_nom || null,
        montant_devis: data.montant_devis ? parseFloat(data.montant_devis) : null,
        date_intervention_prevue: data.date_intervention_prevue || null,
        numero_ticket: generateNumeroTicket(),
        statut: 'nouveau',
        cree_par: user.id,
      });

      if (error) throw error;

      toast.success('Ticket créé avec succès');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast.error(error.message || 'Erreur lors de la création du ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            Nouveau ticket technique
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Immeuble */}
          <div className="space-y-2">
            <Label htmlFor="immeuble">Immeuble *</Label>
            <Select
              value={selectedImmeubleId}
              onValueChange={(v) => {
                setValue('immeuble_id', v);
                setValue('lot_id', '');
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

          {/* Lot */}
          {lots.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="lot">Lot (optionnel)</Label>
              <Select
                value={watch('lot_id')}
                onValueChange={(v) => setValue('lot_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un lot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Parties communes</SelectItem>
                  {lots.map((lot) => (
                    <SelectItem key={lot.id} value={lot.id}>
                      {lot.reference || lot.designation || 'Lot sans référence'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              placeholder="Ex: Fuite d'eau salle de bain"
              {...register('titre', { required: 'Le titre est obligatoire' })}
            />
            {errors.titre && (
              <p className="text-sm text-destructive">{errors.titre.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le problème en détail..."
              rows={3}
              {...register('description')}
            />
          </div>

          {/* Catégorie & Priorité */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={watch('categorie')}
                onValueChange={(v) => setValue('categorie', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priorité *</Label>
              <Select
                value={watch('priorite')}
                onValueChange={(v) => setValue('priorite', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={p.color}>{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fournisseur & Devis */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fournisseur">Fournisseur</Label>
              <Input
                id="fournisseur"
                placeholder="Nom du prestataire"
                {...register('fournisseur_nom')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="devis">Montant devis (CHF)</Label>
              <Input
                id="devis"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('montant_devis')}
              />
            </div>
          </div>

          {/* Date intervention */}
          <div className="space-y-2">
            <Label htmlFor="date_intervention">Date d'intervention prévue</Label>
            <Input
              id="date_intervention"
              type="datetime-local"
              {...register('date_intervention_prevue')}
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
              {loading ? 'Création...' : 'Créer le ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

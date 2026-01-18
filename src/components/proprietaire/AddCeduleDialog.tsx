import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { FileCheck } from 'lucide-react';
import { format } from 'date-fns';

interface AddCeduleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hypothequeId?: string;
  preselectedImmeubleId?: string;
  preselectedHypothequeId?: string;
}

export function AddCeduleDialog({ open, onClose, onSuccess, hypothequeId, preselectedImmeubleId, preselectedHypothequeId }: AddCeduleDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [hypotheques, setHypotheques] = useState<any[]>([]);
  
  // Form state
  const [immeubleId, setImmeubleId] = useState(preselectedImmeubleId || '');
  const [selectedHypothequeId, setSelectedHypothequeId] = useState(preselectedHypothequeId || hypothequeId || '');
  const [numeroCedule, setNumeroCedule] = useState('');
  const [typeCedule, setTypeCedule] = useState('registre');
  const [rang, setRang] = useState('1');
  const [montant, setMontant] = useState('');
  const [dateCreation, setDateCreation] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [lieuDepot, setLieuDepot] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  useEffect(() => {
    if (preselectedHypothequeId || hypothequeId) {
      setSelectedHypothequeId(preselectedHypothequeId || hypothequeId || '');
    }
    if (preselectedImmeubleId) {
      setImmeubleId(preselectedImmeubleId);
    }
  }, [hypothequeId, preselectedHypothequeId, preselectedImmeubleId]);

  const loadData = async () => {
    try {
      const { data: proprio } = await supabase
        .from('proprietaires')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (!proprio) return;

      // Load immeubles
      const { data: immeublesData } = await supabase
        .from('immeubles')
        .select('id, nom, adresse')
        .eq('proprietaire_id', proprio.id)
        .order('nom');

      setImmeubles(immeublesData || []);

      // Load hypotheques
      const immeubleIds = (immeublesData || []).map(i => i.id);
      if (immeubleIds.length > 0) {
        const { data: hypData } = await supabase
          .from('hypotheques')
          .select('id, creancier, montant_initial, immeuble:immeubles(nom)')
          .in('immeuble_id', immeubleIds);

        setHypotheques(hypData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async () => {
    if (!immeubleId || !montant) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('cedules_hypothecaires').insert({
        immeuble_id: immeubleId,
        hypotheque_id: selectedHypothequeId || null,
        numero_cedule: numeroCedule || null,
        type_cedule: typeCedule,
        rang: parseInt(rang) || 1,
        montant: parseFloat(montant),
        date_creation: dateCreation || null,
        lieu_depot: lieuDepot || null,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success('Cédule hypothécaire créée avec succès');
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating cedule:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImmeubleId(preselectedImmeubleId || '');
    setSelectedHypothequeId(preselectedHypothequeId || hypothequeId || '');
    setNumeroCedule('');
    setTypeCedule('registre');
    setRang('1');
    setMontant('');
    setDateCreation(format(new Date(), 'yyyy-MM-dd'));
    setLieuDepot('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Nouvelle cédule hypothécaire
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Immeuble selection */}
          <div className="grid gap-2">
            <Label htmlFor="immeuble">Bien immobilier *</Label>
            <Select value={immeubleId} onValueChange={setImmeubleId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un bien" />
              </SelectTrigger>
              <SelectContent>
                {immeubles.map((imm) => (
                  <SelectItem key={imm.id} value={imm.id}>
                    {imm.nom} - {imm.adresse}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hypothèque liée (optionnel) */}
          <div className="grid gap-2">
            <Label htmlFor="hypotheque">Hypothèque liée (optionnel)</Label>
            <Select value={selectedHypothequeId} onValueChange={setSelectedHypothequeId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une hypothèque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucune</SelectItem>
                {hypotheques.map((hyp) => (
                  <SelectItem key={hyp.id} value={hyp.id}>
                    {hyp.creancier} - CHF {hyp.montant_initial?.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Numéro et type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="numeroCedule">Numéro de cédule</Label>
              <Input
                id="numeroCedule"
                placeholder="CED-001"
                value={numeroCedule}
                onChange={(e) => setNumeroCedule(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="typeCedule">Type de cédule</Label>
              <Select value={typeCedule} onValueChange={setTypeCedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registre">Cédule de registre</SelectItem>
                  <SelectItem value="papier">Cédule papier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rang et montant */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rang">Rang</Label>
              <Select value={rang} onValueChange={setRang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1er rang</SelectItem>
                  <SelectItem value="2">2ème rang</SelectItem>
                  <SelectItem value="3">3ème rang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="montant">Montant (CHF) *</Label>
              <Input
                type="number"
                id="montant"
                placeholder="500000"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
              />
            </div>
          </div>

          {/* Date et lieu */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dateCreation">Date de création</Label>
              <Input
                type="date"
                id="dateCreation"
                value={dateCreation}
                onChange={(e) => setDateCreation(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lieuDepot">Lieu de dépôt</Label>
              <Input
                id="lieuDepot"
                placeholder="Registre foncier de..."
                value={lieuDepot}
                onChange={(e) => setLieuDepot(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Informations complémentaires..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer la cédule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

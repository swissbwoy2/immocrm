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
import { Landmark } from 'lucide-react';
import { format } from 'date-fns';

interface AddHypothequeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddHypothequeDialog({ open, onClose, onSuccess }: AddHypothequeDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  
  // Form state
  const [immeubleId, setImmeubleId] = useState('');
  const [creancier, setCreancier] = useState('');
  const [numeroPret, setNumeroPret] = useState('');
  const [rang, setRang] = useState('1');
  const [montantInitial, setMontantInitial] = useState('');
  const [montantActuel, setMontantActuel] = useState('');
  const [tauxInteret, setTauxInteret] = useState('');
  const [typeTaux, setTypeTaux] = useState('fixe');
  const [margeSaron, setMargeSaron] = useState('');
  const [dateDebut, setDateDebut] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateFin, setDateFin] = useState('');
  const [dateProchaineEcheance, setDateProchaineEcheance] = useState('');
  const [typeAmortissement, setTypeAmortissement] = useState('direct');
  const [montantAmortissement, setMontantAmortissement] = useState('');
  const [periodiciteAmortissement, setPeriodiciteAmortissement] = useState('annuel');
  const [compte3a, setCompte3a] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && user) {
      loadImmeubles();
    }
  }, [open, user]);

  const loadImmeubles = async () => {
    try {
      const { data: proprio } = await supabase
        .from('proprietaires')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (!proprio) return;

      const { data } = await supabase
        .from('immeubles')
        .select('id, nom, adresse')
        .eq('proprietaire_id', proprio.id)
        .order('nom');

      setImmeubles(data || []);
    } catch (error) {
      console.error('Error loading immeubles:', error);
    }
  };

  const handleSubmit = async () => {
    if (!immeubleId || !creancier || !montantInitial) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const montant = parseFloat(montantInitial) || 0;

      const { error } = await (supabase.from('hypotheques') as any).insert({
        immeuble_id: immeubleId,
        creancier,
        numero_pret: numeroPret || null,
        rang: parseInt(rang) || 1,
        montant_initial: montant,
        montant_actuel: parseFloat(montantActuel) || montant,
        taux_interet: parseFloat(tauxInteret) || null,
        type_taux: typeTaux,
        marge_saron: typeTaux === 'saron' ? parseFloat(margeSaron) || null : null,
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
        date_prochaine_echeance: dateProchaineEcheance || null,
        type_amortissement: typeAmortissement,
        montant_amortissement: parseFloat(montantAmortissement) || null,
        periodicite_amortissement: periodiciteAmortissement,
        compte_3a_lie: compte3a || null,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success('Hypothèque créée avec succès');
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating hypotheque:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImmeubleId('');
    setCreancier('');
    setNumeroPret('');
    setRang('1');
    setMontantInitial('');
    setMontantActuel('');
    setTauxInteret('');
    setTypeTaux('fixe');
    setMargeSaron('');
    setDateDebut(format(new Date(), 'yyyy-MM-dd'));
    setDateFin('');
    setDateProchaineEcheance('');
    setTypeAmortissement('direct');
    setMontantAmortissement('');
    setPeriodiciteAmortissement('annuel');
    setCompte3a('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            Nouvelle hypothèque
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

          {/* Créancier et numéro */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="creancier">Créancier (banque) *</Label>
              <Input
                id="creancier"
                placeholder="UBS, Credit Suisse, etc."
                value={creancier}
                onChange={(e) => setCreancier(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="numeroPret">Numéro de prêt</Label>
              <Input
                id="numeroPret"
                placeholder="12345678"
                value={numeroPret}
                onChange={(e) => setNumeroPret(e.target.value)}
              />
            </div>
          </div>

          {/* Rang et montants */}
          <div className="grid grid-cols-3 gap-4">
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
              <Label htmlFor="montantInitial">Montant initial (CHF) *</Label>
              <Input
                type="number"
                id="montantInitial"
                placeholder="500000"
                value={montantInitial}
                onChange={(e) => setMontantInitial(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="montantActuel">Montant actuel (CHF)</Label>
              <Input
                type="number"
                id="montantActuel"
                placeholder="480000"
                value={montantActuel}
                onChange={(e) => setMontantActuel(e.target.value)}
              />
            </div>
          </div>

          {/* Taux */}
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="typeTaux">Type de taux</Label>
              <Select value={typeTaux} onValueChange={setTypeTaux}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixe">Fixe</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                  <SelectItem value="saron">SARON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tauxInteret">Taux d'intérêt (%)</Label>
              <Input
                type="number"
                step="0.01"
                id="tauxInteret"
                placeholder="1.50"
                value={tauxInteret}
                onChange={(e) => setTauxInteret(e.target.value)}
              />
            </div>
            {typeTaux === 'saron' && (
              <div className="grid gap-2">
                <Label htmlFor="margeSaron">Marge SARON (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="margeSaron"
                  placeholder="0.80"
                  value={margeSaron}
                  onChange={(e) => setMargeSaron(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dateDebut">Date de début</Label>
              <Input
                type="date"
                id="dateDebut"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateFin">Date de fin</Label>
              <Input
                type="date"
                id="dateFin"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateProchaineEcheance">Prochaine échéance</Label>
              <Input
                type="date"
                id="dateProchaineEcheance"
                value={dateProchaineEcheance}
                onChange={(e) => setDateProchaineEcheance(e.target.value)}
              />
            </div>
          </div>

          {/* Amortissement */}
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="typeAmortissement">Type d'amortissement</Label>
              <Select value={typeAmortissement} onValueChange={setTypeAmortissement}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="indirect">Indirect (3a)</SelectItem>
                  <SelectItem value="aucun">Aucun</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="montantAmortissement">Montant amortissement</Label>
              <Input
                type="number"
                id="montantAmortissement"
                placeholder="10000"
                value={montantAmortissement}
                onChange={(e) => setMontantAmortissement(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="periodiciteAmortissement">Périodicité</Label>
              <Select value={periodiciteAmortissement} onValueChange={setPeriodiciteAmortissement}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensuel">Mensuel</SelectItem>
                  <SelectItem value="trimestriel">Trimestriel</SelectItem>
                  <SelectItem value="annuel">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Compte 3a (si indirect) */}
          {typeAmortissement === 'indirect' && (
            <div className="grid gap-2">
              <Label htmlFor="compte3a">Compte 3a lié</Label>
              <Input
                id="compte3a"
                placeholder="Numéro ou référence du compte 3a"
                value={compte3a}
                onChange={(e) => setCompte3a(e.target.value)}
              />
            </div>
          )}

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
            {loading ? 'Création...' : 'Créer l\'hypothèque'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

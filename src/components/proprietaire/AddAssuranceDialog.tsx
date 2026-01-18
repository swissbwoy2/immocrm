import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';
import { format } from 'date-fns';

interface AddAssuranceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPES_ASSURANCE = [
  'RC immeuble',
  'Incendie',
  'Dégâts des eaux',
  'Bris de glace',
  'RC propriétaire',
  'Protection juridique',
  'Dommages naturels',
  'Vol',
  'Autre',
];

const RISQUES_COUVERTS_OPTIONS = [
  'Incendie',
  'Dégâts des eaux',
  'Bris de glace',
  'Vol',
  'Vandalisme',
  'Catastrophes naturelles',
  'RC propriétaire',
  'RC locative',
  'Perte de loyers',
  'Frais de déblaiement',
];

export function AddAssuranceDialog({ open, onClose, onSuccess }: AddAssuranceDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  
  // Form state
  const [immeubleId, setImmeubleId] = useState('');
  const [assureur, setAssureur] = useState('');
  const [numeroPolice, setNumeroPolice] = useState('');
  const [typeAssurance, setTypeAssurance] = useState('');
  const [dateDebut, setDateDebut] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateFin, setDateFin] = useState('');
  const [dateProchaineEcheance, setDateProchaineEcheance] = useState('');
  const [primeAnnuelle, setPrimeAnnuelle] = useState('');
  const [franchise, setFranchise] = useState('');
  const [valeurAssuree, setValeurAssuree] = useState('');
  const [periodicitePaiement, setPeriodicitePaiement] = useState('annuel');
  const [delaiResiliationMois, setDelaiResiliationMois] = useState('3');
  const [moisResiliation, setMoisResiliation] = useState('');
  const [risquesCouverts, setRisquesCouverts] = useState<string[]>([]);
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

  const handleToggleRisque = (risque: string) => {
    setRisquesCouverts(prev => 
      prev.includes(risque) 
        ? prev.filter(r => r !== risque)
        : [...prev, risque]
    );
  };

  const handleSubmit = async () => {
    if (!immeubleId || !assureur) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('assurances_immeuble').insert({
        immeuble_id: immeubleId,
        assureur,
        numero_police: numeroPolice || null,
        type_assurance: typeAssurance || null,
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
        date_prochaine_echeance: dateProchaineEcheance || null,
        prime_annuelle: parseFloat(primeAnnuelle) || null,
        franchise: parseFloat(franchise) || null,
        valeur_assuree: parseFloat(valeurAssuree) || null,
        periodicite_paiement: periodicitePaiement,
        delai_resiliation_mois: parseInt(delaiResiliationMois) || null,
        mois_resiliation: parseInt(moisResiliation) || null,
        risques_couverts: risquesCouverts.length > 0 ? risquesCouverts : null,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success('Assurance créée avec succès');
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating assurance:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImmeubleId('');
    setAssureur('');
    setNumeroPolice('');
    setTypeAssurance('');
    setDateDebut(format(new Date(), 'yyyy-MM-dd'));
    setDateFin('');
    setDateProchaineEcheance('');
    setPrimeAnnuelle('');
    setFranchise('');
    setValeurAssuree('');
    setPeriodicitePaiement('annuel');
    setDelaiResiliationMois('3');
    setMoisResiliation('');
    setRisquesCouverts([]);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Nouvelle assurance
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

          {/* Assureur et numéro */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="assureur">Assureur *</Label>
              <Input
                id="assureur"
                placeholder="Zurich, Mobilière, etc."
                value={assureur}
                onChange={(e) => setAssureur(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="numeroPolice">Numéro de police</Label>
              <Input
                id="numeroPolice"
                placeholder="POL-123456"
                value={numeroPolice}
                onChange={(e) => setNumeroPolice(e.target.value)}
              />
            </div>
          </div>

          {/* Type d'assurance */}
          <div className="grid gap-2">
            <Label htmlFor="typeAssurance">Type d'assurance</Label>
            <Select value={typeAssurance} onValueChange={setTypeAssurance}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {TYPES_ASSURANCE.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Montants */}
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="primeAnnuelle">Prime annuelle (CHF)</Label>
              <Input
                type="number"
                id="primeAnnuelle"
                placeholder="1500"
                value={primeAnnuelle}
                onChange={(e) => setPrimeAnnuelle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="franchise">Franchise (CHF)</Label>
              <Input
                type="number"
                id="franchise"
                placeholder="500"
                value={franchise}
                onChange={(e) => setFranchise(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="valeurAssuree">Valeur assurée (CHF)</Label>
              <Input
                type="number"
                id="valeurAssuree"
                placeholder="1000000"
                value={valeurAssuree}
                onChange={(e) => setValeurAssuree(e.target.value)}
              />
            </div>
          </div>

          {/* Paiement et résiliation */}
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="periodicitePaiement">Périodicité paiement</Label>
              <Select value={periodicitePaiement} onValueChange={setPeriodicitePaiement}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensuel">Mensuel</SelectItem>
                  <SelectItem value="trimestriel">Trimestriel</SelectItem>
                  <SelectItem value="semestriel">Semestriel</SelectItem>
                  <SelectItem value="annuel">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delaiResiliationMois">Délai résiliation (mois)</Label>
              <Select value={delaiResiliationMois} onValueChange={setDelaiResiliationMois}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mois</SelectItem>
                  <SelectItem value="2">2 mois</SelectItem>
                  <SelectItem value="3">3 mois</SelectItem>
                  <SelectItem value="6">6 mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="moisResiliation">Mois de résiliation</Label>
              <Select value={moisResiliation} onValueChange={setMoisResiliation}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Janvier</SelectItem>
                  <SelectItem value="2">Février</SelectItem>
                  <SelectItem value="3">Mars</SelectItem>
                  <SelectItem value="4">Avril</SelectItem>
                  <SelectItem value="5">Mai</SelectItem>
                  <SelectItem value="6">Juin</SelectItem>
                  <SelectItem value="7">Juillet</SelectItem>
                  <SelectItem value="8">Août</SelectItem>
                  <SelectItem value="9">Septembre</SelectItem>
                  <SelectItem value="10">Octobre</SelectItem>
                  <SelectItem value="11">Novembre</SelectItem>
                  <SelectItem value="12">Décembre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Risques couverts */}
          <div className="grid gap-2">
            <Label>Risques couverts</Label>
            <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
              {RISQUES_COUVERTS_OPTIONS.map((risque) => (
                <div key={risque} className="flex items-center gap-2">
                  <Checkbox
                    id={`risque-${risque}`}
                    checked={risquesCouverts.includes(risque)}
                    onCheckedChange={() => handleToggleRisque(risque)}
                  />
                  <label
                    htmlFor={`risque-${risque}`}
                    className="text-sm cursor-pointer"
                  >
                    {risque}
                  </label>
                </div>
              ))}
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
            {loading ? 'Création...' : 'Créer l\'assurance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

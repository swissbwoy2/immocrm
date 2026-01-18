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
import { FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface AddBailDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddBailDialog({ open, onClose, onSuccess }: AddBailDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lots, setLots] = useState<any[]>([]);
  const [locataires, setLocataires] = useState<any[]>([]);
  
  // Form state
  const [lotId, setLotId] = useState('');
  const [locataireId, setLocataireId] = useState('');
  const [dateDebut, setDateDebut] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateFin, setDateFin] = useState('');
  const [loyerInitial, setLoyerInitial] = useState('');
  const [provisionsChauffage, setProvisionsChauffage] = useState('');
  const [provisionsEau, setProvisionsEau] = useState('');
  const [autresCharges, setAutresCharges] = useState('');
  const [montantGarantie, setMontantGarantie] = useState('');
  const [typeGarantie, setTypeGarantie] = useState('depot_bancaire');
  const [dureeInitiale, setDureeInitiale] = useState('1 an');
  const [preavisMois, setPreavisMois] = useState('3');
  const [clausesParticulieres, setClausesParticulieres] = useState('');
  const [statut, setStatut] = useState('actif');

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  const loadData = async () => {
    try {
      // Get proprietaire
      const { data: proprio } = await supabase
        .from('proprietaires')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (!proprio) return;

      // Get immeubles and lots
      const { data: immeubles } = await supabase
        .from('immeubles')
        .select('id, nom')
        .eq('proprietaire_id', proprio.id);

      if (immeubles && immeubles.length > 0) {
        const immeubleIds = immeubles.map(i => i.id);
        const { data: lotsData } = await supabase
          .from('lots')
          .select('id, reference, designation, immeuble_id, immeubles(nom)')
          .in('immeuble_id', immeubleIds)
          .order('reference');
        setLots(lotsData || []);

        // Get locataires
        const { data: locatairesData } = await supabase
          .from('locataires_immeuble')
          .select('id, nom, prenom')
          .in('immeuble_id', immeubleIds as string[]);
        setLocataires(locatairesData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async () => {
    if (!lotId || !dateDebut || !loyerInitial) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const loyer = parseFloat(loyerInitial) || 0;
      const chauffage = parseFloat(provisionsChauffage) || 0;
      const eau = parseFloat(provisionsEau) || 0;
      const autres = parseFloat(autresCharges) || 0;
      const totalMensuel = loyer + chauffage + eau + autres;

      const { error } = await supabase.from('baux').insert({
        lot_id: lotId,
        locataire_id: locataireId || null,
        date_debut: dateDebut,
        date_fin: dateFin || null,
        loyer_initial: loyer,
        loyer_actuel: loyer,
        provisions_chauffage: chauffage || null,
        provisions_eau: eau || null,
        autres_charges: autres || null,
        total_mensuel: totalMensuel,
        montant_garantie: parseFloat(montantGarantie) || null,
        type_garantie: typeGarantie || null,
        duree_initiale: dureeInitiale || null,
        preavis_mois: parseInt(preavisMois) || 3,
        clauses_particulieres: clausesParticulieres || null,
        statut,
      });

      if (error) throw error;

      toast.success('Bail créé avec succès');
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating bail:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLotId('');
    setLocataireId('');
    setDateDebut(format(new Date(), 'yyyy-MM-dd'));
    setDateFin('');
    setLoyerInitial('');
    setProvisionsChauffage('');
    setProvisionsEau('');
    setAutresCharges('');
    setMontantGarantie('');
    setTypeGarantie('depot_bancaire');
    setDureeInitiale('1 an');
    setPreavisMois('3');
    setClausesParticulieres('');
    setStatut('actif');
  };

  const calculTotal = () => {
    const loyer = parseFloat(loyerInitial) || 0;
    const chauffage = parseFloat(provisionsChauffage) || 0;
    const eau = parseFloat(provisionsEau) || 0;
    const autres = parseFloat(autresCharges) || 0;
    return loyer + chauffage + eau + autres;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Nouveau bail
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Lot selection */}
          <div className="grid gap-2">
            <Label htmlFor="lot">Lot *</Label>
            <Select value={lotId} onValueChange={setLotId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un lot" />
              </SelectTrigger>
              <SelectContent>
                {lots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.immeubles?.nom} - {lot.reference} {lot.designation && `(${lot.designation})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Locataire selection */}
          <div className="grid gap-2">
            <Label htmlFor="locataire">Locataire</Label>
            <Select value={locataireId} onValueChange={setLocataireId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un locataire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun</SelectItem>
                {locataires.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.prenom} {loc.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dateDebut">Date de début *</Label>
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
          </div>

          {/* Montants */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="loyerInitial">Loyer mensuel (CHF) *</Label>
              <Input
                type="number"
                id="loyerInitial"
                placeholder="1500"
                value={loyerInitial}
                onChange={(e) => setLoyerInitial(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provisionsChauffage">Provisions chauffage</Label>
              <Input
                type="number"
                id="provisionsChauffage"
                placeholder="150"
                value={provisionsChauffage}
                onChange={(e) => setProvisionsChauffage(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="provisionsEau">Provisions eau</Label>
              <Input
                type="number"
                id="provisionsEau"
                placeholder="50"
                value={provisionsEau}
                onChange={(e) => setProvisionsEau(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="autresCharges">Autres charges</Label>
              <Input
                type="number"
                id="autresCharges"
                placeholder="0"
                value={autresCharges}
                onChange={(e) => setAutresCharges(e.target.value)}
              />
            </div>
          </div>

          {/* Total calculé */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Total mensuel</p>
            <p className="text-xl font-bold text-primary">
              CHF {calculTotal().toLocaleString('fr-CH')}
            </p>
          </div>

          {/* Garantie */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="montantGarantie">Montant garantie (CHF)</Label>
              <Input
                type="number"
                id="montantGarantie"
                placeholder="4500"
                value={montantGarantie}
                onChange={(e) => setMontantGarantie(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="typeGarantie">Type de garantie</Label>
              <Select value={typeGarantie} onValueChange={setTypeGarantie}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="depot_bancaire">Dépôt bancaire</SelectItem>
                  <SelectItem value="caution_bancaire">Caution bancaire</SelectItem>
                  <SelectItem value="assurance">Assurance loyer</SelectItem>
                  <SelectItem value="garant">Garant</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Durée et préavis */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dureeInitiale">Durée initiale</Label>
              <Select value={dureeInitiale} onValueChange={setDureeInitiale}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 an">1 an</SelectItem>
                  <SelectItem value="2 ans">2 ans</SelectItem>
                  <SelectItem value="3 ans">3 ans</SelectItem>
                  <SelectItem value="5 ans">5 ans</SelectItem>
                  <SelectItem value="indeterminee">Indéterminée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="preavisMois">Préavis (mois)</Label>
              <Select value={preavisMois} onValueChange={setPreavisMois}>
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
          </div>

          {/* Statut */}
          <div className="grid gap-2">
            <Label htmlFor="statut">Statut</Label>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="resilie">Résilié</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clauses particulières */}
          <div className="grid gap-2">
            <Label htmlFor="clauses">Clauses particulières</Label>
            <Textarea
              id="clauses"
              placeholder="Conditions spéciales du bail..."
              value={clausesParticulieres}
              onChange={(e) => setClausesParticulieres(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer le bail'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, User, DollarSign, Briefcase, Home, Users, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ClientCandidate, CandidateType, CANDIDATE_TYPE_LABELS } from '@/hooks/useClientCandidates';

const TABS = ['type', 'personal', 'financial', 'professional', 'housing'] as const;
type TabValue = typeof TABS[number];

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<ClientCandidate, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => Promise<ClientCandidate | null>;
  editCandidate?: ClientCandidate | null;
}

const initialFormData = {
  type: 'garant' as CandidateType,
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  date_naissance: '',
  adresse: '',
  nationalite: '',
  type_permis: '',
  situation_familiale: '',
  gerance_actuelle: '',
  contact_gerance: '',
  loyer_actuel: '',
  depuis_le: '',
  pieces_actuel: '',
  motif_changement: '',
  profession: '',
  employeur: '',
  secteur_activite: '',
  type_contrat: '',
  source_revenus: '',
  anciennete_mois: '',
  date_engagement: '',
  revenus_mensuels: '',
  charges_mensuelles: '',
  charges_extraordinaires: false,
  montant_charges_extra: '',
  autres_credits: false,
  poursuites: false,
  curatelle: false,
  lien_avec_client: '',
};

export function AddCandidateDialog({ open, onOpenChange, onSave, editCandidate }: AddCandidateDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [activeTab, setActiveTab] = useState<TabValue>('type');

  const currentTabIndex = TABS.indexOf(activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === TABS.length - 1;

  const goToNextTab = () => {
    if (!isLastTab) {
      setActiveTab(TABS[currentTabIndex + 1]);
    }
  };

  const goToPrevTab = () => {
    if (!isFirstTab) {
      setActiveTab(TABS[currentTabIndex - 1]);
    }
  };

  useEffect(() => {
    if (open) {
      setActiveTab('type');
      if (editCandidate) {
        setFormData({
          type: editCandidate.type,
          prenom: editCandidate.prenom || '',
          nom: editCandidate.nom || '',
          email: editCandidate.email || '',
          telephone: editCandidate.telephone || '',
          date_naissance: editCandidate.date_naissance || '',
          adresse: editCandidate.adresse || '',
          nationalite: editCandidate.nationalite || '',
          type_permis: editCandidate.type_permis || '',
          situation_familiale: editCandidate.situation_familiale || '',
          gerance_actuelle: editCandidate.gerance_actuelle || '',
          contact_gerance: editCandidate.contact_gerance || '',
          loyer_actuel: editCandidate.loyer_actuel?.toString() || '',
          depuis_le: editCandidate.depuis_le || '',
          pieces_actuel: editCandidate.pieces_actuel?.toString() || '',
          motif_changement: editCandidate.motif_changement || '',
          profession: editCandidate.profession || '',
          employeur: editCandidate.employeur || '',
          secteur_activite: editCandidate.secteur_activite || '',
          type_contrat: editCandidate.type_contrat || '',
          source_revenus: editCandidate.source_revenus || '',
          anciennete_mois: editCandidate.anciennete_mois?.toString() || '',
          date_engagement: editCandidate.date_engagement || '',
          revenus_mensuels: editCandidate.revenus_mensuels?.toString() || '',
          charges_mensuelles: editCandidate.charges_mensuelles?.toString() || '',
          charges_extraordinaires: editCandidate.charges_extraordinaires || false,
          montant_charges_extra: editCandidate.montant_charges_extra?.toString() || '',
          autres_credits: editCandidate.autres_credits || false,
          poursuites: editCandidate.poursuites || false,
          curatelle: editCandidate.curatelle || false,
          lien_avec_client: editCandidate.lien_avec_client || '',
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [open, editCandidate]);

  const handleSave = async () => {
    if (!formData.prenom.trim() || !formData.nom.trim()) {
      return;
    }

    setSaving(true);
    try {
      // Convertir les strings en nombres et les dates vides en null
      const dataToSave = {
        ...formData,
        // Champs numériques
        loyer_actuel: parseFloat(formData.loyer_actuel) || 0,
        pieces_actuel: parseFloat(formData.pieces_actuel) || 0,
        anciennete_mois: parseInt(formData.anciennete_mois) || 0,
        revenus_mensuels: parseFloat(formData.revenus_mensuels) || 0,
        charges_mensuelles: parseFloat(formData.charges_mensuelles) || 0,
        montant_charges_extra: parseFloat(formData.montant_charges_extra) || 0,
        // Champs de date - convertir "" en null pour PostgreSQL
        date_naissance: formData.date_naissance || null,
        depuis_le: formData.depuis_le || null,
        date_engagement: formData.date_engagement || null,
      };
      await onSave(dataToSave as any);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {editCandidate ? 'Modifier le candidat' : 'Ajouter un candidat au dossier'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="type" className="text-xs"><Users className="w-3 h-3 mr-1" />Type</TabsTrigger>
            <TabsTrigger value="personal" className="text-xs"><User className="w-3 h-3 mr-1" />Personnel</TabsTrigger>
            <TabsTrigger value="financial" className="text-xs"><DollarSign className="w-3 h-3 mr-1" />Finances</TabsTrigger>
            <TabsTrigger value="professional" className="text-xs"><Briefcase className="w-3 h-3 mr-1" />Emploi</TabsTrigger>
            <TabsTrigger value="housing" className="text-xs"><Home className="w-3 h-3 mr-1" />Logement</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[50vh] mt-4 pr-4">
            {/* Type de candidat */}
            <TabsContent value="type" className="space-y-4 mt-0">
              <div className="space-y-4">
                <div>
                  <Label>Type de candidat *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as CandidateType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CANDIDATE_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.type === 'garant' && '⚠️ Le garant doit avoir des revenus >= 3x le loyer et pas de poursuites. Ses revenus ne cumulent PAS avec ceux du client.'}
                    {formData.type === 'colocataire' && '✅ Les revenus du colocataire sont cumulés avec ceux du client pour le calcul du budget.'}
                    {formData.type === 'co_debiteur' && '✅ Les revenus du co-débiteur sont cumulés avec ceux du client pour le calcul du budget.'}
                    {formData.type === 'signataire_solidaire' && '✅ Les revenus du signataire solidaire sont cumulés avec ceux du client pour le calcul du budget.'}
                  </p>
                </div>
                <div>
                  <Label>Lien avec le client principal</Label>
                  <Select
                    value={formData.lien_avec_client}
                    onValueChange={(value) => setFormData({ ...formData, lien_avec_client: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Conjoint(e)">Conjoint(e)</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Enfant">Enfant</SelectItem>
                      <SelectItem value="Frère/Sœur">Frère/Sœur</SelectItem>
                      <SelectItem value="Ami(e)">Ami(e)</SelectItem>
                      <SelectItem value="Collègue">Collègue</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Informations personnelles */}
            <TabsContent value="personal" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prénom *</Label>
                  <Input
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nom *</Label>
                  <Input
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    placeholder="+41 XX XXX XX XX"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de naissance</Label>
                  <Input
                    type="date"
                    value={formData.date_naissance}
                    onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Input
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nationalité</Label>
                  <Input
                    value={formData.nationalite}
                    onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                    placeholder="Suisse, France, etc."
                  />
                </div>
                <div>
                  <Label>Type de permis</Label>
                  <Select
                    value={formData.type_permis}
                    onValueChange={(value) => setFormData({ ...formData, type_permis: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Suisse">Suisse</SelectItem>
                      <SelectItem value="Permis B">Permis B</SelectItem>
                      <SelectItem value="Permis C">Permis C</SelectItem>
                      <SelectItem value="Permis L">Permis L</SelectItem>
                      <SelectItem value="Permis G">Permis G</SelectItem>
                      <SelectItem value="Permis F">Permis F</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Situation familiale</Label>
                <Select
                  value={formData.situation_familiale}
                  onValueChange={(value) => setFormData({ ...formData, situation_familiale: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Célibataire">Célibataire</SelectItem>
                    <SelectItem value="En couple">En couple</SelectItem>
                    <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                    <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                    <SelectItem value="Veuf/Veuve">Veuf/Veuve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Situation financière */}
            <TabsContent value="financial" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Revenus mensuels nets (CHF)</Label>
                  <Input
                    type="number"
                    value={formData.revenus_mensuels}
                    onChange={(e) => setFormData({ ...formData, revenus_mensuels: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Charges mensuelles (CHF)</Label>
                  <Input
                    type="number"
                    value={formData.charges_mensuelles}
                    onChange={(e) => setFormData({ ...formData, charges_mensuelles: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="charges_extra"
                    checked={formData.charges_extraordinaires}
                    onCheckedChange={(checked) => setFormData({ ...formData, charges_extraordinaires: !!checked })}
                  />
                  <Label htmlFor="charges_extra">Charges extraordinaires</Label>
                </div>
                {formData.charges_extraordinaires && (
                  <div>
                    <Label>Montant charges extraordinaires (CHF)</Label>
                    <Input
                      type="number"
                      value={formData.montant_charges_extra}
                      onChange={(e) => setFormData({ ...formData, montant_charges_extra: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autres_credits"
                    checked={formData.autres_credits}
                    onCheckedChange={(checked) => setFormData({ ...formData, autres_credits: !!checked })}
                  />
                  <Label htmlFor="autres_credits">Autres crédits en cours</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="poursuites"
                    checked={formData.poursuites}
                    onCheckedChange={(checked) => setFormData({ ...formData, poursuites: !!checked })}
                  />
                  <Label htmlFor="poursuites" className="text-red-600">Poursuites / Actes de défaut</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="curatelle"
                    checked={formData.curatelle}
                    onCheckedChange={(checked) => setFormData({ ...formData, curatelle: !!checked })}
                  />
                  <Label htmlFor="curatelle">Sous curatelle</Label>
                </div>
              </div>
            </TabsContent>

            {/* Situation professionnelle */}
            <TabsContent value="professional" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Profession</Label>
                  <Input
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Employeur</Label>
                  <Input
                    value={formData.employeur}
                    onChange={(e) => setFormData({ ...formData, employeur: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Secteur d'activité</Label>
                  <Input
                    value={formData.secteur_activite}
                    onChange={(e) => setFormData({ ...formData, secteur_activite: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Type de contrat</Label>
                  <Select
                    value={formData.type_contrat}
                    onValueChange={(value) => setFormData({ ...formData, type_contrat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="CDD">CDD</SelectItem>
                      <SelectItem value="Indépendant">Indépendant</SelectItem>
                      <SelectItem value="Intérimaire">Intérimaire</SelectItem>
                      <SelectItem value="Fonctionnaire">Fonctionnaire</SelectItem>
                      <SelectItem value="Retraité">Retraité</SelectItem>
                      <SelectItem value="Étudiant">Étudiant</SelectItem>
                      <SelectItem value="Sans emploi">Sans emploi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Source de revenus</Label>
                  <Select
                    value={formData.source_revenus}
                    onValueChange={(value) => setFormData({ ...formData, source_revenus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Salaire">Salaire</SelectItem>
                      <SelectItem value="Indépendant">Revenus indépendant</SelectItem>
                      <SelectItem value="Retraite">Retraite / AVS</SelectItem>
                      <SelectItem value="Chômage">Chômage</SelectItem>
                      <SelectItem value="Aide sociale">Aide sociale</SelectItem>
                      <SelectItem value="Rente">Rente / AI</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date d'engagement</Label>
                  <Input
                    type="date"
                    value={formData.date_engagement}
                    onChange={(e) => setFormData({ ...formData, date_engagement: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Ancienneté (mois)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.anciennete_mois}
                  onChange={(e) => setFormData({ ...formData, anciennete_mois: e.target.value })}
                  placeholder="0"
                />
              </div>
            </TabsContent>

            {/* Logement actuel */}
            <TabsContent value="housing" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gérance actuelle</Label>
                  <Input
                    value={formData.gerance_actuelle}
                    onChange={(e) => setFormData({ ...formData, gerance_actuelle: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact gérance</Label>
                  <Input
                    value={formData.contact_gerance}
                    onChange={(e) => setFormData({ ...formData, contact_gerance: e.target.value })}
                    placeholder="Téléphone ou email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Loyer actuel (CHF)</Label>
                  <Input
                    type="number"
                    value={formData.loyer_actuel}
                    onChange={(e) => setFormData({ ...formData, loyer_actuel: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Depuis le</Label>
                  <Input
                    type="date"
                    value={formData.depuis_le}
                    onChange={(e) => setFormData({ ...formData, depuis_le: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre de pièces actuelles</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.pieces_actuel}
                    onChange={(e) => setFormData({ ...formData, pieces_actuel: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Motif du changement</Label>
                  <Input
                    value={formData.motif_changement}
                    onChange={(e) => setFormData({ ...formData, motif_changement: e.target.value })}
                    placeholder="Travail, famille, etc."
                  />
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <Button 
              variant="outline" 
              onClick={goToPrevTab} 
              disabled={isFirstTab || saving}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>
            {!isLastTab && (
              <Button 
                variant="outline" 
                onClick={goToNextTab}
                disabled={saving}
                className="flex-1 sm:flex-none"
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.prenom.trim() || !formData.nom.trim()}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editCandidate ? 'Modifier' : 'Ajouter'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

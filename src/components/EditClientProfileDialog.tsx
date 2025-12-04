import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, User, DollarSign, Briefcase, Home, Heart } from 'lucide-react';
import { RegionAutocomplete } from '@/components/RegionAutocomplete';

interface EditClientProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  profile: any;
  onSaved: () => void;
}

export function EditClientProfileDialog({ open, onOpenChange, client, profile, onSaved }: EditClientProfileDialogProps) {
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    prenom: '',
    nom: '',
    telephone: ''
  });
  const [clientData, setClientData] = useState({
    // Situation financière
    revenus_mensuels: 0,
    budget_max: 0,
    loyer_actuel: 0,
    charges_mensuelles: 0,
    charges_extraordinaires: false,
    montant_charges_extra: 0,
    autres_credits: false,
    apport_personnel: 0,
    poursuites: false,
    curatelle: false,
    // Situation professionnelle
    profession: '',
    employeur: '',
    secteur_activite: '',
    type_contrat: '',
    source_revenus: '',
    anciennete_mois: 0,
    // Situation personnelle
    nationalite: '',
    type_permis: '',
    situation_familiale: '',
    nombre_occupants: 1,
    animaux: false,
    instrument_musique: false,
    vehicules: false,
    numero_plaques: '',
    // Critères de recherche
    type_bien: '',
    pieces: 0,
    region_recherche: '',
    souhaits_particuliers: '',
    // Logement actuel
    adresse: '',
    gerance_actuelle: '',
    contact_gerance: '',
    motif_changement: ''
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        prenom: profile.prenom || '',
        nom: profile.nom || '',
        telephone: profile.telephone || ''
      });
    }
    if (client) {
      setClientData({
        revenus_mensuels: client.revenus_mensuels || 0,
        budget_max: client.budget_max || 0,
        loyer_actuel: client.loyer_actuel || 0,
        charges_mensuelles: client.charges_mensuelles || 0,
        charges_extraordinaires: client.charges_extraordinaires || false,
        montant_charges_extra: client.montant_charges_extra || 0,
        autres_credits: client.autres_credits || false,
        apport_personnel: client.apport_personnel || 0,
        poursuites: client.poursuites || false,
        curatelle: client.curatelle || false,
        profession: client.profession || '',
        employeur: client.employeur || '',
        secteur_activite: client.secteur_activite || '',
        type_contrat: client.type_contrat || '',
        source_revenus: client.source_revenus || '',
        anciennete_mois: client.anciennete_mois || 0,
        nationalite: client.nationalite || '',
        type_permis: client.type_permis || '',
        situation_familiale: client.situation_familiale || '',
        nombre_occupants: client.nombre_occupants || 1,
        animaux: client.animaux || false,
        instrument_musique: client.instrument_musique || false,
        vehicules: client.vehicules || false,
        numero_plaques: client.numero_plaques || '',
        type_bien: client.type_bien || '',
        pieces: client.pieces || 0,
        region_recherche: client.region_recherche || '',
        souhaits_particuliers: client.souhaits_particuliers || '',
        adresse: client.adresse || '',
        gerance_actuelle: client.gerance_actuelle || '',
        contact_gerance: client.contact_gerance || '',
        motif_changement: client.motif_changement || ''
      });
    }
  }, [client, profile, open]);

  const handleSave = async () => {
    if (!profileData.prenom.trim() || !profileData.nom.trim()) {
      toast.error('Le prénom et le nom sont obligatoires');
      return;
    }

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          prenom: profileData.prenom.trim(),
          nom: profileData.nom.trim(),
          telephone: profileData.telephone.trim()
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Update client
      const { error: clientError } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', client.id);

      if (clientError) throw clientError;

      toast.success('Vos informations ont été mises à jour');
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Modifier mon dossier</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal" className="text-xs"><User className="w-3 h-3 mr-1" />Personnel</TabsTrigger>
            <TabsTrigger value="financial" className="text-xs"><DollarSign className="w-3 h-3 mr-1" />Finances</TabsTrigger>
            <TabsTrigger value="professional" className="text-xs"><Briefcase className="w-3 h-3 mr-1" />Emploi</TabsTrigger>
            <TabsTrigger value="search" className="text-xs"><Home className="w-3 h-3 mr-1" />Recherche</TabsTrigger>
            <TabsTrigger value="housing" className="text-xs"><Heart className="w-3 h-3 mr-1" />Logement</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[50vh] mt-4 pr-4">
            {/* Informations personnelles */}
            <TabsContent value="personal" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prénom *</Label>
                  <Input
                    value={profileData.prenom}
                    onChange={(e) => setProfileData({ ...profileData, prenom: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nom *</Label>
                  <Input
                    value={profileData.nom}
                    onChange={(e) => setProfileData({ ...profileData, nom: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={profileData.telephone}
                  onChange={(e) => setProfileData({ ...profileData, telephone: e.target.value })}
                  placeholder="+41 XX XXX XX XX"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nationalité</Label>
                  <Input
                    value={clientData.nationalite}
                    onChange={(e) => setClientData({ ...clientData, nationalite: e.target.value })}
                    placeholder="Suisse, France, etc."
                  />
                </div>
                <div>
                  <Label>Type de permis</Label>
                  <Select
                    value={clientData.type_permis}
                    onValueChange={(value) => setClientData({ ...clientData, type_permis: value })}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Situation familiale</Label>
                  <Select
                    value={clientData.situation_familiale}
                    onValueChange={(value) => setClientData({ ...clientData, situation_familiale: value })}
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
                      <SelectItem value="Famille monoparentale">Famille monoparentale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nombre d'occupants</Label>
                  <Input
                    type="number"
                    min="1"
                    value={clientData.nombre_occupants}
                    onChange={(e) => setClientData({ ...clientData, nombre_occupants: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="animaux"
                    checked={clientData.animaux}
                    onCheckedChange={(checked) => setClientData({ ...clientData, animaux: !!checked })}
                  />
                  <Label htmlFor="animaux">Animaux de compagnie</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="instrument"
                    checked={clientData.instrument_musique}
                    onCheckedChange={(checked) => setClientData({ ...clientData, instrument_musique: !!checked })}
                  />
                  <Label htmlFor="instrument">Instrument de musique</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vehicules"
                    checked={clientData.vehicules}
                    onCheckedChange={(checked) => setClientData({ ...clientData, vehicules: !!checked })}
                  />
                  <Label htmlFor="vehicules">Véhicule(s)</Label>
                </div>
                {clientData.vehicules && (
                  <div>
                    <Label>Numéro de plaques</Label>
                    <Input
                      value={clientData.numero_plaques}
                      onChange={(e) => setClientData({ ...clientData, numero_plaques: e.target.value })}
                      placeholder="GE XXXXX"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Situation financière */}
            <TabsContent value="financial" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Revenu mensuel net (CHF)</Label>
                  <Input
                    type="number"
                    value={clientData.revenus_mensuels}
                    onChange={(e) => setClientData({ ...clientData, revenus_mensuels: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Budget maximum loyer (CHF)</Label>
                  <Input
                    type="number"
                    value={clientData.budget_max}
                    onChange={(e) => setClientData({ ...clientData, budget_max: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Loyer actuel (CHF)</Label>
                  <Input
                    type="number"
                    value={clientData.loyer_actuel}
                    onChange={(e) => setClientData({ ...clientData, loyer_actuel: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Charges mensuelles (CHF)</Label>
                  <Input
                    type="number"
                    value={clientData.charges_mensuelles}
                    onChange={(e) => setClientData({ ...clientData, charges_mensuelles: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>Apport personnel disponible (CHF)</Label>
                <Input
                  type="number"
                  value={clientData.apport_personnel}
                  onChange={(e) => setClientData({ ...clientData, apport_personnel: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="charges_extra"
                    checked={clientData.charges_extraordinaires}
                    onCheckedChange={(checked) => setClientData({ ...clientData, charges_extraordinaires: !!checked })}
                  />
                  <Label htmlFor="charges_extra">Charges extraordinaires</Label>
                </div>
                {clientData.charges_extraordinaires && (
                  <div>
                    <Label>Montant charges extraordinaires (CHF)</Label>
                    <Input
                      type="number"
                      value={clientData.montant_charges_extra}
                      onChange={(e) => setClientData({ ...clientData, montant_charges_extra: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autres_credits"
                    checked={clientData.autres_credits}
                    onCheckedChange={(checked) => setClientData({ ...clientData, autres_credits: !!checked })}
                  />
                  <Label htmlFor="autres_credits">Autres crédits en cours</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="poursuites"
                    checked={clientData.poursuites}
                    onCheckedChange={(checked) => setClientData({ ...clientData, poursuites: !!checked })}
                  />
                  <Label htmlFor="poursuites">Poursuites / Actes de défaut</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="curatelle"
                    checked={clientData.curatelle}
                    onCheckedChange={(checked) => setClientData({ ...clientData, curatelle: !!checked })}
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
                    value={clientData.profession}
                    onChange={(e) => setClientData({ ...clientData, profession: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Employeur</Label>
                  <Input
                    value={clientData.employeur}
                    onChange={(e) => setClientData({ ...clientData, employeur: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Secteur d'activité</Label>
                  <Input
                    value={clientData.secteur_activite}
                    onChange={(e) => setClientData({ ...clientData, secteur_activite: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Type de contrat</Label>
                  <Select
                    value={clientData.type_contrat}
                    onValueChange={(value) => setClientData({ ...clientData, type_contrat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="CDD">CDD</SelectItem>
                      <SelectItem value="Temporaire">Temporaire</SelectItem>
                      <SelectItem value="Indépendant">Indépendant</SelectItem>
                      <SelectItem value="Apprentissage">Apprentissage</SelectItem>
                      <SelectItem value="Stage">Stage</SelectItem>
                      <SelectItem value="Retraité">Retraité</SelectItem>
                      <SelectItem value="Étudiant">Étudiant</SelectItem>
                      <SelectItem value="Sans emploi">Sans emploi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Source des revenus</Label>
                  <Select
                    value={clientData.source_revenus}
                    onValueChange={(value) => setClientData({ ...clientData, source_revenus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Salaire">Salaire</SelectItem>
                      <SelectItem value="Indépendant">Indépendant</SelectItem>
                      <SelectItem value="Rente AVS">Rente AVS</SelectItem>
                      <SelectItem value="Rente AI">Rente AI</SelectItem>
                      <SelectItem value="Chômage">Chômage</SelectItem>
                      <SelectItem value="Aide sociale">Aide sociale</SelectItem>
                      <SelectItem value="Pension">Pension</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ancienneté (mois)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={clientData.anciennete_mois}
                    onChange={(e) => setClientData({ ...clientData, anciennete_mois: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Critères de recherche */}
            <TabsContent value="search" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type de bien recherché</Label>
                  <Select
                    value={clientData.type_bien}
                    onValueChange={(value) => setClientData({ ...clientData, type_bien: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Appartement">Appartement</SelectItem>
                      <SelectItem value="Maison">Maison</SelectItem>
                      <SelectItem value="Villa">Villa</SelectItem>
                      <SelectItem value="Studio">Studio</SelectItem>
                      <SelectItem value="Loft">Loft</SelectItem>
                      <SelectItem value="Duplex">Duplex</SelectItem>
                      <SelectItem value="Attique">Attique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nombre de pièces souhaité</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="1"
                    value={clientData.pieces}
                    onChange={(e) => setClientData({ ...clientData, pieces: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>Région(s) recherchée(s)</Label>
                <RegionAutocomplete
                  value={clientData.region_recherche}
                  onChange={(value) => setClientData({ ...clientData, region_recherche: value })}
                  placeholder="Tapez une région, commune..."
                  multiSelect
                />
              </div>
              <div>
                <Label>Souhaits particuliers</Label>
                <Textarea
                  value={clientData.souhaits_particuliers}
                  onChange={(e) => setClientData({ ...clientData, souhaits_particuliers: e.target.value })}
                  placeholder="Balcon, parking, proche transports, etc."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Logement actuel */}
            <TabsContent value="housing" className="space-y-4 mt-0">
              <div>
                <Label>Adresse actuelle</Label>
                <Input
                  value={clientData.adresse}
                  onChange={(e) => setClientData({ ...clientData, adresse: e.target.value })}
                  placeholder="Rue, numéro, code postal, ville"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gérance actuelle</Label>
                  <Input
                    value={clientData.gerance_actuelle}
                    onChange={(e) => setClientData({ ...clientData, gerance_actuelle: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact gérance</Label>
                  <Input
                    value={clientData.contact_gerance}
                    onChange={(e) => setClientData({ ...clientData, contact_gerance: e.target.value })}
                    placeholder="Téléphone ou email"
                  />
                </div>
              </div>
              <div>
                <Label>Motif de changement</Label>
                <Textarea
                  value={clientData.motif_changement}
                  onChange={(e) => setClientData({ ...clientData, motif_changement: e.target.value })}
                  placeholder="Pourquoi souhaitez-vous déménager ?"
                  rows={3}
                />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

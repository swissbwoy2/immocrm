import { Briefcase, DollarSign, Edit, FileText, Home, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';

/**
 * Modifier les informations du client (parcours location / reloueur) : mêmes champs qu'avant.
 * L'enregistrement (onSave) reste dans la page.
 */
export function ClientEditDialog({ open, onOpenChange, editFormData, setEditFormData, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editFormData: any;
  setEditFormData: (data: any) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Edit className="w-5 h-5 text-primary" />
            </div>
            Modifier les informations du client
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Informations personnelles */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Informations personnelles
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input
                  value={editFormData.prenom || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, prenom: e.target.value })}
                  placeholder="Prénom"
                  className="bg-card border-border/70"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={editFormData.nom || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                  placeholder="Nom"
                  className="bg-card border-border/70"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="email@exemple.com"
                  className="bg-card border-border/70"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={editFormData.telephone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                  placeholder="+41 XX XXX XX XX"
                  className="bg-card border-border/70"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Nationalité</Label>
                <Input
                  value={editFormData.nationalite || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, nationalite: e.target.value })}
                  placeholder="Suisse"
                  className="bg-card border-border/70"
                />
              </div>
              <div className="space-y-2">
                <Label>Type de permis</Label>
                <Select 
                  value={editFormData.type_permis || ''} 
                  onValueChange={(value) => setEditFormData({ ...editFormData, type_permis: value })}
                >
                  <SelectTrigger className="bg-card border-border/70">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B">Permis B</SelectItem>
                    <SelectItem value="C">Permis C</SelectItem>
                    <SelectItem value="L">Permis L</SelectItem>
                    <SelectItem value="G">Permis G</SelectItem>
                    <SelectItem value="Suisse">Suisse</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date de naissance</Label>
                <Input
                  type="date"
                  value={editFormData.date_naissance || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, date_naissance: e.target.value })}
                  className="bg-card border-border/70"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Situation familiale</Label>
                <Select 
                  value={editFormData.situation_familiale || ''} 
                  onValueChange={(value) => setEditFormData({ ...editFormData, situation_familiale: value })}
                >
                  <SelectTrigger className="bg-card border-border/70">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Célibataire">Célibataire</SelectItem>
                    <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                    <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                    <SelectItem value="Veuf(ve)">Veuf(ve)</SelectItem>
                    <SelectItem value="En couple">En couple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre d'occupants</Label>
                <Input
                  type="number"
                  value={editFormData.nombre_occupants || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, nombre_occupants: parseInt(e.target.value) })}
                  placeholder="1"
                  className="bg-card border-border/70"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse actuelle</Label>
              <Input
                value={editFormData.adresse || ''}
                onChange={(e) => setEditFormData({ ...editFormData, adresse: e.target.value })}
                placeholder="Rue, n°, NPA, ville"
                className="bg-card border-border/70"
              />
            </div>
          </div>
    
          <div className="h-px bg-border/70" />
    
          {/* Situation professionnelle */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Situation professionnelle
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Profession</Label>
                <Input
                  value={editFormData.profession || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, profession: e.target.value })}
                  placeholder="Ingénieur"
                  className="bg-card border-border/70"
                />
              </div>
              <div className="space-y-2">
                <Label>Employeur</Label>
                <Input
                  value={editFormData.employeur || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, employeur: e.target.value })}
                  placeholder="Nom de l'entreprise"
                  className="bg-card border-border/70"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Type de contrat</Label>
                <Select 
                  value={editFormData.type_contrat || ''} 
                  onValueChange={(value) => setEditFormData({ ...editFormData, type_contrat: value })}
                >
                  <SelectTrigger className="bg-card border-border/70">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CDI">CDI</SelectItem>
                    <SelectItem value="CDD">CDD</SelectItem>
                    <SelectItem value="Indépendant">Indépendant</SelectItem>
                    <SelectItem value="Intérim">Intérim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date d'engagement</Label>
                <Input
                  type="date"
                  value={editFormData.date_engagement || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, date_engagement: e.target.value })}
                  className="bg-card border-border/70"
                />
              </div>
              <div className="space-y-2">
                <Label>Secteur d'activité</Label>
                <Input
                  value={editFormData.secteur_activite || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, secteur_activite: e.target.value })}
                  placeholder="Technologie"
                  className="bg-card border-border/70"
                />
              </div>
            </div>
          </div>
    
          <div className="h-px bg-border/70" />
    
          {/* Situation financière */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Situation financière
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Revenus mensuels (CHF)</Label>
                <Input
                  type="number"
                  value={editFormData.revenus_mensuels || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, revenus_mensuels: parseFloat(e.target.value) })}
                  placeholder="5000"
                  className="bg-card border-border/70"
                />
              </div>
              <div className="space-y-2">
                <Label>Charges mensuelles (CHF)</Label>
                <Input
                  type="number"
                  value={editFormData.charges_mensuelles || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, charges_mensuelles: parseFloat(e.target.value) })}
                  placeholder="1000"
                  className="bg-card border-border/70"
                />
              </div>
              <div className="space-y-2">
                <Label>Apport personnel (CHF)</Label>
                <Input
                  type="number"
                  value={editFormData.apport_personnel || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, apport_personnel: parseFloat(e.target.value) })}
                  placeholder="10000"
                  className="bg-card border-border/70"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Source de revenus</Label>
                <Input
                  value={editFormData.source_revenus || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, source_revenus: e.target.value })}
                  placeholder="Salaire"
                  className="bg-card border-border/70"
                />
              </div>
              <div className="space-y-2">
                <Label>Garanties</Label>
                <Input
                  value={editFormData.garanties || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, garanties: e.target.value })}
                  placeholder="Cautionnement"
                  className="bg-card border-border/70"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autres_credits"
                  checked={editFormData.autres_credits || false}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, autres_credits: checked })}
                />
                <Label htmlFor="autres_credits">Autres crédits</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="poursuites"
                  checked={editFormData.poursuites || false}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, poursuites: checked })}
                />
                <Label htmlFor="poursuites">Poursuites</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="curatelle"
                  checked={editFormData.curatelle || false}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, curatelle: checked })}
                />
                <Label htmlFor="curatelle">Curatelle</Label>
              </div>
            </div>
          </div>
    
          <div className="h-px bg-border/70" />
    
          {/* Critères de recherche */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Critères de recherche
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Budget maximum (CHF)</Label>
                <Input
                  type="number"
                  value={editFormData.budget_max || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, budget_max: parseFloat(e.target.value) })}
                  placeholder="2000"
                  className="bg-card border-border/70"
                />
              </div>
              <div className="space-y-2">
                <Label>Pièces souhaitées</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editFormData.pieces || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, pieces: parseFloat(e.target.value) })}
                  placeholder="3.5"
                  className="bg-card border-border/70"
                />
              </div>
              <div className="space-y-2">
                <Label>Type de bien</Label>
                <Select 
                  value={editFormData.type_bien || ''} 
                  onValueChange={(value) => setEditFormData({ ...editFormData, type_bien: value })}
                >
                  <SelectTrigger className="bg-card border-border/70">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Appartement">Appartement</SelectItem>
                    <SelectItem value="Maison">Maison</SelectItem>
                    <SelectItem value="Studio">Studio</SelectItem>
                    <SelectItem value="Loft">Loft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Région(s) de recherche</Label>
              <GooglePlacesAutocomplete
                value={editFormData.region_recherche || ''}
                onChange={(value) => setEditFormData({ ...editFormData, region_recherche: value })}
                placeholder="Tapez une région, commune..."
                multiSelect
              />
            </div>
            <div className="space-y-2">
              <Label>Souhaits particuliers</Label>
              <Textarea
                value={editFormData.souhaits_particuliers || ''}
                onChange={(e) => setEditFormData({ ...editFormData, souhaits_particuliers: e.target.value })}
                rows={2}
                placeholder="Balcon, parking, ascenseur..."
                className="bg-card border-border/70"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="animaux"
                  checked={editFormData.animaux || false}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, animaux: checked })}
                />
                <Label htmlFor="animaux">Animaux</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vehicules"
                  checked={editFormData.vehicules || false}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, vehicules: checked })}
                />
                <Label htmlFor="vehicules">Véhicules</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="instrument_musique"
                  checked={editFormData.instrument_musique || false}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, instrument_musique: checked })}
                />
                <Label htmlFor="instrument_musique">Instrument de musique</Label>
              </div>
            </div>
          </div>
    
          <div className="h-px bg-border/70" />
    
          {/* Notes agent */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Notes de l'agent
            </h3>
            <div className="space-y-2">
              <Textarea
                value={editFormData.note_agent || ''}
                onChange={(e) => setEditFormData({ ...editFormData, note_agent: e.target.value })}
                rows={4}
                placeholder="Notes internes..."
                className="bg-card border-border/70"
              />
            </div>
          </div>
    
          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 pt-4 border-t border-border/50 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={onSave}>
              Enregistrer les modifications
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

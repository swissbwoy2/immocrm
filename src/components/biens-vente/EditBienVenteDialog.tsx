import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save } from 'lucide-react';

interface EditBienVenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  immeuble: {
    id: string;
    nom: string;
    adresse: string;
    code_postal: string;
    ville: string;
    canton: string;
    type_bien: string;
    sous_type_bien: string;
    surface_totale: number;
    nombre_pieces: number;
    nb_chambres: number;
    nb_wc: number;
    nb_salles_eau: number;
    nb_garages: number;
    nb_places_int: number;
    nb_places_ext: number;
    etage: number;
    nb_etages_batiment: number;
    annee_construction: number;
    annee_renovation: number;
    type_chauffage: string;
    combustible: string;
    prix_vente_demande: number;
    description_commerciale: string;
    no_rf_base: string;
    no_rf_feuillet: string;
    zone_construction: string;
    no_eca: string;
    volume_eca: number;
    valeur_eca: number;
    administrateur_ppe: string;
    charges_ppe: number;
    charges_chauffage_ec: number;
    fonds_renovation: number;
    classe_energetique: string;
  };
  onSuccess: () => void;
}

export function EditBienVenteDialog({ open, onOpenChange, immeuble, onSuccess }: EditBienVenteDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    code_postal: '',
    ville: '',
    canton: '',
    type_bien: '',
    surface_totale: '',
    nombre_pieces: '',
    nb_chambres: '',
    nb_wc: '',
    nb_salles_eau: '',
    nb_garages: '',
    nb_places_int: '',
    nb_places_ext: '',
    etage: '',
    nb_etages_batiment: '',
    annee_construction: '',
    annee_renovation: '',
    type_chauffage: '',
    combustible: '',
    prix_vente_demande: '',
    description_commerciale: '',
    no_rf_base: '',
    no_rf_feuillet: '',
    zone_construction: '',
    no_eca: '',
    volume_eca: '',
    valeur_eca: '',
    administrateur_ppe: '',
    charges_ppe: '',
    charges_chauffage_ec: '',
    fonds_renovation: '',
    classe_energetique: '',
  });

  useEffect(() => {
    if (immeuble && open) {
      setFormData({
        nom: immeuble.nom || '',
        adresse: immeuble.adresse || '',
        code_postal: immeuble.code_postal || '',
        ville: immeuble.ville || '',
        canton: immeuble.canton || '',
        type_bien: immeuble.type_bien || '',
        surface_totale: immeuble.surface_totale?.toString() || '',
        nombre_pieces: immeuble.nombre_pieces?.toString() || '',
        nb_chambres: immeuble.nb_chambres?.toString() || '',
        nb_wc: immeuble.nb_wc?.toString() || '',
        nb_salles_eau: immeuble.nb_salles_eau?.toString() || '',
        nb_garages: immeuble.nb_garages?.toString() || '',
        nb_places_int: immeuble.nb_places_int?.toString() || '',
        nb_places_ext: immeuble.nb_places_ext?.toString() || '',
        etage: immeuble.etage?.toString() || '',
        nb_etages_batiment: immeuble.nb_etages_batiment?.toString() || '',
        annee_construction: immeuble.annee_construction?.toString() || '',
        annee_renovation: immeuble.annee_renovation?.toString() || '',
        type_chauffage: immeuble.type_chauffage || '',
        combustible: immeuble.combustible || '',
        prix_vente_demande: immeuble.prix_vente_demande?.toString() || '',
        description_commerciale: immeuble.description_commerciale || '',
        no_rf_base: immeuble.no_rf_base || '',
        no_rf_feuillet: immeuble.no_rf_feuillet || '',
        zone_construction: immeuble.zone_construction || '',
        no_eca: immeuble.no_eca || '',
        volume_eca: immeuble.volume_eca?.toString() || '',
        valeur_eca: immeuble.valeur_eca?.toString() || '',
        administrateur_ppe: immeuble.administrateur_ppe || '',
        charges_ppe: immeuble.charges_ppe?.toString() || '',
        charges_chauffage_ec: immeuble.charges_chauffage_ec?.toString() || '',
        fonds_renovation: immeuble.fonds_renovation?.toString() || '',
        classe_energetique: immeuble.classe_energetique || '',
      });
    }
  }, [immeuble, open]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('immeubles')
        .update({
          nom: formData.nom,
          adresse: formData.adresse,
          code_postal: formData.code_postal,
          ville: formData.ville,
          canton: formData.canton,
          type_bien: formData.type_bien,
          surface_totale: formData.surface_totale ? parseFloat(formData.surface_totale) : null,
          nombre_pieces: formData.nombre_pieces ? parseFloat(formData.nombre_pieces) : null,
          nb_chambres: formData.nb_chambres ? parseInt(formData.nb_chambres) : null,
          nb_wc: formData.nb_wc ? parseInt(formData.nb_wc) : null,
          nb_salles_eau: formData.nb_salles_eau ? parseInt(formData.nb_salles_eau) : null,
          nb_garages: formData.nb_garages ? parseInt(formData.nb_garages) : null,
          nb_places_int: formData.nb_places_int ? parseInt(formData.nb_places_int) : null,
          nb_places_ext: formData.nb_places_ext ? parseInt(formData.nb_places_ext) : null,
          etage: formData.etage ? parseInt(formData.etage) : null,
          nb_etages_batiment: formData.nb_etages_batiment ? parseInt(formData.nb_etages_batiment) : null,
          annee_construction: formData.annee_construction ? parseInt(formData.annee_construction) : null,
          annee_renovation: formData.annee_renovation ? parseInt(formData.annee_renovation) : null,
          type_chauffage: formData.type_chauffage,
          combustible: formData.combustible,
          prix_vente_demande: formData.prix_vente_demande ? parseFloat(formData.prix_vente_demande) : null,
          description_commerciale: formData.description_commerciale,
          no_rf_base: formData.no_rf_base,
          no_rf_feuillet: formData.no_rf_feuillet,
          zone_construction: formData.zone_construction,
          no_eca: formData.no_eca,
          volume_eca: formData.volume_eca ? parseFloat(formData.volume_eca) : null,
          valeur_eca: formData.valeur_eca ? parseFloat(formData.valeur_eca) : null,
          administrateur_ppe: formData.administrateur_ppe,
          charges_ppe: formData.charges_ppe ? parseFloat(formData.charges_ppe) : null,
          charges_chauffage_ec: formData.charges_chauffage_ec ? parseFloat(formData.charges_chauffage_ec) : null,
          fonds_renovation: formData.fonds_renovation ? parseFloat(formData.fonds_renovation) : null,
          classe_energetique: formData.classe_energetique,
        })
        .eq('id', immeuble.id);

      if (error) throw error;

      toast.success('Bien mis à jour avec succès');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating bien:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Modifier le bien</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="technique">Technique</TabsTrigger>
              <TabsTrigger value="cadastre">Cadastre</TabsTrigger>
              <TabsTrigger value="ppe">PPE</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du bien *</Label>
                  <Input
                    value={formData.nom}
                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                    placeholder="Villa de charme"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type de bien</Label>
                  <Select 
                    value={formData.type_bien} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, type_bien: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appartement">Appartement</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="maison">Maison</SelectItem>
                      <SelectItem value="immeuble">Immeuble</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                      <SelectItem value="commercial">Local commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adresse *</Label>
                <Input
                  value={formData.adresse}
                  onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                  placeholder="Rue Exemple 123"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Code postal</Label>
                  <Input
                    value={formData.code_postal}
                    onChange={(e) => setFormData(prev => ({ ...prev, code_postal: e.target.value }))}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input
                    value={formData.ville}
                    onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))}
                    placeholder="Lausanne"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Canton</Label>
                  <Select 
                    value={formData.canton} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, canton: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VD">Vaud</SelectItem>
                      <SelectItem value="GE">Genève</SelectItem>
                      <SelectItem value="VS">Valais</SelectItem>
                      <SelectItem value="FR">Fribourg</SelectItem>
                      <SelectItem value="NE">Neuchâtel</SelectItem>
                      <SelectItem value="JU">Jura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Surface (m²)</Label>
                  <Input
                    type="number"
                    value={formData.surface_totale}
                    onChange={(e) => setFormData(prev => ({ ...prev, surface_totale: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nombre de pièces</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.nombre_pieces}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre_pieces: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prix demandé (CHF)</Label>
                  <Input
                    type="number"
                    value={formData.prix_vente_demande}
                    onChange={(e) => setFormData(prev => ({ ...prev, prix_vente_demande: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description commerciale</Label>
                <Textarea
                  value={formData.description_commerciale}
                  onChange={(e) => setFormData(prev => ({ ...prev, description_commerciale: e.target.value }))}
                  placeholder="Description du bien..."
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="technique" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Chambres</Label>
                  <Input
                    type="number"
                    value={formData.nb_chambres}
                    onChange={(e) => setFormData(prev => ({ ...prev, nb_chambres: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Salles d'eau</Label>
                  <Input
                    type="number"
                    value={formData.nb_salles_eau}
                    onChange={(e) => setFormData(prev => ({ ...prev, nb_salles_eau: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>WC</Label>
                  <Input
                    type="number"
                    value={formData.nb_wc}
                    onChange={(e) => setFormData(prev => ({ ...prev, nb_wc: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Garages</Label>
                  <Input
                    type="number"
                    value={formData.nb_garages}
                    onChange={(e) => setFormData(prev => ({ ...prev, nb_garages: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Places int.</Label>
                  <Input
                    type="number"
                    value={formData.nb_places_int}
                    onChange={(e) => setFormData(prev => ({ ...prev, nb_places_int: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Places ext.</Label>
                  <Input
                    type="number"
                    value={formData.nb_places_ext}
                    onChange={(e) => setFormData(prev => ({ ...prev, nb_places_ext: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Étage</Label>
                  <Input
                    type="number"
                    value={formData.etage}
                    onChange={(e) => setFormData(prev => ({ ...prev, etage: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nb étages bâtiment</Label>
                  <Input
                    type="number"
                    value={formData.nb_etages_batiment}
                    onChange={(e) => setFormData(prev => ({ ...prev, nb_etages_batiment: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Année construction</Label>
                  <Input
                    type="number"
                    value={formData.annee_construction}
                    onChange={(e) => setFormData(prev => ({ ...prev, annee_construction: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Année rénovation</Label>
                  <Input
                    type="number"
                    value={formData.annee_renovation}
                    onChange={(e) => setFormData(prev => ({ ...prev, annee_renovation: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type chauffage</Label>
                  <Select 
                    value={formData.type_chauffage} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, type_chauffage: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="central">Central</SelectItem>
                      <SelectItem value="sol">Au sol</SelectItem>
                      <SelectItem value="radiateurs">Radiateurs</SelectItem>
                      <SelectItem value="pac">Pompe à chaleur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Combustible</Label>
                  <Select 
                    value={formData.combustible} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, combustible: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gaz">Gaz</SelectItem>
                      <SelectItem value="mazout">Mazout</SelectItem>
                      <SelectItem value="electrique">Électrique</SelectItem>
                      <SelectItem value="bois">Bois/Pellets</SelectItem>
                      <SelectItem value="pac">PAC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Classe énergétique (CECB)</Label>
                <Select 
                  value={formData.classe_energetique} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, classe_energetique: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="E">E</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                    <SelectItem value="G">G</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="cadastre" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>N° RF Base</Label>
                  <Input
                    value={formData.no_rf_base}
                    onChange={(e) => setFormData(prev => ({ ...prev, no_rf_base: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>N° RF Feuillet</Label>
                  <Input
                    value={formData.no_rf_feuillet}
                    onChange={(e) => setFormData(prev => ({ ...prev, no_rf_feuillet: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Zone de construction</Label>
                <Input
                  value={formData.zone_construction}
                  onChange={(e) => setFormData(prev => ({ ...prev, zone_construction: e.target.value }))}
                  placeholder="Zone villa, zone mixte..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>N° ECA</Label>
                  <Input
                    value={formData.no_eca}
                    onChange={(e) => setFormData(prev => ({ ...prev, no_eca: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volume ECA (m³)</Label>
                  <Input
                    type="number"
                    value={formData.volume_eca}
                    onChange={(e) => setFormData(prev => ({ ...prev, volume_eca: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valeur ECA (CHF)</Label>
                  <Input
                    type="number"
                    value={formData.valeur_eca}
                    onChange={(e) => setFormData(prev => ({ ...prev, valeur_eca: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ppe" className="space-y-4">
              <div className="space-y-2">
                <Label>Administrateur PPE</Label>
                <Input
                  value={formData.administrateur_ppe}
                  onChange={(e) => setFormData(prev => ({ ...prev, administrateur_ppe: e.target.value }))}
                  placeholder="Nom de la gérance"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Charges PPE (CHF/mois)</Label>
                  <Input
                    type="number"
                    value={formData.charges_ppe}
                    onChange={(e) => setFormData(prev => ({ ...prev, charges_ppe: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chauffage/EC (CHF/mois)</Label>
                  <Input
                    type="number"
                    value={formData.charges_chauffage_ec}
                    onChange={(e) => setFormData(prev => ({ ...prev, charges_chauffage_ec: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fonds rénovation (CHF)</Label>
                  <Input
                    type="number"
                    value={formData.fonds_renovation}
                    onChange={(e) => setFormData(prev => ({ ...prev, fonds_renovation: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

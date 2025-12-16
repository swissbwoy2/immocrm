import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, MapPin, DollarSign, Home, Layers, Building2, Link, MessageSquare, User, Phone } from 'lucide-react';

interface EditOffreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offre: any;
  onSuccess: (updatedOffre: any) => void;
}

export function EditOffreDialog({ open, onOpenChange, offre, onSuccess }: EditOffreDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    adresse: '',
    prix: '',
    surface: '',
    pieces: '',
    etage: '',
    type_bien: '',
    description: '',
    lien_annonce: '',
    commentaires: '',
    code_immeuble: '',
    concierge_nom: '',
    concierge_tel: '',
    locataire_nom: '',
    locataire_tel: '',
    disponibilite: '',
  });

  useEffect(() => {
    if (offre) {
      setFormData({
        adresse: offre.adresse || '',
        prix: offre.prix?.toString() || '',
        surface: offre.surface?.toString() || '',
        pieces: offre.pieces?.toString() || '',
        etage: offre.etage || '',
        type_bien: offre.type_bien || '',
        description: offre.description || '',
        lien_annonce: offre.lien_annonce || '',
        commentaires: offre.commentaires || '',
        code_immeuble: offre.code_immeuble || '',
        concierge_nom: offre.concierge_nom || '',
        concierge_tel: offre.concierge_tel || '',
        locataire_nom: offre.locataire_nom || '',
        locataire_tel: offre.locataire_tel || '',
        disponibilite: offre.disponibilite || '',
      });
    }
  }, [offre]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offre?.id) return;

    setLoading(true);
    try {
      const updateData = {
        adresse: formData.adresse,
        prix: parseFloat(formData.prix) || 0,
        surface: formData.surface ? parseFloat(formData.surface) : null,
        pieces: formData.pieces ? parseFloat(formData.pieces) : null,
        etage: formData.etage || null,
        type_bien: formData.type_bien || null,
        description: formData.description || null,
        lien_annonce: formData.lien_annonce || null,
        commentaires: formData.commentaires || null,
        code_immeuble: formData.code_immeuble || null,
        concierge_nom: formData.concierge_nom || null,
        concierge_tel: formData.concierge_tel || null,
        locataire_nom: formData.locataire_nom || null,
        locataire_tel: formData.locataire_tel || null,
        disponibilite: formData.disponibilite || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('offres')
        .update(updateData)
        .eq('id', offre.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Offre modifiée avec succès');
      onSuccess({ ...offre, ...data });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating offer:', error);
      toast.error('Erreur lors de la modification de l\'offre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Modifier l'offre
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations principales */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Informations du bien
            </h4>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="adresse" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Adresse *
                </Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  required
                  placeholder="Rue et numéro, code postal, ville"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="prix" className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    Prix (CHF) *
                  </Label>
                  <Input
                    id="prix"
                    type="number"
                    value={formData.prix}
                    onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                    required
                    placeholder="1500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surface">Surface (m²)</Label>
                  <Input
                    id="surface"
                    type="number"
                    value={formData.surface}
                    onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
                    placeholder="75"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pieces">Pièces</Label>
                  <Input
                    id="pieces"
                    type="number"
                    step="0.5"
                    value={formData.pieces}
                    onChange={(e) => setFormData({ ...formData, pieces: e.target.value })}
                    placeholder="3.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="etage">Étage</Label>
                  <Input
                    id="etage"
                    value={formData.etage}
                    onChange={(e) => setFormData({ ...formData, etage: e.target.value })}
                    placeholder="2ème"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="type_bien">Type de bien</Label>
                  <Input
                    id="type_bien"
                    value={formData.type_bien}
                    onChange={(e) => setFormData({ ...formData, type_bien: e.target.value })}
                    placeholder="Appartement, Villa..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="disponibilite">Disponibilité</Label>
                  <Input
                    id="disponibilite"
                    value={formData.disponibilite}
                    onChange={(e) => setFormData({ ...formData, disponibilite: e.target.value })}
                    placeholder="Immédiate, 01.02.2025..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description détaillée du bien..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lien_annonce" className="flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5" />
                  Lien de l'annonce
                </Label>
                <Input
                  id="lien_annonce"
                  type="url"
                  value={formData.lien_annonce}
                  onChange={(e) => setFormData({ ...formData, lien_annonce: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Informations pratiques */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Informations pratiques
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="code_immeuble">Code immeuble</Label>
                <Input
                  id="code_immeuble"
                  value={formData.code_immeuble}
                  onChange={(e) => setFormData({ ...formData, code_immeuble: e.target.value })}
                  placeholder="1234"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="concierge_nom" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Nom du concierge
                </Label>
                <Input
                  id="concierge_nom"
                  value={formData.concierge_nom}
                  onChange={(e) => setFormData({ ...formData, concierge_nom: e.target.value })}
                  placeholder="M. Dupont"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="concierge_tel" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Tél. concierge
                </Label>
                <Input
                  id="concierge_tel"
                  value={formData.concierge_tel}
                  onChange={(e) => setFormData({ ...formData, concierge_tel: e.target.value })}
                  placeholder="+41 79 xxx xx xx"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="locataire_nom" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Nom du locataire actuel
                </Label>
                <Input
                  id="locataire_nom"
                  value={formData.locataire_nom}
                  onChange={(e) => setFormData({ ...formData, locataire_nom: e.target.value })}
                  placeholder="Mme Martin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locataire_tel" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Tél. locataire
                </Label>
                <Input
                  id="locataire_tel"
                  value={formData.locataire_tel}
                  onChange={(e) => setFormData({ ...formData, locataire_tel: e.target.value })}
                  placeholder="+41 79 xxx xx xx"
                />
              </div>
            </div>
          </div>

          {/* Commentaires */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Commentaires agent
            </h4>

            <div className="space-y-2">
              <Label htmlFor="commentaires">Notes internes</Label>
              <Textarea
                id="commentaires"
                value={formData.commentaires}
                onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                placeholder="Notes et commentaires pour le suivi..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

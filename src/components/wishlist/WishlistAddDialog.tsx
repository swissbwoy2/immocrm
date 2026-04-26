import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useWishlist, detectPortail } from '@/hooks/useWishlist';
import { Link2, MapPin, Phone, Mail, User, Tag, Bookmark } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialLink?: string;
}

export function WishlistAddDialog({ open, onOpenChange, initialLink }: Props) {
  const { addItem } = useWishlist();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    lien_annonce: initialLink ?? '',
    adresse: '',
    npa: '',
    ville: '',
    nb_pieces: '',
    surface: '',
    prix: '',
    type_bien: '',
    contact_nom: '',
    contact_telephone: '',
    contact_email: '',
    notes: '',
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.lien_annonce.trim() || !form.adresse.trim()) return;
    setSubmitting(true);
    const result = await addItem({
      lien_annonce: form.lien_annonce.trim(),
      adresse: form.adresse.trim(),
      npa: form.npa || null,
      ville: form.ville || null,
      nb_pieces: form.nb_pieces ? parseFloat(form.nb_pieces) : null,
      surface: form.surface ? parseFloat(form.surface) : null,
      prix: form.prix ? parseFloat(form.prix) : null,
      type_bien: form.type_bien || null,
      contact_nom: form.contact_nom || null,
      contact_telephone: form.contact_telephone || null,
      contact_email: form.contact_email || null,
      notes: form.notes || null,
      tags: null,
      photo_url: null,
      source_portail: detectPortail(form.lien_annonce),
      statut: 'a_contacter',
      date_dernier_contact: null,
      nb_relances: 0,
    });
    setSubmitting(false);
    if (result) {
      onOpenChange(false);
      setForm({
        lien_annonce: '', adresse: '', npa: '', ville: '', nb_pieces: '', surface: '',
        prix: '', type_bien: '', contact_nom: '', contact_telephone: '', contact_email: '', notes: '',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" /> Ajouter un bien à suivre
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Lien de l'annonce *</Label>
            <Input
              type="url"
              placeholder="https://www.homegate.ch/..."
              value={form.lien_annonce}
              onChange={(e) => update('lien_annonce', e.target.value)}
            />
            {form.lien_annonce && (
              <p className="text-xs text-muted-foreground mt-1">
                Portail détecté : <strong>{detectPortail(form.lien_annonce) ?? '—'}</strong>
              </p>
            )}
          </div>

          <div>
            <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Adresse complète *</Label>
            <Input
              placeholder="Rue de Genève 42, 1003 Lausanne"
              value={form.adresse}
              onChange={(e) => update('adresse', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>NPA</Label>
              <Input value={form.npa} onChange={(e) => update('npa', e.target.value)} />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={form.ville} onChange={(e) => update('ville', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Pièces</Label>
              <Input type="number" step="0.5" value={form.nb_pieces} onChange={(e) => update('nb_pieces', e.target.value)} />
            </div>
            <div>
              <Label>Surface (m²)</Label>
              <Input type="number" value={form.surface} onChange={(e) => update('surface', e.target.value)} />
            </div>
            <div>
              <Label>Prix (CHF)</Label>
              <Input type="number" value={form.prix} onChange={(e) => update('prix', e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Type de bien</Label>
            <Input
              placeholder="Appartement, Studio, Maison, Local..."
              value={form.type_bien}
              onChange={(e) => update('type_bien', e.target.value)}
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-semibold">Contact annonceur</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Nom / Régie</Label>
                <Input value={form.contact_nom} onChange={(e) => update('contact_nom', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Téléphone</Label>
                  <Input type="tel" value={form.contact_telephone} onChange={(e) => update('contact_telephone', e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
                  <Input type="email" value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Ex : Appelé le 24/04, laissé un message au répondeur..."
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.lien_annonce.trim() || !form.adresse.trim()}
          >
            {submitting ? 'Ajout…' : 'Ajouter à ma liste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

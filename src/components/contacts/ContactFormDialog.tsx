import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Contact, ContactType, contactTypeLabels } from "./contactTypes";
import { Loader2 } from "lucide-react";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Contact>) => Promise<void>;
  contact?: Contact | null;
  isLoading?: boolean;
}

const civiliteOptions = ['M.', 'Mme', 'Dr', 'Me'];

export function ContactFormDialog({
  open,
  onOpenChange,
  onSubmit,
  contact,
  isLoading = false,
}: ContactFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Contact>>({
    contact_type: 'autre',
    civilite: '',
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    telephone_secondaire: '',
    adresse: '',
    code_postal: '',
    ville: '',
    entreprise: '',
    fonction: '',
    notes: '',
    tags: [],
    is_favorite: false,
  });

  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (contact) {
      setFormData({
        contact_type: contact.contact_type,
        civilite: contact.civilite || '',
        prenom: contact.prenom || '',
        nom: contact.nom,
        email: contact.email || '',
        telephone: contact.telephone || '',
        telephone_secondaire: contact.telephone_secondaire || '',
        adresse: contact.adresse || '',
        code_postal: contact.code_postal || '',
        ville: contact.ville || '',
        entreprise: contact.entreprise || '',
        fonction: contact.fonction || '',
        notes: contact.notes || '',
        tags: contact.tags || [],
        is_favorite: contact.is_favorite,
      });
      setTagsInput(contact.tags?.join(', ') || '');
    } else {
      setFormData({
        contact_type: 'autre',
        civilite: '',
        prenom: '',
        nom: '',
        email: '',
        telephone: '',
        telephone_secondaire: '',
        adresse: '',
        code_postal: '',
        ville: '',
        entreprise: '',
        fonction: '',
        notes: '',
        tags: [],
        is_favorite: false,
      });
      setTagsInput('');
    }
  }, [contact, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    await onSubmit({ ...formData, tags });
  };

  const handleChange = (field: keyof Contact, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isEditing = !!contact;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le contact' : 'Nouveau contact'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="contact_type">Type de contact *</Label>
              <Select
                value={formData.contact_type}
                onValueChange={(val) => handleChange('contact_type', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(contactTypeLabels) as [ContactType, string][]).map(
                    ([type, label]) => (
                      <SelectItem key={type} value={type}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="civilite">Civilité</Label>
              <Select
                value={formData.civilite || ''}
                onValueChange={(val) => handleChange('civilite', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {civiliteOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="prenom">Prénom</Label>
              <Input
                id="prenom"
                value={formData.prenom || ''}
                onChange={(e) => handleChange('prenom', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom || ''}
                onChange={(e) => handleChange('nom', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                value={formData.telephone || ''}
                onChange={(e) => handleChange('telephone', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="telephone_secondaire">Téléphone secondaire</Label>
              <Input
                id="telephone_secondaire"
                value={formData.telephone_secondaire || ''}
                onChange={(e) => handleChange('telephone_secondaire', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="entreprise">Entreprise</Label>
              <Input
                id="entreprise"
                value={formData.entreprise || ''}
                onChange={(e) => handleChange('entreprise', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="fonction">Fonction</Label>
              <Input
                id="fonction"
                value={formData.fonction || ''}
                onChange={(e) => handleChange('fonction', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={formData.adresse || ''}
                onChange={(e) => handleChange('adresse', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="code_postal">Code postal</Label>
              <Input
                id="code_postal"
                value={formData.code_postal || ''}
                onChange={(e) => handleChange('code_postal', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="ville">Ville</Label>
              <Input
                id="ville"
                value={formData.ville || ''}
                onChange={(e) => handleChange('ville', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="VIP, Urgent, Suivi..."
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { BellPlus, Loader2 } from 'lucide-react';

export interface AlerteCriteres {
  type_transaction?: string | null;
  categorie_id?: string | null;
  ville?: string | null;
  rayon_km?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  prix_min?: number | null;
  prix_max?: number | null;
  pieces_min?: number | null;
  pieces_max?: number | null;
  surface_min?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criteres: AlerteCriteres;
  defaultNom: string;
}

export function AlerteAnnonceDialog({ open, onOpenChange, criteres, defaultNom }: Props) {
  const { user } = useAuth();
  const [nom, setNom] = useState(defaultNom);
  const [email, setEmail] = useState('');
  const [frequence, setFrequence] = useState<'instantane' | 'quotidien'>('instantane');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const finalEmail = (user?.email || email).trim().toLowerCase();
    if (!finalEmail || !/^\S+@\S+\.\S+$/.test(finalEmail)) {
      toast.error('Veuillez saisir une adresse e-mail valide');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('alertes_annonces').insert({
        user_id: user?.id ?? null,
        email: finalEmail,
        nom: nom || defaultNom,
        criteres: criteres as never,
        actif: true,
        frequence,
      });
      if (error) throw error;
      toast.success('Alerte créée : vous recevrez les nouvelles annonces correspondantes');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Impossible de créer l'alerte");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellPlus className="h-5 w-5 text-primary" />
            Créer une alerte e-mail
          </DialogTitle>
          <DialogDescription>
            Recevez un e-mail dès qu'une nouvelle annonce correspond à votre recherche.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="alerte-nom">Nom de l'alerte</Label>
            <Input id="alerte-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>

          {!user && (
            <div className="space-y-2">
              <Label htmlFor="alerte-email">Votre e-mail *</Label>
              <Input
                id="alerte-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Fréquence</Label>
            <Select value={frequence} onValueChange={(v) => setFrequence(v as typeof frequence)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instantane">Dès la publication</SelectItem>
                <SelectItem value="quotidien">Résumé quotidien</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Vous pourrez vous désinscrire à tout moment via le lien présent dans chaque e-mail.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellPlus className="h-4 w-4 mr-2" />}
              Créer l'alerte
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

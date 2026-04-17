import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Send, Loader2, Home, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateClientAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si fourni, le client sera automatiquement assigné à cet agent (id de la table agents) */
  agentId?: string | null;
  onCreated?: () => void;
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const CreateClientAccountDialog = ({
  open,
  onOpenChange,
  agentId,
  onCreated,
}: CreateClientAccountDialogProps) => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    typeRecherche: 'Louer' as 'Louer' | 'Acheter',
  });

  const reset = () => setForm({ prenom: '', nom: '', email: '', telephone: '', typeRecherche: 'Louer' });

  const handleSubmit = async () => {
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim()) {
      toast({ title: 'Champs requis', description: 'Prénom, nom et email sont obligatoires.', variant: 'destructive' });
      return;
    }
    if (!isValidEmail(form.email)) {
      toast({ title: 'Email invalide', description: "Veuillez entrer une adresse email valide.", variant: 'destructive' });
      return;
    }

    try {
      setSending(true);
      const { error } = await supabase.functions.invoke('invite-client', {
        body: {
          email: form.email.trim().toLowerCase(),
          prenom: form.prenom.trim(),
          nom: form.nom.trim(),
          telephone: form.telephone.trim() || null,
          invitationLegere: true,
          typeRecherche: form.typeRecherche,
          agentId: agentId || undefined,
        },
      });
      if (error) throw error;
      toast({
        title: 'Invitation envoyée',
        description: `${form.prenom} ${form.nom} recevra un email pour activer son compte, signer son mandat et joindre ses documents.`,
      });
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      console.error('Error creating client account:', err);
      toast({ title: 'Erreur', description: err.message || "Impossible d'envoyer l'invitation", variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Créer un compte client
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Le client recevra un email d'invitation pour <strong>définir son mot de passe</strong>, compléter son profil, signer son mandat et joindre les documents demandés.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cca-prenom">Prénom *</Label>
              <Input id="cca-prenom" value={form.prenom} onChange={(e) => setForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Marie" />
            </div>
            <div>
              <Label htmlFor="cca-nom">Nom *</Label>
              <Input id="cca-nom" value={form.nom} onChange={(e) => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Dupont" />
            </div>
          </div>
          <div>
            <Label htmlFor="cca-email">Email *</Label>
            <Input id="cca-email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="marie@exemple.ch" />
          </div>
          <div>
            <Label htmlFor="cca-tel">Téléphone</Label>
            <Input id="cca-tel" value={form.telephone} onChange={(e) => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="+41 79 000 00 00" />
          </div>
          <div>
            <Label>Type de recherche</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                size="sm"
                variant={form.typeRecherche === 'Louer' ? 'default' : 'outline'}
                onClick={() => setForm(f => ({ ...f, typeRecherche: 'Louer' }))}
                className="flex-1"
              >
                <Key className="w-4 h-4 mr-1" /> Louer
              </Button>
              <Button
                type="button"
                size="sm"
                variant={form.typeRecherche === 'Acheter' ? 'default' : 'outline'}
                onClick={() => setForm(f => ({ ...f, typeRecherche: 'Acheter' }))}
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-1" /> Acheter
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={sending}>Annuler</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={sending}>
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Envoyer l'invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';

interface ContactAnnonceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annonce: {
    id: string;
    titre: string;
    annonceurs?: {
      id: string;
      nom: string;
      email?: string;
    };
  };
}

export function ContactAnnonceDialog({ open, onOpenChange, annonce }: ContactAnnonceDialogProps) {
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    message: `Bonjour,\n\nJe suis intéressé(e) par votre annonce "${annonce?.titre}".\n\nPouvez-vous me donner plus d'informations ?\n\nCordialement`,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      // Log the contact form submission
      // In production, this would create a conversation record and send email notification
      console.log('Contact form submitted:', {
        annonceId: annonce.id,
        annonceurId: annonce.annonceurs?.id,
        nom: formData.nom,
        email: formData.email,
        telephone: formData.telephone,
        message: formData.message,
      });

      // TODO: Implement edge function to send email to annonceur
      // and optionally create conversation record
      
      return true;
    },
    onSuccess: () => {
      toast.success('Message envoyé avec succès !');
      onOpenChange(false);
      setFormData(prev => ({ ...prev, nom: '', email: '', telephone: '' }));
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.email || !formData.message) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    sendMessageMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contacter l'annonceur</DialogTitle>
          <DialogDescription>
            Envoyez un message concernant : {annonce?.titre}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                placeholder="Votre nom"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                type="tel"
                value={formData.telephone}
                onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                placeholder="+41 XX XXX XX XX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="votre@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={6}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={sendMessageMutation.isPending}>
              {sendMessageMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
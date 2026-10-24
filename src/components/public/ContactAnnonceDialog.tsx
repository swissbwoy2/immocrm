import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Field, Note, PrimaryButton, SecondaryButton, SheetDialog, TextArea } from '@/components/funnel-ui/FunnelKit';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    message: `Bonjour,\n\nJe suis intéressé(e) par votre annonce "${annonce?.titre}".\n\nPouvez-vous me donner plus d'informations ?\n\nCordialement`,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('contact-annonce', {
        body: {
          annonce_id: annonce.id,
          nom: formData.nom,
          email: formData.email,
          telephone: formData.telephone,
          message: formData.message,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any)?.conversation_id as string | null;
    },

    onSuccess: (conversationId) => {
      onOpenChange(false);
      setFormData(prev => ({ ...prev, nom: '', email: '', telephone: '' }));
      if (conversationId) {
        toast.success('Message envoyé — la discussion est ouverte', {
          action: {
            label: 'Voir la discussion',
            onClick: () => navigate(`/mes-messages-annonces/${conversationId}`),
          },
        });
      } else {
        toast.success('Message envoyé avec succès !');
      }
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

  const set = (k: keyof typeof formData) => (v: string) => setFormData((prev) => ({ ...prev, [k]: v }));

  return (
    <SheetDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<Send className="h-5 w-5" strokeWidth={1.8} />}
      title="Contacter l'annonceur"
      description={<>Votre message concernant : {annonce?.titre}</>}
      footer={
        <>
          <SecondaryButton onClick={() => onOpenChange(false)}>Annuler</SecondaryButton>
          <PrimaryButton loading={sendMessageMutation.isPending} onClick={() => handleSubmit({ preventDefault() {} } as React.FormEvent)}>
            Envoyer
          </PrimaryButton>
        </>
      }
    >
      {!user && (
        <div className="mb-4">
          <Note>
            Votre message sera transmis par e-mail. Pour discuter en direct avec l'annonceur (messagerie instantanée, pièces jointes),{' '}
            <button type="button" className="cursor-pointer font-medium text-[#222222] underline underline-offset-2" onClick={() => navigate('/login')}>
              connectez-vous ou créez un compte
            </button>
            .
          </Note>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field id="ca-nom" label="Nom" value={formData.nom} onChange={set('nom')} autoComplete="name" />
          <Field id="ca-tel" label="Téléphone (facultatif)" type="tel" inputMode="tel" value={formData.telephone} onChange={set('telephone')} autoComplete="tel" placeholder="+41 …" />
        </div>
        <Field id="ca-email" label="E-mail" type="email" inputMode="email" value={formData.email} onChange={set('email')} autoComplete="email" />
        <TextArea id="ca-message" label="Message" value={formData.message} onChange={set('message')} rows={6} />
        <button type="submit" className="sr-only">Envoyer</button>
      </form>
    </SheetDialog>
  );
}

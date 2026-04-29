import { useState } from 'react';
import { Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClientMultiSelect } from './ClientMultiSelect';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Offer {
  id: string;
  adresse: string;
  prix: number;
  surface: number | null;
  pieces: number | null;
  description: string | null;
  lien_annonce: string | null;
  disponibilite: string | null;
  etage: string | null;
  code_immeuble: string | null;
  locataire_nom: string | null;
  locataire_tel: string | null;
  concierge_nom: string | null;
  concierge_tel: string | null;
  commentaires: string | null;
  type_bien: string | null;
}

interface Client {
  id: string;
  user_id: string;
  profiles?: {
    prenom: string;
    nom: string;
    email: string;
  };
}

interface ResendOfferDialogProps {
  offer: Offer;
  clients: Client[];
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ResendOfferDialog = ({
  offer,
  clients,
  agentId,
  open,
  onOpenChange,
  onSuccess,
}: ResendOfferDialogProps) => {
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    if (sending) return; // Protection double-clic
    
    if (selectedClientIds.length === 0) {
      toast.error('Veuillez sélectionner au moins un client');
      return;
    }

    setSending(true);
    try {
      for (const clientId of selectedClientIds) {
        // Créer une nouvelle offre pour ce client
        const { data: newOffer, error: offerError } = await supabase
          .from('offres')
          .insert({
            client_id: clientId,
            agent_id: agentId,
            adresse: offer.adresse,
            prix: offer.prix,
            surface: offer.surface,
            pieces: offer.pieces,
            description: offer.description,
            lien_annonce: offer.lien_annonce,
            disponibilite: offer.disponibilite,
            etage: offer.etage,
            code_immeuble: offer.code_immeuble,
            locataire_nom: offer.locataire_nom,
            locataire_tel: offer.locataire_tel,
            concierge_nom: offer.concierge_nom,
            concierge_tel: offer.concierge_tel,
            commentaires: offer.commentaires,
            type_bien: offer.type_bien,
            statut: 'envoyee',
          })
          .select()
          .single();

        if (offerError) throw offerError;

        // Find ANY existing conversation for this client (regardless of which agent created it)
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', clientId)
          .eq('conversation_type', 'client-agent')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        let conversationId = existingConv?.id;

        if (!conversationId) {
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              agent_id: agentId,
              client_id: clientId,
              conversation_type: 'client-agent',
              subject: `Offre - ${offer.adresse}`,
              status: 'active',
            })
            .select()
            .single();

          if (convError) throw convError;
          conversationId = newConv.id;
        }

        // Always ensure the acting agent is in conversation_agents (idempotent)
        const { data: existingAgentLink } = await supabase
          .from('conversation_agents')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('agent_id', agentId)
          .maybeSingle();

        if (!existingAgentLink) {
          await supabase
            .from('conversation_agents')
            .insert({
              conversation_id: conversationId,
              agent_id: agentId,
            });
        }

        // Récupérer le nom du client pour la personnalisation
        const client = clients.find(c => c.id === clientId);
        const clientName = client?.profiles 
          ? `${client.profiles.prenom} ${client.profiles.nom}` 
          : 'Client';

        // Créer le message complet comme dans EnvoyerOffre
        const messageLines = [
          `Nouvelle Offre pour Votre Recherche d'Appartement`,
          ``,
          `Bonjour ${clientName} 👋,`,
          ``,
          `Nous avons trouvé une offre qui pourrait correspondre à vos critères de recherche ! Voici les détails de ce bien immobilier :`,
          ``,
          `📍 Localisation : ${offer.adresse}`,
          `💰 Prix : ${offer.prix.toLocaleString()} CHF`,
        ];
        
        if (offer.surface) messageLines.push(`📐 Surface : ${offer.surface} m²`);
        if (offer.pieces) messageLines.push(`🏠 Nombre de pièces : ${offer.pieces}`);
        if (offer.etage) messageLines.push(`🏢 Étage : ${offer.etage}`);
        if (offer.disponibilite) messageLines.push(`📅 Disponibilité : ${offer.disponibilite}`);
        if (offer.type_bien) messageLines.push(`🏘️ Type de bien : ${offer.type_bien}`);
        if (offer.description) {
          messageLines.push(``);
          messageLines.push(`Description :`);
          messageLines.push(offer.description);
        }
        if (offer.lien_annonce) {
          messageLines.push(``);
          messageLines.push(`🔗 Voir l'annonce complète : ${offer.lien_annonce}`);
        }
        if (offer.commentaires) {
          messageLines.push(``);
          messageLines.push(`💬 Commentaires : ${offer.commentaires}`);
        }
        
        messageLines.push(``);
        messageLines.push(`Pour toute question, n'hésitez pas à nous appeler au +41 21 634 28 39 ou à répondre directement à ce message.`);
        messageLines.push(``);
        messageLines.push(`Cordialement,`);
        messageLines.push(`L'équipe Immo-rama.ch`);

        const messageContent = messageLines.join('\n');

        const { error: messageError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: agentId,
          sender_type: 'agent',
          content: messageContent,
          offre_id: newOffer.id,
        });

        if (messageError) throw messageError;

        // Mettre à jour last_message_at
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);
      }

      toast.success(`Offre renvoyée à ${selectedClientIds.length} client(s)`);
      onOpenChange(false);
      setSelectedClientIds([]);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error resending offer:', error);
      toast.error('Erreur lors du renvoi de l\'offre');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Renvoyer l'offre à d'autres clients</DialogTitle>
          <DialogDescription>
            Sélectionnez les clients à qui vous souhaitez envoyer cette offre
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg space-y-2">
            <h4 className="font-semibold">{offer.adresse}</h4>
            <div className="flex gap-2">
              <Badge variant="secondary">CHF {offer.prix}.-</Badge>
              {offer.pieces && <Badge variant="outline">{offer.pieces} pièces</Badge>}
              {offer.surface && <Badge variant="outline">{offer.surface} m²</Badge>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Clients destinataires
            </label>
            <ClientMultiSelect
              clients={clients}
              selectedClientIds={selectedClientIds}
              onSelectionChange={setSelectedClientIds}
              disabled={sending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleResend} disabled={sending || selectedClientIds.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Envoi...' : `Envoyer à ${selectedClientIds.length} client(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

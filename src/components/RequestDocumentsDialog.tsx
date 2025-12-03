import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClientCandidate } from '@/hooks/useClientCandidates';

interface RequestDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientUserId: string;
  clientName: string;
  candidate?: ClientCandidate | null;
  existingDocuments: { type_document?: string; candidate_id?: string }[];
  agentId: string;
  agentUserId: string;
}

const DOCUMENT_TYPES = [
  { type: 'fiche_salaire', label: '💰 Fiches de salaire (3 dernières)' },
  { type: 'extrait_poursuites', label: '📋 Extrait des poursuites (< 3 mois)' },
  { type: 'piece_identite', label: '🪪 Pièce d\'identité / Permis' },
  { type: 'attestation_domicile', label: '🏠 Attestation de domicile' },
  { type: 'contrat_travail', label: '📝 Contrat de travail' },
  { type: 'attestation_employeur', label: '👔 Attestation employeur' },
  { type: 'rc_menage', label: '🛡️ RC Ménage' },
];

export function RequestDocumentsDialog({
  open,
  onOpenChange,
  clientId,
  clientUserId,
  clientName,
  candidate,
  existingDocuments,
  agentId,
  agentUserId,
}: RequestDocumentsDialogProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedTypes([]);
      setNote('');
    }
  }, [open]);

  const targetName = candidate ? `${candidate.prenom} ${candidate.nom}` : clientName;

  // Check if document type already exists for this target
  const hasDocument = (type: string) => {
    return existingDocuments.some(doc => 
      doc.type_document === type && 
      (candidate ? doc.candidate_id === candidate.id : !doc.candidate_id)
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Sélectionnez au moins un type de document');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create document requests
      const requests = selectedTypes.map(type => ({
        client_id: clientId,
        candidate_id: candidate?.id || null,
        requested_by: agentUserId,
        document_type: type,
        document_label: DOCUMENT_TYPES.find(d => d.type === type)?.label || type,
        status: 'pending',
        note: note || null,
      }));

      const { error: requestError } = await supabase
        .from('document_requests')
        .insert(requests);

      if (requestError) throw requestError;

      // 2. Find or create conversation
      let conversationId: string;
      
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', clientId)
        .eq('agent_id', agentId)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            client_id: clientId,
            agent_id: agentId,
            subject: 'Échanges',
            conversation_type: 'client-agent',
          })
          .select('id')
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // 3. Send message in conversation
      const documentsList = selectedTypes
        .map(t => `• ${DOCUMENT_TYPES.find(d => d.type === t)?.label || t}`)
        .join('\n');

      const messageContent = `📄 **Demande de documents**\n\nBonjour,\n\nMerci de bien vouloir me fournir les documents suivants pour **${targetName}** :\n\n${documentsList}${note ? `\n\n📝 Note: ${note}` : ''}\n\nVous pouvez les uploader dans la section "Mes documents" de votre espace client.\n\nMerci !`;

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: agentUserId,
          sender_type: 'agent',
          content: messageContent,
        });

      if (messageError) throw messageError;

      // 4. Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // 5. Create notification for client
      await supabase.rpc('create_notification', {
        p_user_id: clientUserId,
        p_type: 'document_request',
        p_title: '📄 Documents demandés',
        p_message: `Votre agent vous a demandé ${selectedTypes.length} document(s) pour ${targetName}`,
        p_link: '/client/messagerie',
        p_metadata: { client_id: clientId, candidate_id: candidate?.id || null }
      });

      toast.success('Demande envoyée', {
        description: `${selectedTypes.length} document(s) demandé(s) à ${clientName}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error sending document request:', error);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📩 Demander des documents
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Pour: <span className="font-medium">{targetName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Types de documents requis</Label>
            {DOCUMENT_TYPES.map(({ type, label }) => {
              const alreadyHas = hasDocument(type);
              return (
                <div 
                  key={type}
                  className={`flex items-center gap-3 p-2 rounded-lg border ${
                    alreadyHas ? 'bg-green-50 dark:bg-green-950 border-green-200' : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    id={type}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => toggleType(type)}
                    disabled={alreadyHas}
                  />
                  <label 
                    htmlFor={type} 
                    className={`flex-1 text-sm cursor-pointer ${alreadyHas ? 'text-muted-foreground' : ''}`}
                  >
                    {label}
                  </label>
                  {alreadyHas && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                      Reçu
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optionnel)</Label>
            <Textarea
              id="note"
              placeholder="Ajouter une note pour le client..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedTypes.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Envoyer la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

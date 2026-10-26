import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DETAIL_DIALOG, DetailHeader, DetailBody, KeyFacts, DetailSection, DetailText, DetailActions } from '@/components/details/DetailPrimitives';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from './statusBadges';
import { toast } from 'sonner';

interface Props {
  offer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfferPreviewDialog({ offer, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [editBody, setEditBody] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('client_offer_messages')
        .update({ message_body: editBody })
        .eq('id', offer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-offers'] });
      toast.success('Brouillon mis à jour');
      setIsEditing(false);
    },
    onError: () => toast.error('Erreur'),
  });

  if (!offer) return null;

  const handleEdit = () => {
    setEditBody(offer.message_body || '');
    setIsEditing(true);
  };

  const nbBiens = Array.isArray(offer.property_result_ids) ? offer.property_result_ids.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DETAIL_DIALOG}>
        <DetailHeader
          titleAs={DialogTitle}
          descriptionAs={DialogDescription}
          eyebrow="Aperçu de l'offre"
          title={offer.message_subject || 'Message au client'}
          subtitle={offer.channel ? <span className="capitalize">Canal : {offer.channel}</span> : undefined}
          badge={<StatusBadge type="offer" value={offer.status} />}
        />

        <DetailBody>
          {offer.property_result_ids && (
            <KeyFacts items={[{ label: 'Biens liés', value: `${nbBiens} bien${nbBiens > 1 ? 's' : ''}` }]} />
          )}

          <DetailSection title="Message">
            {isEditing ? (
              <div className="space-y-1.5">
                <Label htmlFor="offer-preview-body" className="sr-only">Message</Label>
                <Textarea
                  id="offer-preview-body"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={12}
                  className="text-[15px]"
                />
              </div>
            ) : (
              <DetailText>{offer.message_body || 'Aucun contenu'}</DetailText>
            )}
          </DetailSection>
        </DetailBody>

        <DetailActions>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Annuler</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Sauvegarder</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
              {['brouillon', 'pret'].includes(offer.status) && (
                <Button onClick={handleEdit}>Modifier</Button>
              )}
            </>
          )}
        </DetailActions>
      </DialogContent>
    </Dialog>
  );
}

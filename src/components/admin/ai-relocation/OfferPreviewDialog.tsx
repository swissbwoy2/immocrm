import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from './statusBadges';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aperçu de l'offre</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <StatusBadge type="offer" value={offer.status} />
              {offer.channel && <span className="text-xs text-muted-foreground capitalize">{offer.channel}</span>}
            </div>

            {offer.subject && (
              <div>
                <Label className="text-xs text-muted-foreground">Sujet</Label>
                <p className="text-sm font-medium">{offer.subject}</p>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Message</Label>
              {isEditing ? (
                <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={10} />
              ) : (
                <pre className="text-sm whitespace-pre-wrap bg-muted rounded-lg p-3 mt-1">
                  {offer.message_body || 'Aucun contenu'}
                </pre>
              )}
            </div>

            {offer.property_result_ids && (
              <div>
                <Label className="text-xs text-muted-foreground">Biens liés</Label>
                <p className="text-xs text-muted-foreground">{Array.isArray(offer.property_result_ids) ? offer.property_result_ids.length : 0} bien(s)</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Annuler</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Sauvegarder</Button>
            </>
          ) : (
            <>
              {['brouillon', 'pret'].includes(offer.status) && (
                <Button variant="outline" onClick={handleEdit}>Modifier</Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

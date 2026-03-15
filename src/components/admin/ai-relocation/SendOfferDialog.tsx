import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';

interface Props {
  offer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}

export function SendOfferDialog({ offer, open, onOpenChange, onSent }: Props) {
  const [customMessage, setCustomMessage] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Fetch property results linked to this offer
  const { data: properties } = useQuery({
    queryKey: ['offer-properties', offer?.id, offer?.property_result_ids],
    queryFn: async () => {
      const ids: string[] = Array.isArray(offer?.property_result_ids) ? offer.property_result_ids : [];
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('property_results')
        .select('id, title, address, rent_amount, living_area, number_of_rooms, source_name')
        .in('id', ids)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!offer?.property_result_ids?.length,
  });

  const toggleProperty = (id: string) => {
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!offer || selectedProperties.length === 0) return;
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expirée');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/ai-relocation-api/offers/${offer.id}/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            selected_property_ids: selectedProperties,
            custom_message: customMessage || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Erreur ${response.status}`);
      }

      toast.success(`Offre envoyée (${result.properties_sent} bien${result.properties_sent > 1 ? 's' : ''})`);
      onOpenChange(false);
      setCustomMessage('');
      setSelectedProperties([]);
      onSent();
    } catch (e: any) {
      toast.error(`Erreur d'envoi: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!offer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" /> Envoyer l'offre au client
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Message personnalisé (optionnel)</Label>
            <Textarea
              placeholder="Ajoutez un message pour le client..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label>Biens à inclure dans l'offre</Label>
            {!properties?.length ? (
              <p className="text-sm text-muted-foreground py-2">Aucun bien trouvé pour cette offre.</p>
            ) : (
              <ScrollArea className="h-[200px] border rounded-md p-2 mt-1">
                <div className="space-y-2">
                  {(properties as any[]).map((p: any) => (
                    <div key={p.id} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50">
                      <Checkbox
                        checked={selectedProperties.includes(p.id)}
                        onCheckedChange={() => toggleProperty(p.id)}
                      />
                      <div className="text-sm min-w-0">
                        <p className="font-medium truncate">{p.title || 'Sans titre'}</p>
                        <p className="text-muted-foreground text-xs">
                          {[p.address, p.rent_amount ? `CHF ${p.rent_amount.toLocaleString()}` : null, p.number_of_rooms ? `${p.number_of_rooms}p` : null].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={handleSend}
            disabled={isSending || selectedProperties.length === 0}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            Envoyer ({selectedProperties.length} bien{selectedProperties.length > 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

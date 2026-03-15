import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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

  // Fetch property results linked to this offer's client
  const { data: properties } = useQuery({
    queryKey: ['offer-properties', offer?.client_id, offer?.ai_agent_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_results')
        .select('id, title, address, price, surface, rooms, source_name, result_status')
        .eq('client_id', offer.client_id)
        .eq('ai_agent_id', offer.ai_agent_id)
        .in('result_status', ['retenu', 'nouveau'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open && !!offer?.client_id,
  });

  // Initialize selection when properties load
  const toggleProperty = (id: string) => {
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!offer) throw new Error('No offer');

      // Get client info
      const { data: client } = await supabase
        .from('clients')
        .select('id, user_id, profiles:user_id(prenom, nom, email)')
        .eq('id', offer.client_id)
        .single();

      const clientEmail = (client as any)?.profiles?.email;
      const clientName = [(client as any)?.profiles?.prenom, (client as any)?.profiles?.nom].filter(Boolean).join(' ') || 'Client';

      if (!clientEmail) throw new Error('Email client introuvable');

      // Get selected property details
      const selectedProps = properties?.filter(p => selectedProperties.includes(p.id)) ?? [];

      // Build email body
      const propertiesHtml = selectedProps.map(p => `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;">
          <h3 style="margin:0 0 8px;color:#1f2937;">${p.title || 'Bien immobilier'}</h3>
          ${p.address ? `<p style="margin:4px 0;color:#6b7280;">📍 ${p.address}</p>` : ''}
          <div style="display:flex;gap:16px;margin-top:8px;">
            ${p.price ? `<span style="font-weight:600;color:#059669;">CHF ${p.price.toLocaleString()}</span>` : ''}
            ${p.surface ? `<span style="color:#6b7280;">${p.surface} m²</span>` : ''}
            ${p.rooms ? `<span style="color:#6b7280;">${p.rooms} pièces</span>` : ''}
          </div>
          ${p.source_name ? `<p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">Source: ${p.source_name}</p>` : ''}
        </div>
      `).join('');

      const emailBody = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#1f2937;">Bonjour ${clientName},</h2>
          <p style="color:#4b5563;">Nous avons trouvé des biens correspondant à vos critères de recherche :</p>
          ${customMessage ? `<p style="color:#4b5563;background:#f3f4f6;padding:12px;border-radius:6px;">${customMessage}</p>` : ''}
          ${propertiesHtml}
          <p style="color:#4b5563;margin-top:24px;">N'hésitez pas à nous contacter pour organiser des visites.</p>
          <p style="color:#6b7280;">Cordialement,<br/>L'équipe Logisorama</p>
        </div>
      `;

      // Send email
      const { error: emailError } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          recipient_email: clientEmail,
          subject: `Nouvelles offres immobilières pour vous`,
          html_body: emailBody,
        },
      });

      if (emailError) throw emailError;

      // Update offer status to 'envoye'
      await supabase
        .from('client_offer_messages')
        .update({ status: 'envoye' as any })
        .eq('id', offer.id);

      // Update property_results to 'envoye_au_client'
      if (selectedProps.length > 0) {
        await supabase
          .from('property_results')
          .update({ result_status: 'envoye_au_client' })
          .in('id', selectedProps.map(p => p.id));
      }

      // Create notification for client
      if ((client as any)?.user_id) {
        await supabase.from('notifications').insert({
          user_id: (client as any).user_id,
          type: 'new_offer',
          title: '🏠 Nouvelles offres disponibles',
          message: `${selectedProps.length} bien(s) correspondant à vos critères vous ont été envoyés.`,
          link: '/client/offres-recues',
        });
      }
    },
    onSuccess: () => {
      toast.success('Offre envoyée au client par email');
      onOpenChange(false);
      setCustomMessage('');
      setSelectedProperties([]);
      onSent();
    },
    onError: (e) => toast.error(`Erreur d'envoi: ${e.message}`),
  });

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
              <p className="text-sm text-muted-foreground py-2">Aucun bien retenu trouvé pour ce client.</p>
            ) : (
              <ScrollArea className="h-[200px] border rounded-md p-2 mt-1">
                <div className="space-y-2">
                  {properties.map((p) => (
                    <div key={p.id} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50">
                      <Checkbox
                        checked={selectedProperties.includes(p.id)}
                        onCheckedChange={() => toggleProperty(p.id)}
                      />
                      <div className="text-sm min-w-0">
                        <p className="font-medium truncate">{p.title || 'Sans titre'}</p>
                        <p className="text-muted-foreground text-xs">
                          {[p.address, p.price ? `CHF ${p.price.toLocaleString()}` : null, p.rooms ? `${p.rooms}p` : null].filter(Boolean).join(' · ')}
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
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || selectedProperties.length === 0}
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            Envoyer ({selectedProperties.length} bien{selectedProperties.length > 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

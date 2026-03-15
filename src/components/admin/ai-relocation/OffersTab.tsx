import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './statusBadges';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Send, Eye, Mail } from 'lucide-react';
import { OfferPreviewDialog } from './OfferPreviewDialog';
import { SendOfferDialog } from './SendOfferDialog';
import type { Database } from '@/integrations/supabase/types';

type OfferStatus = Database['public']['Enums']['offer_status'];

interface Props {
  agentId: string;
}

export function OffersTab({ agentId }: Props) {
  const queryClient = useQueryClient();
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [sendOffer, setSendOffer] = useState<any>(null);

  const { data: offers, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-offers', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_offer_messages')
        .select('*, clients:client_id(id, user_id, profiles:user_id(prenom, nom, email))')
        .eq('ai_agent_id', agentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OfferStatus }) => {
      const { error } = await supabase
        .from('client_offer_messages')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-offers'] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur'),
  });

  const getClientName = (o: any) => {
    const p = o.clients?.profiles;
    if (!p) return '—';
    return [p.prenom, p.nom].filter(Boolean).join(' ') || p.email || '—';
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center py-12">
        <AlertTriangle className="w-8 h-8 text-destructive mb-2" />
        <p className="text-muted-foreground mb-4">Erreur de chargement</p>
        <Button variant="outline" onClick={() => refetch()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Offres ({offers?.length ?? 0})</h3>

      {!offers?.length ? (
        <div className="flex flex-col items-center py-12">
          <Send className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucune offre</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{getClientName(o)}</TableCell>
                  <TableCell className="capitalize text-xs">{o.channel || '—'}</TableCell>
                  <TableCell><StatusBadge type="offer" value={o.status} /></TableCell>
                  <TableCell className="text-xs">{o.approval_required ? 'Oui' : 'Non'}</TableCell>
                  <TableCell className="text-xs">
                    {o.created_at ? format(new Date(o.created_at), 'dd/MM HH:mm', { locale: fr }) : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setSelectedOffer(o)}>
                      <Eye className="w-3 h-3" />
                    </Button>
                    {o.status === 'pret' && (
                      <Button size="sm" variant="default" onClick={() => setSendOffer(o)}>
                        <Mail className="w-3 h-3 mr-1" /> Envoyer
                      </Button>
                    )}
                    {o.status === 'en_attente_validation' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: o.id, status: 'pret' })}>
                          Approuver
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: o.id, status: 'refuse' })}>
                          Refuser
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <OfferPreviewDialog
        offer={selectedOffer}
        open={!!selectedOffer}
        onOpenChange={(open) => { if (!open) setSelectedOffer(null); }}
      />

      <SendOfferDialog
        offer={sendOffer}
        open={!!sendOffer}
        onOpenChange={(open) => { if (!open) setSendOffer(null); }}
        onSent={() => {
          queryClient.invalidateQueries({ queryKey: ['ai-offers'] });
          setSendOffer(null);
        }}
      />
    </div>
  );
}

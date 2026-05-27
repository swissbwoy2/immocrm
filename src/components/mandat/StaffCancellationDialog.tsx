import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CancellationReasonForm, type CancellationReason } from './CancellationReasonForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName?: string;
  daysSinceSignature: number;
  withRefund: boolean;
  onSuccess?: () => void;
}

export function StaffCancellationDialog({
  open, onOpenChange, clientId, clientName, daysSinceSignature, withRefund, onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (reason: CancellationReason) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mandate-renewal-action', {
        body: {
          triggered_by: 'staff',
          client_id: clientId,
          action: withRefund ? 'cancel_with_refund' : 'cancel',
          cancellation_reason: reason,
        },
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.error || 'Erreur');

      toast.success(
        withRefund && data?.refund_eligible
          ? `Remboursement enregistré pour ${clientName ?? 'le client'}. Le client a été notifié.`
          : `Mandat annulé pour ${clientName ?? 'le client'}.`,
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la demande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {withRefund ? 'Demander le remboursement' : 'Annuler le mandat'}
          </DialogTitle>
          <DialogDescription>
            {clientName ? `Pour ${clientName}. ` : ''}
            Cette action est effectuée pour le compte du client.
            {withRefund && ' Le remboursement sera automatiquement validé si éligible.'}
          </DialogDescription>
        </DialogHeader>
        <CancellationReasonForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          withRefund={withRefund}
          loading={loading}
          daysSinceSignature={daysSinceSignature}
        />
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateInvoiceParams {
  clientId: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  typeRecherche: string;
}

interface InvoiceResult {
  success: boolean;
  clientUuid?: string;
  invoiceId?: string;
  invoiceRef?: string;
  error?: string;
}

export function useAbaNinjaInvoice() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createInvoice = async (params: CreateInvoiceParams): Promise<InvoiceResult> => {
    setLoading(true);
    
    try {
      // Step 1: Create client in AbaNinja
      console.log('Creating AbaNinja client...', { prenom: params.prenom, nom: params.nom, email: params.email });
      
      const { data: clientResult, error: clientError } = await supabase.functions.invoke('create-abaninja-client', {
        body: {
          prenom: params.prenom,
          nom: params.nom,
          email: params.email,
          telephone: params.telephone || '',
          adresse: params.adresse || ''
        }
      });

      if (clientError) {
        console.error('Error creating AbaNinja client:', clientError);
        throw new Error(`Erreur création client: ${clientError.message}`);
      }

      if (!clientResult?.success) {
        console.error('AbaNinja client creation failed:', clientResult);
        throw new Error(clientResult?.error || 'Échec création client AbaNinja');
      }

      const clientUuid = clientResult.client_uuid;
      const addressUuid = clientResult.address_uuid;

      console.log('AbaNinja client created:', { clientUuid, addressUuid });

      // Step 2: Create invoice in AbaNinja
      console.log('Creating AbaNinja invoice...');
      
      const { data: invoiceResult, error: invoiceError } = await supabase.functions.invoke('create-abaninja-invoice', {
        body: {
          client_uuid: clientUuid,
          address_uuid: addressUuid,
          type_recherche: params.typeRecherche,
          prenom: params.prenom,
          nom: params.nom,
          email: params.email,
          demande_id: params.clientId
        }
      });

      if (invoiceError) {
        console.error('Error creating AbaNinja invoice:', invoiceError);
        throw new Error(`Erreur création facture: ${invoiceError.message}`);
      }

      if (!invoiceResult?.success) {
        console.error('AbaNinja invoice creation failed:', invoiceResult);
        throw new Error(invoiceResult?.error || 'Échec création facture AbaNinja');
      }

      const invoiceId = invoiceResult.invoice_id;
      const invoiceRef = invoiceResult.invoice_number;

      console.log('AbaNinja invoice created:', { invoiceId, invoiceRef });

      // Step 3: Update client record in database
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          abaninja_client_uuid: clientUuid,
          abaninja_invoice_id: invoiceId,
          abaninja_invoice_ref: invoiceRef
        })
        .eq('id', params.clientId);

      if (updateError) {
        console.error('Error updating client with AbaNinja refs:', updateError);
        // Don't throw here - invoice was created successfully
        toast({
          title: 'Attention',
          description: 'Facture créée mais mise à jour locale échouée',
          variant: 'destructive'
        });
      }

      toast({
        title: 'Facture créée',
        description: `Facture ${invoiceRef || 'AbaNinja'} envoyée à ${params.email}`
      });

      return {
        success: true,
        clientUuid,
        invoiceId,
        invoiceRef
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('useAbaNinjaInvoice error:', error);
      
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive'
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const resendInvoice = async (invoiceUuid: string, email: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('resend-abaninja-invoice', {
        body: {
          invoice_uuid: invoiceUuid,
          email
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Échec renvoi facture');

      toast({
        title: 'Facture renvoyée',
        description: `La facture a été renvoyée à ${email}`
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createInvoice,
    resendInvoice
  };
}

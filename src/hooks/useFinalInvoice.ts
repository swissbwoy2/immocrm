import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateFinalInvoiceParams {
  candidatureId: string;
  clientId: string;
  loyerMensuel: number;
  acomptePaye?: number;
  adresseBien: string;
}

interface FinalInvoiceResult {
  success: boolean;
  invoiceId?: string;
  invoiceRef?: string;
  montant?: number;
  error?: string;
}

export function useFinalInvoice() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createFinalInvoice = async (params: CreateFinalInvoiceParams): Promise<FinalInvoiceResult> => {
    const { candidatureId, clientId, loyerMensuel, acomptePaye = 300, adresseBien } = params;
    setLoading(true);
    
    try {
      // Step 1: Get client info (via clients.user_id → profiles) and check for existing AbaNinja UUID
      console.log('Fetching client info for final invoice...', { clientId });
      
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select(`
          id,
          user_id,
          abaninja_client_uuid,
          abaninja_invoice_id,
          profiles:user_id (
            id,
            prenom,
            nom,
            email,
            telephone,
            adresse
          )
        `)
        .eq('id', clientId)
        .single();

      if (clientError || !clientData) {
        throw new Error(`Client non trouvé: ${clientError?.message || 'Données manquantes'}`);
      }

      const profile = clientData.profiles as any;
      if (!profile) {
        throw new Error('Profil client non trouvé');
      }

      let clientUuid = clientData.abaninja_client_uuid;
      let addressUuid: string | null = null;

      // Step 2: If client doesn't have AbaNinja UUID, create the client first
      if (!clientUuid) {
        console.log('Client has no AbaNinja UUID, creating client first...');
        
        const { data: createClientResult, error: createClientError } = await supabase.functions.invoke('create-abaninja-client', {
          body: {
            prenom: profile.prenom || 'Client',
            nom: profile.nom || 'Inconnu',
            email: profile.email,
            telephone: profile.telephone || '',
            adresse: profile.adresse || ''
          }
        });

        if (createClientError || !createClientResult?.success) {
          throw new Error(`Erreur création client AbaNinja: ${createClientError?.message || createClientResult?.error}`);
        }

        clientUuid = createClientResult.client_uuid;
        addressUuid = createClientResult.address_uuid;

        // Update client record with AbaNinja UUID
        await supabase
          .from('clients')
          .update({ abaninja_client_uuid: clientUuid })
          .eq('id', clientId);

        console.log('AbaNinja client created:', { clientUuid, addressUuid });
      } else {
        // Fetch the address UUID from AbaNinja since we already have the client
        console.log('Client already has AbaNinja UUID, fetching address...');
        // For now, we'll pass the existing UUID - the edge function will handle missing address
        addressUuid = clientUuid; // Use same UUID as fallback
      }

      // Step 3: Create the final invoice
      console.log('Creating final invoice...', { 
        candidatureId, 
        loyerMensuel, 
        acomptePaye, 
        adresseBien 
      });
      
      const { data: invoiceResult, error: invoiceError } = await supabase.functions.invoke('create-final-invoice', {
        body: {
          client_uuid: clientUuid,
          address_uuid: addressUuid,
          candidature_id: candidatureId,
          loyer_mensuel: loyerMensuel,
          acompte_paye: acomptePaye,
          prenom: profile.prenom || 'Client',
          nom: profile.nom || '',
          email: profile.email,
          adresse_bien: adresseBien
        }
      });

      if (invoiceError) {
        console.error('Error creating final invoice:', invoiceError);
        throw new Error(`Erreur création facture finale: ${invoiceError.message}`);
      }

      if (!invoiceResult?.success) {
        console.error('Final invoice creation failed:', invoiceResult);
        throw new Error(invoiceResult?.error || 'Échec création facture finale');
      }

      const invoiceId = invoiceResult.invoice_id;
      const invoiceRef = invoiceResult.invoice_ref;
      const montant = invoiceResult.montant;

      console.log('Final invoice created:', { invoiceId, invoiceRef, montant });

      // Step 4: Update candidature with invoice references
      const { error: updateError } = await supabase
        .from('candidatures')
        .update({
          facture_finale_invoice_id: invoiceId,
          facture_finale_invoice_ref: invoiceRef,
          facture_finale_montant: montant,
          facture_finale_created_at: new Date().toISOString()
        })
        .eq('id', candidatureId);

      if (updateError) {
        console.error('Error updating candidature with invoice refs:', updateError);
        // Don't throw - invoice was created successfully
        toast({
          title: 'Attention',
          description: 'Facture créée mais mise à jour locale échouée',
          variant: 'destructive'
        });
      }

      toast({
        title: 'Facture finale créée',
        description: `Facture ${invoiceRef} de ${montant?.toFixed(2)} CHF envoyée à ${profile.email}`
      });

      return {
        success: true,
        invoiceId,
        invoiceRef,
        montant
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('useFinalInvoice error:', error);
      
      toast({
        title: 'Erreur facture finale',
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

  return {
    loading,
    createFinalInvoice
  };
}

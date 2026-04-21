import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinalInvoice } from './useFinalInvoice';
import { useToast } from './use-toast';

interface CandidatureData {
  client_id: string;
  offre_prix: number;
  offre_adresse: string;
}

interface ProgressionResult {
  success: boolean;
  invoiceData?: {
    facture_finale_invoice_id?: string;
    facture_finale_invoice_ref?: string;
    facture_finale_montant?: number;
    facture_finale_created_at?: string;
  };
  error?: string;
}

/**
 * Hook centralisé pour gérer les progressions de candidature avec génération automatique de facture.
 * 
 * Utilisé par tous les points d'entrée (Messagerie, Calendrier, Candidatures admin/agent)
 * pour garantir que la transition bail_conclu → attente_bail génère toujours la facture finale.
 */
export function useHandleCandidatureProgression() {
  const [loading, setLoading] = useState(false);
  const { createFinalInvoice, loading: invoiceLoading } = useFinalInvoice();
  const { toast } = useToast();

  /**
   * Gère la progression d'une candidature vers un nouveau statut.
   * Si la transition est bail_conclu → attente_bail, génère automatiquement la facture finale.
   */
  const progressCandidature = async (
    candidatureId: string,
    currentStatut: string,
    newStatut: string,
    candidatureData: CandidatureData,
    additionalUpdateData?: Record<string, any>
  ): Promise<ProgressionResult> => {
    setLoading(true);
    
    try {
      let invoiceData: Record<string, any> = {};

      // Si transition vers attente_bail depuis bail_conclu → créer facture finale
      if (currentStatut === 'bail_conclu' && newStatut === 'attente_bail') {
        console.log('[Progression] Transition bail_conclu → attente_bail, création facture finale...');
        
        const result = await createFinalInvoice({
          candidatureId,
          clientId: candidatureData.client_id,
          loyerMensuel: candidatureData.offre_prix,
          acomptePaye: 300,
          adresseBien: candidatureData.offre_adresse
        });

        if (result.success) {
          invoiceData = {
            facture_finale_invoice_id: result.invoiceId,
            facture_finale_invoice_ref: result.invoiceRef,
            facture_finale_montant: result.montant,
            facture_finale_created_at: new Date().toISOString()
          };
          console.log('[Progression] Facture finale créée:', invoiceData);
        } else {
          console.warn('[Progression] Échec création facture, progression continue sans facture:', result.error);
          // On ne bloque pas la progression si la facture échoue
        }
      }

      // Préparer les données de mise à jour
      const updateData: Record<string, any> = {
        statut: newStatut,
        ...invoiceData,
        ...additionalUpdateData
      };

      // Ajouter les flags de validation régie si applicable
      if (newStatut === 'attente_bail') {
        updateData.agent_valide_regie = true;
        updateData.agent_valide_regie_at = new Date().toISOString();
      }

      // Mettre à jour le statut
      const { error } = await (supabase
        .from('candidatures') as any)
        .update(updateData)
        .eq('id', candidatureId);

      if (error) {
        throw error;
      }

      return { 
        success: true, 
        invoiceData: Object.keys(invoiceData).length > 0 ? invoiceData : undefined 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[Progression] Erreur:', error);
      
      toast({
        title: 'Erreur progression',
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

  /**
   * Génère une facture finale manquante pour une candidature déjà avancée.
   * À utiliser pour rattraper les cas où la facture n'a pas été générée.
   */
  const createMissingInvoice = async (
    candidatureId: string,
    candidatureData: CandidatureData
  ): Promise<ProgressionResult> => {
    setLoading(true);
    
    try {
      console.log('[Rattrapage] Création facture finale manquante...');
      
      const result = await createFinalInvoice({
        candidatureId,
        clientId: candidatureData.client_id,
        loyerMensuel: candidatureData.offre_prix,
        acomptePaye: 300,
        adresseBien: candidatureData.offre_adresse
      });

      if (!result.success) {
        throw new Error(result.error || 'Échec création facture');
      }

      // La mise à jour de la candidature est déjà faite dans useFinalInvoice
      
      return {
        success: true,
        invoiceData: {
          facture_finale_invoice_id: result.invoiceId,
          facture_finale_invoice_ref: result.invoiceRef,
          facture_finale_montant: result.montant,
          facture_finale_created_at: new Date().toISOString()
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[Rattrapage] Erreur:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    progressCandidature,
    createMissingInvoice,
    loading: loading || invoiceLoading
  };
}

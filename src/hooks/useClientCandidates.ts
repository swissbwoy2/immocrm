import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientCandidate {
  id: string;
  client_id: string;
  type: 'garant' | 'colocataire' | 'co_debiteur' | 'signataire_solidaire';
  prenom: string;
  nom: string;
  email?: string;
  telephone?: string;
  date_naissance?: string;
  adresse?: string;
  nationalite?: string;
  type_permis?: string;
  situation_familiale?: string;
  gerance_actuelle?: string;
  contact_gerance?: string;
  loyer_actuel?: number;
  depuis_le?: string;
  pieces_actuel?: number;
  motif_changement?: string;
  profession?: string;
  employeur?: string;
  secteur_activite?: string;
  type_contrat?: string;
  source_revenus?: string;
  anciennete_mois?: number;
  date_engagement?: string;
  revenus_mensuels?: number;
  charges_mensuelles?: number;
  charges_extraordinaires?: boolean;
  montant_charges_extra?: number;
  autres_credits?: boolean;
  apport_personnel?: number;
  poursuites?: boolean;
  curatelle?: boolean;
  lien_avec_client?: string;
  created_at?: string;
  updated_at?: string;
}

export type CandidateType = ClientCandidate['type'];

export const CANDIDATE_TYPE_LABELS: Record<CandidateType, string> = {
  garant: '🛡️ Garant',
  colocataire: '👥 Colocataire',
  co_debiteur: '🤝 Co-débiteur',
  signataire_solidaire: '✍️ Signataire solidaire',
};

// Types qui contribuent au calcul du budget (revenus cumulés)
export const CUMULATIVE_TYPES: CandidateType[] = ['colocataire', 'co_debiteur', 'signataire_solidaire'];

export function useClientCandidates(clientId: string | undefined) {
  const [candidates, setCandidates] = useState<ClientCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    if (!clientId) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('client_candidates')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      
      setCandidates((data || []) as ClientCandidate[]);
      setError(null);
    } catch (err: any) {
      console.error('Error loading candidates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const addCandidate = async (candidateData: Omit<ClientCandidate, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => {
    if (!clientId) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('client_candidates')
        .insert({
          ...candidateData,
          client_id: clientId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setCandidates(prev => [...prev, data as ClientCandidate]);
      toast.success(`${CANDIDATE_TYPE_LABELS[candidateData.type]} ajouté avec succès`);
      return data as ClientCandidate;
    } catch (err: any) {
      console.error('Error adding candidate:', err);
      toast.error('Erreur lors de l\'ajout du candidat');
      return null;
    }
  };

  const updateCandidate = async (candidateId: string, updates: Partial<ClientCandidate>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('client_candidates')
        .update(updates)
        .eq('id', candidateId)
        .select()
        .single();

      if (updateError) throw updateError;

      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, ...data } as ClientCandidate : c));
      toast.success('Candidat mis à jour');
      return data as ClientCandidate;
    } catch (err: any) {
      console.error('Error updating candidate:', err);
      toast.error('Erreur lors de la mise à jour');
      return null;
    }
  };

  const deleteCandidate = async (candidateId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('client_candidates')
        .delete()
        .eq('id', candidateId);

      if (deleteError) throw deleteError;

      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      toast.success('Candidat supprimé');
      return true;
    } catch (err: any) {
      console.error('Error deleting candidate:', err);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  };

  // Calculer les revenus cumulés (sans garants)
  const getCumulativeIncome = useCallback(() => {
    return candidates
      .filter(c => CUMULATIVE_TYPES.includes(c.type))
      .reduce((sum, c) => sum + (c.revenus_mensuels || 0), 0);
  }, [candidates]);

  // Récupérer les garants valides
  const getValidGarants = useCallback(() => {
    return candidates.filter(c => 
      c.type === 'garant' && 
      !c.poursuites && 
      (c.revenus_mensuels || 0) > 0
    );
  }, [candidates]);

  return {
    candidates,
    loading,
    error,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    refresh: loadCandidates,
    getCumulativeIncome,
    getValidGarants,
  };
}

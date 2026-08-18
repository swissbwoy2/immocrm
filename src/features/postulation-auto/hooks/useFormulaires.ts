import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FormulaireChamp, FormulaireLocation } from '../types';

export function useFormulaires(onlyActive = false) {
  const [formulaires, setFormulaires] = useState<FormulaireLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('formulaires_location').select('*').order('created_at', { ascending: false });
    if (onlyActive) query = query.eq('actif', true);
    const { data } = await query;
    setFormulaires((data ?? []) as FormulaireLocation[]);
    setLoading(false);
  }, [onlyActive]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { formulaires, loading, reload };
}

export function useFormulaireChamps(formulaireId?: string | null) {
  const [champs, setChamps] = useState<FormulaireChamp[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!formulaireId) {
      setChamps([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('formulaire_champs')
      .select('*')
      .eq('formulaire_id', formulaireId)
      .order('page', { ascending: true });
    setChamps((data ?? []) as unknown as FormulaireChamp[]);
    setLoading(false);
  }, [formulaireId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { champs, setChamps, loading, reload };
}

import { supabase } from '@/integrations/supabase/client';

export interface LlmFillResult {
  mode: 'acroform' | 'overlay';
  /** { nomChampPdf | cle_champ : valeur } */
  values: Record<string, string>;
  fields: { name: string; type: string; options?: string[] }[];
  filled: number;
}

/** Appelle le moteur de remplissage intelligent (LLM côté serveur). */
export async function llmFillPostulation(params: {
  formulaireId: string;
  clientId: string;
  offreId?: string | null;
  lieu?: string;
}): Promise<LlmFillResult> {
  const { data, error } = await supabase.functions.invoke('postulation-fill-llm', {
    body: {
      formulaireId: params.formulaireId,
      clientId: params.clientId,
      offreId: params.offreId ?? null,
      lieu: params.lieu ?? 'Genève',
    },
  });
  if (error) throw new Error((data as any)?.error ?? error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as LlmFillResult;
}

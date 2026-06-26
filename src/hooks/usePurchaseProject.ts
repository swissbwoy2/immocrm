import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_FINANCING_SETTINGS,
  FinancingSettings,
  computeFinancing,
  computeProgression,
  ACHAT_STEPS,
  FinancingComputed,
} from '@/lib/purchaseFinancing';

export interface PurchaseProject {
  id: string;
  client_id: string;
  user_id: string | null;
  assigned_agent_id: string | null;
  statut: string;
  statut_mandat: string | null;
  statut_acompte: string | null;
  montant_mandat: number | null;
  montant_acompte: number | null;
  duree_progression_jours: number;
  date_debut_progression: string | null;
  date_fin_progression: string | null;
  date_signature_mandat: string | null;
  date_paiement_acompte: string | null;
  conditions_renouvellement: string | null;
  conditions_resiliation: string | null;
  conditions_remboursement: string | null;
  notes_internes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsePurchaseProjectResult {
  loading: boolean;
  project: PurchaseProject | null;
  financing: any | null;
  computed: FinancingComputed | null;
  settings: FinancingSettings;
  properties: any[];
  visitReports: any[];
  negotiations: any[];
  notary: any | null;
  steps: any[];
  documents: any[];
  agent: any | null;
  reload: () => Promise<void>;
}

export function usePurchaseProject(opts: { userId?: string | null; clientId?: string | null }): UsePurchaseProjectResult {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<PurchaseProject | null>(null);
  const [financing, setFinancing] = useState<any | null>(null);
  const [settings, setSettings] = useState<FinancingSettings>(DEFAULT_FINANCING_SETTINGS);
  const [properties, setProperties] = useState<any[]>([]);
  const [visitReports, setVisitReports] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [notary, setNotary] = useState<any | null>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [agent, setAgent] = useState<any | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    // Settings (toujours, modifiables côté admin)
    const { data: settingsRows } = await supabase.from('purchase_financing_settings').select('key,value');
    if (settingsRows && settingsRows.length > 0) {
      const s = { ...DEFAULT_FINANCING_SETTINGS };
      settingsRows.forEach((r: any) => {
        if (r.key in s) (s as any)[r.key] = Number(r.value);
      });
      setSettings(s);
    }

    // Projet
    let q = supabase.from('purchase_projects').select('*').order('created_at', { ascending: false }).limit(1);
    if (opts.clientId) q = q.eq('client_id', opts.clientId);
    else if (opts.userId) q = q.eq('user_id', opts.userId);
    else { setLoading(false); return; }

    const { data: prj } = await q.maybeSingle();
    setProject(prj as any);

    if (!prj) {
      setLoading(false);
      return;
    }

    const projectId = (prj as any).id;
    const [fin, props, visits, negos, not, stepsRes, docs] = await Promise.all([
      supabase.from('purchase_financing_profiles').select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('purchase_selected_properties').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('purchase_visit_reports').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('purchase_negotiations').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('purchase_notary_steps').select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('purchase_project_steps').select('*').eq('project_id', projectId).order('ordre'),
      supabase.from('documents').select('*').eq('purchase_project_id', projectId),
    ]);

    setFinancing(fin.data);
    setProperties(props.data || []);
    setVisitReports(visits.data || []);
    setNegotiations(negos.data || []);
    setNotary(not.data);
    setSteps(stepsRes.data || []);
    setDocuments(docs.data || []);

    if ((prj as any).assigned_agent_id) {
      const { data: a } = await supabase
        .from('agents')
        .select('id, user_id, profile:profiles!agents_user_id_fkey(prenom, nom, email, telephone, avatar_url)')
        .eq('id', (prj as any).assigned_agent_id)
        .maybeSingle();
      if (a) setAgent({
        prenom: (a.profile as any)?.prenom, nom: (a.profile as any)?.nom,
        email: (a.profile as any)?.email, telephone: (a.profile as any)?.telephone,
        avatar_url: (a.profile as any)?.avatar_url,
      });
    }

    setLoading(false);
  }, [opts.clientId, opts.userId]);

  useEffect(() => { void reload(); }, [reload]);

  const computed = financing ? computeFinancing(financing, settings) : null;

  return { loading, project, financing, computed, settings, properties, visitReports, negotiations, notary, steps, documents, agent, reload };
}

export { ACHAT_STEPS, computeProgression };

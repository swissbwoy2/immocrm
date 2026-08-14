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
  // mutations
  createProject: (clientId: string, userId: string | null, agentId: string | null) => Promise<string | null>;
  updateProject: (patch: Partial<PurchaseProject>) => Promise<void>;
  updateFinancing: (patch: Record<string, any>) => Promise<void>;
  activateProject: () => Promise<void>;
  upsertProperty: (row: any) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  upsertVisitReport: (row: any) => Promise<void>;
  deleteVisitReport: (id: string) => Promise<void>;
  upsertNegotiation: (row: any) => Promise<void>;
  deleteNegotiation: (id: string) => Promise<void>;
  upsertNotary: (row: any) => Promise<void>;
  updateStep: (id: string, patch: any) => Promise<void>;
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
    const { data: settingsRows } = await supabase.from('purchase_financing_settings').select('key,value');
    if (settingsRows && settingsRows.length > 0) {
      const s = { ...DEFAULT_FINANCING_SETTINGS };
      settingsRows.forEach((r: any) => { if (r.key in s) (s as any)[r.key] = Number(r.value); });
      setSettings(s);
    }

    if (!opts.clientId && !opts.userId) { setLoading(false); return; }

    // Détection stricte acheteur : le projet peut être lié au client_id OU au user_id
    // (certains acheteurs invités admin ont été créés avant la liaison client_id complète).
    let prj: any = null;
    if (opts.clientId) {
      const { data } = await supabase
        .from('purchase_projects')
        .select('*')
        .eq('client_id', opts.clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      prj = data;
    }
    if (!prj && opts.userId) {
      const { data } = await supabase
        .from('purchase_projects')
        .select('*')
        .eq('user_id', opts.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      prj = data;
    }
    // Parcours achat : la durée du mandat est verrouillée à 180 jours minimum (6 mois).
    if (prj) {
      prj = { ...prj, duree_progression_jours: Math.max(180, Number((prj as any).duree_progression_jours) || 0) };
    }
    setProject(prj as any);

    if (!prj) {
      setFinancing(null);
      setProperties([]);
      setVisitReports([]);
      setNegotiations([]);
      setNotary(null);
      setSteps([]);
      setDocuments([]);
      setAgent(null);
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

    // Conseiller affiché : priorité au assigned_agent_id du projet,
    // sinon repli sur clients.agent_id (parcours achat invité admin sans seed du projet).
    let agentId: string | null = (prj as any).assigned_agent_id || null;
    if (!agentId && (prj as any).client_id) {
      const { data: cli } = await supabase.from('clients').select('agent_id').eq('id', (prj as any).client_id).maybeSingle();
      agentId = (cli as any)?.agent_id || null;
    }
    if (agentId) {
      const { data: a } = await supabase
        .from('agents')
        .select('id, user_id, profile:profiles!agents_user_id_fkey(prenom, nom, email, telephone, avatar_url)')
        .eq('id', agentId)
        .maybeSingle();
      if (a) setAgent({
        prenom: (a.profile as any)?.prenom, nom: (a.profile as any)?.nom,
        email: (a.profile as any)?.email, telephone: (a.profile as any)?.telephone,
        avatar_url: (a.profile as any)?.avatar_url,
      });
    } else {
      setAgent(null);
    }

    setLoading(false);
  }, [opts.clientId, opts.userId]);

  useEffect(() => { void reload(); }, [reload]);

  // Les revenus et fonds propres des co-acquéreurs entrent dans la capacité d'achat.
  const coAcheteurs: any[] = Array.isArray((project as any)?.co_acheteurs) ? (project as any).co_acheteurs : [];
  const coRevenus = coAcheteurs.reduce((acc, c) => acc + (Number(c?.revenu_annuel) || 0), 0);
  const coFondsPropres = coAcheteurs.reduce((acc, c) => acc + (Number(c?.fonds_propres) || 0), 0);

  const computed = financing
    ? computeFinancing(
        {
          ...financing,
          autres_revenus: (Number(financing.autres_revenus) || 0) + coRevenus,
          placements: (Number(financing.placements) || 0) + coFondsPropres,
        },
        settings,
      )
    : null;

  const createProject = useCallback(async (clientId: string, userId: string | null, agentId: string | null) => {
    // idempotent: skip if a project already exists for this client OR user.
    const { data: existingByClient } = await supabase.from('purchase_projects').select('id').eq('client_id', clientId).limit(1).maybeSingle();
    if (existingByClient?.id) return existingByClient.id;

    const { data: existingByUser } = userId
      ? await supabase.from('purchase_projects').select('id').eq('user_id', userId).limit(1).maybeSingle()
      : { data: null as any };
    if (existingByUser?.id) return existingByUser.id;

    await supabase.from('clients').update({
      type_recherche: 'Acheter',
      journey_type: 'purchase_search',
      statut: 'en_attente',
      priorite: 'haute',
    } as any).eq('id', clientId);

    const { data: created, error } = await supabase
      .from('purchase_projects')
      .insert({
        client_id: clientId,
        user_id: userId,
        assigned_agent_id: agentId,
        statut: 'en_attente_activation',
        statut_mandat: 'a_signer',
        statut_acompte: 'a_payer',
        montant_mandat: 4999,
        montant_acompte: 2499,
        duree_progression_jours: 180,
        date_debut_progression: null,
      })
      .select('id').single();
    if (error || !created) { console.error(error); return null; }

    const projectId = created.id;
    // 17 steps
    const stepsPayload = ACHAT_STEPS.map((s) => ({
      project_id: projectId, step_key: s.key, label: s.label, ordre: s.ordre, statut: 'a_faire',
    }));
    await supabase.from('purchase_project_steps').upsert(stepsPayload, { onConflict: 'project_id,step_key', ignoreDuplicates: true });
    const { data: existingFin } = await supabase.from('purchase_financing_profiles').select('id').eq('project_id', projectId).maybeSingle();
    if (!existingFin?.id) await supabase.from('purchase_financing_profiles').insert({ project_id: projectId, statut_bancaire: 'a_evaluer' } as any);
    if (userId) {
      await supabase
        .from('documents')
        .update({ purchase_project_id: projectId, purchase_category: 'autre' } as any)
        .eq('user_id', userId)
        .is('purchase_project_id', null);
    }
    await reload();
    return projectId;
  }, [reload]);

  const updateProject = useCallback(async (patch: Partial<PurchaseProject>) => {
    if (!project) return;
    const safePatch: Partial<PurchaseProject> = { ...patch };
    if (safePatch.duree_progression_jours !== undefined) {
      safePatch.duree_progression_jours = Math.max(180, Number(safePatch.duree_progression_jours) || 0);
    }
    await supabase.from('purchase_projects').update(safePatch).eq('id', project.id);
    await reload();
  }, [project, reload]);

  const updateFinancing = useCallback(async (patch: Record<string, any>) => {
    if (!project) return;
    if (financing?.id) {
      await supabase.from('purchase_financing_profiles').update(patch as any).eq('id', financing.id);
    } else {
      await supabase.from('purchase_financing_profiles').insert({ project_id: project.id, ...patch } as any);
    }
    await reload();
  }, [project, financing, reload]);

  const upsertProperty = useCallback(async (row: any) => {
    if (!project) return;
    const payload = { ...row, project_id: project.id };
    if (row.id) await supabase.from('purchase_selected_properties').update(payload).eq('id', row.id);
    else await supabase.from('purchase_selected_properties').insert(payload);
    await reload();
  }, [project, reload]);

  const deleteProperty = useCallback(async (id: string) => {
    await supabase.from('purchase_selected_properties').delete().eq('id', id);
    await reload();
  }, [reload]);

  const upsertVisitReport = useCallback(async (row: any) => {
    if (!project) return;
    const payload = { ...row, project_id: project.id };
    if (row.id) await supabase.from('purchase_visit_reports').update(payload).eq('id', row.id);
    else await supabase.from('purchase_visit_reports').insert(payload);
    await reload();
  }, [project, reload]);

  const deleteVisitReport = useCallback(async (id: string) => {
    await supabase.from('purchase_visit_reports').delete().eq('id', id);
    await reload();
  }, [reload]);

  const upsertNegotiation = useCallback(async (row: any) => {
    if (!project) return;
    const payload = { ...row, project_id: project.id };
    if (row.id) await supabase.from('purchase_negotiations').update(payload).eq('id', row.id);
    else await supabase.from('purchase_negotiations').insert(payload);
    await reload();
  }, [project, reload]);

  const deleteNegotiation = useCallback(async (id: string) => {
    await supabase.from('purchase_negotiations').delete().eq('id', id);
    await reload();
  }, [reload]);

  const upsertNotary = useCallback(async (row: any) => {
    if (!project) return;
    const payload = { ...row, project_id: project.id };
    if (notary?.id) await supabase.from('purchase_notary_steps').update(payload).eq('id', notary.id);
    else await supabase.from('purchase_notary_steps').insert(payload);
    await reload();
  }, [project, notary, reload]);

  const updateStep = useCallback(async (id: string, patch: any) => {
    await supabase.from('purchase_project_steps').update(patch).eq('id', id);
    await reload();
  }, [reload]);

  // 🆕 Activation explicite par l'admin : passe le projet en "actif" et démarre la progression (mandat 6 mois).
  const activateProject = useCallback(async () => {
    if (!project) return;
    await supabase.from('purchase_projects').update({
      statut: 'actif',
      date_debut_progression: new Date().toISOString().slice(0, 10),
    }).eq('id', project.id);
    await reload();
  }, [project, reload]);

  return {
    loading, project, financing, computed, settings,
    properties, visitReports, negotiations, notary, steps, documents, agent, reload,
    createProject, updateProject, updateFinancing, activateProject,
    upsertProperty, deleteProperty,
    upsertVisitReport, deleteVisitReport,
    upsertNegotiation, deleteNegotiation,
    upsertNotary, updateStep,
  };
}

export { ACHAT_STEPS, computeProgression };

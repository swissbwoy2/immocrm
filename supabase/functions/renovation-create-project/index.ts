import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_MILESTONES = [
  { title: 'Diagnostic initial', sort_order: 1 },
  { title: 'Cahier des charges', sort_order: 2 },
  { title: 'Appel d\'offres / Devis', sort_order: 3 },
  { title: 'Sélection entreprises', sort_order: 4 },
  { title: 'Autorisations / Permis', sort_order: 5 },
  { title: 'Début des travaux', sort_order: 6 },
  { title: 'Gros œuvre', sort_order: 7 },
  { title: 'Second œuvre', sort_order: 8 },
  { title: 'Finitions', sort_order: 9 },
  { title: 'Réception des travaux', sort_order: 10 },
  { title: 'Clôture projet', sort_order: 11 },
];

const DEFAULT_BUDGET_CATEGORIES = [
  'Architecture / Ingénierie',
  'Démolition',
  'Gros œuvre',
  'Toiture / Étanchéité',
  'Menuiserie extérieure',
  'Menuiserie intérieure',
  'Électricité',
  'Plomberie / Sanitaire',
  'Chauffage / Ventilation',
  'Peinture / Revêtements',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT and get user
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check role: admin or agent only
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || !['admin', 'agent'].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin or agent required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { immeuble_id, title, description, project_type, priority, start_date_planned, end_date_planned, budget_estimated } = body;

    if (!immeuble_id || !title) {
      return new Response(JSON.stringify({ error: 'immeuble_id and title are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify immeuble exists
    const { data: immeuble } = await supabase
      .from('immeubles')
      .select('id, agent_responsable_id')
      .eq('id', immeuble_id)
      .single();

    if (!immeuble) {
      return new Response(JSON.stringify({ error: 'Immeuble not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Agent can only create projects on buildings they manage
    if (roleData.role === 'agent' && immeuble.agent_responsable_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: agent does not manage this building' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('renovation_projects')
      .insert({
        immeuble_id,
        title,
        description: description || null,
        project_type: project_type || 'renovation',
        priority: priority || 'medium',
        start_date_planned: start_date_planned || null,
        end_date_planned: end_date_planned || null,
        budget_estimated: budget_estimated || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      return new Response(JSON.stringify({ error: projectError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create default milestones
    const milestones = DEFAULT_MILESTONES.map(m => ({
      project_id: project.id,
      title: m.title,
      sort_order: m.sort_order,
    }));
    await supabase.from('renovation_milestones').insert(milestones);

    // Create default budget lines
    const budgetLines = DEFAULT_BUDGET_CATEGORIES.map(cat => ({
      project_id: project.id,
      category: cat,
      label: cat,
    }));
    await supabase.from('renovation_budget_lines').insert(budgetLines);

    // Add creator as member
    await supabase.from('renovation_project_members').insert({
      project_id: project.id,
      user_id: user.id,
      role: 'manager',
      can_validate: true,
      can_manage_budget: true,
      added_by: user.id,
    });

    // Audit log
    await supabase.from('renovation_audit_logs').insert({
      project_id: project.id,
      user_id: user.id,
      action: 'project_created',
      target_table: 'renovation_projects',
      target_id: project.id,
      new_data: { title, immeuble_id, project_type },
    });

    return new Response(JSON.stringify({ id: project.id }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

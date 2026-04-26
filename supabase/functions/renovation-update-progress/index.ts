import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Verify JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { projectId, milestoneId, taskId, status, actualDate } = body;

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update milestone
    if (milestoneId && status) {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (status === 'completed') {
        updateData.actual_date = actualDate || new Date().toISOString().split('T')[0];
      }
      await supabase
        .from('renovation_milestones')
        .update(updateData)
        .eq('id', milestoneId)
        .eq('project_id', projectId);

      await supabase.from('renovation_audit_logs').insert({
        project_id: projectId,
        user_id: user.id,
        action: 'milestone_updated',
        target_table: 'renovation_milestones',
        target_id: milestoneId,
        new_data: { status, actual_date: updateData.actual_date },
      });
    }

    // Update task
    if (taskId && status) {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      await supabase
        .from('renovation_tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('project_id', projectId);

      await supabase.from('renovation_audit_logs').insert({
        project_id: projectId,
        user_id: user.id,
        action: 'task_updated',
        target_table: 'renovation_tasks',
        target_id: taskId,
        new_data: { status },
      });
    }

    // Recalculate overall progress (weighted milestone completion)
    const { data: milestones } = await supabase
      .from('renovation_milestones')
      .select('id, status, weight')
      .eq('project_id', projectId);

    if (milestones && milestones.length > 0) {
      const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 1), 0);
      const completedWeight = milestones
        .filter(m => m.status === 'completed')
        .reduce((sum, m) => sum + (m.weight || 1), 0);
      const progressPct = Math.round((completedWeight / totalWeight) * 100);

      // Determine project status based on progress
      let newStatus: string | null = null;
      if (progressPct === 100) {
        newStatus = 'completed';
      } else if (progressPct > 0) {
        // Only auto-set to in_progress if currently in planning/approved
        const { data: project } = await supabase
          .from('renovation_projects')
          .select('status')
          .eq('id', projectId)
          .single();

        if (project && ['planning', 'approved'].includes(project.status)) {
          newStatus = 'in_progress';
        }
      }

      if (newStatus) {
        await supabase
          .from('renovation_projects')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', projectId);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

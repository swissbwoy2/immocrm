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
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, companyId } = await req.json();

    if (!projectId || !companyId) {
      return new Response(JSON.stringify({ error: 'projectId and companyId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all tasks for this company on this project
    const { data: tasks } = await supabase
      .from('renovation_tasks')
      .select('id, status, due_date, completed_at, title')
      .eq('project_id', projectId)
      .eq('company_id', companyId);

    if (!tasks || tasks.length < 3) {
      return new Response(JSON.stringify({
        score: null,
        message: 'Insufficient data: minimum 3 tasks required for scoring',
        task_count: tasks?.length || 0,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deterministic scoring
    let onTimeCount = 0;
    let completedCount = 0;
    let totalTasks = tasks.length;

    for (const task of tasks) {
      if (task.status === 'completed') {
        completedCount++;
        if (task.due_date && task.completed_at) {
          const due = new Date(task.due_date);
          const completed = new Date(task.completed_at);
          if (completed <= due) {
            onTimeCount++;
          }
        } else {
          onTimeCount++;
        }
      }
    }

    const score = Math.round((onTimeCount / totalTasks) * 100);

    const { error: upsertError } = await supabase
      .from('renovation_company_scores')
      .upsert({
        project_id: projectId,
        company_id: companyId,
        score_type: 'reliability',
        score,
        details: {
          total_tasks: totalTasks,
          completed: completedCount,
          on_time: onTimeCount,
          scored_at: new Date().toISOString(),
        },
      }, {
        onConflict: 'project_id,company_id,score_type',
      });

    if (upsertError) {
      console.error(JSON.stringify({ event: "renovation_error", function: "renovation-score-companies", project_id: projectId, error: upsertError.message, context: { company_id: companyId } }));
    }

    return new Response(JSON.stringify({
      score,
      total_tasks: totalTasks,
      completed: completedCount,
      on_time: onTimeCount,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(JSON.stringify({ event: "renovation_error", function: "renovation-score-companies", error: err.message }));
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

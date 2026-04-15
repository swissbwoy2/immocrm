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

    // Check role
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
    const { projectId, fileId, companyId, title, reference, notes } = body;

    if (!projectId || !companyId || !title) {
      return new Response(JSON.stringify({ error: 'projectId, companyId, and title are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify project exists and user can manage it
    const { data: project } = await supabase
      .from('renovation_projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If fileId provided, verify it belongs to the project and is category 'quote'
    if (fileId) {
      const { data: file } = await supabase
        .from('renovation_project_files')
        .select('id, project_id, category')
        .eq('id', fileId)
        .single();

      if (!file) {
        return new Response(JSON.stringify({ error: 'File not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (file.project_id !== projectId) {
        return new Response(JSON.stringify({ error: 'File does not belong to this project' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (file.category !== 'quote') {
        return new Response(JSON.stringify({ error: 'File is not categorized as a quote' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Verify company is linked to the project
    const { data: projectCompany } = await supabase
      .from('renovation_project_companies')
      .select('id')
      .eq('project_id', projectId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (!projectCompany) {
      return new Response(JSON.stringify({ error: 'Company is not linked to this project' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert quote (DB unique index on file_id prevents duplicates)
    const { data: quote, error: insertError } = await supabase
      .from('renovation_quotes')
      .insert({
        project_id: projectId,
        company_id: companyId,
        file_id: fileId || null,
        title,
        reference: reference || null,
        notes: notes || null,
        status: 'received',
      })
      .select('id')
      .single();

    if (insertError) {
      // Handle unique constraint violation (duplicate file_id)
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ error: 'A quote already exists for this file' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Audit log
    await supabase.from('renovation_audit_logs').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'quote_created',
      target_table: 'renovation_quotes',
      target_id: quote.id,
      new_data: { title, companyId, fileId },
    });

    return new Response(JSON.stringify({ id: quote.id }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { projectId, storagePath, fileName, category, mimeType, fileSize, fileHash, tags } = await req.json();

    if (!projectId || !storagePath || !fileName) {
      return new Response(JSON.stringify({ error: 'projectId, storagePath, and fileName are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate storage path matches project
    if (!storagePath.startsWith(`project/${projectId}/`)) {
      return new Response(JSON.stringify({ error: 'Invalid storage path for this project' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert file record
    const { data: file, error: fileError } = await supabase
      .from('renovation_project_files')
      .insert({
        project_id: projectId,
        category: category || 'other',
        file_name: fileName,
        storage_path: storagePath,
        file_size: fileSize || null,
        mime_type: mimeType || null,
        file_hash: fileHash || null,
        tags: tags || null,
        uploaded_by: user.id,
      })
      .select('id')
      .single();

    if (fileError) {
      console.error('File insert error:', fileError);
      return new Response(JSON.stringify({ error: fileError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create analysis job
    const { data: job, error: jobError } = await supabase
      .from('renovation_analysis_jobs')
      .insert({
        file_id: file.id,
        project_id: projectId,
        status: 'queued',
        analysis_type: 'document_summary',
      })
      .select('id')
      .single();

    if (jobError) {
      console.error('Job insert error:', jobError);
    }

    // Audit log
    await supabase.from('renovation_audit_logs').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'file_uploaded',
      target_table: 'renovation_project_files',
      target_id: file.id,
      new_data: { fileName, category, storagePath },
    });

    // Auto-trigger analysis (fire and forget)
    if (job) {
      const analyzeUrl = `${supabaseUrl}/functions/v1/renovation-analyze-file`;
      fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId: job.id }),
      }).catch(err => {
        console.error('Auto-analyze trigger failed:', err);
      });
    }

    return new Response(JSON.stringify({
      fileId: file.id,
      jobId: job?.id || null,
    }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: (err instanceof Error ? err.message : String(err)) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Categories restricted from company_users
const RESTRICTED_CATEGORIES = ['contract', 'diagnostic', 'insurance'];

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

    const { fileId } = await req.json();

    if (!fileId) {
      return new Response(JSON.stringify({ error: 'fileId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Server-side lookup: get file details
    const { data: file, error: fileError } = await supabase
      .from('renovation_project_files')
      .select('id, project_id, storage_path, category, file_name, mime_type')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user access to project
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdminOrAgent = roleData && ['admin', 'agent'].includes(roleData.role);

    // Check if project member
    const { data: isMember } = await supabase
      .from('renovation_project_members')
      .select('id')
      .eq('project_id', file.project_id)
      .eq('user_id', user.id)
      .maybeSingle();

    // Check if proprietaire
    const { data: projectData } = await supabase
      .from('renovation_projects')
      .select('immeuble_id, created_by')
      .eq('id', file.project_id)
      .single();

    let isProprietaire = false;
    if (projectData) {
      const { data: imm } = await supabase
        .from('immeubles')
        .select('proprietaire_id')
        .eq('id', projectData.immeuble_id)
        .single();
      if (imm?.proprietaire_id) {
        const { data: prop } = await supabase
          .from('proprietaires')
          .select('id')
          .eq('id', imm.proprietaire_id)
          .eq('user_id', user.id)
          .maybeSingle();
        isProprietaire = !!prop;
      }
    }

    // Check if company_user on project
    let isCompanyUser = false;
    const { data: companyLinks } = await supabase
      .from('renovation_company_users')
      .select('company_id')
      .eq('user_id', user.id);

    if (companyLinks && companyLinks.length > 0) {
      const companyIds = companyLinks.map(c => c.company_id);
      const { data: projCompany } = await supabase
        .from('renovation_project_companies')
        .select('id')
        .eq('project_id', file.project_id)
        .in('company_id', companyIds)
        .maybeSingle();
      isCompanyUser = !!projCompany;
    }

    const isCreator = projectData?.created_by === user.id;

    // Deny if no access at all
    if (!isAdminOrAgent && !isMember && !isProprietaire && !isCompanyUser && !isCreator) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Company users: check category restriction
    if (isCompanyUser && !isAdminOrAgent && !isMember && !isProprietaire && !isCreator) {
      if (RESTRICTED_CATEGORIES.includes(file.category)) {
        return new Response(JSON.stringify({ error: 'Access denied for this file category' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Generate signed download URL (5 minutes)
    const { data: signedUrl, error: signError } = await supabase.storage
      .from('renovation-private')
      .createSignedUrl(file.storage_path, 300);

    if (signError || !signedUrl) {
      console.error('Signed URL error:', signError);
      return new Response(JSON.stringify({ error: 'Failed to generate download URL' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Audit log
    await supabase.from('renovation_audit_logs').insert({
      project_id: file.project_id,
      user_id: user.id,
      action: 'file_downloaded',
      target_table: 'renovation_project_files',
      target_id: file.id,
      new_data: { file_name: file.file_name, category: file.category },
    });

    return new Response(JSON.stringify({
      signedUrl: signedUrl.signedUrl,
      fileName: file.file_name,
      mimeType: file.mime_type,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: (err instanceof Error ? err.message : String(err)) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

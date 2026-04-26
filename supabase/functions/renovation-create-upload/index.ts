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

    const { projectId, fileName, category, mimeType } = await req.json();

    if (!projectId || !fileName) {
      return new Response(JSON.stringify({ error: 'projectId and fileName are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user can upload to this project
    const { data: canUpload } = await supabase.rpc('renovation_user_can_upload_to_project', { _project_id: projectId });
    // Since it's SECURITY DEFINER with auth.uid(), we need to check via member/role tables directly
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdminOrAgent = roleData && ['admin', 'agent'].includes(roleData.role);

    const { data: isMember } = await supabase
      .from('renovation_project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: isCompanyUser } = await supabase
      .from('renovation_project_companies')
      .select('id, company_id')
      .eq('project_id', projectId)
      .maybeSingle();

    let companyLink = false;
    if (isCompanyUser) {
      const { data: cuLink } = await supabase
        .from('renovation_company_users')
        .select('id')
        .eq('company_id', isCompanyUser.company_id)
        .eq('user_id', user.id)
        .maybeSingle();
      companyLink = !!cuLink;
    }

    // Check proprietaire via immeuble
    const { data: projectData } = await supabase
      .from('renovation_projects')
      .select('immeuble_id')
      .eq('id', projectId)
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

    if (!isAdminOrAgent && !isMember && !companyLink && !isProprietaire) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate controlled path
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `project/${projectId}/${category || 'other'}/${timestamp}_${sanitizedName}`;

    // Create signed upload URL
    const { data: signedUrl, error: signError } = await supabase.storage
      .from('renovation-private')
      .createSignedUploadUrl(storagePath);

    if (signError) {
      console.error('Signed URL error:', signError);
      return new Response(JSON.stringify({ error: signError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      signedUrl: signedUrl.signedUrl,
      token: signedUrl.token,
      path: signedUrl.path,
      storagePath,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { denyIfNoProjectAccess } from "../_shared/renovation-access.ts";

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

    const accessDenied = await denyIfNoProjectAccess(
      supabase,
      user.id,
      projectId,
      corsHeaders,
      'renovation-create-upload',
    );
    if (accessDenied) return accessDenied;

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

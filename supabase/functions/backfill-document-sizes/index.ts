import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Optional: target a specific client
    let clientId: string | null = null;
    try {
      const body = await req.json();
      clientId = body?.client_id || null;
    } catch { /* no body */ }

    // Process in batches of 50
    const batchSize = 50;
    let totalUpdated = 0;
    let totalProcessed = 0;
    const errors: string[] = [];
    let hasMore = true;

    while (hasMore) {
      let query = supabaseAdmin
        .from('documents')
        .select('id, url, nom')
        .is('taille', null)
        .limit(batchSize);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: docs, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (!docs || docs.length === 0) {
        hasMore = false;
        break;
      }

      totalProcessed += docs.length;

      for (const doc of docs) {
        if (!doc.url || doc.url.startsWith('data:')) continue;

        try {
          let filePath = doc.url;
          if (filePath.includes('/client-documents/')) {
            filePath = filePath.split('/client-documents/')[1];
          } else if (filePath.includes('/storage/v1/object/')) {
            const match = filePath.match(/\/storage\/v1\/object\/(?:public|sign)\/([^?]+)/);
            if (match) filePath = match[1];
          }

          // Remove query params
          filePath = filePath.split('?')[0];

          // Remove bucket prefix if present
          const buckets = ['client-documents', 'mandates-private'];
          let downloaded = false;

          for (const bucket of buckets) {
            const cleanPath = filePath.startsWith(`${bucket}/`) 
              ? filePath.replace(`${bucket}/`, '') 
              : filePath;

            const { data: fileData, error: dlError } = await supabaseAdmin.storage
              .from(bucket)
              .download(cleanPath);

            if (!dlError && fileData) {
              const size = fileData.size;
              await supabaseAdmin.from('documents').update({ taille: size }).eq('id', doc.id);
              totalUpdated++;
              downloaded = true;
              break;
            }
          }

          if (!downloaded) {
            errors.push(`${doc.nom}: file not found in any bucket`);
          }
        } catch (e) {
          errors.push(`${doc.nom}: ${e.message}`);
        }
      }

      // If we got fewer than batchSize, we're done
      if (docs.length < batchSize) {
        hasMore = false;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      total_processed: totalProcessed,
      updated: totalUpdated, 
      errors: errors.length > 0 ? errors : undefined 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

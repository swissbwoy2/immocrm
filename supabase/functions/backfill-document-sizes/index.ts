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

    // Get documents with null taille
    const { data: docs, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('id, url, nom')
      .is('taille', null)
      .limit(100);

    if (fetchError) throw fetchError;
    if (!docs || docs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No documents to backfill', updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updated = 0;
    const errors: string[] = [];

    for (const doc of docs) {
      if (!doc.url || doc.url.startsWith('data:')) continue;

      try {
        // Extract relative path
        let filePath = doc.url;
        if (filePath.includes('/client-documents/')) {
          filePath = filePath.split('/client-documents/')[1];
        } else if (filePath.includes('/storage/v1/object/')) {
          const match = filePath.match(/\/storage\/v1\/object\/(?:public|sign)\/([^?]+)/);
          if (match) filePath = match[1];
        }

        // Try to download to get size
        const { data: fileData, error: dlError } = await supabaseAdmin.storage
          .from('client-documents')
          .download(filePath);

        if (dlError) {
          // Try mandates-private bucket
          const { data: fileData2, error: dlError2 } = await supabaseAdmin.storage
            .from('mandates-private')
            .download(filePath);

          if (dlError2) {
            errors.push(`${doc.nom}: file not found in storage`);
            continue;
          }
          
          const size = fileData2.size;
          await supabaseAdmin.from('documents').update({ taille: size }).eq('id', doc.id);
          updated++;
          continue;
        }

        const size = fileData.size;
        await supabaseAdmin.from('documents').update({ taille: size }).eq('id', doc.id);
        updated++;
      } catch (e) {
        errors.push(`${doc.nom}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      total: docs.length,
      updated, 
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

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobId, force } = await req.json();

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If force=true, reset completed job to queued
    if (force) {
      await supabase
        .from('renovation_analysis_jobs')
        .update({ status: 'queued', locked_at: null, last_error: null })
        .eq('id', jobId)
        .eq('status', 'completed');
    }

    // Atomic lock via RPC (increments attempts atomically)
    const { data: lockedJobs, error: lockError } = await supabase
      .rpc('renovation_lock_analysis_job', { _job_id: jobId });

    const lockedJob = lockedJobs?.[0];

    if (!lockedJob) {
      return new Response(JSON.stringify({ message: 'Job not available for processing (already processing or completed)' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // Get file info
      const { data: file } = await supabase
        .from('renovation_project_files')
        .select('storage_path, file_name, mime_type, category')
        .eq('id', lockedJob.file_id)
        .single();

      if (!file) {
        throw new Error('File record not found');
      }

      // Download file from storage
      const { data: fileData, error: dlError } = await supabase.storage
        .from('renovation-private')
        .download(file.storage_path);

      if (dlError || !fileData) {
        throw new Error(`File download failed: ${dlError?.message || 'no data'}`);
      }

      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      let analysisContent: string;
      const isPdf = file.mime_type === 'application/pdf';
      const isImage = file.mime_type?.startsWith('image/');

      if (isPdf || isImage) {
        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const dataUrl = `data:${file.mime_type};base64,${base64}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Tu es un assistant spécialisé dans l'analyse de documents immobiliers et de rénovation en Suisse. 
Analyse le document fourni et produis un résumé structuré en JSON avec les champs suivants :
- "type_document": type détecté (devis, facture, plan, diagnostic, contrat, photo, rapport, permis, assurance, garantie, autre)
- "titre": titre ou objet du document
- "resume": résumé en 2-3 phrases
- "montant_total": montant total si applicable (nombre ou null)
- "devise": devise si applicable
- "date_document": date du document si détectée (YYYY-MM-DD ou null)
- "entreprise": nom de l'entreprise si détecté
- "points_cles": liste de 3-5 points clés
- "alertes": alertes éventuelles (montant anormal, clause inhabituelle, etc.)
Réponds uniquement en JSON valide.`
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Analyse ce document : ${file.file_name} (catégorie: ${file.category})` },
                  { type: 'image_url', image_url: { url: dataUrl } },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error ${response.status}: ${await response.text()}`);
        }

        const aiResult = await response.json();
        analysisContent = aiResult.choices?.[0]?.message?.content || '{}';
      } else {
        const textContent = await fileData.text();
        const truncated = textContent.substring(0, 10000);

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Tu es un assistant spécialisé dans l'analyse de documents immobiliers et de rénovation en Suisse.
Analyse le texte fourni et produis un résumé structuré en JSON avec les champs :
- "type_document", "titre", "resume", "montant_total", "devise", "date_document", "entreprise", "points_cles", "alertes"
Réponds uniquement en JSON valide.`
              },
              { role: 'user', content: `Analyse ce document (${file.file_name}, catégorie: ${file.category}) :\n\n${truncated}` },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error ${response.status}: ${await response.text()}`);
        }

        const aiResult = await response.json();
        analysisContent = aiResult.choices?.[0]?.message?.content || '{}';
      }

      let parsedResult: any;
      try {
        const cleaned = analysisContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedResult = JSON.parse(cleaned);
      } catch {
        parsedResult = { raw_text: analysisContent };
      }

      await supabase
        .from('renovation_analysis_jobs')
        .update({
          status: 'completed',
          result: parsedResult,
          completed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', jobId);

      return new Response(JSON.stringify({ status: 'completed', result: parsedResult }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (analysisError) {
      await supabase
        .from('renovation_analysis_jobs')
        .update({
          status: 'failed',
          last_error: analysisError.message,
          locked_at: null,
        })
        .eq('id', jobId);

      console.error('Analysis failed:', analysisError);
      return new Response(JSON.stringify({ status: 'failed', error: analysisError.message }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

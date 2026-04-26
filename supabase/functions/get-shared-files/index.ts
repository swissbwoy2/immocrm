import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the share link
    const { data: shareLink, error: linkError } = await supabase
      .from('shared_file_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (linkError || !shareLink) {
      console.error('Link not found:', linkError);
      return new Response(
        JSON.stringify({ success: false, error: 'Link not found or expired' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Link has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get documents info
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, nom, type, taille, url')
      .in('id', shareLink.document_ids);

    if (docsError) {
      console.error('Documents fetch error:', docsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch documents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URLs for each document
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        if (doc.url && doc.url.startsWith('client-documents/')) {
          const { data: signedUrlData } = await supabase.storage
            .from('client-documents')
            .createSignedUrl(doc.url.replace('client-documents/', ''), 3600); // 1 hour validity
          
          return {
            ...doc,
            downloadUrl: signedUrlData?.signedUrl || doc.url
          };
        }
        return {
          ...doc,
          downloadUrl: doc.url
        };
      })
    );

    // Increment download count
    await supabase
      .from('shared_file_links')
      .update({ download_count: (shareLink.download_count || 0) + 1 })
      .eq('id', shareLink.id);

    console.log('Files retrieved for token:', token, 'count:', documents.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        documents: documentsWithUrls,
        expiresAt: shareLink.expires_at,
        createdAt: shareLink.created_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in get-shared-files:', error);
    const message = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

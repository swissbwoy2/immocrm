import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Fetching preview for URL:', url);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Check cache first
    const { data: cached } = await supabase
      .from('link_previews')
      .select('*')
      .eq('url', url)
      .single();
    
    // If cache is recent (< 7 days), return it
    if (cached && new Date(cached.fetched_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      console.log('Returning cached preview');
      return new Response(JSON.stringify(cached), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Fetch the page
    console.log('Fetching page...');
    const hostname = new URL(url).hostname;
    
    let html = '';
    try {
      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      });
      
      if (!response.ok) {
        console.log(`Site returned ${response.status}, using fallback preview`);
        // Return a basic preview for sites that block scraping
        const fallbackPreview = {
          url,
          title: hostname,
          description: null,
          image_url: null,
          site_name: hostname,
          favicon_url: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
          fetched_at: new Date().toISOString(),
        };
        
        // Cache the fallback
        await supabase
          .from('link_previews')
          .upsert(fallbackPreview, { onConflict: 'url' });
        
        return new Response(JSON.stringify(fallbackPreview), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      html = await response.text();
    } catch (fetchError) {
      console.log('Fetch failed, using fallback preview:', fetchError);
      const fallbackPreview = {
        url,
        title: hostname,
        description: null,
        image_url: null,
        site_name: hostname,
        favicon_url: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
        fetched_at: new Date().toISOString(),
      };
      
      return new Response(JSON.stringify(fallbackPreview), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Extract Open Graph metadata
    const getMetaContent = (property: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
      }
      return null;
    };
    
    const getMetaName = (name: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
      }
      return null;
    };
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    
    // Get image URL and make it absolute if needed
    let imageUrl = getMetaContent('og:image') || getMetaContent('twitter:image');
    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url);
      imageUrl = imageUrl.startsWith('/') 
        ? `${baseUrl.protocol}//${baseUrl.host}${imageUrl}`
        : `${baseUrl.protocol}//${baseUrl.host}/${imageUrl}`;
    }
    
    const preview = {
      url,
      title: getMetaContent('og:title') || getMetaName('title') || (titleMatch ? titleMatch[1].trim() : null),
      description: getMetaContent('og:description') || getMetaName('description'),
      image_url: imageUrl,
      site_name: getMetaContent('og:site_name') || hostname,
      favicon_url: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      fetched_at: new Date().toISOString(),
    };
    
    console.log('Preview extracted:', preview.title);
    
    // Save to cache
    const { error: upsertError } = await supabase
      .from('link_previews')
      .upsert(preview, { onConflict: 'url' });
    
    if (upsertError) {
      console.error('Error caching preview:', upsertError);
    }
    
    return new Response(JSON.stringify(preview), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching link preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

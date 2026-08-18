import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h === 'ip6-localhost' || h === 'ip6-loopback') return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1]), parseInt(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }
  if (h.includes(':')) return true;
  if (h.endsWith('.internal') || h.endsWith('.local') || h.endsWith('.localhost')) return true;
  return false;
}

const normalize = (raw: string): URL | null => {
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (isPrivateHost(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(parseInt(d, 10)));

const getMeta = (html: string, attr: 'property' | 'name', key: string): string | null => {
  const patterns = [
    new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${key}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeEntities(m[1]);
  }
  return null;
};

/** Certains portails (homegate, immoscout…) bloquent le fetch direct : on passe par Firecrawl. */
const fetchHtmlViaFirecrawl = async (url: string): Promise<string | null> => {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return null;
  const endpoints = ['https://api.firecrawl.dev/v2/scrape', 'https://api.firecrawl.dev/v1/scrape'];
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          formats: ['rawHtml'],
          onlyMainContent: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const body = await res.text();
      if (!res.ok) {
        console.error('firecrawl preview failed', endpoint, url, res.status, body.slice(0, 300));
        continue;
      }
      const data = JSON.parse(body);
      const html = data?.data?.rawHtml || data?.rawHtml || data?.data?.html || null;
      if (html) return html;
    } catch (e) {
      clearTimeout(timer);
      console.error('firecrawl preview error', endpoint, url, String(e));
    }
  }
  return null;
};



serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawUrls: string[] = Array.isArray(body?.urls)
      ? body.urls
      : typeof body?.url === 'string'
        ? [body.url]
        : [];

    const candidates = rawUrls
      .filter((u) => typeof u === 'string')
      .slice(0, 20)
      .map((u) => ({ raw: u, parsed: normalize(u) }))
      .filter((c) => c.parsed !== null) as { raw: string; parsed: URL }[];

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ previews: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Only allow URLs that are actually referenced by an offer (anti-SSRF / anti-abuse)
    const { data: allowedRows } = await admin
      .from('offres')
      .select('lien_annonce')
      .in('lien_annonce', candidates.map((c) => c.raw))
      .limit(50);

    const allowed = new Set((allowedRows || []).map((r) => r.lien_annonce as string));
    const targets = candidates.filter((c) => allowed.has(c.raw));

    const previews: Record<string, { image_url: string | null; title: string | null }> = {};
    if (targets.length === 0) {
      return new Response(JSON.stringify({ previews }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cache lookup
    const { data: cachedRows } = await admin
      .from('link_previews')
      .select('url, image_url, title, fetched_at')
      .in('url', targets.map((t) => t.parsed.toString()));

    const cache = new Map((cachedRows || []).map((r) => [r.url as string, r]));
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const toFetch: { raw: string; parsed: URL }[] = [];

    for (const t of targets) {
      const c = cache.get(t.parsed.toString());
      if (c && new Date(c.fetched_at as string).getTime() > weekAgo) {
        previews[t.raw] = { image_url: (c.image_url as string) ?? null, title: (c.title as string) ?? null };
      } else {
        toFetch.push(t);
      }
    }

    await Promise.all(
      toFetch.slice(0, 6).map(async (t) => {
        const url = t.parsed.toString();
        const hostname = t.parsed.hostname;
        try {
          let html: string | null = null;
          try {
            const res = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
              },
            });
            if (res.ok) html = await res.text();
          } catch (_e) {
            html = null;
          }

          const hasImage = (h: string | null) =>
            !!h && !!(getMeta(h, 'property', 'og:image') || getMeta(h, 'name', 'twitter:image'));

          // Portails protégés (403) ou page sans og:image → fallback Firecrawl
          if (!hasImage(html)) {
            const viaFirecrawl = await fetchHtmlViaFirecrawl(url);
            if (hasImage(viaFirecrawl)) html = viaFirecrawl;
            else html = html ?? viaFirecrawl;
          }

          if (!html) {
            previews[t.raw] = { image_url: null, title: hostname };
            return;
          }

          let imageUrl = getMeta(html, 'property', 'og:image') || getMeta(html, 'name', 'twitter:image');
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/')
              ? `${t.parsed.protocol}//${t.parsed.host}${imageUrl}`
              : `${t.parsed.protocol}//${t.parsed.host}/${imageUrl}`;
          }
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

          const preview = {
            url,
            title: getMeta(html, 'property', 'og:title') || (titleMatch ? titleMatch[1].trim() : null),
            description: getMeta(html, 'property', 'og:description') || getMeta(html, 'name', 'description'),
            image_url: imageUrl,
            site_name: getMeta(html, 'property', 'og:site_name') || hostname,
            favicon_url: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
            fetched_at: new Date().toISOString(),
          };
          previews[t.raw] = { image_url: preview.image_url, title: preview.title };
          await admin.from('link_previews').upsert(preview, { onConflict: 'url' });
        } catch (_e) {
          previews[t.raw] = { image_url: null, title: hostname };
        }
      }),
    );

    return new Response(JSON.stringify({ previews }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('showcase preview error', error);
    return new Response(JSON.stringify({ previews: {}, error: String(error) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

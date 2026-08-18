import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/');

const BAD = /(logo|sprite|icon|favicon|placeholder|pixel|avatar|badge|banner|tracking|blank|loader|watermark|\.svg($|\?))/i;
const IMG_EXT = /\.(jpe?g|png|webp)(\?|$)/i;

const isGalleryImage = (u: string): boolean => {
  if (!/^https?:\/\//i.test(u)) return false;
  if (BAD.test(u)) return false;
  if (u.length > 600) return false;
  const host = (() => { try { return new URL(u).hostname; } catch { return ''; } })();
  if (!host) return false;
  if (/immobilier\.ch/i.test(host)) return /\/Medias\//i.test(u) && IMG_EXT.test(u);
  if (/homegate|immoscout|scout24|static\.rsc/i.test(host)) return IMG_EXT.test(u) || /\/image\//i.test(u);
  if (/flatfox/i.test(host)) return /media|images/i.test(u);
  return IMG_EXT.test(u);
};

/** Upgrade immobilier.ch thumbnails to the big gallery variant. */
const normalizeUrl = (u: string): string =>
  u.replace(/\/images\/(gridsmall|small|thumb|medium)\//i, '/images/gridbig/');

const extractImages = (html: string, pageUrl: string): string[] => {
  const out: string[] = [];
  const push = (raw?: string | null) => {
    if (!raw) return;
    let u = decodeEntities(raw.trim());
    if (u.startsWith('//')) u = `https:${u}`;
    if (u.startsWith('/')) {
      try { u = new URL(u, pageUrl).toString(); } catch { return; }
    }
    u = normalizeUrl(u);
    if (isGalleryImage(u) && !out.includes(u)) out.push(u);
  };

  // 1) <img src> / data-src / srcset
  for (const m of html.matchAll(/<img[^>]+>/gi)) {
    const tag = m[0];
    push(tag.match(/\ssrc=["']([^"']+)["']/i)?.[1]);
    push(tag.match(/\sdata-src=["']([^"']+)["']/i)?.[1]);
    const srcset = tag.match(/\ssrcset=["']([^"']+)["']/i)?.[1];
    if (srcset) srcset.split(',').map((p) => p.trim().split(/\s+/)[0]).forEach(push);
  }

  // 2) URLs d'images dans le JSON embarqué (Next.js / Nuxt / JSON-LD)
  for (const m of html.matchAll(/https?:\\?\/\\?\/[^"'\s<>\\]+\.(?:jpe?g|png|webp)(?:\?[^"'\s<>\\]*)?/gi)) {
    push(m[0]);
  }

  // 3) og:image en dernier recours
  const og = html.match(/<meta[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["']/i)?.[1];
  push(og);

  return out.slice(0, 24);
};

const fetchDirect = async (url: string): Promise<string | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'fr-CH,fr;q=0.9', Accept: 'text/html' },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch (_e) {
    clearTimeout(timer);
    return null;
  }
};

const fetchViaFirecrawl = async (url: string): Promise<string | null> => {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['rawHtml'], onlyMainContent: false, proxy: 'stealth', location: { country: 'CH', languages: ['fr'] } }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const body = await res.text();
    if (!res.ok) {
      console.error('firecrawl images failed', url, res.status, body.slice(0, 200));
      return null;
    }
    const data = JSON.parse(body);
    return data?.data?.rawHtml || data?.rawHtml || data?.data?.html || null;
  } catch (e) {
    clearTimeout(timer);
    console.error('firecrawl images error', url, String(e));
    return null;
  }
};

const geocode = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  const key = Deno.env.get('GOOGLE_MAPS_API_KEY_WEB');
  if (key) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', Suisse')}&region=ch&key=${key}`,
      );
      const data = await res.json();
      const loc = data?.results?.[0]?.geometry?.location;
      if (loc?.lat && loc?.lng) return { lat: loc.lat, lng: loc.lng };
    } catch (e) {
      console.error('google geocode error', String(e));
    }
  }
  // Repli OpenStreetMap
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ch&q=${encodeURIComponent(address)}`,
      { headers: { 'User-Agent': 'Logisorama/1.0 (portail annonces)' } },
    );
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (first?.lat && first?.lon) return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
  } catch (e) {
    console.error('nominatim error', String(e));
  }
  return null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.slice(0, 12) : [];
    const limit = Math.min(Number(body?.limit) || 6, 12);

    let query = supabase
      .from('offres')
      .select('id, lien_annonce, adresse, medias_galerie, latitude, longitude, images_extracted_at')
      .not('lien_annonce', 'is', null)
      .gte('date_envoi', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());

    if (ids.length) {
      query = query.in('id', ids);
    } else {
      query = query.is('images_extracted_at', null).order('date_envoi', { ascending: false }).limit(limit);
    }

    const { data: offres, error } = await query;
    if (error) throw error;

    let updated = 0;
    const results: Record<string, number> = {};

    for (const o of offres || []) {
      const already = Array.isArray(o.medias_galerie) ? o.medias_galerie.length : 0;
      const needsImages = already === 0 && !o.images_extracted_at;
      const needsGeo = o.latitude == null || o.longitude == null;
      if (!needsImages && !needsGeo) continue;

      const patch: Record<string, unknown> = {};

      if (needsImages && o.lien_annonce) {
        let html = await fetchDirect(o.lien_annonce);
        let images = html ? extractImages(html, o.lien_annonce) : [];
        if (!images.length) {
          html = await fetchViaFirecrawl(o.lien_annonce);
          images = html ? extractImages(html, o.lien_annonce) : [];
        }
        patch.images_extracted_at = new Date().toISOString();
        if (images.length) patch.medias_galerie = images.map((url) => ({ url }));
        results[o.id] = images.length;
      }

      if (needsGeo && o.adresse) {
        const coords = await geocode(o.adresse);
        if (coords) {
          patch.latitude = coords.lat;
          patch.longitude = coords.lng;
          patch.geocoded_at = new Date().toISOString();
        }
      }

      if (Object.keys(patch).length) {
        const { error: upErr } = await supabase.from('offres').update(patch).eq('id', o.id);
        if (upErr) console.error('update offre failed', o.id, upErr.message);
        else updated++;
      }
    }

    return new Response(JSON.stringify({ success: true, processed: offres?.length || 0, updated, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('extract-offre-images error', String(e));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

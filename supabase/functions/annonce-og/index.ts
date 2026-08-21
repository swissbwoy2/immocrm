// Edge function: sert un HTML avec balises Open Graph par annonce (photo + titre + description)
// puis redirige les navigateurs humains vers la fiche publique.
const SITE = "https://logisorama.ch";
const FALLBACK_IMAGE = `${SITE}/app-icon.png`;

const esc = (s: string) =>
  (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url);
    const key = u.searchParams.get("slug") || u.searchParams.get("id") || "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const select =
      "id,slug,titre,ville,meta_title,meta_description,description_courte,type_transaction,photos_annonces_publiques(url,est_principale,ordre)";

    const fetchBy = async (col: string) => {
      const url =
        `${SUPABASE_URL}/rest/v1/annonces_publiques?${col}=eq.${encodeURIComponent(key)}` +
        `&statut=eq.publie&select=${encodeURIComponent(select)}&limit=1`;
      const r = await fetch(url, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      if (!r.ok) return null;
      const rows = await r.json();
      return Array.isArray(rows) && rows.length ? rows[0] : null;
    };

    let a: any = key ? await fetchBy("slug") : null;
    if (!a && key) a = await fetchBy("id");

    const canonical = a
      ? `${SITE}/annonces/${a.slug || a.id}`
      : `${SITE}/annonces`;

    const title = a
      ? (a.meta_title || `${a.titre} — ${a.ville}` || "Annonce").slice(0, 70)
      : "Logisorama — Annonces";
    const description = a
      ? (a.meta_description ||
          a.description_courte ||
          `${a.titre} à ${a.ville}. Découvrez cette annonce sur Logisorama.`).slice(0, 200)
      : "Découvrez les annonces immobilières sur Logisorama.";

    let image = FALLBACK_IMAGE;
    const photos = a?.photos_annonces_publiques;
    if (Array.isArray(photos) && photos.length) {
      const sorted = [...photos].sort(
        (x, y) =>
          (y.est_principale ? 1 : 0) - (x.est_principale ? 1 : 0) ||
          (x.ordre ?? 0) - (y.ordre ?? 0),
      );
      if (sorted[0]?.url) image = sorted[0].url;
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Logisorama" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<link rel="canonical" href="${esc(canonical)}" />
<meta http-equiv="refresh" content="0; url=${esc(canonical)}" />
</head>
<body>
<p>Redirection vers <a href="${esc(canonical)}">${esc(title)}</a>…</p>
<script>window.location.replace(${JSON.stringify(canonical)});</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch (_e) {
    return new Response("Redirection…", {
      status: 302,
      headers: { location: `${SITE}/annonces` },
    });
  }
});

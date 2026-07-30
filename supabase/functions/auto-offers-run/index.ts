// Auto offers routine — dry-run par défaut, aucun envoi tant que app_config ne l'autorise pas.
// Sécurisée par un secret cron (AUTO_OFFERS_CRON_SECRET) OU un JWT admin.
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseHTML } from "npm:linkedom@0.18.5";
import { buildOffreMessage, cleanValue } from "../_shared/offre-message.ts";
import { fetchListingDetails } from "../_shared/listing-details.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const IMMO_BASE = "https://www.immobilier.ch";

// ---------- Utils ----------

function normalizeStr(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function parseNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,-]/g, "").replace(/'/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function extractLocalitiesFromRegion(region: string | null | undefined): string[] {
  if (!region) return [];
  return region
    .split(/[,;/]+|\bet\b|\bou\b/i)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

// Table minimale de localités proches (V1). Extensible plus tard.
const NEIGHBORS: Record<string, string[]> = {
  lausanne: ["prilly", "renens", "pully", "epalinges", "chavannes-pres-renens", "crissier"],
  renens: ["lausanne", "prilly", "chavannes-pres-renens", "ecublens"],
  prilly: ["lausanne", "renens", "jouxtens-mezery"],
  pully: ["lausanne", "lutry", "paudex"],
  morges: ["tolochenaz", "preverenges", "echichens", "saint-prex"],
  nyon: ["prangins", "gland", "eysins", "signy"],
  geneve: ["carouge", "lancy", "vernier", "meyrin", "onex", "chene-bougeries"],
  vevey: ["la tour-de-peilz", "corseaux", "corsier-sur-vevey", "montreux"],
  montreux: ["clarens", "vevey", "veytaux"],
  fribourg: ["villars-sur-glane", "givisiez", "granges-paccot", "marly"],
  neuchatel: ["hauterive", "peseux", "corcelles", "colombier"],
  sion: ["conthey", "savièse", "bramois"],
};

function neighborsOf(locality: string): string[] {
  return NEIGHBORS[normalizeStr(locality)] ?? [];
}

// ---------- Fetch & parse immobilier.ch ----------

async function fetchListings(locality: string): Promise<any[]> {
  const url = `${IMMO_BASE}/fr/carte/louer-appartement-${encodeURIComponent(locality.trim())}.html`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LogisoramaBot/1.0; +https://logisorama.ch)",
        "Accept-Language": "fr-CH,fr;q=0.9",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseListings(html, locality);
  } catch (e) {
    console.warn("fetchListings failed", locality, e);
    return [];
  }
}

function parseListings(html: string, sourceLocality: string): any[] {
  const { document } = parseHTML(html);
  const cards = document.querySelectorAll("article, .filter-item, [class*='listing'], [class*='result-card']");
  const results: any[] = [];
  cards.forEach((card: any) => {
    const text = card.textContent || "";
    const linkEl = card.querySelector("a[href]");
    const href = linkEl?.getAttribute("href") || "";
    const listing_url = href.startsWith("http") ? href : href ? `${IMMO_BASE}${href}` : "";

    // Adresse & npa/ville — chercher un élément adresse
    const addrEl = card.querySelector("address, .address, [class*='address']");
    const addressRaw = addrEl?.textContent?.trim() || "";

    // Loyer
    const priceEl = card.querySelector(".price, [class*='price']");
    const priceRaw = priceEl?.textContent || "";
    const loyer_cc = parseNumber(priceRaw);

    // Pièces
    const piecesMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:pièces|pcs|pieces)/i);
    const pieces = piecesMatch ? parseNumber(piecesMatch[1]) : null;

    // Surface
    const surfaceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|2)/i);
    const surface = surfaceMatch ? parseNumber(surfaceMatch[1]) : null;

    // NPA + ville
    const npaMatch = addressRaw.match(/(\d{4})\s+([A-Za-zÀ-ÿ' -]+)/);
    const npa = npaMatch?.[1] ?? null;
    const ville = npaMatch?.[2]?.trim() ?? sourceLocality;

    // Régie (parfois dans un footer de carte)
    const regieEl = card.querySelector(".company, [class*='company'], [class*='agency']");
    const regie = regieEl?.textContent?.trim() || null;

    // External id
    const idMatch = listing_url.match(/(\d{6,})/);
    const listing_external_id = idMatch?.[1] || listing_url;

    if (!loyer_cc || !listing_url) return; // trop peu de données

    results.push({
      source: "immobilier.ch",
      listing_url,
      listing_external_id,
      adresse: addressRaw || null,
      npa,
      ville,
      pieces,
      surface,
      loyer_net: null,
      charges: null,
      loyer_cc,
      regie,
    });
  });
  return results;
}

// ---------- Scoring ----------


function computeScore(client: any, listing: any) {
  const breakdown: Record<string, number> = { region: 0, pieces: 0, budget: 0, type_bien: 0 };
  const localities = extractLocalitiesFromRegion(client.region_recherche).map(normalizeStr);
  const villeNorm = normalizeStr(listing.ville);
  if (localities.includes(villeNorm)) breakdown.region = 3;
  else if (localities.some(l => neighborsOf(l).includes(villeNorm))) breakdown.region = 2;

  const cPieces = Number(client.pieces || 0);
  if (cPieces && listing.pieces) {
    if (listing.pieces === cPieces) breakdown.pieces = 3;
    else if (listing.pieces === cPieces + 0.5 || listing.pieces === cPieces - 0.5) breakdown.pieces = 2;
    else if (listing.pieces > cPieces) breakdown.pieces = 2; // léger malus
  } else if (!cPieces) breakdown.pieces = 2;

  const hardCap = client.revenus_mensuels ? Number(client.revenus_mensuels) / 3 : Number(client.budget_max || 0);
  if (listing.loyer_cc && hardCap) {
    const ratio = listing.loyer_cc / hardCap;
    if (ratio <= 0.9) breakdown.budget = 3;
    else if (ratio <= 1.0) breakdown.budget = 2;
  }

  if (client.type_bien && normalizeStr(listing.adresse + " " + (listing.ville || "")).includes(normalizeStr(client.type_bien))) {
    breakdown.type_bien = 1;
  } else if (!client.type_bien) breakdown.type_bien = 1;

  const total = breakdown.region + breakdown.pieces + breakdown.budget + breakdown.type_bien;
  return { score: total, breakdown, hard_budget_cap: hardCap };
}

function passesHardRules(client: any, listing: any, hardCap: number) {
  const cPieces = Number(client.pieces || 0);
  if (cPieces && listing.pieces && listing.pieces < cPieces) {
    return { ok: false, reason: `Pièces annonce (${listing.pieces}) < demandées (${cPieces})` };
  }
  if (!listing.loyer_cc) return { ok: false, reason: "Loyer CC inconnu" };
  if (hardCap && listing.loyer_cc > hardCap) {
    const noteRev = client.revenus_mensuels ? "revenus/3" : "budget_max (revenus null)";
    return { ok: false, reason: `Loyer CC ${listing.loyer_cc} > plafond dur ${Math.round(hardCap)} (${noteRev})` };
  }
  return { ok: true, reason: null };
}

// ---------- Main ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("AUTO_OFFERS_CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") ?? "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  let triggered_by = "cron";
  if (!cronSecret || headerSecret !== cronSecret) {
    // Fallback: exiger un JWT admin
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminCheck = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await adminCheck
      .from("user_roles").select("role").eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    triggered_by = `admin:${userData.user.id}`;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Lire flags
  const { data: cfg } = await supabase
    .from("app_config").select("key,value")
    .in("key", ["auto_offers_enabled", "auto_offers_dry_run"]);
  const cfgMap = Object.fromEntries((cfg ?? []).map((r: any) => [r.key, r.value]));
  const enabled = cfgMap.auto_offers_enabled === "true";
  const dry_run = cfgMap.auto_offers_dry_run !== "false"; // défaut true
  const willSendReal = enabled && !dry_run;

  // Créer le run
  const { data: run, error: runErr } = await supabase
    .from("auto_offer_runs")
    .insert({ dry_run: !willSendReal, triggered_by })
    .select().single();
  if (runErr || !run) {
    return new Response(JSON.stringify({ error: "Cannot create run", details: runErr }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const summary: any = { enabled, dry_run, willSendReal, per_client: [] };
  const clients_sous_objectif: any[] = [];
  let listings_found = 0;
  let listings_retained = 0;
  let offers_created = 0;
  let clients_servis = 0;

  try {
    // Charger clients éligibles
    const { data: clients } = await supabase
      .from("clients")
      .select("id, user_id, region_recherche, pieces, budget_max, revenus_mensuels, type_bien, souhaits_particuliers, statut")
      .not("statut", "in", "(reloge,mandat_annule)")
      .limit(500);

    if (!clients?.length) throw new Error("Aucun client éligible");

    // Précharger agents primaires
    const { data: ca } = await supabase
      .from("client_agents")
      .select("client_id, agent_id, is_primary")
      .in("client_id", clients.map(c => c.id));
    const primaryAgentByClient: Record<string, string> = {};
    (ca ?? []).forEach((row: any) => {
      if (row.is_primary) primaryAgentByClient[row.client_id] = row.agent_id;
    });

    // Cache listings par localité pour ce run
    const listingsCache: Record<string, any[]> = {};

    for (const client of clients) {
      const cLocalities = extractLocalitiesFromRegion(client.region_recherche);
      if (!cLocalities.length) continue;

      // Fetch initial localités
      let candidateListings: any[] = [];
      const seenSig = new Set<string>();
      for (const loc of cLocalities) {
        const key = normalizeStr(loc);
        if (!listingsCache[key]) {
          listingsCache[key] = await fetchListings(loc);
          listings_found += listingsCache[key].length;
        }
        for (const l of listingsCache[key]) {
          const sig = `${normalizeStr(l.adresse)}|${l.pieces}|${l.surface}|${l.loyer_cc}`;
          if (seenSig.has(sig)) continue;
          seenSig.add(sig);
          candidateListings.push(l);
        }
      }

      // Anti-doublon vs offres déjà envoyées à ce client
      const addresses = candidateListings.map(l => l.adresse).filter(Boolean);
      const { data: existingOffers } = addresses.length
        ? await supabase.from("offres").select("adresse").eq("client_id", client.id).in("adresse", addresses)
        : { data: [] as any[] };
      const alreadySent = new Set((existingOffers ?? []).map((o: any) => normalizeStr(o.adresse)));

      // Scorer
      const scored = candidateListings
        .filter(l => !alreadySent.has(normalizeStr(l.adresse)))
        .map(l => {
          const s = computeScore(client, l);
          const hard = passesHardRules(client, l, s.hard_budget_cap);
          return { listing: l, ...s, ok: hard.ok, reason: hard.reason };
        });

      let retained = scored.filter(x => x.ok && x.score > 7);

      // Élargissement si <5
      if (retained.length < 5) {
        const extraLocs = Array.from(new Set(cLocalities.flatMap(l => neighborsOf(l))));
        for (const loc of extraLocs) {
          const key = normalizeStr(loc);
          if (!listingsCache[key]) {
            listingsCache[key] = await fetchListings(loc);
            listings_found += listingsCache[key].length;
          }
          for (const l of listingsCache[key]) {
            const sig = `${normalizeStr(l.adresse)}|${l.pieces}|${l.surface}|${l.loyer_cc}`;
            if (seenSig.has(sig)) continue;
            seenSig.add(sig);
            if (alreadySent.has(normalizeStr(l.adresse))) continue;
            const s = computeScore(client, l);
            const hard = passesHardRules(client, l, s.hard_budget_cap);
            if (hard.ok && s.score > 7) retained.push({ listing: l, ...s, ok: true, reason: null });
          }
          if (retained.length >= 5) break;
        }
      }

      retained.sort((a, b) => b.score - a.score);
      retained = retained.slice(0, 5);
      listings_retained += retained.length;
      if (retained.length > 0) clients_servis += 1;
      if (retained.length < 5) {
        clients_sous_objectif.push({ client_id: client.id, retained: retained.length });
      }

      // Enregistrer les candidats
      const rows = retained.map(r => ({
        run_id: run.id,
        client_id: client.id,
        source: r.listing.source,
        listing_url: r.listing.listing_url,
        listing_external_id: r.listing.listing_external_id,
        adresse: r.listing.adresse,
        npa: r.listing.npa,
        ville: r.listing.ville,
        pieces: r.listing.pieces,
        surface: r.listing.surface,
        loyer_net: r.listing.loyer_net,
        charges: r.listing.charges,
        loyer_cc: r.listing.loyer_cc,
        regie: r.listing.regie,
        score: r.score,
        score_breakdown: r.breakdown,
        hard_budget_cap: r.hard_budget_cap,
        would_send: true,
        reason: r.reason,
      }));

      let insertedCandidates: any[] = [];
      if (rows.length) {
        const { data: ins } = await supabase.from("auto_offer_candidates").insert(rows).select();
        insertedCandidates = ins ?? [];
      }

      summary.per_client.push({ client_id: client.id, retained: retained.length });

      // Envoi réel
      if (willSendReal && insertedCandidates.length) {
        const agentId = primaryAgentByClient[client.id];
        if (!agentId) continue;
        for (const cand of insertedCandidates) {
          // Anti-doublon final identique à EnvoyerOffre
          const { data: dup } = await supabase.from("offres").select("id")
            .eq("client_id", client.id)
            .eq("adresse", cand.adresse)
            .eq("prix", cand.loyer_net ?? cand.loyer_cc)
            .eq("surface", cand.surface);
          if (dup && dup.length) continue;

          // Enrichissement depuis la page détail de l'annonce
          const { details } = await fetchListingDetails(cand.listing_url);

          const surface = cand.surface ?? details.surface;
          const pieces = cand.pieces ?? details.pieces;
          const description = details.description
            ?? `Annonce automatique (score ${cand.score}/10)`;

          const missing = [
            !surface ? "surface" : null,
            !pieces ? "pièces" : null,
            !details.etage ? "étage" : null,
            !details.disponibilite ? "disponibilité" : null,
            !details.description ? "description" : null,
            !details.contact_gerance ? "contact gérance" : null,
            !details.contact_visite ? "contact visite" : null,
          ].filter(Boolean) as string[];

          const commentaires = [
            cand.regie ? `Régie : ${cand.regie}` : null,
            "Visite à fixer manuellement",
            cand.listing_url ? `Source : ${cand.listing_url}` : null,
          ].filter(Boolean).join("\n");

          const { data: offre } = await supabase.from("offres").insert({
            client_id: client.id,
            agent_id: agentId,
            adresse: cand.adresse,
            prix: cand.loyer_net ?? cand.loyer_cc,
            surface,
            pieces,
            etage: details.etage,
            disponibilite: details.disponibilite,
            type_bien: details.type_bien,
            description,
            statut: "envoyee",
            lien_annonce: cand.listing_url,
            contact_gerance: details.contact_gerance ?? (cand.regie || null),
            contact_annonceur: details.contact_annonceur ?? (cand.regie || null),
            contact_visite: details.contact_visite,
            commentaires,
            envoi_auto: true,
            needs_agent_action: missing.length > 0,
            missing_info: missing.length ? missing.join(", ") : null,
          }).select().single();

          if (!offre) continue;
          offers_created += 1;

          await supabase.from("auto_offer_candidates").update({ offer_id: offre.id }).eq("id", cand.id);

          // WhatsApp non bloquant
          try {
            await supabase.functions.invoke("wa-send-new-offer", { body: { offre_id: offre.id } });
          } catch (_) { /* non bloquant */ }

          // Conversation + message
          const { data: existingConv } = await supabase.from("conversations")
            .select("id").eq("client_id", client.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
          let conversationId = existingConv?.id;
          if (!conversationId) {
            const { data: nc } = await supabase.from("conversations").insert({
              client_id: client.id, agent_id: agentId, subject: "Nouvelles offres",
            }).select().single();
            conversationId = nc?.id;
          }
          if (conversationId) {
            const { data: agentLink } = await supabase.from("conversation_agents").select("id")
              .eq("conversation_id", conversationId).eq("agent_id", agentId).maybeSingle();
            if (!agentLink) {
              await supabase.from("conversation_agents").insert({ conversation_id: conversationId, agent_id: agentId });
            }
            const { data: clientProfile } = client.user_id
              ? await supabase.from("profiles").select("prenom, nom").eq("id", client.user_id).maybeSingle()
              : { data: null as any };
            const msg = buildOffreMessage(offre, clientProfile);

            await supabase.from("messages").insert({
              conversation_id: conversationId, sender_id: agentId, sender_type: "agent",
              content: msg, offre_id: offre.id,
            });
          }
        }
      }
    }

    await supabase.from("auto_offer_runs").update({
      finished_at: new Date().toISOString(),
      clients_servis, listings_found, listings_retained, offers_created,
      summary, clients_sous_objectif,
    }).eq("id", run.id);

    return new Response(JSON.stringify({
      ok: true, run_id: run.id, dry_run: !willSendReal,
      clients_servis, listings_found, listings_retained, offers_created,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    await supabase.from("auto_offer_runs").update({
      finished_at: new Date().toISOString(),
      error: String(e?.message ?? e),
      summary, clients_sous_objectif,
    }).eq("id", run.id);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

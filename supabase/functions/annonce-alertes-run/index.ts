import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { canSendNotificationEmail } from "../_shared/notificationEmailOptOut.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RAW_FROM = (Deno.env.get("RESEND_FROM_EMAIL") || "").trim();
const SENDER_EMAIL = RAW_FROM && RAW_FROM.includes("@") ? RAW_FROM : "support@logisorama.ch";
const SITE_URL = "https://logisorama.ch";
const FUNCTIONS_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function matches(annonce: any, criteres: any): boolean {
  if (!criteres || typeof criteres !== "object") return true;

  if (criteres.type_transaction && annonce.type_transaction !== criteres.type_transaction) return false;
  if (criteres.categorie_id && annonce.categorie_id !== criteres.categorie_id) return false;

  const prix = num(annonce.prix);
  if (num(criteres.prix_min) !== null && (prix === null || prix < num(criteres.prix_min)!)) return false;
  if (num(criteres.prix_max) !== null && (prix === null || prix > num(criteres.prix_max)!)) return false;

  const pieces = num(annonce.nombre_pieces);
  if (num(criteres.pieces_min) !== null && (pieces === null || pieces < num(criteres.pieces_min)!)) return false;
  if (num(criteres.pieces_max) !== null && (pieces === null || pieces > num(criteres.pieces_max)!)) return false;

  const surface = num(annonce.surface_habitable);
  if (num(criteres.surface_min) !== null && (surface === null || surface < num(criteres.surface_min)!)) return false;

  const lat = num(criteres.latitude);
  const lng = num(criteres.longitude);
  const rayon = num(criteres.rayon_km) ?? 20;
  if (lat !== null && lng !== null && annonce.latitude != null && annonce.longitude != null) {
    if (distanceKm(lat, lng, Number(annonce.latitude), Number(annonce.longitude)) > rayon) return false;
  } else if (criteres.ville) {
    const ville = String(criteres.ville).toLowerCase();
    const target = `${annonce.ville || ""} ${annonce.canton || ""}`.toLowerCase();
    if (!target.includes(ville.split(",")[0].trim())) return false;
  }

  return true;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY || !to) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: `Logisorama <${SENDER_EMAIL}>`, to: [to], subject, html }),
  });
  if (!res.ok) console.error("Resend error", await res.text());
  return res.ok;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Authorization: service role, internal secret, or an authenticated admin.
  const caller = await verifyInternalCaller(req);
  const authorized = caller.ok &&
    (caller.kind === "service" || caller.kind === "secret" || caller.roles?.includes("admin"));
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const annonceId: string | undefined = body?.annonce_id;
    const frequence: "instantane" | "quotidien" | "all" = body?.frequence || "instantane";

    let annoncesQuery = supabase
      .from("annonces_publiques")
      .select(
        "id, titre, slug, ville, canton, prix, type_transaction, categorie_id, nombre_pieces, surface_habitable, latitude, longitude, statut, created_at",
      )
      .eq("statut", "publie");

    if (annonceId) {
      annoncesQuery = annoncesQuery.eq("id", annonceId);
    } else {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      annoncesQuery = annoncesQuery.gte("created_at", since);
    }

    const { data: annonces, error: annoncesErr } = await annoncesQuery;
    if (annoncesErr) throw annoncesErr;
    if (!annonces?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_annonces" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let alertesQuery = supabase.from("alertes_annonces").select("*").eq("actif", true);
    if (frequence !== "all") alertesQuery = alertesQuery.eq("frequence", frequence);
    const { data: alertes, error: alertesErr } = await alertesQuery;
    if (alertesErr) throw alertesErr;

    let sent = 0;

    for (const alerte of alertes || []) {
      const matched = (annonces || []).filter((a: any) => matches(a, alerte.criteres));
      if (!matched.length) continue;

      // Deduplicate: skip annonces already sent for this alert
      const { data: already } = await supabase
        .from("alertes_annonces_envois")
        .select("annonce_id")
        .eq("alerte_id", alerte.id)
        .in("annonce_id", matched.map((a: any) => a.id));
      const alreadyIds = new Set((already || []).map((r: any) => r.annonce_id));
      const toSend = matched.filter((a: any) => !alreadyIds.has(a.id));
      if (!toSend.length) continue;

      const optOut = await canSendNotificationEmail(supabase, {
        userId: alerte.user_id,
        email: alerte.email,
      });
      if (!optOut.allowed) continue;

      const unsubUrl = `${FUNCTIONS_URL}/annonce-alertes-unsubscribe?token=${alerte.unsubscribe_token}`;

      const cards = toSend
        .map(
          (a: any) => `
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:12px">
            <p style="margin:0 0 4px;font-size:16px;font-weight:600">${esc(a.titre)}</p>
            <p style="margin:0;color:#4b5563;font-size:14px">
              ${esc(a.ville || "")}${a.nombre_pieces ? ` • ${esc(a.nombre_pieces)} pièces` : ""}${
            a.surface_habitable ? ` • ${esc(a.surface_habitable)} m²` : ""
          }
            </p>
            <p style="margin:6px 0 10px;font-size:18px;font-weight:700;color:#16a34a">
              ${a.prix ? `CHF ${Number(a.prix).toLocaleString("fr-CH")}` : "Prix sur demande"}
            </p>
            <a href="${SITE_URL}/annonces/${esc(a.slug || a.id)}"
               style="display:inline-block;background:#16a34a;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none;font-size:14px">
               Voir l'annonce
            </a>
          </div>`,
        )
        .join("");

      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#111827">${toSend.length > 1 ? "Nouvelles annonces" : "Nouvelle annonce"} correspondant à votre recherche</h2>
          <p style="color:#4b5563">Alerte : <strong>${esc(alerte.nom || "Ma recherche")}</strong></p>
          ${cards}
          <p style="color:#9ca3af;font-size:12px;margin-top:20px">
            Vous recevez cet e-mail car vous avez créé une alerte sur Logisorama.
            <a href="${unsubUrl}" style="color:#9ca3af">Se désinscrire de cette alerte</a>.
          </p>
        </div>`;

      const ok = await sendEmail(
        optOut.email as string,
        toSend.length > 1
          ? `${toSend.length} nouvelles annonces pour « ${alerte.nom || "votre recherche"} »`
          : `Nouvelle annonce : ${toSend[0].titre}`,
        html,
      );

      if (ok) {
        sent++;
        await supabase.from("alertes_annonces_envois").insert(
          toSend.map((a: any) => ({ alerte_id: alerte.id, annonce_id: a.id })),
        );
        await supabase
          .from("alertes_annonces")
          .update({ derniere_notif_at: new Date().toISOString() })
          .eq("id", alerte.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("annonce-alertes-run error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erreur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

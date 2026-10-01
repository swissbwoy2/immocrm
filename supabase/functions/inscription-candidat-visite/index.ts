import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  annonce_id: z.string().uuid(),
  creneau_id: z.string().uuid(),
  prenom: z.string().trim().min(1).max(80),
  nom: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(255),
  telephone: z.string().trim().min(6).max(30),
});

function generatePassword(len = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  // garantit majuscule + minuscule + chiffre
  return "A" + out.slice(1, len - 2) + "k7";
}

async function findUserByEmail(admin: any, email: string): Promise<string | null> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x: any) => (x.email || "").toLowerCase() === email);
    if (u) return u.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const limited = await enforceRateLimit(admin, req, corsHeaders, "inscription-candidat-visite", {
    maxRequests: 8,
    windowSeconds: 600,
  });
  if (limited) return limited;

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ code: "invalid_body", error: "Requête invalide" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    const emailErr = parsed.error.issues.some((i) => i.path[0] === "email");
    return json({
      code: emailErr ? "invalid_email" : "invalid_fields",
      error: emailErr ? "Adresse e-mail invalide" : "Veuillez remplir correctement tous les champs",
    }, 400);
  }
  const { annonce_id, creneau_id, prenom, nom, email, telephone } = parsed.data;

  try {
    // 1. Créneau valide
    const { data: creneau } = await admin
      .from("annonce_creneaux")
      .select("id, annonce_id, date_heure, actif, capacite_max")
      .eq("id", creneau_id)
      .maybeSingle();
    if (!creneau || !creneau.actif || creneau.annonce_id !== annonce_id || new Date(creneau.date_heure) <= new Date()) {
      return json({ code: "slot_unavailable", error: "Ce créneau n'est plus disponible" }, 409);
    }
    if (creneau.capacite_max != null) {
      const { count, error: cntErr } = await admin
        .from("candidatures_location")
        .select("id", { count: "exact", head: true })
        .eq("creneau_id", creneau_id)
        .not("statut", "in", "(desiste,refuse)");
      if (cntErr) {
        console.error("inscription-candidat-visite: comptage", cntErr.message);
        return json({ code: "server_error", error: "Erreur serveur" }, 500);
      }
      if ((count ?? 0) >= creneau.capacite_max) {
        return json({ code: "slot_full", error: "Ce créneau est complet, veuillez en choisir un autre" }, 409);
      }
    }
    const { data: annonce } = await admin
      .from("annonces_publiques")
      .select("id, titre, adresse, ville, slug, statut, prix, nombre_pieces, surface_habitable, sous_type")
      .eq("id", annonce_id)
      .maybeSingle();
    if (!annonce || annonce.statut !== "publie") {
      return json({ code: "slot_unavailable", error: "Annonce indisponible" }, 409);
    }

    // 2. Compte
    let userId = await findUserByEmail(admin, email);
    let tempPassword: string | null = null;
    if (!userId) {
      tempPassword = generatePassword();
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { prenom, nom, telephone, source: "candidat_visite" },
      });
      if (cErr || !created?.user) {
        console.error("inscription-candidat-visite: création compte échouée", cErr?.message);
        return json({ code: "account_error", error: "Impossible de créer le compte" }, 500);
      }
      userId = created.user.id;
    }

    // 3. Rôle candidat (ajout seul, jamais d'autre rôle) — sauf si déjà client
    const { data: clientRole } = await admin
      .from("user_roles").select("id").eq("user_id", userId).eq("role", "client").maybeSingle();
    const isClient = !!clientRole;
    if (!isClient) {
      const { data: existingRole } = await admin
        .from("user_roles").select("id").eq("user_id", userId).eq("role", "candidat").maybeSingle();
      if (!existingRole) {
        const { error: rErr } = await admin.from("user_roles").insert({ user_id: userId, role: "candidat" });
        if (rErr) console.error("inscription-candidat-visite: rôle", rErr.message);
      }
    }

    // 4. Profil (sans écraser). Nouveau compte candidat créé ici → actif=false
    // (le profil a pu être auto-créé par trigger avec le DEFAULT true).
    const isNewCandidat = !!tempPassword && !isClient;
    const { data: profile } = await admin
      .from("profiles").select("id, prenom, nom, telephone").eq("id", userId).maybeSingle();
    if (profile) {
      const patch: Record<string, string | boolean> = {};
      if (!profile.prenom) patch.prenom = prenom;
      if (!profile.nom) patch.nom = nom;
      if (!profile.telephone) patch.telephone = telephone;
      if (isNewCandidat) patch.actif = false;
      if (Object.keys(patch).length) {
        const { error: uErr } = await admin.from("profiles").update(patch).eq("id", userId);
        if (uErr) console.error("inscription-candidat-visite: profil maj", uErr.message);
      }
    } else {
      const { error: pErr } = await admin.from("profiles").insert({
        id: userId, email, prenom, nom, telephone, ...(isNewCandidat ? { actif: false } : {}),
      });
      if (pErr) console.warn("inscription-candidat-visite: profil", pErr.message);
    }

    // 5. Candidature + visite
    const { error: iErr } = await admin.from("candidatures_location").insert({
      user_id: userId,
      annonce_id,
      creneau_id,
      date_visite: creneau.date_heure,
      prenom,
      nom,
      email,
      telephone,
      statut: "en_attente",
    });
    if (iErr) {
      if (iErr.code === "23505") return json({ code: "already_booked", error: "Vous avez déjà réservé ce créneau" }, 409);
      console.error("inscription-candidat-visite: candidature", iErr.message);
      return json({ code: "save_error", error: "Impossible d'enregistrer la réservation" }, 500);
    }

    // 5b. Pont pipeline client (best-effort)
    if (isClient) {
      try {
        const { data: client } = await admin
          .from("clients").select("id, agent_id").eq("user_id", userId).maybeSingle();
        if (!client) {
          console.warn("inscription-candidat-visite: rôle client sans ligne clients", userId);
        } else {
          const lien = `https://logisorama.ch/annonces/${annonce.slug || annonce.id}`;
          const adresse = [annonce.adresse, annonce.ville].filter(Boolean).join(", ");
          const { data: existingOffres } = await admin
            .from("offres").select("id, lien_annonce, adresse").eq("client_id", client.id);
          let offreId = (existingOffres || []).find((o: any) =>
            o.lien_annonce === lien || o.adresse === adresse || o.adresse === annonce.adresse)?.id ?? null;
          if (!offreId) {
            const { data: newOffre, error: oErr } = await admin.from("offres").insert({
              client_id: client.id,
              agent_id: client.agent_id,
              adresse,
              prix: annonce.prix ?? 0,
              pieces: annonce.nombre_pieces ?? null,
              surface: annonce.surface_habitable ?? null,
              type_bien: annonce.sous_type ?? null,
              titre: annonce.titre,
              lien_annonce: lien,
              statut: "interesse",
              envoi_auto: false,
              needs_agent_action: false,
              date_envoi: new Date().toISOString(),
            }).select("id").single();
            if (oErr) console.error("inscription-candidat-visite: offre", oErr.message);
            offreId = newOffre?.id ?? null;
          }
          const { data: existingVisite } = await admin
            .from("visites").select("id")
            .eq("client_id", client.id).eq("date_visite", creneau.date_heure)
            .in("adresse", [adresse, annonce.adresse]).limit(1);
          if (!existingVisite?.length) {
            const { error: vErr } = await admin.from("visites").insert({
              offre_id: offreId,
              client_id: client.id,
              agent_id: client.agent_id,
              date_visite: creneau.date_heure,
              adresse,
              statut: "confirmee",
              source: "portail",
            });
            if (vErr) console.error("inscription-candidat-visite: visite", vErr.message);
          }
        }
      } catch (e) {
        console.error("inscription-candidat-visite: pont client", (e as Error)?.message);
      }
    }

    // 6. E-mail
    const dateLabel = new Intl.DateTimeFormat("fr-CH", {
      timeZone: "Europe/Zurich", weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(creneau.date_heure)).replace(":", "h");
    let emailSent = false;
    try {
      const r = await sendTemplateEmail("candidat-visite-confirmation", email, {
        templateData: {
          prenom,
          titre: annonce.titre,
          adresse: [annonce.adresse, annonce.ville].filter(Boolean).join(", "),
          dateLabel,
          email,
          tempPassword: tempPassword ?? undefined,
          annonceUrl: `https://logisorama.ch/annonces/${annonce.slug || annonce.id}`,
        },
        idempotencyKey: `candidat-visite-${creneau_id}-${userId}`,
      });
      emailSent = r.sent;
    } catch (e) {
      console.error("inscription-candidat-visite: e-mail non envoyé", (e as Error)?.message);
    }

    return json({ ok: true, new_account: !!tempPassword, email_sent: emailSent });
  } catch (e) {
    console.error("inscription-candidat-visite: erreur", (e as Error)?.message);
    return json({ code: "server_error", error: "Erreur serveur" }, 500);
  }
});

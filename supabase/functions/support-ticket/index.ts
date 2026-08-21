import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RAW_FROM = (Deno.env.get("RESEND_FROM_EMAIL") || "").trim();
const SENDER = RAW_FROM && RAW_FROM.includes("@") ? RAW_FROM : "support@logisorama.ch";
const SUPPORT_INBOX = "support@logisorama.ch";
const SITE = "https://logisorama.ch";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function sendMail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Logisorama Support <${SENDER}>`, to: [to], subject, html }),
    });
  } catch (e) { console.error("resend", e); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: ud } = await asUser.auth.getUser();
    const user = ud?.user;
    if (!user) return json({ error: "Non authentifié" }, 401);

    // role de l'auteur
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const roleSet = new Set((roles || []).map((r: any) => r.role));
    const isAdmin = roleSet.has("admin");
    const isAgent = roleSet.has("agent");
    const authorRole = isAdmin ? "admin" : isAgent ? "agent" : "client";

    const body = await req.json();
    const action = body.action as string;

    const notify = async (userId: string, title: string, message: string, link: string) => {
      if (!userId) return;
      await admin.from("notifications").insert({ user_id: userId, title, message, type: "support_ticket", link });
    };
    const notifyAdmins = async (title: string, message: string, link: string) => {
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      for (const a of admins || []) await notify((a as any).user_id, title, message, link);
    };
    const profileName = async (uid: string) => {
      const { data: p } = await admin.from("profiles").select("nom, prenom, email").eq("id", uid).maybeSingle();
      const pp: any = p || {};
      return { name: [pp.prenom, pp.nom].filter(Boolean).join(" ") || pp.email || "Client", email: pp.email || "" };
    };

    if (action === "create") {
      const { sujet, categorie, message } = body;
      if (!sujet || !message) return json({ error: "Sujet et message requis" }, 400);
      const cat = ["bug", "question", "conseil", "avis", "autre"].includes(categorie) ? categorie : "question";
      const { data: t, error } = await admin.from("support_tickets")
        .insert({ user_id: user.id, sujet, categorie: cat, statut: "nouveau" }).select("id").single();
      if (error || !t) return json({ error: error?.message || "insert" }, 500);
      await admin.from("support_ticket_messages").insert({ ticket_id: t.id, author_id: user.id, author_role: "client", body: message });
      const who = await profileName(user.id);
      await notifyAdmins("Nouveau ticket support", `${who.name} — ${sujet}`, "/admin/support");
      await sendMail(SUPPORT_INBOX, `[Ticket ${cat}] ${sujet}`,
        `<h3>Nouveau ticket support</h3><p><b>De :</b> ${esc(who.name)} (${esc(who.email)})</p><p><b>Catégorie :</b> ${esc(cat)}</p><p><b>Sujet :</b> ${esc(sujet)}</p><p>${esc(message).replace(/\n/g, "<br>")}</p><p><a href="${SITE}/admin/support">Ouvrir dans le tableau de bord</a></p>`);
      return json({ ok: true, ticket_id: t.id });
    }

    // charge le ticket + contrôle d'accès pour les autres actions
    const ticketId = body.ticket_id as string;
    if (!ticketId) return json({ error: "ticket_id requis" }, 400);
    const { data: ticket } = await admin.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
    if (!ticket) return json({ error: "Ticket introuvable" }, 404);
    const canAccess = isAdmin || ticket.user_id === user.id || ticket.assigned_agent_id === user.id;
    if (!canAccess) return json({ error: "Accès refusé" }, 403);

    if (action === "reply") {
      const { message } = body;
      if (!message) return json({ error: "Message requis" }, 400);
      await admin.from("support_ticket_messages").insert({ ticket_id: ticketId, author_id: user.id, author_role: authorRole, body: message });
      if (authorRole === "client") {
        // notifie l'agent assigné + admins + email support
        if (ticket.assigned_agent_id) await notify(ticket.assigned_agent_id, "Réponse client — ticket", ticket.sujet, "/agent/support");
        await notifyAdmins("Réponse client — ticket", ticket.sujet, "/admin/support");
        const who = await profileName(user.id);
        await sendMail(SUPPORT_INBOX, `[Ticket] Réponse — ${ticket.sujet}`,
          `<p><b>${esc(who.name)}</b> a répondu :</p><p>${esc(message).replace(/\n/g, "<br>")}</p><p><a href="${SITE}/admin/support">Ouvrir</a></p>`);
        if (ticket.statut === "resolu" || ticket.statut === "cloture")
          await admin.from("support_tickets").update({ statut: "en_cours", closed_at: null }).eq("id", ticketId);
      } else {
        await notify(ticket.user_id, "Réponse du support", ticket.sujet, "/support");
        if (ticket.statut === "nouveau" || ticket.statut === "assigne")
          await admin.from("support_tickets").update({ statut: "en_cours" }).eq("id", ticketId);
      }
      return json({ ok: true });
    }

    if (action === "assign") {
      if (!isAdmin) return json({ error: "Réservé à l'admin" }, 403);
      const agentId = body.agent_id || null;
      await admin.from("support_tickets").update({ assigned_agent_id: agentId, statut: agentId ? "assigne" : "nouveau" }).eq("id", ticketId);
      if (agentId) await notify(agentId, "Ticket assigné", ticket.sujet, "/agent/support");
      return json({ ok: true });
    }

    if (action === "set_status") {
      if (!(isAdmin || ticket.assigned_agent_id === user.id)) return json({ error: "Accès refusé" }, 403);
      const statut = body.statut as string;
      if (!["nouveau", "assigne", "en_cours", "resolu", "cloture"].includes(statut)) return json({ error: "Statut invalide" }, 400);
      const closed = statut === "cloture" || statut === "resolu";
      await admin.from("support_tickets").update({ statut, closed_at: closed ? new Date().toISOString() : null }).eq("id", ticketId);
      const label = statut === "cloture" ? "clôturé" : statut === "resolu" ? "résolu" : statut;
      await notify(ticket.user_id, "Mise à jour de votre ticket", `${ticket.sujet} — ${label}`, "/support");
      return json({ ok: true });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

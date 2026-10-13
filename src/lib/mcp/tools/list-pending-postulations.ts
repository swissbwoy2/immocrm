import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAutomationOperator, textResult, toZurichISO } from "../guard";

export default defineTool({
  name: "list_pending_postulations",
  title: "Postulations à faire",
  description:
    "Liste les postulations en attente de dépôt (offres au statut « souhaite_postuler »), avec le client concerné. Les demandes dont la préparation est en file, prête ou bloquée apparaissent en premier, avec job_id, statut, priorité, résumé et éléments manquants.",
  inputSchema: {
    limit: z.number().int().describe("Nombre maximum de postulations à retourner (défaut 25, max 100).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const { supabase } = await requireAutomationOperator(ctx);
    const max = Math.min(Math.max(limit ?? 25, 1), 100);

    const { data: offres, error } = await supabase
      .from("offres")
      .select("id, created_at, adresse, prix, pieces, surface, etage, type_bien, lien_annonce, statut, client_id")
      .eq("statut", "souhaite_postuler")
      .order("created_at", { ascending: false })
      .limit(max);
    if (error) throw new Error(error.message);

    const jobPriority: Record<string, number> = { ready: 0, blocked: 1, queued: 2, processing: 3, failed: 4, completed: 5 };
    const { data: jobs } = await supabase
      .from("postulation_jobs")
      .select("id, offre_id, status, priority, created_at, ai_result")
      .in("status", ["queued", "ready", "blocked"])
      .order("created_at", { ascending: true })
      .limit(max);
    const jobByOffre = new Map<string, any>();
    for (const j of jobs ?? []) jobByOffre.set(j.offre_id, j);
    const known = new Set((offres ?? []).map((o) => o.id));
    const missingIds = [...jobByOffre.keys()].filter((id) => !known.has(id));
    let extra: typeof offres = [];
    if (missingIds.length) {
      const { data } = await supabase
        .from("offres")
        .select("id, created_at, adresse, prix, pieces, surface, etage, type_bien, lien_annonce, statut, client_id")
        .in("id", missingIds);
      extra = data ?? [];
    }
    const rows = [...(extra ?? []), ...(offres ?? [])]
      .sort((a, b) => {
        const ja = jobByOffre.get(a.id), jb = jobByOffre.get(b.id);
        const pa = ja ? jobPriority[ja.status] ?? 9 : 9, pb = jb ? jobPriority[jb.status] ?? 9 : 9;
        return pa - pb;
      })
      .slice(0, max);
    const clientIds = [...new Set(rows.map((o) => o.client_id).filter(Boolean))] as string[];
    const clientById = new Map<string, { user_id: string | null }>();
    if (clientIds.length) {
      const { data: clients } = await supabase.from("clients").select("id, user_id").in("id", clientIds);
      for (const c of clients ?? []) clientById.set(c.id, { user_id: c.user_id });
    }
    const userIds = [...new Set([...clientById.values()].map((c) => c.user_id).filter(Boolean))] as string[];
    const profileById = new Map<string, { prenom: string | null; nom: string | null; email: string | null }>();
    if (userIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, prenom, nom, email").in("id", userIds);
      for (const p of profiles ?? []) profileById.set(p.id, { prenom: p.prenom, nom: p.nom, email: p.email });
    }

    return textResult({
      count: rows.length,
      postulations: rows.map((o) => {
        const userId = clientById.get(o.client_id)?.user_id ?? null;
        const profile = userId ? profileById.get(userId) : undefined;
        const job = jobByOffre.get(o.id);
        return {
          postulation_id: o.id,
          job: job
            ? {
                job_id: job.id,
                status: job.status,
                priority: job.priority ?? job.ai_result?.priority ?? null,
                requested_at: toZurichISO(job.created_at),
                summary: job.ai_result?.concise_staff_summary ?? null,
                missing_items: job.ai_result?.missing_items ?? [],
              }
            : null,
          created_at: toZurichISO(o.created_at),
          adresse: o.adresse,
          prix: o.prix,
          pieces: o.pieces,
          surface: o.surface,
          etage: o.etage,
          type_bien: o.type_bien,
          lien_annonce: o.lien_annonce,
          statut: o.statut,
          client: {
            client_id: o.client_id,
            prenom: profile?.prenom ?? null,
            nom: profile?.nom ?? null,
            email: profile?.email ?? null,
          },
        };
      }),
    });
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAutomationOperator, textResult, toZurichISO } from "../guard";

export default defineTool({
  name: "list_pending_postulations",
  title: "Postulations à faire",
  description:
    "Liste les postulations en attente de dépôt (offres au statut « souhaite_postuler »), avec le client concerné.",
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

    const rows = offres ?? [];
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
        return {
          postulation_id: o.id,
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

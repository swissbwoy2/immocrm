import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAutomationOperator, textResult } from "../guard";

// Raccord de la routine Postulation au registre partagé avec Steeve : elle signale son avancement ;
// « brouillon_pret » confie l'envoi à Steeve (contrôles, puis envoi depuis relocation@immo-rama.ch).
export default defineTool({
  name: "report_postulation_progress",
  title: "Signaler l'avancement d'une postulation",
  description:
    "Signale l'avancement d'une postulation au registre partagé avec Steeve. etape = pdf_prepare (PDF de candidature déposé), brouillon_pret (brouillon complet déposé dans les Brouillons de relocation@immo-rama.ch : Steeve le contrôle puis l'envoie, tu ne l'envoies pas toi-même) ou bloque (préparation impossible, note obligatoire avec la cause). Si le dossier est déjà envoyé, la réponse le dit : ne refais rien.",
  inputSchema: {
    postulation_id: z.string().uuid().describe("postulation_id renvoyé par list_pending_postulations (identifiant de l'offre)."),
    etape: z.enum(["pdf_prepare", "brouillon_pret", "bloque"]),
    note: z.string().max(500).describe("Précision courte (objet du brouillon, cause du blocage…).").optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ postulation_id, etape, note }, ctx) => {
    const { supabase } = await requireAutomationOperator(ctx);
    const { data, error } = await supabase.rpc("steeve_routine_signaler", {
      p_offre_id: postulation_id,
      p_etape: etape,
      p_note: note ?? null,
      p_routine: "routine-chatgpt",
    });
    if (error) throw new Error(error.message);
    return textResult(data);
  },
});

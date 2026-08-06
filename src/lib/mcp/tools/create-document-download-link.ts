import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { auditLog, requireAutomationOperator, textResult, toZurichISO } from "../guard";

const BUCKET = "client-documents";
const EXPIRES_SECONDS = 60;

function storagePath(url: string): string {
  let path = url.trim();
  const marker = `/storage/v1/object/`;
  const idx = path.indexOf(marker);
  if (idx >= 0) {
    path = path.slice(idx + marker.length).replace(/^(public|sign|authenticated)\//, "");
    path = path.split("?")[0];
  }
  if (path.startsWith(`${BUCKET}/`)) path = path.slice(BUCKET.length + 1);
  return path;
}

export default defineTool({
  name: "create_document_download_link",
  title: "Lien de téléchargement temporaire",
  description:
    "Crée une URL signée de 60 secondes pour UN SEUL document du dossier client. Aucun binaire ni lien permanent n'est renvoyé.",
  inputSchema: {
    document_id: z.string().uuid().describe("Identifiant du document à télécharger."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ document_id }, ctx) => {
    const { supabase, userId } = await requireAutomationOperator(ctx);

    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, nom, url, type, taille, client_id, user_id, type_document")
      .eq("id", document_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) {
      await auditLog(supabase, { actor_user_id: userId, tool: "create_document_download_link", document_id, outcome: "denied", detail: "document introuvable ou non autorisé" });
      throw new ToolError("404 not found: document introuvable ou non autorisé.");
    }
    if (!doc.url || doc.url.startsWith("data:")) {
      throw new ToolError("400 invalid: ce document n'est pas stocké dans le stockage de fichiers.");
    }

    const path = storagePath(doc.url);
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, EXPIRES_SECONDS);
    if (signErr || !signed?.signedUrl) {
      await auditLog(supabase, { actor_user_id: userId, tool: "create_document_download_link", document_id, client_id: doc.client_id, outcome: "denied", detail: signErr?.message ?? "signature refusée" });
      throw new ToolError(`403 forbidden: lien impossible (${signErr?.message ?? "accès refusé"}).`);
    }

    await auditLog(supabase, {
      actor_user_id: userId,
      tool: "create_document_download_link",
      document_id,
      client_id: doc.client_id,
      filename: doc.nom,
      size_bytes: doc.taille ?? null,
      outcome: "granted",
    });

    return textResult({
      document_id: doc.id,
      nom: doc.nom,
      type_document: doc.type_document,
      mime: doc.type,
      download_url: signed.signedUrl,
      expires_in_seconds: EXPIRES_SECONDS,
      expires_at: toZurichISO(new Date(Date.now() + EXPIRES_SECONDS * 1000)),
    });
  },
});

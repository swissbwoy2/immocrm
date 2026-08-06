import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { auditLog, requireAutomationOperator, textResult, toZurichISO } from "../guard";

const BUCKET = "client-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo

function sanitizeFilename(input: string): string {
  const base = input.split(/[\\/]/).pop() ?? "document.pdf";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 120);
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

function decodeBase64(b64: string): Uint8Array {
  const clean = b64.replace(/^data:application\/pdf;base64,/, "").replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default defineTool({
  name: "upload_prepared_pdf",
  title: "Déposer un PDF préparé",
  description:
    "Ajoute (INSERT uniquement) un PDF préparé au dossier du client d'une postulation. Valide la signature %PDF, la taille, le nom de fichier et détecte les doublons.",
  inputSchema: {
    postulation_id: z.string().uuid().describe("Identifiant de l'offre (postulation) concernée."),
    filename: z.string().describe("Nom du fichier PDF, par ex. dossier_candidature.pdf."),
    content_base64: z.string().describe("Contenu du PDF encodé en base64."),
    type_document: z
      .string()
      .describe("Catégorie du document dans le CRM (défaut : dossier_candidature).")
      .optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const { supabase, userId } = await requireAutomationOperator(ctx);
    const filename = sanitizeFilename(input.filename);

    // Correspondance client <-> postulation (RLS appliquée)
    const { data: offre, error: offreErr } = await supabase
      .from("offres")
      .select("id, client_id, adresse")
      .eq("id", input.postulation_id)
      .maybeSingle();
    if (offreErr) throw new Error(offreErr.message);
    if (!offre) {
      await auditLog(supabase, { actor_user_id: userId, tool: "upload_prepared_pdf", filename, outcome: "denied", detail: "postulation introuvable ou non autorisée" });
      throw new ToolError("404 not found: postulation introuvable ou non autorisée.");
    }

    const { data: client } = await supabase
      .from("clients")
      .select("id, user_id")
      .eq("id", offre.client_id)
      .maybeSingle();
    if (!client?.user_id) {
      throw new ToolError("409 conflict: le client de cette postulation n'a pas de compte utilisateur associé.");
    }

    let bytes: Uint8Array;
    try {
      bytes = decodeBase64(input.content_base64);
    } catch {
      await auditLog(supabase, { actor_user_id: userId, tool: "upload_prepared_pdf", client_id: client.id, filename, outcome: "invalid", detail: "base64 illisible" });
      throw new ToolError("400 invalid: content_base64 n'est pas un base64 valide.");
    }
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
      await auditLog(supabase, { actor_user_id: userId, tool: "upload_prepared_pdf", client_id: client.id, filename, size_bytes: bytes.byteLength, outcome: "invalid", detail: "taille hors limites" });
      throw new ToolError(`400 invalid: taille de fichier invalide (max ${MAX_BYTES} octets).`);
    }
    const header = String.fromCharCode(...bytes.slice(0, 5));
    if (header !== "%PDF-") {
      await auditLog(supabase, { actor_user_id: userId, tool: "upload_prepared_pdf", client_id: client.id, filename, size_bytes: bytes.byteLength, outcome: "invalid", detail: "signature %PDF absente" });
      throw new ToolError("400 invalid: le fichier n'est pas un PDF (signature %PDF- absente).");
    }

    // Détection de doublon : même nom + même taille pour ce client
    const { data: existing } = await supabase
      .from("documents")
      .select("id, nom, taille")
      .eq("client_id", client.id)
      .eq("nom", filename)
      .limit(5);
    const duplicate = (existing ?? []).find((d) => d.taille === bytes.byteLength);
    if (duplicate) {
      await auditLog(supabase, { actor_user_id: userId, tool: "upload_prepared_pdf", client_id: client.id, document_id: duplicate.id, filename, size_bytes: bytes.byteLength, outcome: "duplicate" });
      throw new ToolError(`409 conflict: document déjà présent (document_id ${duplicate.id}).`);
    }

    const path = `${client.user_id}/postulations/${offre.id}/${Date.now()}-${filename}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (upErr) {
      await auditLog(supabase, { actor_user_id: userId, tool: "upload_prepared_pdf", client_id: client.id, filename, size_bytes: bytes.byteLength, outcome: "denied", detail: upErr.message });
      throw new ToolError(`403 forbidden: dépôt refusé (${upErr.message}).`);
    }

    const { data: inserted, error: insErr } = await supabase
      .from("documents")
      .insert({
        nom: filename,
        type: "application/pdf",
        taille: bytes.byteLength,
        url: path,
        user_id: client.user_id,
        client_id: client.id,
        offre_id: offre.id,
        type_document: input.type_document ?? "dossier_candidature",
        statut: "en attente",
      })
      .select("id, nom, date_upload")
      .single();
    if (insErr) {
      await auditLog(supabase, { actor_user_id: userId, tool: "upload_prepared_pdf", client_id: client.id, filename, size_bytes: bytes.byteLength, outcome: "denied", detail: insErr.message });
      throw new ToolError(`403 forbidden: enregistrement refusé (${insErr.message}).`);
    }

    await auditLog(supabase, {
      actor_user_id: userId,
      tool: "upload_prepared_pdf",
      client_id: client.id,
      document_id: inserted.id,
      filename,
      size_bytes: bytes.byteLength,
      outcome: "granted",
    });

    return textResult({
      document_id: inserted.id,
      nom: inserted.nom,
      client_id: client.id,
      postulation_id: offre.id,
      taille_octets: bytes.byteLength,
      date_upload: toZurichISO(inserted.date_upload),
    });
  },
});

// Dépôt de fichiers pour les parcours PUBLICS (mandat V3 non signé, demande de mandat).
// Aucune écriture anonyme directe dans le stockage : tout passe ici, avec validation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Méthode non autorisée" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const form = await req.formData();
    const file = form.get("file");
    const target = String(form.get("target") ?? "");
    if (!(file instanceof File)) return json(400, { success: false, error: "Fichier manquant" });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return json(400, { success: false, error: "Taille de fichier invalide (max 20 Mo)" });
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.includes(mime)) {
      return json(400, { success: false, error: "Type de fichier non autorisé" });
    }
    const safeName = (file.name || "document").replace(/[^\w.\-]+/g, "_").slice(-120);

    // ---- Mandat V3 : brouillon non signé, jeton d'accès obligatoire ----
    if (target === "mandate_v3") {
      const mandateId = String(form.get("mandate_id") ?? "");
      const accessToken = String(form.get("access_token") ?? "");
      const category = String(form.get("document_category") ?? "autre");
      if (!UUID_RE.test(mandateId) || !accessToken) {
        return json(400, { success: false, error: "Paramètres invalides" });
      }
      const { data: mandate } = await supabase
        .from("mandates")
        .select("id, access_token, signed_at")
        .eq("id", mandateId)
        .maybeSingle();
      if (!mandate || mandate.access_token !== accessToken) {
        return json(403, { success: false, error: "Accès refusé" });
      }
      if (mandate.signed_at) return json(409, { success: false, error: "Ce mandat est déjà signé" });

      const filePath = `${mandateId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("mandates-private")
        .upload(filePath, file, { contentType: mime, upsert: false });
      if (upErr) {
        console.error("public-document-upload storage error");
        return json(500, { success: false, error: "Erreur lors du dépôt" });
      }
      const { data: docRow, error: insErr } = await supabase
        .from("mandate_documents")
        .insert({
          mandate_id: mandateId,
          file_name: file.name,
          file_path: filePath,
          file_type: mime,
          file_size: file.size,
          document_category: category,
        })
        .select("id")
        .single();
      if (insErr) {
        console.error("public-document-upload insert error");
        return json(500, { success: false, error: "Erreur enregistrement document" });
      }
      return json(200, { success: true, document_id: docRow.id, file_path: filePath });
    }

    // ---- Demande de mandat publique : dossier isolé par requête ----
    if (target === "demande_mandat") {
      let requestId = String(form.get("request_id") ?? "");
      if (!UUID_RE.test(requestId)) requestId = crypto.randomUUID();
      const filePath = `mandat/${requestId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("client-documents")
        .upload(filePath, file, { contentType: mime, upsert: false });
      if (upErr) {
        console.error("public-document-upload storage error");
        return json(500, { success: false, error: "Erreur lors du dépôt" });
      }
      return json(200, {
        success: true,
        request_id: requestId,
        file_path: filePath,
        url: `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/client-documents/${filePath}`,
      });
    }

    return json(400, { success: false, error: "Cible inconnue" });
  } catch (_e) {
    console.error("public-document-upload: erreur inattendue");
    return json(500, { success: false, error: "Erreur inattendue" });
  }
});

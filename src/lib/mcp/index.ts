import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPendingPostulations from "./tools/list-pending-postulations";
import getPostulationContext from "./tools/get-postulation-context";
import createDocumentDownloadLink from "./tools/create-document-download-link";
import uploadPreparedPdf from "./tools/upload-prepared-pdf";

// L'émetteur OAuth doit être l'hôte Supabase DIRECT (jamais l'URL proxy .lovable.cloud).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "logisorama-logiciel-crm-immo-rama",
  title: "Logisorama - Logiciel CRM Immo-rama",
  version: "1.0.0",
  instructions:
    "Outils du CRM Logisorama pour le flux « Postulations ». Utilisez list_pending_postulations pour lister les postulations à faire, get_postulation_context pour obtenir le dossier borné d'une postulation, create_document_download_link pour obtenir un lien signé de 60 s vers un document, et upload_prepared_pdf pour déposer le PDF de candidature préparé. Toutes les actions s'exécutent avec l'identité de l'utilisateur connecté (rôle automation_operator requis).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPendingPostulations, getPostulationContext, createDocumentDownloadLink, uploadPreparedPdf],
});

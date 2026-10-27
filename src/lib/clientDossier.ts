import { supabase } from '@/integrations/supabase/client';
import { isPurchaseBuyer } from '@/lib/journey';
import {
  AUTRE_ALLOWED_MIME,
  DOSSIER_ALLOWED_MIME,
  DOSSIER_MAX_BYTES,
  PURCHASE_DOC_CATEGORY,
  type DossierJourney,
} from '@/config/clientDocumentCatalog';

/** Personne du dossier à qui une pièce peut être rattachée (garant, colocataire…). */
export interface DossierPerson {
  /** client_candidates.id */
  id: string;
  label: string;
}

export interface ClientDossierContext {
  userId: string;
  clientId: string;
  journey: DossierJourney;
  purchaseProjectId: string | null;
  persons: DossierPerson[];
  /** Libellé du client lui-même dans le choix de la personne, ex. « Moi (Shakhawan) ». */
  selfLabel?: string;
}

const PERSON_TYPE_LABELS: Record<string, string> = {
  garant: 'garant',
  colocataire: 'colocataire',
  co_debiteur: 'codébiteur',
  signataire_solidaire: 'signataire solidaire',
};

/**
 * Dossier du client connecté : même détection location / achat que la page « Mes documents ».
 * Renvoie null pour un compte qui n'a pas de dossier client.
 */
export async function loadClientDossierContext(userId: string): Promise<ClientDossierContext | null> {
  const { data: client } = await supabase
    .from('clients')
    .select('id, type_recherche, journey_type')
    .eq('user_id', userId)
    .maybeSingle();
  if (!client) return null;

  let project: { id: string; client_id: string | null; user_id: string | null } | null = null;
  const { data: byUser } = await supabase
    .from('purchase_projects')
    .select('id, client_id, user_id')
    .eq('user_id', userId)
    .maybeSingle();
  project = byUser ?? null;
  if (!project) {
    const { data: byClient } = await supabase
      .from('purchase_projects')
      .select('id, client_id, user_id')
      .eq('client_id', client.id)
      .maybeSingle();
    project = byClient ?? null;
  }
  const buyer = isPurchaseBuyer(client, project);

  const { data: people } = await supabase
    .from('client_candidates')
    .select('id, type, prenom, nom')
    .eq('client_id', client.id)
    .order('created_at', { ascending: true });

  const { data: profile } = await supabase.from('profiles').select('prenom').eq('id', userId).maybeSingle();
  const firstName = String(profile?.prenom ?? '').trim().split(/\s+/)[0];

  return {
    userId,
    clientId: client.id,
    journey: buyer ? 'achat' : 'location',
    purchaseProjectId: buyer ? project?.id ?? null : null,
    selfLabel: firstName ? `Moi (${firstName})` : 'Moi',
    persons: (people || []).map((p) => {
      const name = `${p.prenom || ''} ${p.nom || ''}`.trim();
      const role = PERSON_TYPE_LABELS[p.type] || p.type;
      return { id: p.id, label: name ? `${name} (${role})` : role.charAt(0).toUpperCase() + role.slice(1) };
    }),
  };
}

export interface FiledDocument {
  documentId: string;
  type: string;
  label: string;
  candidateId: string | null;
  personLabel: string | null;
  /** Chemin dans le bucket privé client-documents */
  storagePath: string;
  name: string;
  size: number;
  mime: string;
  isImage: boolean;
}

/** Vérifie format et taille ; renvoie un message d'erreur lisible, ou null si le fichier convient. */
export function validateDossierFile(file: File, type: string): string | null {
  const allowed = type === 'autre' ? AUTRE_ALLOWED_MIME : DOSSIER_ALLOWED_MIME;
  if (file.type && !allowed.includes(file.type)) {
    return type === 'autre'
      ? 'Format non accepté. Envoie un PDF, une image ou un document Word ou Excel.'
      : 'Format non accepté. Envoie un PDF ou une photo (JPG, PNG).';
  }
  if (file.size > DOSSIER_MAX_BYTES) return 'Fichier trop volumineux (20 Mo au maximum).';
  if (file.size === 0) return 'Le fichier est vide.';
  return null;
}

/**
 * Dépose une pièce dans le dossier du client, au même endroit que la page « Mes documents » :
 * fichier dans client-documents, ligne dans documents, demande de pièce correspondante marquée reçue.
 */
export async function fileDocumentToDossier(params: {
  ctx: ClientDossierContext;
  file: File;
  type: string;
  label: string;
  candidateId: string | null;
}): Promise<FiledDocument> {
  const { ctx, file, type, label, candidateId } = params;
  const safeName = file.name.replace(/[/\\]/g, '_') || `document-${Date.now()}`;
  const storagePath = `${ctx.userId}/general/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from('client-documents').upload(storagePath, file);
  if (uploadError) throw uploadError;

  const { data: inserted, error: dbError } = await supabase
    .from('documents')
    .insert({
      nom: safeName,
      type: file.type || 'application/octet-stream',
      taille: file.size,
      user_id: ctx.userId,
      client_id: ctx.clientId,
      candidate_id: candidateId,
      type_document: type,
      purchase_project_id: ctx.journey === 'achat' ? ctx.purchaseProjectId : null,
      purchase_category: ctx.journey === 'achat' ? PURCHASE_DOC_CATEGORY[type] || 'autre' : null,
      url: storagePath,
    })
    .select('id')
    .single();

  if (dbError || !inserted) {
    // Pas de fichier orphelin dans le stockage si l'enregistrement échoue.
    await supabase.storage.from('client-documents').remove([storagePath]);
    throw dbError || new Error("Le document n'a pas pu être enregistré");
  }

  // La demande de pièce correspondante est close côté serveur (trg_fulfil_document_request_on_upload).

  const person = candidateId ? ctx.persons.find((p) => p.id === candidateId) : null;
  return {
    documentId: inserted.id,
    type,
    label,
    candidateId,
    personLabel: person?.label ?? null,
    storagePath,
    name: safeName,
    size: file.size,
    mime: file.type || 'application/octet-stream',
    isImage: (file.type || '').startsWith('image/'),
  };
}

/** Champs du message qui annonce la pièce dans la conversation (fichier lu depuis le dossier, sans copie). */
export function dossierDocumentMessage(doc: FiledDocument) {
  const who = doc.personLabel ? ` — ${doc.personLabel}` : '';
  return {
    content: `📎 ${doc.label} ajouté(e) au dossier${who}`,
    attachment_url: `client-documents/${doc.storagePath}`,
    attachment_name: doc.name,
    attachment_type: doc.isImage ? 'image' : 'document',
    attachment_size: doc.size,
    payload: {
      kind: 'dossier_document',
      document_id: doc.documentId,
      type_document: doc.type,
      label: doc.label,
      candidate_id: doc.candidateId,
      // Contrôle à venir par Steeve ou un agent (lisibilité, bonne pièce, bonne personne).
      verification: 'a_verifier',
    },
  };
}

/** Publie dans la conversation le message qui annonce une pièce déposée au dossier. */
export async function postDossierDocumentMessage(params: {
  conversationId: string;
  senderId: string;
  senderType: string;
  doc: FiledDocument;
  clientMsgId: string;
}) {
  const { conversationId, senderId, senderType, doc, clientMsgId } = params;
  return supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_type: senderType,
      ...dossierDocumentMessage(doc),
      client_msg_id: clientMsgId,
    })
    .select()
    .maybeSingle();
}

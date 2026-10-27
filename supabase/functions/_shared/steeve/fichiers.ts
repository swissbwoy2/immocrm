// Steeve, 27.10.2026 : lire ce que le client envoie (photos, captures, PDF) et lui écrire dans sa langue.
// - Pièces jointes de la messagerie (bucket privé message-attachments) données au modèle comme images / PDF.
// - Classement d'un fichier dans « Mes documents » (bucket client-documents + table documents) par Steeve.
// - Messages automatiques traduits dans la langue notée pour le client (conversations.steeve_summary.langue).
import { costOf, type CallModel, type ContentBlock } from './anthropic.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

export const ATTACHMENTS_BUCKET = 'message-attachments';
export const DOCUMENTS_BUCKET = 'client-documents';
/** Image envoyée au modèle : 3,7 Mo au plus (5 Mo une fois encodée) ; au-delà de 1 Mo, réduite à 1600 px. PDF : 20 Mo. */
export const MAX_IMAGE_BYTES = 3_700_000;
export const RESIZE_ABOVE_BYTES = 1_000_000;
export const MAX_EDGE_PX = 1600;
export const MAX_PDF_BYTES = 20_000_000;
/** Pièces jointes du client montrées au modèle à chaque réponse : les plus récentes, non classées, 72 h. */
export const MAX_ATTACHMENTS = 3;
export const ATTACHMENT_WINDOW_MS = 72 * 3600_000;
export const TRANSLATION_MODEL = 'claude-haiku-5-5';

const IMAGE_MIME: Record<string, 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
};

/** Types de documents que Steeve peut classer (mêmes valeurs que la page « Mes documents »). */
export const DOC_TYPES: Record<string, string> = {
  piece_identite: "Pièce d'identité",
  permis_sejour: 'Permis de séjour',
  fiche_salaire: 'Fiche de salaire',
  contrat_travail: 'Contrat de travail',
  attestation_employeur: "Attestation de l'employeur",
  extrait_poursuites: 'Extrait des poursuites',
  attestation_domicile: 'Attestation de domicile',
  rc_menage: 'Assurance RC ménage',
  certificat_salaire: 'Certificat de salaire',
  formulaire_location: 'Demande de location (formulaire)',
  autre: 'Autre document',
};

export function extOf(name: string | null | undefined): string {
  const m = String(name ?? '').toLowerCase().match(/\.([a-z0-9]{2,5})(?:\?|$)/);
  return m ? m[1] : '';
}

/** Chemin dans le bucket à partir de l'URL enregistrée sur le message (publique ou signée) ou d'un chemin brut. */
export function attachmentPath(url: string | null | undefined): string | null {
  const u = String(url ?? '').trim();
  if (!u) return null;
  const m = u.match(/\/message-attachments\/([^?#]+)/);
  if (m) return decodeURIComponent(m[1]);
  return /^https?:/i.test(u) ? null : u.replace(/^\/+/, '');
}

export function mimeFor(name: string | null | undefined, declared?: string | null): string {
  const ext = extOf(name);
  if (ext === 'pdf' || /pdf/i.test(String(declared ?? ''))) return 'application/pdf';
  if (IMAGE_MIME[ext]) return IMAGE_MIME[ext];
  if (/^image\/(jpeg|png|webp|gif)$/i.test(String(declared ?? ''))) return String(declared).toLowerCase();
  return String(declared ?? 'application/octet-stream');
}

export function b64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Photo de téléphone (souvent 2 à 6 Mo) réduite à 1600 px en JPEG : lisible par le modèle et moins coûteuse. */
export async function shrinkImage(bytes: Uint8Array, mime: string): Promise<{ bytes: Uint8Array; mime: string }> {
  if (bytes.length <= RESIZE_ABOVE_BYTES || !/^image\/(jpeg|png)$/.test(mime)) return { bytes, mime };
  try {
    const { Image } = await import('npm:imagescript@1.3.0');
    const img = await Image.decode(bytes);
    if (img.width >= img.height && img.width > MAX_EDGE_PX) img.resize(MAX_EDGE_PX, Image.RESIZE_AUTO);
    else if (img.height > MAX_EDGE_PX) img.resize(Image.RESIZE_AUTO, MAX_EDGE_PX);
    return { bytes: await img.encodeJPEG(82), mime: 'image/jpeg' };
  } catch {
    return { bytes, mime };
  }
}

/** Bloc lisible par le modèle, ou la raison pour laquelle le fichier ne peut pas être lu. */
export async function blockFor(raw: Uint8Array, rawMime: string, title: string): Promise<ContentBlock | { raison: string }> {
  if (rawMime === 'application/pdf') {
    if (raw.length > MAX_PDF_BYTES) return { raison: 'PDF trop lourd (plus de 20 Mo)' };
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64(raw) }, title: title.slice(0, 120) };
  }
  if (Object.values(IMAGE_MIME).includes(rawMime as never)) {
    const { bytes, mime } = await shrinkImage(raw, rawMime);
    if (bytes.length > MAX_IMAGE_BYTES) return { raison: 'photo trop lourde : demander une capture d\'écran ou une photo moins lourde' };
    return { type: 'image', source: { type: 'base64', media_type: mime as 'image/jpeg', data: b64(bytes) } };
  }
  return { raison: `format non lisible (${rawMime}) : demander une photo JPG/PNG ou un PDF (une photo HEIC d'iPhone peut être envoyée en capture d'écran)` };
}

async function download(db: Db, bucket: string, path: string): Promise<Uint8Array | null> {
  try {
    const { data } = await db.storage.from(bucket).download(path);
    return data ? new Uint8Array(await data.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/**
 * Pièces jointes récentes du client pas encore classées (payload.document_classe absent) : blocs à joindre au
 * contexte du modèle, avec l'identifiant du message pour l'outil classer_document.
 */
export async function attachmentBlocks(db: Db, transcript: any[], now: Date): Promise<ContentBlock[]> {
  const recents = transcript
    .filter((m) => m.sender_type === 'client' && m.attachment_url && m.attachment_type !== 'audio'
      && m.payload?.kind !== 'dossier_document' && !m.payload?.document_classe && !m.payload?.fichier_lu
      && now.getTime() - new Date(m.created_at).getTime() <= ATTACHMENT_WINDOW_MS)
    .slice(-MAX_ATTACHMENTS);
  const blocks: ContentBlock[] = [];
  for (const m of recents) {
    const name = String(m.attachment_name ?? 'fichier');
    const mime = mimeFor(name, m.attachment_type === 'image' ? `image/${extOf(name) || 'jpeg'}` : m.attachment_type);
    const path = attachmentPath(m.attachment_url);
    const bytes = path ? await download(db, ATTACHMENTS_BUCKET, path) : null;
    const head = `Pièce jointe envoyée par le client (message_id ${m.id}, fichier « ${name} »)`;
    if (!bytes) { blocks.push({ type: 'text', text: `${head} : fichier introuvable dans le stockage, demande-lui de le renvoyer.` }); continue; }
    const block = await blockFor(bytes, mime, name);
    if ('raison' in block) { blocks.push({ type: 'text', text: `${head} : ${block.raison}.` }); continue; }
    blocks.push({ type: 'text', text: `${head} — regarde-la : si c'est un document du dossier, classe-le avec classer_document (message_id ci-dessus) ; si c'est une annonce ou une demande de location, traite-la.` });
    blocks.push(block);
  }
  return blocks;
}

/** Document déjà dans « Mes documents » du client, lu par le modèle (outil lire_document). */
export async function documentBlock(db: Db, clientId: string, documentId: string): Promise<{ block?: ContentBlock; info?: any; erreur?: string }> {
  const { data: d } = await db.from('documents').select('id, nom, type, url, type_document, candidate_id, date_upload, statut')
    .eq('id', documentId).eq('client_id', clientId).maybeSingle();
  if (!d) return { erreur: 'Document introuvable dans le dossier de ce client.' };
  if (!d.url) return { erreur: 'Document sans fichier.' };
  const bytes = await download(db, DOCUMENTS_BUCKET, d.url);
  if (!bytes) return { erreur: 'Fichier introuvable dans le stockage.' };
  const block = await blockFor(bytes, mimeFor(d.nom || d.url, d.type), d.nom || 'document');
  if ('raison' in block) return { erreur: String(block.raison) };
  return { block, info: { document_id: d.id, fichier: d.nom, type_actuel: d.type_document, statut: d.statut, depose_le: String(d.date_upload ?? '').slice(0, 10) } };
}

/**
 * Copie une pièce jointe de la messagerie dans « Mes documents » (même chemin que l'application : <user_id>/<horodatage>_<uuid>.<ext>).
 * Rend le chemin, le type MIME et la taille, ou une erreur.
 */
export async function copyAttachmentToDocuments(db: Db, userId: string, message: { attachment_url: string; attachment_name?: string | null; attachment_type?: string | null }):
  Promise<{ path: string; mime: string; taille: number; nom: string } | { erreur: string }> {
  const path = attachmentPath(message.attachment_url);
  if (!path) return { erreur: 'Pièce jointe sans chemin de stockage.' };
  const bytes = await download(db, ATTACHMENTS_BUCKET, path);
  if (!bytes) return { erreur: 'Pièce jointe introuvable dans le stockage.' };
  const nom = String(message.attachment_name ?? path.split('/').pop() ?? 'document');
  const mime = mimeFor(nom, message.attachment_type === 'image' ? `image/${extOf(nom) || 'jpeg'}` : message.attachment_type);
  const ext = extOf(nom) || (mime === 'application/pdf' ? 'pdf' : 'jpg');
  const dest = `${userId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(DOCUMENTS_BUCKET).upload(dest, new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }), { contentType: mime, upsert: false });
  if (error) return { erreur: `Copie refusée par le stockage (${String(error.message ?? error).slice(0, 80)}).` };
  return { path: dest, mime, taille: bytes.length, nom };
}

// ---------- langue du client ----------

export async function languageOf(db: Db, conversationId: string): Promise<string | null> {
  try {
    const { data } = await db.from('conversations').select('steeve_summary').eq('id', conversationId).limit(1);
    const l = String(((data?.[0] ?? data)?.steeve_summary as any)?.langue ?? '').trim();
    return l && !/^fran/i.test(l) ? l : null;
  } catch {
    return null;
  }
}

/**
 * Message automatique de Steeve dans la langue du client (s'il en a une autre que le français), suivi de la version
 * française pour l'équipe. Sans langue, sans modèle ou en cas d'échec : le texte français tel quel.
 */
export async function inClientLanguage(db: Db, callModel: CallModel | null | undefined, conversationId: string, content: string): Promise<{ text: string; cost: number }> {
  if (!callModel) return { text: content, cost: 0 };
  const langue = await languageOf(db, conversationId);
  if (!langue) return { text: content, cost: 0 };
  try {
    const resp = await callModel({
      model: TRANSLATION_MODEL,
      max_tokens: 1500,
      system: [{ type: 'text', text: `Traduis en ${langue} ce message qu'une agence immobilière suisse envoie à son client. Tutoiement ou vouvoiement comme dans l'original, phrases simples. Garde en français, entre guillemets ou parenthèses, les adresses, montants, dates, heures, noms des boutons de l'application et noms des documents. Garde les liens et les emojis tels quels. Rends uniquement le message traduit, sans commentaire.` }],
      tools: [],
      messages: [{ role: 'user', content }],
    });
    const out = resp.content.filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text').map((b) => b.text).join('').trim();
    return { text: out ? `${out}\n\n—\n(FR) ${content}` : content, cost: costOf(TRANSLATION_MODEL, resp.usage) };
  } catch {
    return { text: content, cost: 0 };
  }
}

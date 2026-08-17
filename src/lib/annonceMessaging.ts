import { supabase } from '@/integrations/supabase/client';

export interface AnnonceConversation {
  id: string;
  annonce_id: string;
  participant_1_id: string;
  participant_2_id: string;
  dernier_message_at: string | null;
  archive_par_1: boolean | null;
  archive_par_2: boolean | null;
  bloque_par_1: boolean | null;
  bloque_par_2: boolean | null;
  created_at: string;
  annonces_publiques?: { id: string; titre: string; ville: string | null; slug: string | null } | null;
  messages_annonces?: AnnonceMessage[];
}

export interface AnnonceMessage {
  id: string;
  conversation_id: string;
  expediteur_id: string;
  contenu: string | null;
  piece_jointe_url: string | null;
  piece_jointe_nom: string | null;
  lu: boolean | null;
  created_at: string;
  supprime?: boolean | null;
}

export const ANNONCE_ATTACHMENTS_BUCKET = 'annonce-attachments';

export function isParticipant1(conv: AnnonceConversation, userId: string) {
  return conv.participant_1_id === userId;
}

export function isArchived(conv: AnnonceConversation, userId: string) {
  return isParticipant1(conv, userId) ? !!conv.archive_par_1 : !!conv.archive_par_2;
}

export function isBlockedByMe(conv: AnnonceConversation, userId: string) {
  return isParticipant1(conv, userId) ? !!conv.bloque_par_1 : !!conv.bloque_par_2;
}

export function isBlockedByOther(conv: AnnonceConversation, userId: string) {
  return isParticipant1(conv, userId) ? !!conv.bloque_par_2 : !!conv.bloque_par_1;
}

export async function fetchAnnonceConversations(userId: string): Promise<AnnonceConversation[]> {
  const { data, error } = await supabase
    .from('conversations_annonces')
    .select('*, annonces_publiques(id, titre, ville, slug), messages_annonces(id, conversation_id, expediteur_id, contenu, piece_jointe_url, piece_jointe_nom, lu, created_at)')
    .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
    .order('dernier_message_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data || []) as unknown as AnnonceConversation[];
}

export async function fetchAnnonceMessages(conversationId: string): Promise<AnnonceMessage[]> {
  const { data, error } = await supabase
    .from('messages_annonces')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as AnnonceMessage[];
}

export async function markAnnonceMessagesRead(conversationId: string, userId: string) {
  await supabase
    .from('messages_annonces')
    .update({ lu: true, date_lecture: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('expediteur_id', userId)
    .eq('lu', false);
}

export async function sendAnnonceMessage(params: {
  conversationId: string;
  userId: string;
  contenu: string;
  file?: File | null;
}) {
  const { conversationId, userId, contenu, file } = params;
  let piece_jointe_url: string | null = null;
  let piece_jointe_nom: string | null = null;

  if (file) {
    const safeName = file.name.replace(/[^\w.\-]/g, '_');
    const path = `${conversationId}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from(ANNONCE_ATTACHMENTS_BUCKET)
      .upload(path, file, { upsert: false });
    if (upErr) throw upErr;
    piece_jointe_url = path;
    piece_jointe_nom = file.name;
  }

  const { error } = await supabase.from('messages_annonces').insert({
    conversation_id: conversationId,
    expediteur_id: userId,
    contenu: contenu || (piece_jointe_nom ? `📎 ${piece_jointe_nom}` : ''),
    piece_jointe_url,
    piece_jointe_nom,
  });
  if (error) throw error;
}

export async function getAttachmentUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(ANNONCE_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

export async function setConversationFlag(
  conv: AnnonceConversation,
  userId: string,
  flag: 'archive' | 'bloque',
  value: boolean,
) {
  const column = `${flag}_par_${isParticipant1(conv, userId) ? 1 : 2}`;
  const { error } = await supabase
    .from('conversations_annonces')
    .update({ [column]: value })
    .eq('id', conv.id);
  if (error) throw error;
}

export function unreadCount(conv: AnnonceConversation, userId: string) {
  return (conv.messages_annonces || []).filter((m) => !m.lu && m.expediteur_id !== userId).length;
}

export function lastMessage(conv: AnnonceConversation): AnnonceMessage | undefined {
  const msgs = [...(conv.messages_annonces || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  return msgs[msgs.length - 1];
}

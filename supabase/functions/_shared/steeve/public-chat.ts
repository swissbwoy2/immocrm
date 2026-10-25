// Steeve sur le site public : un échange (question du visiteur → réponse), sans accès à aucune donnée.
// deno-lint-ignore-file no-explicit-any
import { costOf, type CallModel, type ContentBlock, type ModelMessage } from './anthropic.ts';
import { toPlainReply } from './engine.ts';
import { STEEVE_PUBLIC_PROMPT } from './public-prompt.ts';

export const MAX_HISTORY = 10;
export const MAX_MESSAGE_CHARS = 1000;

export const PUBLIC_BUSY_MESSAGE =
  "Je reçois beaucoup de questions en ce moment et je ne peux pas vous répondre en détail tout de suite. Vous trouverez nos conditions sur le site, et vous pouvez démarrer votre recherche ici : https://logisorama.ch/nouveau-mandat";
export const PUBLIC_ERROR_MESSAGE =
  "Désolé, je n'arrive pas à répondre pour le moment. Réessayez dans un instant, ou démarrez votre recherche ici : https://logisorama.ch/nouveau-mandat";

export interface PublicChatResult {
  status: number;
  body: { reply?: string; sig?: string; enabled?: boolean; error?: string };
}

/**
 * Signature des réponses de Steeve : le site renvoie l'historique, et seules les répliques réellement écrites
 * par Steeve (signées) sont reprises. Un visiteur ne peut pas inventer une « réponse de Steeve ».
 */
export async function signReply(sessionId: string, content: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${sessionId}\n${content}`));
  return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Garde les messages du visiteur et les seules répliques de Steeve dont la signature est valide. */
export async function keepSignedHistory(raw: unknown, sessionId: string, salt: string): Promise<unknown[]> {
  if (!Array.isArray(raw)) return [];
  const out: unknown[] = [];
  for (const m of raw.slice(-20)) {
    const msg = m as { role?: unknown; content?: unknown; sig?: unknown };
    if (msg?.role === 'user') out.push({ role: 'user', content: msg.content });
    else if (msg?.role === 'assistant' && typeof msg.content === 'string' && typeof msg.sig === 'string'
      && msg.sig === await signReply(sessionId, msg.content, salt)) {
      out.push({ role: 'assistant', content: msg.content });
    }
  }
  return out;
}

/** Empreinte SHA-256 salée (aucune adresse IP ni identifiant de session n'est stocké en clair). */
export async function fingerprint(value: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${value}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Historique envoyé par le site : validé et borné (rôles alternés, dernier message du visiteur). */
export function sanitizeHistory(raw: unknown): ModelMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const items = raw.slice(-MAX_HISTORY).map((m: any) => ({
    role: m?.role === 'assistant' ? 'assistant' as const : m?.role === 'user' ? 'user' as const : null,
    content: typeof m?.content === 'string' ? m.content.replace(/\u0000/g, '').trim().slice(0, MAX_MESSAGE_CHARS) : '',
  }));
  if (items.some((m) => !m.role || !m.content)) return null;
  // L'API exige un premier message du visiteur et des rôles alternés.
  while (items.length && items[0].role !== 'user') items.shift();
  const out: ModelMessage[] = [];
  for (const m of items) {
    if (out.length && out[out.length - 1].role === m.role) {
      out[out.length - 1] = { role: m.role!, content: `${out[out.length - 1].content}\n${m.content}`.slice(0, MAX_MESSAGE_CHARS * 2) };
    } else out.push({ role: m.role!, content: m.content });
  }
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

export async function handlePublicChat(opts: {
  db: any;
  callModel: CallModel | null;
  body: any;
  ip: string;
  salt: string;
}): Promise<PublicChatResult> {
  const { db, callModel, body } = opts;
  const sessionId = typeof body?.session_id === 'string' ? body.session_id : '';
  if (!/^[A-Za-z0-9-]{8,64}$/.test(sessionId)) return { status: 400, body: { error: 'session invalide' } };
  const history = sanitizeHistory(await keepSignedHistory(body?.messages, sessionId, opts.salt));
  if (!history) return { status: 400, body: { error: 'messages invalides' } };

  const [sessionHash, ipHash] = await Promise.all([fingerprint(sessionId, opts.salt), fingerprint(opts.ip || 'inconnue', opts.salt)]);
  const { data: admit, error: admitError } = await db.rpc('steeve_public_admit', { p_session_hash: sessionHash, p_ip_hash: ipHash });
  if (admitError) return { status: 200, body: { reply: PUBLIC_ERROR_MESSAGE } };
  if (!admit?.ok) {
    if (admit?.reason === 'desactive') return { status: 200, body: { enabled: false } };
    return { status: 200, body: { reply: PUBLIC_BUSY_MESSAGE } };
  }
  const usageId: string = admit.usage_id;
  const model: string = admit.model || 'claude-haiku-5-5';
  if (!callModel) {
    await db.from('steeve_public_usage').update({ status: 'failed', error: 'ANTHROPIC_API_KEY non configurée' }).eq('id', usageId);
    return { status: 200, body: { reply: PUBLIC_ERROR_MESSAGE } };
  }

  try {
    const resp = await callModel({
      model,
      max_tokens: 500,
      system: [{ type: 'text', text: STEEVE_PUBLIC_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: [],
      messages: history,
    });
    const text = resp.content
      .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    await db.from('steeve_public_usage').update({
      status: text ? 'done' : 'failed',
      model,
      input_tokens: resp.usage.input_tokens,
      cache_write_tokens: resp.usage.cache_creation_input_tokens,
      cache_read_tokens: resp.usage.cache_read_input_tokens,
      output_tokens: resp.usage.output_tokens,
      cost_usd: Number(costOf(model, resp.usage).toFixed(6)),
      error: text ? null : 'réponse vide',
    }).eq('id', usageId);
    const reply = text ? toPlainReply(text) : PUBLIC_ERROR_MESSAGE;
    return { status: 200, body: { reply, sig: text ? await signReply(sessionId, reply, opts.salt) : undefined } };
  } catch (err) {
    await db.from('steeve_public_usage').update({ status: 'failed', error: (err instanceof Error ? err.message : String(err)).slice(0, 500) }).eq('id', usageId);
    return { status: 200, body: { reply: PUBLIC_ERROR_MESSAGE } };
  }
}

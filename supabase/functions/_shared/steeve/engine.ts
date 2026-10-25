// Un passage de Steeve : répondre au(x) dernier(s) message(s) du client d'une conversation.
// Le code décide (droits, plafonds, publication) ; le modèle comprend, choisit les outils et rédige.
// deno-lint-ignore-file no-explicit-any
import { costOf, type CallModel, type ContentBlock, type ModelMessage, type Usage } from './anthropic.ts';
import { loadDossier, overview, type Db } from './context.ts';
import { STEEVE_SYSTEM_PROMPT } from './prompt.ts';
import { runTool, STEEVE_TOOLS, transferToAgent } from './tools.ts';

export const MAX_MODEL_CALLS = 6;
const MAX_ATTEMPTS = 2;
const TRANSCRIPT_SIZE = 30;

export const CAPPED_MESSAGE =
  "Je ne peux pas te répondre en détail pour le moment. J'ai transmis ton message à ton agent, qui te répondra ici.";
export const TECHNICAL_MESSAGE =
  "J'ai un petit souci technique et je préfère ne pas te répondre au hasard. J'ai transmis ton message à ton agent, qui te répondra ici.";

export interface TurnResult {
  status: 'done' | 'skipped' | 'capped' | 'failed';
  reason?: string;
  replyMessageId?: string | null;
}

interface Totals {
  calls: number;
  usage: Usage;
  cost: number;
  tools: string[];
}

async function readConfig(db: Db): Promise<Record<string, string>> {
  const { data } = await db.from('app_config').select('key, value').like('key', 'steeve_%');
  const cfg: Record<string, string> = {};
  for (const row of data || []) cfg[row.key] = row.value;
  return cfg;
}

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

function formatZurich(iso: string): string {
  return new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function describeMessage(m: any): string {
  const who = m.sender_type === 'client' ? 'Client'
    : m.sender_type === 'assistant' ? 'Steeve'
    : m.sender_type === 'admin' ? 'Équipe Logisorama'
    : 'Agent';
  const parts: string[] = [];
  if (m.content) parts.push(String(m.content).slice(0, 1500));
  if (m.attachment_url && m.payload?.kind !== 'dossier_document') {
    if (m.attachment_type === 'audio') parts.push('[message vocal : Steeve ne peut pas encore l’écouter]');
    else parts.push(`[pièce jointe ${m.attachment_type || 'fichier'} : ${m.attachment_name || 'sans nom'}]`);
  }
  return `[${formatZurich(m.created_at)}] ${who} : ${parts.join(' ') || '(vide)'}`;
}

async function loadTranscript(db: Db, conversationId: string) {
  const { data } = await db
    .from('messages')
    .select('id, sender_type, content, attachment_url, attachment_type, attachment_name, payload, created_at')
    .eq('conversation_id', conversationId)
    .eq('masque_messagerie', false)
    .order('created_at', { ascending: false })
    .limit(TRANSCRIPT_SIZE);
  return (data || []).reverse();
}

/**
 * Texte brut pour la messagerie : la bulle n'affiche pas le Markdown, et un message commençant par
 * un emoji suivi de « ** » serait classé automatique et masqué (message_est_automatique).
 */
export function toPlainReply(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 2500);
}

async function postReply(db: Db, conversationId: string, runId: string, content: string): Promise<string | null> {
  const { data, error } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: 'steeve',
      sender_type: 'assistant',
      content,
      payload: { steeve_run_id: runId },
    })
    .select('id')
    .single();
  if (error) throw new Error(`Publication impossible : ${error.message}`);
  return data?.id ?? null;
}

async function notifyAdminsOnce(db: Db, key: string, marker: string, title: string, message: string) {
  const { data: current } = await db.from('app_config').select('value').eq('key', key).maybeSingle();
  if (current?.value === marker) return;
  await db.from('app_config').upsert({ key, value: marker, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  const { data: admins } = await db.from('user_roles').select('user_id').eq('role', 'admin');
  for (const a of admins || []) {
    await db.rpc('create_notification', {
      p_user_id: a.user_id,
      p_type: 'new_message',
      p_title: title,
      p_message: message,
      p_link: '/admin/messagerie',
      p_metadata: { source: 'steeve_budget' },
    });
  }
}

export async function runTurn(opts: {
  db: Db;
  runId: string;
  callModel: CallModel | null;
  now?: () => Date;
}): Promise<TurnResult> {
  const { db, runId, callModel } = opts;
  const now = opts.now ?? (() => new Date());

  const { data: claim } = await db.rpc('steeve_claim_run', { p_run_id: runId });
  if (!claim?.ok) return { status: 'skipped', reason: claim?.reason || 'non_pris' };

  const totals: Totals = {
    calls: 0,
    usage: { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 },
    cost: 0,
    tools: [],
  };
  let model = 'claude-haiku-5-5';

  const finish = async (result: TurnResult, error?: string) => {
    await db.from('steeve_runs').update({
      status: result.status,
      reason: result.reason ?? null,
      reply_message_id: result.replyMessageId ?? null,
      model,
      calls: totals.calls,
      input_tokens: totals.usage.input_tokens,
      cache_write_tokens: totals.usage.cache_creation_input_tokens,
      cache_read_tokens: totals.usage.cache_read_input_tokens,
      output_tokens: totals.usage.output_tokens,
      cost_usd: Number(totals.cost.toFixed(6)),
      tools_used: totals.tools,
      error: error ? error.slice(0, 1000) : null,
      finished_at: now().toISOString(),
    }).eq('id', runId);
    return result;
  };

  const { data: run } = await db.from('steeve_runs').select('id, conversation_id, client_id').eq('id', runId).single();
  const conversationId: string = run.conversation_id;

  const { data: conv } = await db
    .from('conversations')
    .select('id, client_id, handled_by, conversation_type')
    .eq('id', conversationId)
    .single();
  if (!conv || conv.handled_by !== 'steeve') return finish({ status: 'skipped', reason: 'pris_en_main' });

  const { data: enabled } = await db.rpc('steeve_enabled_for_conversation', { p_conversation_id: conversationId });
  if (!enabled) return finish({ status: 'skipped', reason: 'desactive' });

  const dossier = await loadDossier(db, conv.client_id);
  if (!dossier) return finish({ status: 'failed', reason: 'dossier_introuvable' }, `client ${conv.client_id} introuvable`);
  const toolCtx = { db, dossier, conversationId, now: now() };

  // Repli commun : message honnête au client, demande transmise à l'agent.
  const fallback = async (status: 'capped' | 'failed', reason: string, message: string, error?: string) => {
    await transferToAgent(toolCtx, reason, `Steeve n'a pas pu répondre (${reason}). Merci de reprendre la conversation.`);
    const replyId = await postReply(db, conversationId, runId, message);
    return finish({ status, reason, replyMessageId: replyId }, error);
  };

  // Plafonds de dépense (réglables dans app_config).
  const cfg = await readConfig(db);
  model = cfg.steeve_model || model;
  const { data: spend } = await db.rpc('steeve_spend', { p_client_id: conv.client_id });
  const s = spend || {};
  const monthCap = num(cfg.steeve_budget_month_usd, 30);
  const alertAt = num(cfg.steeve_alert_month_usd, 20);
  if ((s.month_usd ?? 0) >= alertAt) {
    const month = now().toISOString().slice(0, 7);
    await notifyAdminsOnce(db, 'steeve_alert_sent_month', month,
      'Steeve : seuil d’alerte du budget atteint',
      `Dépense du mois : ${Number(s.month_usd).toFixed(2)} USD (alerte à ${alertAt} USD, plafond ${monthCap} USD).`);
  }
  if ((s.month_usd ?? 0) >= monthCap || (s.day_usd ?? 0) >= num(cfg.steeve_budget_day_usd, 3)) {
    return fallback('capped', 'plafond_global', CAPPED_MESSAGE);
  }
  if ((s.client_day_usd ?? 0) >= num(cfg.steeve_client_day_usd, 0.5)
    || (s.client_day_runs ?? 0) >= num(cfg.steeve_client_day_messages, 40)) {
    return fallback('capped', 'plafond_client', CAPPED_MESSAGE);
  }

  if (!callModel) return fallback('failed', 'cle_api_absente', TECHNICAL_MESSAGE, 'ANTHROPIC_API_KEY non configurée');

  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const transcript = await loadTranscript(db, conversationId);
      const last = transcript[transcript.length - 1];
      // Quelqu'un a déjà répondu au client (agent ou passage précédent) : rien à ajouter.
      if (!last || last.sender_type !== 'client') return finish({ status: 'skipped', reason: 'deja_repondu' });

      const facts = await overview(db, dossier, now());
      const messages: ModelMessage[] = [{
        role: 'user',
        content:
          `Dossier du client (données de l'application) :\n${JSON.stringify(facts)}\n\n` +
          `Conversation récente, la plus ancienne en premier :\n${transcript.map(describeMessage).join('\n')}\n\n` +
          'Réponds maintenant au dernier message du client.',
      }];

      let finalText = '';
      let transferred = false;
      for (let i = 0; i < MAX_MODEL_CALLS; i++) {
        const resp = await callModel({
          model,
          max_tokens: 800,
          system: [{ type: 'text', text: STEEVE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          tools: STEEVE_TOOLS.map((t, idx) => (idx === STEEVE_TOOLS.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t)),
          messages,
        });
        totals.calls += 1;
        totals.usage.input_tokens += resp.usage.input_tokens;
        totals.usage.cache_creation_input_tokens += resp.usage.cache_creation_input_tokens;
        totals.usage.cache_read_input_tokens += resp.usage.cache_read_input_tokens;
        totals.usage.output_tokens += resp.usage.output_tokens;
        totals.cost += costOf(model, resp.usage);

        const toolUses = resp.content.filter((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use');
        if (resp.stop_reason !== 'tool_use' || toolUses.length === 0) {
          finalText = resp.content
            .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
            .map((b) => b.text)
            .join('\n')
            .trim();
          break;
        }

        messages.push({ role: 'assistant', content: resp.content });
        const results: ContentBlock[] = [];
        for (const use of toolUses) {
          totals.tools.push(use.name);
          let outcome;
          try {
            outcome = await runTool(use.name, use.input || {}, toolCtx);
          } catch (err) {
            outcome = { content: `Erreur de lecture : ${err instanceof Error ? err.message : String(err)}`, isError: true };
          }
          if (outcome.transferred) transferred = true;
          results.push({ type: 'tool_result', tool_use_id: use.id, content: outcome.content, ...(outcome.isError ? { is_error: true } : {}) });
        }
        messages.push({ role: 'user', content: results });
      }

      if (!finalText) {
        if (transferred) {
          finalText = "J'ai transmis ta demande à ton agent, qui te répondra ici.";
        } else {
          return fallback('failed', 'sans_reponse', TECHNICAL_MESSAGE, `aucun texte après ${totals.calls} appels`);
        }
      }

      // Nouveau message du client arrivé pendant la rédaction : on recommence une fois avec la conversation à jour.
      const fresh = await loadTranscript(db, conversationId);
      const freshLast = fresh[fresh.length - 1];
      if (!transferred && attempt + 1 < MAX_ATTEMPTS && freshLast && freshLast.id !== last.id && freshLast.sender_type === 'client') {
        continue;
      }

      // Un agent a pris la main pendant la rédaction : on ne publie pas.
      if (!transferred) {
        const { data: check } = await db.from('conversations').select('handled_by').eq('id', conversationId).single();
        if (check?.handled_by !== 'steeve') return finish({ status: 'skipped', reason: 'pris_en_main_pendant_redaction' });
      }

      const replyId = await postReply(db, conversationId, runId, toPlainReply(finalText));
      return finish({ status: 'done', reason: transferred ? 'transfere_agent' : undefined, replyMessageId: replyId });
    }
    return finish({ status: 'skipped', reason: 'conversation_en_mouvement' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      return await fallback('failed', 'erreur', TECHNICAL_MESSAGE, message);
    } catch (inner) {
      return finish({ status: 'failed', reason: 'erreur' }, `${message} / repli : ${inner instanceof Error ? inner.message : String(inner)}`);
    }
  }
}

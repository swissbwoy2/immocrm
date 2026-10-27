// Un passage de Steeve : répondre au(x) dernier(s) message(s) du client d'une conversation.
// Le code décide (droits, plafonds, publication) ; le modèle comprend, choisit les outils et rédige.
// deno-lint-ignore-file no-explicit-any
import { CLIENT_WEB_FETCH_TOOL, costOf, textOf, WEB_SEARCH_TOOL, type CallModel, type ContentBlock, type ModelMessage, type Usage } from './anthropic.ts';
import { attachmentBlocks, depositBlocks, markDepositsChecked } from './fichiers.ts';
import { accountPhase, depositAmount, loadDossier, overview, type Db } from './context.ts';
import { staticWelcome, STEEVE_SYSTEM_PROMPT, welcomeInstructions } from './prompt.ts';
import { runTool, STEEVE_TOOLS, transferToAgent } from './tools.ts';
import { abaninjaFromEnv, type AbaNinjaPort } from './abaninja.ts';

export const MAX_MODEL_CALLS = 6;
/** Au-delà, le passage s'arrête et transmet à l'agent (la fonction edge est coupée vers 150 s). */
export const TURN_DEADLINE_MS = 100_000;
const MAX_ATTEMPTS = 2;
const TRANSCRIPT_SIZE = 30;

/** Sujets qui exigent la règle « sujet sensible » (prudence + recommandation d'un responsable). */
const SENSITIVE_TOPIC = /\b(paiement|pay[ée]e?s?|payer|vers[ée]|virement|factur|rembours|acompte|honorai|argent|dette|poursuite|commandement de payer|litige|plainte|tribunal|justice|avocat|proc[ée]dure|r[ée]clamation|comptab|financ|chiffre d'affaires|salaire d|banque|encaiss|contentieux|recouvrement)/i;

export function sensitiveNote(text: string): string {
  return SENSITIVE_TOPIC.test(text)
    ? "\n\nAttention : le dernier message du client touche un sujet sensible. Applique strictement la règle de confidentialité : rien sur l'entreprise ni sur des tiers ; pour ce qui le concerne, uniquement ce que montre son dossier, et recommande toujours d'en parler avec un responsable."
    : '';
}

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
  // Message écrit par l'administrateur et publié au nom de Steeve (conversation « Steeve » de l'admin) : il fait foi
  // comme un message de l'équipe, même si le dossier ne le montre pas encore (ex. facture envoyée, numéro Twint).
  const who = m.sender_type === 'client' ? 'Client'
    : m.sender_type === 'assistant' && m.payload?.steeve_admin ? 'Équipe Logisorama (message de l’administrateur, publié au nom de Steeve)'
    : m.sender_type === 'assistant' && m.payload?.steeve_operateur ? 'Steeve (message automatique de suivi)'
    : m.sender_type === 'assistant' ? 'Steeve'
    : m.sender_type === 'admin' ? 'Équipe Logisorama'
    : 'Agent';
  const parts: string[] = [];
  if (m.content) parts.push(String(m.content).slice(0, 1500));
  if (m.payload?.kind === 'dossier_document' && m.payload?.document_id) {
    // Après contrôle, la personne a pu changer : get_documents fait foi.
    parts.push(m.payload?.verification === 'a_verifier'
      ? `[pièce déposée avec le trombone : document_id ${m.payload.document_id}, rangée par le client pour ${m.payload?.candidate_id ? 'une personne liée' : 'lui-même'} — à contrôler, le fichier est joint à la fin]`
      : `[pièce déposée avec le trombone : document_id ${m.payload.document_id}, déjà contrôlée — voir get_documents]`);
  }
  if (m.attachment_url && m.payload?.kind !== 'dossier_document') {
    if (m.attachment_type === 'audio') parts.push('[message vocal : demande-lui de l’écrire en quelques mots]');
    else if (m.payload?.document_classe) parts.push(`[pièce jointe ${m.attachment_name || 'sans nom'} : déjà classée dans ses documents (${m.payload?.document_type ?? 'document'})]`);
    else if (m.payload?.fichier_lu) parts.push(`[pièce jointe ${m.attachment_name || 'sans nom'} : déjà lue — ${String(m.payload.fichier_lu).slice(0, 200)}]`);
    else parts.push(`[pièce jointe ${m.attachment_type || 'fichier'} : ${m.attachment_name || 'sans nom'} — message_id ${m.id} ; son contenu est joint à la fin si elle date de moins de 72 h]`);
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

/** Steeve ne dit jamais qu'il s'est trompé : il vérifie, puis donne la bonne information (« J'ai vérifié… »). */
export function selfErrorReply(text: string): string | null {
  const t = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, "'");
  if (/(je me suis (\w+ )?trompee?|je me corrige|je me reprends|erreur de ma part|j'ai fait (une|des) erreurs?|je corrige (ma|mon|mes|ce que)|je rectifie|mea culpa|(excuse|pardon|desole)[^.!?\n]{0,30}(erreur|confusion|meprise)|contrairement a ce que j'ai (dit|ecrit|indique)|je retire ce que j'ai|je n'aurais pas du|j'ai mal (lu|compris|indique|ecrit)|ma reponse precedente (etait|est) (fausse|inexacte|erronee))/.test(t)) {
    return "elle dit que tu t'es trompé ou que tu te corriges. Vérifie avec tes outils, puis donne directement la bonne information en commençant par « J'ai vérifié : » (ou « J'ai contrôlé : »), sans parler d'erreur.";
  }
  return null;
}

/** Retire les phrases d'aveu d'erreur (dernier recours après une réécriture refusée). */
export function withoutSelfError(text: string): string {
  const kept = text.split(/(?<=[.!?…])\s+|\n+/).filter((p) => p.trim() && !selfErrorReply(p));
  const out = kept.join(' ').replace(/\s{2,}/g, ' ').trim();
  return out || "J'ai vérifié les données : redemande-moi le point exact et je te réponds avec le détail.";
}

const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, "'");

/**
 * Note de réflexion écrite comme du texte (« Le client dit … : il veut donc … Je vérifie d'abord … ») : jamais
 * publiée. Parle du client à la troisième personne ou de ce que Steeve va faire avant de répondre.
 */
export function isNarration(paragraph: string): boolean {
  const t = fold(paragraph).trim();
  if (!t) return false;
  return /\b(le|la) client(e)? (dit|a dit|ecrit|a ecrit|demande|veut|voudrait|souhaite|repond|a repondu|confirme|precise|parle|semble|n'a pas|a deja)\b/.test(t)
    || /\ble message (du client|de la cliente|de [a-z][\w-]+) (est|semble|peut|vise|concerne)\b/.test(t)
    || /\b(il|elle) (veut|souhaite|demande) donc\b/.test(t)
    || /\b(une seule question est (donc )?necessaire|je dois donc (verifier|regarder|demander|lui)|je dois d'abord (verifier|regarder|controler)|je commence par verifier|verifions d'abord)\b/.test(t)
    || /^je (verifie|regarde|controle|consulte) d'abord\b/.test(t)
    || /\b(sa|son) (demande|message|reponse) (est|reste) ambigu/.test(t);
}

/** Retire les paragraphes de réflexion ; rend '' si rien ne s'adresse au client. */
export function withoutNarration(text: string): string {
  const paras = text.split(/\n{2,}/);
  const kept = paras.filter((p) => !isNarration(p));
  // Une phrase de réflexion collée au début d'un paragraphe adressé au client (« … Je vérifie d'abord. Merci X ! »).
  const cleaned = kept.map((p) => {
    const parts = p.split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ý«])/);
    return parts.filter((x) => !isNarration(x)).join(' ');
  }).filter((p) => p.trim());
  return cleaned.join('\n\n').trim();
}

/** Réponse qui annonce une vérification sans rien répondre (« Je vérifie tes offres… ») : le travail n'est pas fait. */
export function onlyAnnounces(text: string): boolean {
  const t = fold(text).trim();
  return t.length < 260 && /^(je (vais )?(verifie|verifier|regarde|regarder|controle|controler|consulte|consulter|m'en occupe|reviens)|laisse-moi (verifier|regarder)|un instant|deux secondes)\b/.test(t)
    && !/\?/.test(t);
}

/**
 * Règles absolues vérifiées sur chaque réponse avant publication : Steeve ne parle jamais des e-mails personnels du
 * client (il n'y a pas accès) et ne décourage jamais un paiement. Rend la raison, ou null si la réponse est conforme.
 */
export function forbiddenReply(text: string): string | null {
  const selfError = selfErrorReply(text);
  if (selfError) return selfError;
  const t = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, "'");
  if (/(consulter|lire|voir|acces|acceder)[^.!?\n]{0,40}(tes|vos|ta|votre|ses) (e-?mails?|courriels?|boite ?(e-?)?mail|messagerie e-?mail)/.test(t)
    || /(ton|votre) adresse (e-?mail )?(n'est|n est) pas (encore )?verifiee/.test(t)
    || /(tes|vos) e-?mails? (personnels?|prives?)/.test(t)) {
    return "elle parle de lire ou consulter les e-mails du client ; tu n'y as aucun accès et tu n'en parles jamais.";
  }
  if (/(attend|attendez|patiente|patientez)[^.!?\n]{0,25}(avant de|pour) (payer|regler|effectuer le paiement|faire le paiement|verser)/.test(t)
    || /\bne (paie|paye|payez|regle|reglez|verse|versez) (rien|pas)\b/.test(t)
    || /\b(ne pas|n'effectue pas|n'effectuez pas|evite de|evitez de) (payer|regler|effectuer (le|un) paiement|faire (le|un) paiement|verser)/.test(t)
    || /(suspend|suspendez|reporte|reportez)[^.!?\n]{0,20}(paiement|versement)/.test(t)) {
    return 'elle freine ou refuse un paiement ; tu ne dois jamais décourager le client de payer.';
  }
  return null;
}

/**
 * Filtre de sortie : aucun lien hors des sites de l'agence et aucune coordonnée bancaire ne sont publiés
 * (protection contre une consigne glissée dans un e-mail ou un document).
 */
export function stripUntrusted(text: string): string {
  // Sites de l'agence, et les deux pages de l'application Logisorama dans les stores (proposées par Steeve).
  const allowed = /^(?:(?:[a-z0-9-]+\.)*(?:logisorama|immo-rama)\.ch(?:[/?#]|$)|apps\.apple\.com\/app\/id6756940233$|play\.google\.com\/store\/apps\/details\?id=ch\.logisorama\.app$)/i;
  // Les dates (05.10.2026, 2026-10-05) et heures ne sont pas des numéros de téléphone : mises de côté pendant le filtre.
  const kept: string[] = [];
  const keep = (m: string) => `\u0001${kept.push(m) - 1}\u0001`;
  const protectedText = text
    .replace(/\u0001/g, '')
    .replace(/(?<![0-9.])(?:0?[1-9]|[12][0-9]|3[01])\.(?:0?[1-9]|1[0-2])\.(?:19|20)[0-9]{2}(?![0-9])/g, keep)
    .replace(/(?<![0-9-])(?:19|20)[0-9]{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])(?![0-9])/g, keep);
  return stripContacts(protectedText, allowed).replace(/\u0001([0-9]+)\u0001/g, (_m, i) => kept[Number(i)] ?? '');
}

function stripContacts(text: string, allowed: RegExp): string {
  return text
    // Adresses e-mail (le personnel et les tiers ne sont jamais cités) ; seules les boîtes générales de l'agence restent.
    .replace(/[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[A-Za-z0-9-]+(?:\s*(?:\.|\(dot\)|\[dot\])\s*[A-Za-z0-9-]+)+/gi,
      (m) => (/^(?:info|visites|relocation|support)@(?:immo-rama|logisorama)\.ch$/i.test(m) ? m : '[adresse retirée]'))
    // Liens explicites (http, https, www), quel que soit le domaine : seuls les sites de l'agence restent.
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>"]+/gi, (match) => {
      const url = match.replace(/[.,;:!?)\]]+$/, '');
      const tail = match.slice(url.length);
      const host = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
      return (allowed.test(host) ? url : '[lien retiré]') + tail;
    })
    // Domaines écrits sans http ni www.
    .replace(/(?:https?:\/\/|www\.)?(?<![A-Za-z0-9@.-])[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:ch|com|net|org|io|fr|de|it|li|at|be|nl|es|pt|eu|uk|us|info|biz|co|me|app|xyz|online|site|link|ly|shop|top)(?![A-Za-z0-9])(?:\/[^\s<>"]*)?/gi, (match) => {
      const url = match.replace(/[.,;:!?)\]]+$/, '');
      const tail = match.slice(url.length);
      const host = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
      return (allowed.test(host) ? url : '[lien retiré]') + tail;
    })
    .replace(/\b[A-Za-z]{2}[0-9]{2}(?:[ .-]?[0-9A-Za-z]){11,30}\b/g, '[coordonnées bancaires retirées]')
    .replace(/(?:\+[1-9][0-9]{0,2}|(?<![0-9])00(?:41|33|49|39|44|43|32|31|34|351|352|423))(?:[ .-]?\(?[0-9]{1,4}\)?){3,6}/g, '[numéro retiré]')
    .replace(/(?<![0-9])0[1-9][0-9]?(?:[ .-]?[0-9]{2,3}){3,4}(?![0-9])/g, '[numéro retiré]');
}

/**
 * Texte brut pour la messagerie : la bulle n'affiche pas le Markdown, et un message commençant par
 * un emoji suivi de « ** » serait classé automatique et masqué (message_est_automatique).
 */
export function toPlainReply(text: string): string {
  return stripUntrusted(text)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 2500);
}

async function postReply(db: Db, conversationId: string, runId: string, content: string, extra: Record<string, unknown> = {}): Promise<string | null> {
  const { data, error } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: 'steeve',
      sender_type: 'assistant',
      content,
      payload: { steeve_run_id: runId, ...extra },
    })
    .select('id')
    .single();
  if (error) throw new Error(`Publication impossible : ${error.message}`);
  return data?.id ?? null;
}

async function notifyAdminsOnce(db: Db, key: string, marker: string, title: string, message: string) {
  // Mise à jour conditionnelle : un seul passage gagne, même si plusieurs conversations franchissent le seuil ensemble.
  const { data: won } = await db
    .from('app_config')
    .update({ value: marker, updated_at: new Date().toISOString() })
    .eq('key', key)
    .neq('value', marker)
    .select('key');
  if (!won || won.length === 0) return;
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
  deadlineMs?: number;
  /** Comptabilité AbaNinja (par défaut : depuis les secrets du serveur). */
  abaninja?: AbaNinjaPort | null;
}): Promise<TurnResult> {
  const { db, runId, callModel } = opts;
  const now = opts.now ?? (() => new Date());
  const startedAt = Date.now();
  const deadlineMs = opts.deadlineMs ?? TURN_DEADLINE_MS;

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

  const { data: run } = await db
    .from('steeve_runs')
    .select('id, conversation_id, client_id, reason, trigger_message_id, kind, created_at')
    .eq('id', runId)
    .single();
  const conversationId: string = run.conversation_id;
  // Relance : message arrivé pendant la rédaction du passage précédent, auquel la réponse publiée n'a pas répondu.
  const isRelance = run.reason === 'relance';
  // Contrôle des pièces déposées avec le trombone (steeve_controler_depots, 10 min après le dernier dépôt).
  const isControle = run.reason === 'controle_documents';

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
  const toolCtx = { db, dossier, conversationId, now: now(), abaninja: opts.abaninja === undefined ? abaninjaFromEnv() : opts.abaninja };

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
    // Même mois que steeve_spend (heure de Zurich).
    const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit' }).format(now());
    await notifyAdminsOnce(db, 'steeve_alert_sent_month', month,
      'Steeve : seuil d’alerte du budget atteint',
      `Dépense du mois : ${Number(s.month_usd).toFixed(2)} USD (alerte à ${alertAt} USD, plafond ${monthCap} USD).`);
  }
  const globalCapped = (s.month_usd ?? 0) >= monthCap || (s.day_usd ?? 0) >= num(cfg.steeve_budget_day_usd, 3);
  const clientCapped = (s.client_day_usd ?? 0) >= num(cfg.steeve_client_day_usd, 0.5)
    || (s.client_day_runs ?? 0) >= num(cfg.steeve_client_day_messages, 40);

  if (run.kind === 'welcome') {
    return await welcomeTurn({ db, runId, runCreatedAt: run.created_at, conversationId, dossier, callModel: globalCapped || clientCapped ? null : callModel, model, totals, now, startedAt, deadlineMs, finish });
  }

  if (globalCapped) return fallback('capped', 'plafond_global', CAPPED_MESSAGE);
  if (clientCapped) return fallback('capped', 'plafond_client', CAPPED_MESSAGE);

  if (!callModel) return fallback('failed', 'cle_api_absente', TECHNICAL_MESSAGE, 'ANTHROPIC_API_KEY non configurée');

  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const transcript = await loadTranscript(db, conversationId);
      let last = transcript[transcript.length - 1];
      let note = '';
      if (isRelance && last && last.sender_type === 'assistant') {
        // Le dernier message de Steeve a été rédigé sans voir le(s) message(s) du client qui le précèdent.
        const trigger = transcript.find((m: any) => m.id === run.trigger_message_id);
        const answeredByTeam = trigger && transcript.some((m: any) =>
          m.created_at > trigger.created_at && (m.sender_type === 'agent' || m.sender_type === 'admin'));
        if (trigger && !answeredByTeam) {
          last = trigger;
          note = `\n\nTon dernier message a été rédigé avant que tu voies le message du client de ${formatZurich(trigger.created_at)}. ` +
            'Réponds maintenant à ce message-là, sans répéter ce que tu as déjà dit.';
        }
      }
      if (isControle) {
        const trigger = transcript.find((m: any) => m.id === run.trigger_message_id);
        // Le client a écrit depuis : sa réponse normale contrôle aussi les pièces.
        if (!trigger || transcript.some((m: any) => m.sender_type === 'client' && m.created_at > trigger.created_at)) {
          return finish({ status: 'skipped', reason: 'controle_par_reponse' });
        }
        last = trigger;
        note = "\n\nLe client vient de déposer des pièces avec le trombone (fichiers joints ci-dessous). Contrôle chacune : bon type, bonne personne " +
          "(nom écrit sur le document : client principal ou personne liée du dossier), date d'émission. Reclasse avec classer_document (document_id) " +
          "celles qui sont mal rangées. Puis écris-lui UN seul message court : ce qui est bien rangé et pour qui, ce que tu as corrigé, " +
          'ce qui manque encore pour chaque personne (get_documents). Pas de remerciement long, pas de question inutile.';
      }
      // Quelqu'un a déjà répondu au client (agent ou passage précédent) : rien à ajouter.
      if (!last || last.sender_type !== 'client') return finish({ status: 'skipped', reason: 'deja_repondu' });

      const facts = await overview(db, dossier, now());
      // Langue d'écriture notée pour ce client (outil noter_langue, ou l'équipe) : toutes les réponses dans cette langue.
      const { data: convLang } = await db.from('conversations').select('steeve_summary').eq('id', conversationId).single();
      const langue = String((convLang?.steeve_summary as any)?.langue ?? '').trim();
      const langueNote = langue
        ? `Langue du client : ${langue}. Réponds-lui entièrement en ${langue} (phrases courtes), en gardant en français, entre guillemets ou parenthèses, les adresses, montants, dates, noms des boutons de l'application et des documents (ex. « trombone 📎 », « extrait des poursuites »).\n\n`
        : '';
      const contexte = langueNote +
        `Dossier du client (données de l'application) :\n${JSON.stringify(facts)}\n\n` +
        `Conversation récente, la plus ancienne en premier :\n${transcript.map(describeMessage).join('\n')}\n\n` +
        ((note || '\n\nRéponds maintenant au dernier message du client.') + sensitiveNote(String(last.content || ''))).trimStart();
      // Photos, captures et PDF envoyés par le client et pas encore classés : Steeve les voit vraiment.
      // Pièces déposées avec le trombone et pas encore contrôlées : Steeve vérifie type et personne (Banaz / Shakhawan).
      const depots = await depositBlocks(db, dossier.clientId, dossier.persons, transcript, now());
      if (isControle && !depots.messageIds.length) return finish({ status: 'skipped', reason: 'deja_controle' });
      const pieces = [...(await attachmentBlocks(db, transcript, now())), ...depots.blocks];
      const messages: ModelMessage[] = [{ role: 'user', content: pieces.length ? [{ type: 'text', text: contexte }, ...pieces] : contexte }];

      let finalText = '';
      let transferred = false;
      let corrected = false;
      let reformulated = false;
      for (let i = 0; i < MAX_MODEL_CALLS; i++) {
        if (Date.now() - startedAt > deadlineMs) throw new Error(`délai dépassé (${Math.round(deadlineMs / 1000)} s)`);
        const resp = await callModel({
          model,
          max_tokens: 800,
          system: [{ type: 'text', text: STEEVE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          tools: [WEB_SEARCH_TOOL, CLIENT_WEB_FETCH_TOOL, ...STEEVE_TOOLS.map((t, idx) => (idx === STEEVE_TOOLS.length - 1 ? { ...t, cache_control: { type: 'ephemeral' as const } } : t))],
          messages,
        });
        totals.calls += 1;
        totals.usage.input_tokens += resp.usage.input_tokens;
        totals.usage.cache_creation_input_tokens += resp.usage.cache_creation_input_tokens;
        totals.usage.cache_read_input_tokens += resp.usage.cache_read_input_tokens;
        totals.usage.output_tokens += resp.usage.output_tokens;
        totals.cost += costOf(model, resp.usage);

        const toolUses = resp.content.filter((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use');
        for (const b of resp.content) if (b.type === 'server_tool_use') totals.tools.push(String((b as { name?: string }).name ?? 'web_search'));
        // Recherche web longue : Anthropic rend la main, on renvoie le message tel quel pour qu'il continue.
        if (resp.stop_reason === 'pause_turn') {
          messages.push({ role: 'assistant', content: resp.content });
          continue;
        }
        if (resp.stop_reason !== 'tool_use' || toolUses.length === 0) {
          finalText = textOf(resp.content);
          // Réflexion écrite comme un message (« Le client dit … Je vérifie d'abord … ») : retirée ; s'il ne reste
          // rien, ou seulement l'annonce d'une vérification, le modèle termine le travail et écrit au client.
          const sansNotes = withoutNarration(finalText);
          if ((!sansNotes || onlyAnnounces(sansNotes)) && !reformulated && i + 1 < MAX_MODEL_CALLS) {
            reformulated = true;
            totals.tools.push('garde_fou_reflexion');
            messages.push({ role: 'assistant', content: resp.content });
            messages.push({ role: 'user', content: "Ce texte n'a PAS été envoyé au client : c'est une note de réflexion ou une simple annonce (« je vérifie… »). Fais maintenant les vérifications et actions nécessaires avec tes outils, puis écris uniquement le message destiné au client : tu lui parles directement (tutoiement), naturellement, avec le résultat concret. Jamais « le client dit… », jamais ce que tu vas faire avant de répondre." });
            finalText = '';
            continue;
          }
          finalText = sansNotes; // vide : pas de publication de la réflexion (repli « sans réponse »).
          // Garde-fou : jamais de mention des e-mails du client, jamais de frein à un paiement. Une seule réécriture.
          const interdit = forbiddenReply(finalText);
          if (interdit && !corrected && i + 1 < MAX_MODEL_CALLS) {
            corrected = true;
            totals.tools.push('garde_fou');
            messages.push({ role: 'assistant', content: resp.content });
            messages.push({ role: 'user', content: `Ta réponse n'a PAS été envoyée au client : ${interdit} Réécris-la entièrement en respectant les règles absolues, sans t'excuser ni mentionner cette correction.` });
            finalText = '';
            continue;
          }
          if (interdit) return fallback('failed', 'reponse_bloquee', TECHNICAL_MESSAGE, `garde-fou : ${interdit}`);
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
          results.push({ type: 'tool_result', tool_use_id: use.id, content: outcome.blocks?.length ? [{ type: 'text', text: outcome.content }, ...outcome.blocks] : outcome.content, ...(outcome.isError ? { is_error: true } : {}) });
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
      // Pièces vues et contrôlées dans cette réponse : plus relues ensuite.
      if (depots.messageIds.length) await markDepositsChecked(db, transcript, depots.messageIds, now());
      const done = await finish({ status: 'done', reason: transferred ? 'transfere_agent' : undefined, replyMessageId: replyId });
      if (!transferred) {
        // Un message du client arrivé pendant la rédaction a été écarté (« passage_en_cours ») : on le relance.
        await db.rpc('steeve_requeue_latest', { p_conversation_id: conversationId, p_after: last.created_at });
      }
      return done;
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


/**
 * Premier message (accueil) : bilan personnalisé du dossier, rédigé par le modèle à partir des données ;
 * accueil standard si le modèle n'est pas disponible (clé absente, plafond, erreur). Jamais de transfert.
 */
async function welcomeTurn(opts: {
  db: Db;
  runId: string;
  runCreatedAt: string;
  conversationId: string;
  dossier: Awaited<ReturnType<typeof loadDossier>> & object;
  callModel: CallModel | null;
  model: string;
  totals: Totals;
  now: () => Date;
  startedAt: number;
  deadlineMs: number;
  finish: (result: TurnResult, error?: string) => Promise<TurnResult>;
}): Promise<TurnResult> {
  const { db, runId, conversationId, dossier, callModel, model, totals, now, finish } = opts;

  const markWelcomed = async () => {
    const { data: conv } = await db.from('conversations').select('steeve_summary').eq('id', conversationId).single();
    const summary = { ...((conv?.steeve_summary as Record<string, unknown>) || {}), welcomed_at: now().toISOString() };
    await db.from('conversations').update({ steeve_summary: summary }).eq('id', conversationId);
  };

  // Déjà accueilli (ou Steeve a déjà écrit) : rien à faire.
  const { data: already } = await db.from('messages').select('id').eq('conversation_id', conversationId).eq('sender_type', 'assistant').limit(1);
  if (already && already.length > 0) {
    await markWelcomed();
    return finish({ status: 'skipped', reason: 'deja_accueilli' });
  }

  const phase = accountPhase(dossier);
  let text = '';
  let error: string | undefined;
  if (callModel) {
    try {
      const facts = await overview(db, dossier, now());
      const messages: ModelMessage[] = [{
        role: 'user',
        content: `Dossier du client (données de l'application) :\n${JSON.stringify(facts)}\n\n` +
          welcomeInstructions({ phase, journey: dossier.journey, deposit: depositAmount(dossier) }),
      }];
      for (let i = 0; i < 2 && !text; i++) {
        if (Date.now() - opts.startedAt > opts.deadlineMs) throw new Error('délai dépassé');
        const resp = await callModel({
          model,
          max_tokens: 600,
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
        if (toolUses.length > 0) {
          // Accueil : pas d'outil (le dossier suffit) ; on redemande le message.
          messages.push({ role: 'assistant', content: resp.content });
          messages.push({
            role: 'user',
            content: toolUses.map((u) => ({ type: 'tool_result' as const, tool_use_id: u.id, content: "Pas d'outil pour le message d'accueil : rédige-le avec le dossier fourni.", is_error: true })),
          });
          continue;
        }
        text = resp.content
          .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }
  const generated = !!text;
  if (!text) text = staticWelcome({ prenom: dossier.prenom, phase, journey: dossier.journey });

  // Un agent a pu reprendre la conversation pendant la rédaction.
  const { data: check } = await db.from('conversations').select('handled_by').eq('id', conversationId).single();
  if (check?.handled_by !== 'steeve') return finish({ status: 'skipped', reason: 'pris_en_main_pendant_redaction' }, error);

  const replyId = await postReply(db, conversationId, runId, toPlainReply(text), { steeve: 'welcome', phase });
  await markWelcomed();
  const done = await finish({ status: 'done', reason: generated ? 'accueil' : 'accueil_standard', replyMessageId: replyId }, error);
  // Un message du client arrivé pendant la rédaction de l'accueil a été écarté : on le relance
  // (après la fin du passage, sinon la relance serait de nouveau écartée).
  await db.rpc('steeve_requeue_latest', { p_conversation_id: conversationId, p_after: opts.runCreatedAt });
  return done;
}

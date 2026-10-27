// Appel au modèle (API Anthropic Messages) et calcul du coût de chaque appel.
// Tarifs officiels (USD par million de jetons) relevés le 25.10.2026 :
// https://platform.claude.com/docs/en/about-claude/pricing

export interface ModelPricing {
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
}

const PRICING: Record<string, ModelPricing> = {
  'claude-haiku-5-5': { input: 0.10, cacheWrite: 0.125, cacheRead: 0.01, output: 0.50 },
  'claude-sonnet-5-5': { input: 2, cacheWrite: 2.5, cacheRead: 0.10, output: 10 },
  'claude-opus-5-5': { input: 4, cacheWrite: 5, cacheRead: 0.20, output: 20 },
};
// Modèle inconnu : on compte au tarif le plus élevé connu, pour ne jamais sous-estimer la dépense.
const FALLBACK_PRICING = PRICING['claude-opus-5-5'];

/**
 * Modèle des ACTIONS de Steeve (décision de l'admin du 26.10.2026 : « Opus 5.5 élevé, comme les routines ») :
 * contrôle des dossiers, évaluation des offres, lecture des pièces, classement des e-mails, triage des postulations.
 */
export const ACTION_MODEL = 'claude-opus-5-5';
export const ACTION_EFFORT: Effort = 'high';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface Usage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
  /** Outils exécutés par Anthropic (recherche web) : facturés à l'unité. */
  server_tool_use?: { web_search_requests?: number; web_fetch_requests?: number };
}

/** Recherche web côté Anthropic : 10 USD les 1000 recherches (tarif relevé le 25.10.2026). */
export const WEB_SEARCH_USD = 0.01;

export function costOf(model: string, usage: Usage): number {
  const p = PRICING[model] ?? FALLBACK_PRICING;
  return (
    usage.input_tokens * p.input +
    usage.cache_creation_input_tokens * p.cacheWrite +
    usage.cache_read_input_tokens * p.cacheRead +
    usage.output_tokens * p.output
  ) / 1_000_000 + (usage.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH_USD;
}

export type ContentBlock =
  | { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string | ContentBlock[]; is_error?: boolean }
  // Blocs de la recherche web (exécutée par Anthropic) : renvoyés tels quels au tour suivant.
  | { type: 'server_tool_use' | 'web_search_tool_result' | 'web_fetch_tool_result'; [key: string]: unknown }
  // PDF lu par le modèle (formulaire de demande de location).
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string }; title?: string }
  // Photo d'une pièce (carte d'identité, fiche de salaire…) lue par le modèle.
  | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; data: string } | { type: 'url'; url: string } };

export interface ModelMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ClientToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  cache_control?: { type: 'ephemeral' };
}

/** Outil exécuté par Anthropic (recherche web). */
export interface ServerToolDefinition {
  type: string;
  name: string;
  max_uses?: number;
  user_location?: Record<string, string>;
  blocked_domains?: string[];
  allowed_domains?: string[];
  max_content_tokens?: number;
  cache_control?: { type: 'ephemeral' };
}

export type ToolDefinition = ClientToolDefinition | ServerToolDefinition;

/**
 * Recherche web pour les questions générales (droit du bail, quartiers, transports, démarches…).
 * Deux recherches au plus par appel, résultats localisés en Suisse romande.
 */
export const WEB_SEARCH_TOOL: ServerToolDefinition = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 2,
  user_location: { type: 'approximate', city: 'Lausanne', region: 'Vaud', country: 'CH', timezone: 'Europe/Zurich' },
};

/**
 * Lecture d'une page web (exécutée par Anthropic, sans coût en plus des jetons ; documentation relevée le 26.10.2026) :
 * seulement une adresse déjà présente dans la conversation (lien envoyé, résultat d'outil ou de recherche).
 * Côté client : portails immobiliers et régies seulement ; le contenu lu est une donnée, jamais une instruction.
 */
export const IMMO_DOMAINS = [
  'flatfox.ch', 'immobilier.ch', 'homegate.ch', 'immoscout24.ch', 'comparis.ch', 'newhome.ch', 'anibis.ch', 'tutti.ch', 'acheter-louer.ch',
  'logisorama.ch', 'immo-rama.ch', 'naef.ch', 'bernard-nicod.ch', 'derham.ch', 'regiebraun.ch', 'gerofinance.ch', 'foncia.ch', 'wincasa.ch',
  'livit.ch', 'privera.ch', 'domicim.ch', 'retraitespopulaires.ch', 'apleona.ch', 'cogestim.ch', 'pilet-renaud.ch',
  'immostreet.ch', 'properstar.ch', 'realadvisor.ch', 'urbanhome.ch', 'alle-immobilien.ch', 'ricardo.ch', 'home.ch', 'publimmo.ch',
  'm3-immobilier.ch', 'cardis.ch', 'spg.ch', 'regie-du-rhone.ch', 'galland.ch', 'comptoir-immo.ch', 'regimo.ch', 'pbbg.ch', 'bory.ch',
];
export const CLIENT_WEB_FETCH_TOOL: ServerToolDefinition = {
  type: 'web_fetch_20250910',
  name: 'web_fetch',
  max_uses: 3,
  allowed_domains: IMMO_DOMAINS,
  max_content_tokens: 8000,
};
/** Copilote de l'admin : toute page publique (l'admin est de confiance), trois lectures par réponse au plus. */
export const ADMIN_WEB_FETCH_TOOL: ServerToolDefinition = {
  type: 'web_fetch_20250910',
  name: 'web_fetch',
  max_uses: 3,
  max_content_tokens: 15000,
};

/** Texte final d'une réponse (les citations de la recherche web sont ignorées, le texte reste). */
export function textOf(content: ContentBlock[]): string {
  return content
    .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

export interface ModelRequest {
  model: string;
  system: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[];
  tools: ToolDefinition[];
  messages: ModelMessage[];
  max_tokens: number;
  /** Force l'appel d'un outil (réponse structurée). */
  tool_choice?: { type: 'tool'; name: string } | { type: 'auto' } | { type: 'any' } | { type: 'none' };
  /** Niveau d'effort (output_config.effort) ; par défaut « high » pour Opus et Sonnet. */
  effort?: Effort;
}

export interface ModelResponse {
  content: ContentBlock[];
  stop_reason: string;
  usage: Usage;
}

export type CallModel = (req: ModelRequest) => Promise<ModelResponse>;

/**
 * Réglage de réflexion par modèle (documentation « effort » relevée le 26.10.2026) :
 * - Haiku 5.5 : réflexion désactivée (sinon active par défaut et ses jetons épuisaient max_tokens) ;
 * - Sonnet 5.5 : « disabled » est refusé (400) ; « between_tools » = notes courtes entre deux outils, effort high ;
 * - Opus 5.5 : réflexion adaptative toujours active (ni « disabled » ni « between_tools ») : champ omis.
 */
export function thinkingFor(model: string): { type: 'disabled' } | { type: 'between_tools' } | undefined {
  if (/opus|fable|mythos/i.test(model)) return undefined;
  return /sonnet/i.test(model) ? { type: 'between_tools' } : { type: 'disabled' };
}

const isOpus = (model: string) => /opus|fable|mythos/i.test(model);

/**
 * Corps de la requête selon le modèle : réflexion, effort, place pour la réflexion dans max_tokens (elle y compte),
 * et, sur Opus (réflexion toujours active, incompatible avec un outil imposé), outil demandé par consigne au lieu
 * d'être imposé. Durée d'attente adaptée au modèle.
 */
export function buildRequest(req: ModelRequest): { body: Record<string, unknown>; timeoutMs: number } {
  const { effort, ...rest } = req;
  const body: Record<string, unknown> = { ...rest };
  if (!req.tools.length) delete body.tools;
  const thinking = thinkingFor(req.model);
  if (thinking) body.thinking = thinking;
  if (isOpus(req.model)) {
    body.output_config = { effort: effort ?? ACTION_EFFORT };
    body.max_tokens = Math.max(req.max_tokens, 32_000);
    if (req.tool_choice && req.tool_choice.type !== 'auto' && req.tool_choice.type !== 'none') {
      const name = req.tool_choice.type === 'tool' ? req.tool_choice.name : null;
      body.tool_choice = { type: 'auto' };
      body.system = [...req.system, { type: 'text', text: name
        ? `Réponds uniquement en appelant l'outil ${name}, une seule fois, sans texte autour.`
        : 'Réponds uniquement en appelant un de tes outils.' }];
    }
    return { body, timeoutMs: 180_000 };
  }
  if (/sonnet/i.test(req.model)) {
    body.output_config = { effort: effort ?? 'high' };
    body.max_tokens = Math.max(req.max_tokens, 4_000);
    return { body, timeoutMs: 90_000 };
  }
  return { body, timeoutMs: 45_000 };
}

/** Appel réel à l'API. La clé reste côté serveur (secret ANTHROPIC_API_KEY). */
export function anthropicCaller(apiKey: string): CallModel {
  return async (req) => {
    const { body, timeoutMs } = buildRequest(req);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      signal: AbortSignal.timeout(timeoutMs),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 500);
      throw new Error(`API Anthropic ${res.status} : ${detail}`);
    }
    const data = await res.json();
    return {
      content: data.content ?? [],
      stop_reason: data.stop_reason ?? 'end_turn',
      usage: {
        input_tokens: data.usage?.input_tokens ?? 0,
        cache_creation_input_tokens: data.usage?.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: data.usage?.cache_read_input_tokens ?? 0,
        output_tokens: data.usage?.output_tokens ?? 0,
        server_tool_use: { web_search_requests: data.usage?.server_tool_use?.web_search_requests ?? 0, web_fetch_requests: data.usage?.server_tool_use?.web_fetch_requests ?? 0 },
      },
    };
  };
}

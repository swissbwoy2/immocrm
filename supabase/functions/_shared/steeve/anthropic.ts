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
};
// Modèle inconnu : on compte au tarif le plus élevé connu, pour ne jamais sous-estimer la dépense.
const FALLBACK_PRICING = PRICING['claude-sonnet-5-5'];

export interface Usage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
  /** Outils exécutés par Anthropic (recherche web) : facturés à l'unité. */
  server_tool_use?: { web_search_requests?: number };
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
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  // Blocs de la recherche web (exécutée par Anthropic) : renvoyés tels quels au tour suivant.
  | { type: 'server_tool_use' | 'web_search_tool_result'; [key: string]: unknown }
  // PDF lu par le modèle (formulaire de demande de location).
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string }; title?: string };

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
  tool_choice?: { type: 'tool'; name: string } | { type: 'auto' } | { type: 'any' };
}

export interface ModelResponse {
  content: ContentBlock[];
  stop_reason: string;
  usage: Usage;
}

export type CallModel = (req: ModelRequest) => Promise<ModelResponse>;

/** Appel réel à l'API. La clé reste côté serveur (secret ANTHROPIC_API_KEY). */
export function anthropicCaller(apiKey: string): CallModel {
  return async (req) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      signal: AbortSignal.timeout(45_000),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      // Sans outil (site public) : le champ est omis.
      // Réflexion désactivée : sur Claude Haiku 5.5 (et les modèles 5.5), elle est active par défaut et ses jetons
      // comptent dans max_tokens ; Steeve épuisait sa limite à réfléchir, sans écrire de réponse.
      body: JSON.stringify({ ...(req.tools.length ? req : { ...req, tools: undefined }), thinking: { type: 'disabled' } }),
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
        server_tool_use: { web_search_requests: data.usage?.server_tool_use?.web_search_requests ?? 0 },
      },
    };
  };
}

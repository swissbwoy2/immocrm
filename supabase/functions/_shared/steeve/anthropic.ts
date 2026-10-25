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
}

export function costOf(model: string, usage: Usage): number {
  const p = PRICING[model] ?? FALLBACK_PRICING;
  return (
    usage.input_tokens * p.input +
    usage.cache_creation_input_tokens * p.cacheWrite +
    usage.cache_read_input_tokens * p.cacheRead +
    usage.output_tokens * p.output
  ) / 1_000_000;
}

export type ContentBlock =
  | { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface ModelMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  cache_control?: { type: 'ephemeral' };
}

export interface ModelRequest {
  model: string;
  system: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[];
  tools: ToolDefinition[];
  messages: ModelMessage[];
  max_tokens: number;
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
      body: JSON.stringify(req),
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
      },
    };
  };
}

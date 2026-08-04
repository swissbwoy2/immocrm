import { supabase } from '@/integrations/supabase/client';
import { readPersistedTokens, getStorageKeyNames } from '@/lib/authStorageGuard';
import type { Session } from '@supabase/supabase-js';

/**
 * Utilitaires de session longue durée.
 *
 * Règles de sécurité :
 * - AUCUN jeton, refresh token, mot de passe ou contenu de stockage n'est journalisé.
 * - On ne journalise que des métadonnées : origine, NOM de la clé de stockage,
 *   présence booléenne d'une session, début/résultat de refresh, classification
 *   d'erreur et raison exacte d'une redirection vers /login.
 */

const PREFIX = '[auth]';

export function authLog(event: string, details?: Record<string, string | number | boolean | null>) {
  try {
    // eslint-disable-next-line no-console
    console.info(`${PREFIX} ${event}`, details ?? {});
  } catch {
    /* noop */
  }
}

/** Noms (jamais les valeurs) des clés de stockage persistantes utilisées. */
export function getAuthStorageKeyName(): string {
  return getStorageKeyNames();
}

/** Vrai si des jetons persistés existent (entrée SDK ou copie de secours). */
export function hasPersistedAuthEntry(): boolean {
  return readPersistedTokens() !== null;
}


export type AuthFailureKind =
  | 'refresh_token_invalide' // définitif : refresh token absent/invalide/révoqué, session introuvable
  | 'temporaire_reseau' // hors ligne, fetch échoué, timeout
  | 'temporaire_serveur' // 5xx
  | 'temporaire_rate_limit' // 429
  | 'temporaire_autre'; // tout autre 4xx NON lié au refresh token → jamais déconnectant

/**
 * Classification stricte : seule une réponse explicite du serveur indiquant que le
 * refresh token est absent, invalide, révoqué, déjà utilisé, ou que la session est
 * introuvable, autorise la suppression de la session locale.
 */
export function classifyAuthError(error: unknown): AuthFailureKind {
  const err = (error ?? {}) as { status?: number; code?: string; name?: string; message?: string };
  const status = typeof err.status === 'number' ? err.status : undefined;
  const code = (err.code ?? '').toLowerCase();
  const message = (err.message ?? '').toLowerCase();

  const definitiveCodes = [
    'refresh_token_not_found',
    'refresh_token_already_used',
    'refresh_token_revoked',
    'session_not_found',
    'session_expired',
    'invalid_grant',
    'bad_jwt',
    'user_not_found',
  ];

  const definitiveMessages = [
    'refresh token not found',
    'refresh token already used',
    'refresh token revoked',
    'invalid refresh token',
    'refresh_token_not_found',
    'session not found',
    'session from session_id claim in jwt does not exist',
    'invalid grant',
    'user from sub claim in jwt does not exist',
  ];

  // "Auth session missing" est un état LOCAL du SDK, pas un verdict serveur :
  // il survient aussi après une panne temporaire. Il n'est définitif que si
  // plus aucun jeton n'est persisté dans ce profil navigateur.
  if (message.includes('auth session missing')) {
    return readPersistedTokens() ? 'temporaire_autre' : 'refresh_token_invalide';
  }

  if (definitiveCodes.includes(code)) return 'refresh_token_invalide';
  if (definitiveMessages.some((m) => message.includes(m))) return 'refresh_token_invalide';


  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'temporaire_reseau';
  if (err.name === 'AuthRetryableFetchError') return 'temporaire_reseau';
  if (message.includes('failed to fetch') || message.includes('networkerror') || message.includes('timeout')) {
    return 'temporaire_reseau';
  }

  if (status === 429) return 'temporaire_rate_limit';
  if (status !== undefined && status >= 500) return 'temporaire_serveur';

  // Tout autre 4xx (autorisation métier, etc.) n'est PAS une raison de déconnexion.
  return 'temporaire_autre';
}

export type RefreshOutcome =
  | { status: 'session'; session: Session }
  | { status: 'temporaire'; kind: AuthFailureKind }
  | { status: 'definitif'; kind: 'refresh_token_invalide' };

let inFlight: Promise<RefreshOutcome> | null = null;
let cooldownUntil = 0;
const COOLDOWN_MS = 30_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Refresh « single flight » : une seule opération de renouvellement à la fois par
 * onglet, en complément du verrou multi-onglets (Web Locks) du SDK.
 * Jusqu'à 3 tentatives espacées pour les erreurs temporaires, puis période de
 * repos pour éviter toute boucle de renouvellement.
 */
export function ensureFreshSession(reason: string): Promise<RefreshOutcome> {
  if (inFlight) {
    authLog('refresh.rejoint_en_cours', { reason });
    return inFlight;
  }

  if (Date.now() < cooldownUntil && reason !== 'online' && reason !== 'manuel') {
    return Promise.resolve({ status: 'temporaire', kind: 'temporaire_autre' } as RefreshOutcome);
  }

  inFlight = (async (): Promise<RefreshOutcome> => {

    authLog('refresh.debut', { reason, en_ligne: typeof navigator === 'undefined' ? true : navigator.onLine });

    let lastKind: AuthFailureKind = 'temporaire_autre';

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        authLog('refresh.reporte_hors_ligne', { reason, attempt });
        return { status: 'temporaire', kind: 'temporaire_reseau' };
      }

      try {
        const { data: current, error: getErr } = await supabase.auth.getSession();
        if (current?.session) {
          const expiresAt = (current.session.expires_at ?? 0) * 1000;
          if (expiresAt - Date.now() > 60_000) {
            authLog('refresh.resultat', { reason, attempt, resultat: 'session_valide_existante' });
            return { status: 'session', session: current.session };
          }
        } else if (getErr) {
          const kind = classifyAuthError(getErr);
          if (kind === 'refresh_token_invalide') {
            authLog('refresh.resultat', { reason, attempt, resultat: 'echec', classification: kind });
            return { status: 'definitif', kind };
          }
        }

        // Si le SDK a perdu sa session en mémoire mais que les jetons sont
        // toujours persistés, on le réhydrate avant de renouveler.
        if (!current?.session) {
          const persisted = readPersistedTokens();
          if (persisted) {
            authLog('refresh.rehydratation', { reason, attempt });
            const { data: restored, error: setErr } = await supabase.auth.setSession(persisted);
            if (restored?.session) {
              authLog('refresh.resultat', { reason, attempt, resultat: 'rehydrate' });
              return { status: 'session', session: restored.session };
            }
            const setKind = classifyAuthError(setErr);
            lastKind = setKind;
            authLog('refresh.rehydratation_echouee', { reason, attempt, classification: setKind });
            if (setKind === 'refresh_token_invalide') {
              return { status: 'definitif', kind: 'refresh_token_invalide' };
            }
            if (attempt < 3) await sleep(attempt * 1500);
            continue;
          }
        }

        const { data, error } = await supabase.auth.refreshSession();
        if (data?.session) {
          authLog('refresh.resultat', { reason, attempt, resultat: 'renouvele' });
          return { status: 'session', session: data.session };
        }


        const kind = classifyAuthError(error);
        lastKind = kind;
        authLog('refresh.tentative_echouee', { reason, attempt, classification: kind });

        if (kind === 'refresh_token_invalide') {
          return { status: 'definitif', kind };
        }
      } catch (e) {
        lastKind = classifyAuthError(e);
        authLog('refresh.tentative_exception', { reason, attempt, classification: lastKind });
        if (lastKind === 'refresh_token_invalide') {
          return { status: 'definitif', kind: 'refresh_token_invalide' };
        }
      }

      if (attempt < 3) await sleep(attempt * 1500);
    }

    authLog('refresh.resultat', { reason, resultat: 'temporaire_non_resolu', classification: lastKind });
    cooldownUntil = Date.now() + COOLDOWN_MS;
    return { status: 'temporaire', kind: lastKind };
  })();

  void inFlight
    .then((outcome) => {
      if (outcome.status === 'temporaire') cooldownUntil = Date.now() + COOLDOWN_MS;
    })
    .finally(() => {
      inFlight = null;
    });


  return inFlight;
}

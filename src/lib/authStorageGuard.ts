/**
 * Protection du stockage d'authentification persistant.
 *
 * Constat mesuré : le SDK d'authentification supprime l'entrée persistante dès
 * qu'une requête de renouvellement échoue avec une erreur HTTP non réseau
 * (500, 429, 403…). L'utilisateur perd alors sa session pour une panne
 * temporaire, sans qu'aucun refresh token n'ait été révoqué.
 *
 * Ce module intercepte la suppression de cette entrée : elle n'est autorisée
 * que lors d'une déconnexion manuelle ou d'un rejet définitif confirmé.
 *
 * Aucun jeton n'est journalisé : uniquement le NOM de la clé.
 */

import { authLog } from './authSession';

const AUTH_KEY_RE = /^sb-.*-auth-token$/;

let removalAllowed = false;
let patched = false;

export function installAuthStorageGuard() {
  if (patched || typeof window === 'undefined' || !window.Storage) return;
  patched = true;

  const originalRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function (key: string) {
    if (this === window.localStorage && AUTH_KEY_RE.test(key) && !removalAllowed) {
      authLog('stockage.suppression_bloquee', { cle_stockage: key, raison: 'erreur_temporaire_non_definitive' });
      return;
    }
    return originalRemoveItem.call(this, key);
  };

  authLog('stockage.protection_active', {});
}

/** Autorise explicitement la suppression (déconnexion manuelle / rejet définitif). */
export async function withAuthStorageRemoval<T>(fn: () => Promise<T> | T): Promise<T> {
  removalAllowed = true;
  try {
    return await fn();
  } finally {
    removalAllowed = false;
  }
}

export function purgePersistedAuth(reason: string) {
  removalAllowed = true;
  try {
    Object.keys(localStorage)
      .filter((k) => AUTH_KEY_RE.test(k))
      .forEach((k) => {
        localStorage.removeItem(k);
        authLog('stockage.purge', { cle_stockage: k, raison: reason });
      });
  } catch {
    /* noop */
  } finally {
    removalAllowed = false;
  }
}

/** Lit les jetons persistés pour réhydrater le SDK. Les valeurs ne sont jamais journalisées. */
export function readPersistedTokens(): { access_token: string; refresh_token: string } | null {
  try {
    const key = Object.keys(localStorage).find((k) => AUTH_KEY_RE.test(k));
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const payload = parsed?.currentSession ?? parsed;
    if (payload?.access_token && payload?.refresh_token) {
      return { access_token: payload.access_token, refresh_token: payload.refresh_token };
    }
    return null;
  } catch {
    return null;
  }
}

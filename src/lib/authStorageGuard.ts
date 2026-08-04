/**
 * Sauvegarde de session résistante aux pannes temporaires.
 *
 * Constat mesuré : le SDK d'authentification supprime son entrée persistante dès
 * qu'une requête de renouvellement échoue avec une erreur HTTP non réseau
 * (500, 429, 403…). L'utilisateur perd alors sa session pour une panne
 * temporaire, sans qu'aucun refresh token n'ait été révoqué.
 *
 * On conserve donc une copie de secours indépendante, utilisée uniquement pour
 * réhydrater le SDK. Elle n'est effacée que sur déconnexion manuelle ou rejet
 * définitif confirmé par le serveur.
 *
 * Aucun jeton n'est journalisé : uniquement le NOM des clés.
 */

import { authLog } from './authSession';

const SDK_KEY_RE = /^sb-.*-auth-token$/;
export const BACKUP_KEY = 'logisorama.auth.backup';

type Tokens = { access_token: string; refresh_token: string };

export function installAuthStorageGuard() {
  authLog('stockage.sauvegarde_active', { cle_sauvegarde: BACKUP_KEY });
}

export function mirrorSession(tokens: Tokens) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(tokens));
  } catch {
    /* noop */
  }
}

/** Autorise une déconnexion volontaire : purge aussi la copie de secours. */
export async function withAuthStorageRemoval<T>(fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } finally {
    purgePersistedAuth('deconnexion_volontaire');
  }
}

export function purgePersistedAuth(reason: string) {
  try {
    Object.keys(localStorage)
      .filter((k) => SDK_KEY_RE.test(k) || k === BACKUP_KEY)
      .forEach((k) => {
        localStorage.removeItem(k);
        authLog('stockage.purge', { cle_stockage: k, raison: reason });
      });
  } catch {
    /* noop */
  }
}

function readSdkTokens(): Tokens | null {
  try {
    const key = Object.keys(localStorage).find((k) => SDK_KEY_RE.test(k));
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

function readBackupTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.access_token && parsed?.refresh_token) {
      return { access_token: parsed.access_token, refresh_token: parsed.refresh_token };
    }
    return null;
  } catch {
    return null;
  }
}

/** Jetons persistés (entrée SDK, sinon copie de secours). Valeurs jamais journalisées. */
export function readPersistedTokens(): Tokens | null {
  return readSdkTokens() ?? readBackupTokens();
}

export function getStorageKeyNames(): string {
  try {
    const sdk = Object.keys(localStorage).find((k) => SDK_KEY_RE.test(k)) ?? 'sb-<projet>-auth-token (absent)';
    const backup = localStorage.getItem(BACKUP_KEY) ? BACKUP_KEY : `${BACKUP_KEY} (absent)`;
    return `${sdk} + ${backup}`;
  } catch {
    return 'indisponible';
  }
}

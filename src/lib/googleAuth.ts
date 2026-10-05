import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

/** Schéma de retour de l'app native (déclaré dans Info.plist / AndroidManifest). */
export const NATIVE_AUTH_CALLBACK = 'ch.logisorama.app://auth/callback';
const NEXT_KEY = 'logisorama.google-next';

export function setGoogleNext(next: string | null) {
  try {
    if (next && /^\/(?!\/)/.test(next)) sessionStorage.setItem(NEXT_KEY, next);
    else sessionStorage.removeItem(NEXT_KEY);
  } catch { /* noop */ }
}

export function takeGoogleNext(): string | null {
  try {
    const v = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    return v && /^\/(?!\/)/.test(v) ? v : null;
  } catch { return null; }
}

/**
 * Connexion Google. Web : redirection vers /auth/callback (même origine, route publique).
 * App native : Google refuse les WebView (disallowed_useragent) → navigateur système
 * (ASWebAuthenticationSession / Custom Tabs) puis retour par lien profond.
 */
export async function signInWithGoogle(next?: string | null) {
  setGoogleNext(next ?? null);
  const native = Capacitor.isNativePlatform();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: native ? NATIVE_AUTH_CALLBACK : `${window.location.origin}/auth/callback`,
      skipBrowserRedirect: native,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  if (native && data?.url) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url, presentationStyle: 'popover' });
  }
}

/** Reprend la session au retour du navigateur système (lien profond). */
export async function handleNativeAuthUrl(url: string): Promise<boolean> {
  if (!url.startsWith(NATIVE_AUTH_CALLBACK)) return false;
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close().catch(() => undefined);
  } catch { /* noop */ }
  const parsed = new URL(url.replace(NATIVE_AUTH_CALLBACK, 'https://x/auth/callback'));
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const code = parsed.searchParams.get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (hash.get('access_token') && hash.get('refresh_token')) {
    await supabase.auth.setSession({
      access_token: hash.get('access_token')!,
      refresh_token: hash.get('refresh_token')!,
    });
  }
  window.location.assign('/auth/callback');
  return true;
}

let listenerInstalled = false;
export async function installNativeAuthListener() {
  if (listenerInstalled || !Capacitor.isNativePlatform()) return;
  listenerInstalled = true;
  const { App } = await import('@capacitor/app');
  App.addListener('appUrlOpen', ({ url }) => { void handleNativeAuthUrl(url); });
}

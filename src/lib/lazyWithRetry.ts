import { lazy, type ComponentType } from 'react';

// Enveloppe React.lazy : si un chunk périmé (nouveau déploiement) échoue,
// recharge la page UNE seule fois ; au 2e échec l'erreur remonte à l'ErrorBoundary.
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  name?: string,
) {
  const src = factory.toString();
  const match = src.match(/import\(["'`]([^"'`]+)["'`]\)/);
  const key = `chunk_reload_${name ?? match?.[1] ?? src.slice(0, 80)}`;

  return lazy(async () => {
    try {
      const mod = await factory();
      try { sessionStorage.removeItem(key); } catch {}
      return mod;
    } catch (error) {
      let alreadyReloaded = true;
      try {
        alreadyReloaded = sessionStorage.getItem(key) === '1';
        if (!alreadyReloaded) sessionStorage.setItem(key, '1');
      } catch {}
      if (!alreadyReloaded && (window as any).__logisorama_in_call !== true) {
        window.location.reload();
        return new Promise<{ default: T }>(() => {}); // attend le reload
      }
      throw error;
    }
  });
}

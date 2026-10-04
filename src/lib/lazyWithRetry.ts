import { lazy, type ComponentType } from 'react';

// Enveloppe React.lazy : si un chunk périmé (nouveau déploiement) échoue,
// recharge la page UNE seule fois par onglet ; au 2e échec l'erreur remonte à l'ErrorBoundary.
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  name?: string,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      return mod;
    } catch (error) {
      const isChunkError = /Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError|error loading dynamically imported module/i.test(String(error));
      if (!isChunkError || (window as any).__logisorama_in_call === true) throw error;
      let alreadyReloaded = true;
      try {
        alreadyReloaded = sessionStorage.getItem('__chunk_reload_attempted') === '1';
        if (!alreadyReloaded) sessionStorage.setItem('__chunk_reload_attempted', '1');
      } catch { alreadyReloaded = true; }
      if (!alreadyReloaded) {
        window.location.reload();
        return new Promise<{ default: T }>(() => {}); // attend le reload
      }
      throw error;
    }
  });
}

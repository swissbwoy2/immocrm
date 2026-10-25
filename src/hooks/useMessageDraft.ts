import { useCallback, useEffect, useState } from 'react';

const KEY_PREFIX = 'logisorama.message-draft.';

function readDraft(conversationId: string | null): string {
  if (!conversationId) return '';
  try {
    return localStorage.getItem(KEY_PREFIX + conversationId) || '';
  } catch {
    return '';
  }
}

function writeDraft(conversationId: string, value: string) {
  try {
    if (value) localStorage.setItem(KEY_PREFIX + conversationId, value);
    else localStorage.removeItem(KEY_PREFIX + conversationId);
  } catch {
    // Stockage indisponible (navigation privée, quota) : le brouillon reste en mémoire seulement.
  }
}

/** Efface tous les brouillons de messages de cet appareil (appelé à la déconnexion). */
export function clearAllMessageDrafts() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}

/**
 * Brouillon conservé par conversation, sur cet appareil :
 * il survit à un changement de page, à la fermeture de la bulle et au rechargement.
 */
export function useMessageDraft(conversationId: string | null) {
  const [draft, setDraftState] = useState(() => readDraft(conversationId));

  useEffect(() => {
    setDraftState(readDraft(conversationId));
  }, [conversationId]);

  const setDraft = useCallback(
    (value: string) => {
      setDraftState(value);
      if (conversationId) writeDraft(conversationId, value);
    },
    [conversationId],
  );

  return [draft, setDraft] as const;
}

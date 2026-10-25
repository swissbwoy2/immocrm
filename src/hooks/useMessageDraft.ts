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

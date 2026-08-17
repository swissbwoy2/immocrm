import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';

export type CallMode = 'audio' | 'video';

/** Room naming convention. Phase B will add `visit:{visiteId}` rooms. */
export const callRoomName = (conversationId: string) => `call:${conversationId}`;

export interface CallTokenResult {
  token: string;
  url: string;
  identity: string;
  name: string;
  role: string;
  isHost: boolean;
  room: string;
}

/**
 * supabase.functions.invoke masque toutes les erreurs derrière
 * « Edge Function returned a non-2xx status code ». On lit le vrai corps de
 * la réponse pour afficher le message réel (et on le logge en console).
 */
export async function readInvokeError(fnName: string, error: unknown): Promise<string> {
  let detail = '';
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().text();
      try {
        const parsed = JSON.parse(body);
        detail = parsed?.error || parsed?.message || body;
      } catch {
        detail = body;
      }
    } catch {
      detail = '';
    }
  }
  const message = detail || (error as any)?.message || 'Erreur inconnue';
  console.error(`[${fnName}] échec:`, {
    status: (error as any)?.context?.status,
    detail,
    error,
  });
  return message;
}

export async function fetchCallToken(params: {
  conversationId: string;
  mode: CallMode;
  notify?: boolean;
}): Promise<CallTokenResult> {
  if (!params.conversationId) {
    throw new Error("Conversation introuvable pour cet appel (identifiant manquant)");
  }

  // Sans session, l'edge function répond 401 : message explicite plutôt qu'un
  // « edge function error » générique.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    throw new Error('Session expirée : reconnecte-toi pour rejoindre l’appel.');
  }

  const room = callRoomName(params.conversationId);
  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: { room, mode: params.mode, notify: !!params.notify },
  });
  if (error) throw new Error(await readInvokeError('livekit-token', error));
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as CallTokenResult;
}

export interface CallCandidate {
  user_id: string;
  name: string;
  role: string;
}

export async function fetchInviteCandidates(conversationId: string): Promise<CallCandidate[]> {
  const { data, error } = await supabase.functions.invoke('livekit-invite', {
    body: { action: 'candidates', conversationId },
  });
  if (error) throw new Error(await readInvokeError('livekit-invite', error));
  if ((data as any)?.error) throw new Error((data as any).error);
  return ((data as any)?.candidates || []) as CallCandidate[];
}

export async function inviteToCall(params: {
  conversationId: string;
  userId: string;
  mode: CallMode;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke('livekit-invite', {
    body: {
      action: 'invite',
      conversationId: params.conversationId,
      userId: params.userId,
      mode: params.mode,
    },
  });
  if (error) throw new Error(await readInvokeError('livekit-invite', error));
  if ((data as any)?.error) throw new Error((data as any).error);
}

/** Hosts (admin / agent / coursier) can invite; clients never can. */
export const isCallHostRole = (role?: string | null) =>
  role === 'admin' || role === 'agent' || role === 'coursier';

/** Signale à l'appelant que l'appel a été refusé ou manqué. */
export async function signalCall(params: {
  conversationId: string;
  action: 'declined' | 'missed';
  to?: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke('livekit-signal', {
    body: params,
  });
  if (error) throw new Error(await readInvokeError('livekit-signal', error));
  if ((data as any)?.error) throw new Error((data as any).error);
}

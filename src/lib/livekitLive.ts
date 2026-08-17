import { supabase } from '@/integrations/supabase/client';
import { CallCandidate, CallTokenResult, readInvokeError } from '@/lib/livekitCall';

/** PHASE B — Live de visite multi-participants. Room : visit:{visiteId} */
export const liveRoomName = (visiteId: string) => `visit:${visiteId}`;

export interface LiveTokenResult extends CallTokenResult {
  visiteId: string;
}

export async function fetchLiveToken(params: {
  visiteId: string;
  notify?: boolean;
}): Promise<LiveTokenResult> {
  if (!params.visiteId) throw new Error('Visite introuvable (identifiant manquant)');

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    throw new Error('Session expirée : reconnecte-toi pour rejoindre le live.');
  }

  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: { room: liveRoomName(params.visiteId), mode: 'video', notify: !!params.notify },
  });
  if (error) throw new Error(await readInvokeError('livekit-token', error));
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as LiveTokenResult;
}

export async function fetchLiveCandidates(visiteId: string): Promise<CallCandidate[]> {
  const { data, error } = await supabase.functions.invoke('livekit-invite', {
    body: { action: 'candidates', visiteId },
  });
  if (error) throw new Error(await readInvokeError('livekit-invite', error));
  if ((data as any)?.error) throw new Error((data as any).error);
  return ((data as any)?.candidates || []) as CallCandidate[];
}

export async function inviteToLive(params: { visiteId: string; userId: string }): Promise<void> {
  const { data, error } = await supabase.functions.invoke('livekit-invite', {
    body: { action: 'invite', visiteId: params.visiteId, userId: params.userId },
  });
  if (error) throw new Error(await readInvokeError('livekit-invite', error));
  if ((data as any)?.error) throw new Error((data as any).error);
}

export type ParticipantAction = 'promote' | 'demote' | 'mute' | 'remove';

/** Host-only : faire monter / redescendre / couper / retirer un participant. */
export async function setParticipantPermission(params: {
  room: string;
  identity: string;
  action: ParticipantAction;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke('livekit-participant-permissions', {
    body: params,
  });
  if (error) throw new Error(await readInvokeError('livekit-participant-permissions', error));
  if ((data as any)?.error) throw new Error((data as any).error);
}

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

async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (!data?.session) throw new Error('Session expirée : reconnecte-toi pour gérer le live.');
}

export async function fetchLiveCandidates(visiteId: string): Promise<CallCandidate[]> {
  if (!visiteId) throw new Error('Visite introuvable (identifiant manquant)');
  await requireSession();
  const { data, error } = await supabase.functions.invoke('livekit-invite', {
    body: { action: 'candidates', visiteId },
  });
  if (error) throw new Error(await readInvokeError('livekit-invite', error));
  if ((data as any)?.error) throw new Error((data as any).error);
  return ((data as any)?.candidates || []) as CallCandidate[];
}

export async function inviteToLive(params: { visiteId: string; userId: string }): Promise<void> {
  await requireSession();
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

/** Host-only : promotion / rétrogradation d'un spectateur (max 2 intervenants). */
export async function setLiveSpeaker(params: {
  visiteId: string;
  identity: string;
  action: 'promote' | 'demote';
}): Promise<void> {
  await requireSession();
  const { data, error } = await supabase.functions.invoke('livekit-live-promote', {
    body: params,
  });
  if (error) throw new Error(await readInvokeError('livekit-live-promote', error));
  if ((data as any)?.error) throw new Error((data as any).error);
}

/** Host-only : termine le live (ferme la room, statut = termine). */
export async function endLive(visiteId: string): Promise<void> {
  await requireSession();
  const { data, error } = await supabase.functions.invoke('livekit-live-end', {
    body: { visiteId },
  });
  if (error) throw new Error(await readInvokeError('livekit-live-end', error));
  if ((data as any)?.error) throw new Error((data as any).error);
}

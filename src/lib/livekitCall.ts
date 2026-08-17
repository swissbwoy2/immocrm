import { supabase } from '@/integrations/supabase/client';

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

export async function fetchCallToken(params: {
  conversationId: string;
  mode: CallMode;
  notify?: boolean;
}): Promise<CallTokenResult> {
  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: {
      room: callRoomName(params.conversationId),
      mode: params.mode,
      notify: !!params.notify,
    },
  });
  if (error) throw new Error(error.message || "Impossible de démarrer l'appel");
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
  if (error) throw new Error(error.message || 'Impossible de charger les participants');
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
  if (error) throw new Error(error.message || "Invitation impossible");
  if ((data as any)?.error) throw new Error((data as any).error);
}

/** Hosts (admin / agent / coursier) can invite; clients never can. */
export const isCallHostRole = (role?: string | null) =>
  role === 'admin' || role === 'agent' || role === 'coursier';

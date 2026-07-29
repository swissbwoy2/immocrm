import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { VisitVideoPlayer } from '@/components/calendar/VisitVideoPlayer';
import { formatSwissDateTime } from '@/lib/dateUtils';
import { getOrCreateClientConversation } from '@/lib/clientConversation';

interface Props {
  visite: any;
  onUpdated?: () => void;
}

function hasSharedVideo(medias: any): boolean {
  if (!Array.isArray(medias)) return false;
  return medias.some(
    (m: any) =>
      m &&
      typeof m === 'object' &&
      m.url &&
      m.shared_to_clients !== false &&
      ((typeof m.mime === 'string' && m.mime.startsWith('video/')) ||
        m.type === 'video' ||
        (typeof m.type === 'string' && m.type.startsWith('video/')) ||
        (typeof m.name === 'string' && /\.(mp4|webm|mov|m4v|ogv|ogg|mkv)$/i.test(m.name)))
  );
}

export async function submitVisitVideoDecision(params: {
  user: { id: string };
  visiteId: string;
  offreId?: string | null;
  agentIdHint?: string | null;
  address?: string;
  choice: 'souhaite_postuler' | 'refuse';
}): Promise<void> {
  const { user, visiteId: initialVisiteId, offreId, agentIdHint, address = '', choice } = params;

  const decisionAt = new Date().toISOString();
  let visiteId = initialVisiteId;

  // If no linked visite exists, create one so the decision can be recorded.
  if (!visiteId) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id, agent_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const clientIdForVisite = clientRow?.id ?? null;
    const agentIdForVisite = clientRow?.agent_id ?? agentIdHint ?? null;

    if (clientIdForVisite) {
      const { data: newVisite, error: createErr } = await supabase
        .from('visites')
        .insert({
          offre_id: offreId ?? null,
          client_id: clientIdForVisite,
          agent_id: agentIdForVisite,
          adresse: address,
          date_visite: decisionAt,
          statut: 'effectuee',
          client_decision: choice,
          client_decision_at: decisionAt,
        })
        .select('id')
        .maybeSingle();
      if (createErr) throw createErr;
      visiteId = newVisite?.id ?? '';
    }
  } else {
    const { error: vErr } = await supabase
      .from('visites')
      .update({ client_decision: choice, client_decision_at: decisionAt })
      .eq('id', visiteId);
    if (vErr) throw vErr;
  }

  if (offreId) {
    const nextStatut = choice === 'souhaite_postuler' ? 'souhaite_postuler' : 'refusee';
    await supabase.from('offres').update({ statut: nextStatut }).eq('id', offreId);
  }

  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, agent_id')
    .eq('user_id', user.id)
    .maybeSingle();
  const clientId = clientRow?.id;
  const agentId = clientRow?.agent_id || agentIdHint || null;

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('prenom, nom')
    .eq('id', user.id)
    .maybeSingle();
  const displayName = `${profileRow?.prenom || ''} ${profileRow?.nom || ''}`.trim() || 'Le client';

  if (clientId) {
    const convId = await getOrCreateClientConversation(clientId);
    if (convId) {
      const messageContent =
        choice === 'souhaite_postuler'
          ? `✅ Après visionnage de la vidéo, je souhaite déposer ma candidature pour ${address}.`
          : `❌ Après visionnage de la vidéo, je ne souhaite pas postuler pour ${address}.`;
      await supabase.from('messages').insert({
        conversation_id: convId,
        sender_id: user.id,
        sender_type: 'client',
        content: messageContent,
        offre_id: offreId ?? null,
      });
    }
  }

  const notifTitle =
    choice === 'souhaite_postuler'
      ? `✅ ${displayName} souhaite postuler — ${address}`
      : `❌ ${displayName} ne postule pas — ${address}`;
  const notifMessage =
    choice === 'souhaite_postuler'
      ? `Après avoir visionné la vidéo de visite, le client souhaite déposer sa candidature.`
      : `Après avoir visionné la vidéo de visite, le client ne souhaite pas postuler.`;
  const notifType = choice === 'souhaite_postuler' ? 'client_souhaite_postuler' : 'visit_refused';
  const notifMeta = {
    visite_id: visiteId,
    offre_id: offreId ?? null,
    client_id: clientId ?? null,
    adresse: address,
  };

  if (agentId) {
    const { data: agentRow } = await supabase
      .from('agents')
      .select('user_id')
      .eq('id', agentId)
      .maybeSingle();
    if (agentRow?.user_id) {
      await supabase.rpc('create_notification', {
        p_user_id: agentRow.user_id,
        p_type: notifType,
        p_title: notifTitle,
        p_message: notifMessage,
        p_link: `/agent/clients/${clientId ?? ''}`,
        p_metadata: notifMeta,
      });
    }
  }

  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');
  for (const a of admins || []) {
    await supabase.rpc('create_notification', {
      p_user_id: a.user_id,
      p_type: `${notifType}_admin`,
      p_title: notifTitle,
      p_message: notifMessage,
      p_link: `/admin/clients/${clientId ?? ''}`,
      p_metadata: notifMeta,
    });
  }
}

export function VisitVideoDecisionCard({ visite, onUpdated }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState<null | 'souhaite_postuler' | 'refuse'>(null);
  const hasVideo = useMemo(() => hasSharedVideo(visite?.medias), [visite?.medias]);
  const decision: 'souhaite_postuler' | 'refuse' | null = visite?.client_decision ?? null;
  const address = visite?.adresse || visite?.offres?.adresse || '';

  if (!hasVideo) return null;

  const handleDecision = async (choice: 'souhaite_postuler' | 'refuse') => {
    if (!user || decision || saving) return;
    setSaving(choice);
    try {
      await submitVisitVideoDecision({
        user,
        visiteId: visite.id,
        offreId: visite.offre_id ?? null,
        agentIdHint: visite.agent_id ?? null,
        address,
        choice,
      });
      toast.success(
        choice === 'souhaite_postuler'
          ? 'Merci, votre agent a été notifié de votre intérêt.'
          : 'Merci, votre choix a été enregistré.'
      );
      onUpdated?.();
    } catch (err: any) {
      console.error('[VisitVideoDecisionCard]', err);
      toast.error(err?.message || 'Impossible d’enregistrer votre choix');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            {address || 'Adresse non renseignée'}
          </div>
          {visite?.date_visite && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatSwissDateTime(visite.date_visite)}
            </div>
          )}
        </div>

        <VisitVideoPlayer medias={visite.medias} />

        {decision ? (
          <div className="flex justify-center">
            {decision === 'souhaite_postuler' ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <Check className="w-3.5 h-3.5 mr-1" /> Vous avez indiqué vouloir postuler
              </Badge>
            ) : (
              <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                <X className="w-3.5 h-3.5 mr-1" /> Vous avez indiqué ne pas postuler
              </Badge>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!!saving}
              onClick={() => handleDecision('souhaite_postuler')}
            >
              {saving === 'souhaite_postuler' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              ✅ Je souhaite déposer ma candidature
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-300"
              disabled={!!saving}
              onClick={() => handleDecision('refuse')}
            >
              {saving === 'refuse' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              ❌ Je ne souhaite pas postuler
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

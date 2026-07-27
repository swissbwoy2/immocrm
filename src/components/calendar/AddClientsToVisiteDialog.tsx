import { useState, useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientMultiSelect } from '@/components/ClientMultiSelect';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';

const FALLBACK_AGENT_ID = 'ed0ca4bb-79e4-4cf5-b2bc-3ecd16ff9752';
const TZ = 'Europe/Zurich';

interface AvailableClient {
  id: string;
  user_id: string;
  profiles?: { prenom: string; nom: string; email?: string } | null;
}

interface SourceOffre {
  id?: string;
  adresse?: string | null;
  prix?: number | null;
  pieces?: number | null;
  surface?: number | null;
  etage?: string | null;
  disponibilite?: string | null;
  annee_construction?: number | null;
  description?: string | null;
  lien_annonce?: string | null;
  agent_id?: string | null;
  envoi_auto?: boolean | null;
  type_bien?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceOffre: SourceOffre;
  adresse: string;
  dateVisite: string; // ISO string of source visite
  dateVisiteFin?: string | null;
  existingClientIds: string[];
  availableClients: AvailableClient[];
  sourceMedias?: any;
  onSuccess?: () => void;
}

function pickSharedVideos(medias: any): any[] {
  if (!Array.isArray(medias)) return [];
  return medias.filter(
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

export const AddClientsToVisiteDialog = ({
  open,
  onOpenChange,
  sourceOffre,
  adresse,
  dateVisite,
  dateVisiteFin,
  existingClientIds,
  availableClients,
  sourceMedias,
  onSuccess,
}: Props) => {
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const agentId = sourceOffre.agent_id || FALLBACK_AGENT_ID;
  const sharedVideos = useMemo(() => pickSharedVideos(sourceMedias), [sourceMedias]);
  const hasVideo = sharedVideos.length > 0;

  const eligibleClients = useMemo(
    () => availableClients.filter(c => !existingClientIds.includes(c.id)),
    [availableClients, existingClientIds]
  );

  const visitDateLabel = useMemo(() => {
    try {
      return formatInTimeZone(new Date(dateVisite), TZ, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr });
    } catch {
      return dateVisite;
    }
  }, [dateVisite]);

  const handleAdd = async () => {
    if (sending) return;
    if (selectedClientIds.length === 0) {
      toast.error('Sélectionnez au moins un client');
      return;
    }

    setSending(true);
    let added = 0;
    let skipped = 0;

    try {
      for (const clientId of selectedClientIds) {
        if (existingClientIds.includes(clientId)) {
          skipped++;
          continue;
        }

        // Dedup: existing offer for this client with same lien_annonce OR same adresse
        let dedupQuery = supabase
          .from('offres')
          .select('id')
          .eq('client_id', clientId)
          .limit(1);
        if (sourceOffre.lien_annonce) {
          dedupQuery = dedupQuery.eq('lien_annonce', sourceOffre.lien_annonce);
        } else {
          dedupQuery = dedupQuery.eq('adresse', adresse);
        }
        const { data: existingOffers } = await dedupQuery;
        if (existingOffers && existingOffers.length > 0) {
          skipped++;
          continue;
        }

        // 1) Insert offre
        const { data: newOffer, error: offerError } = await supabase
          .from('offres')
          .insert({
            client_id: clientId,
            agent_id: agentId,
            adresse,
            prix: sourceOffre.prix ?? null,
            pieces: sourceOffre.pieces ?? null,
            surface: sourceOffre.surface ?? null,
            etage: sourceOffre.etage ?? null,
            disponibilite: sourceOffre.disponibilite ?? null,
            annee_construction: typeof sourceOffre.annee_construction === 'number' ? sourceOffre.annee_construction : null,
            description: sourceOffre.description ?? null,
            lien_annonce: sourceOffre.lien_annonce ?? null,
            type_bien: sourceOffre.type_bien ?? null,
            statut: 'envoyee',
            envoi_auto: sourceOffre.envoi_auto ?? false,
            needs_agent_action: false,
            date_envoi: new Date().toISOString(),
          })
          .select()
          .single();

        if (offerError) throw offerError;

        // 2) Get / create conversation
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', clientId)
          .eq('conversation_type', 'client-agent')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        let conversationId = existingConv?.id;
        if (!conversationId) {
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              agent_id: agentId,
              client_id: clientId,
              conversation_type: 'client-agent',
              subject: `Offre - ${adresse}`,
              status: 'active',
            })
            .select()
            .single();
          if (convError) throw convError;
          conversationId = newConv.id;
        }

        // 3) Insert message
        const client = availableClients.find(c => c.id === clientId);
        const prenom = client?.profiles?.prenom || 'Bonjour';
        const parts: string[] = [
          `Bonjour ${prenom} 👋, une offre correspond à vos critères :`,
          `📍 ${adresse}`,
        ];
        if (sourceOffre.prix != null) {
          parts.push(`💰 ${sourceOffre.prix.toLocaleString('fr-CH')} CHF/mois charges comprises`);
        }
        if (sourceOffre.pieces != null) {
          parts.push(`🛏 ${sourceOffre.pieces} pièces`);
        }
        parts.push(`📅 Visite : ${visitDateLabel}`);
        if (sourceOffre.lien_annonce) {
          parts.push(`🔗 ${sourceOffre.lien_annonce}`);
        }
        parts.push(`L'équipe Immo-rama.ch`);
        const content = parts.join('\n');

        const { error: msgError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: FALLBACK_AGENT_ID,
          sender_type: 'agent',
          content,
          offre_id: newOffer.id,
          read: false,
        });
        if (msgError) throw msgError;

        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);

        // 4) Insert visite (carry medias so the added client sees the video + decision card)
        const { error: visiteError } = await supabase.from('visites').insert({
          offre_id: newOffer.id,
          client_id: clientId,
          agent_id: agentId,
          adresse,
          date_visite: dateVisite,
          date_visite_fin: dateVisiteFin ?? null,
          statut: 'planifiee',
          source: 'manuel',
          medias_coursier: [],
          medias: hasVideo ? (sourceMedias as any) : null,
        });
        if (visiteError) throw visiteError;

        // 5) If there is a shared video, send the added client the video message + notif + email
        if (hasVideo) {
          const firstVideo = sharedVideos[0];
          const videoContent = `🎥 Vidéo de la visite disponible ci-dessous.\n\n📍 ${adresse}`;
          const mediasPayload = sharedVideos.map((m: any) => ({
            url: m.url,
            name: m.name,
            mime: m.mime,
            size: m.size,
          }));

          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: FALLBACK_AGENT_ID,
            sender_type: 'agent',
            content: videoContent,
            offre_id: newOffer.id,
            read: false,
            attachment_type: 'video',
            attachment_url: firstVideo.url,
            attachment_name: firstVideo.name ?? null,
            attachment_size: firstVideo.size ?? null,
            payload: { medias: mediasPayload },
          } as any);

          await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId);

          // In-app + email notification for the client user
          const clientRow = availableClients.find(c => c.id === clientId);
          const clientUserId = clientRow?.user_id;
          const clientEmail = clientRow?.profiles?.email;
          const clientPrenom = clientRow?.profiles?.prenom || '';

          if (clientUserId) {
            try {
              await supabase.rpc('create_notification', {
                p_user_id: clientUserId,
                p_type: 'visite_video',
                p_title: `🎥 Vidéo de visite disponible — ${adresse}`,
                p_message: `Votre agent a partagé une vidéo de la visite. Consultez-la dans votre espace.`,
                p_link: '/client/visites',
                p_metadata: { adresse, offre_id: newOffer.id },
              });
            } catch (e) {
              console.warn('[AddClientsToVisite] notif error', e);
            }
          }

          if (clientEmail) {
            try {
              await supabase.functions.invoke('send-notification-email', {
                body: {
                  to: clientEmail,
                  subject: `🎥 Vidéo de votre visite — ${adresse}`,
                  html: `<p>Bonjour ${clientPrenom},</p><p>Votre agent a partagé une vidéo de la visite pour <strong>${adresse}</strong>.</p><p>Connectez-vous à votre espace pour la visionner et indiquer si vous souhaitez déposer votre candidature.</p><p><a href="https://logisorama.ch/client/visites">Voir la vidéo</a></p>`,
                },
              });
            } catch (e) {
              console.warn('[AddClientsToVisite] email error', e);
            }
          }
        }


        added++;
      }

      if (added > 0) {
        toast.success(`${added} client(s) ajouté(s) et offre envoyée${skipped > 0 ? ` (${skipped} ignoré(s))` : ''}`);
      } else if (skipped > 0) {
        toast.info(`${skipped} client(s) déjà destinataire(s) de cette offre`);
      }

      setSelectedClientIds([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('[AddClientsToVisite] error:', error);
      toast.error(error?.message || 'Erreur lors de l\'ajout des clients');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!sending) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ajouter des clients à cette visite
          </DialogTitle>
          <DialogDescription>
            Les clients sélectionnés recevront l'offre (message + notifications) avec la date de visite,
            et apparaîtront comme concernés dans le calendrier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg space-y-2">
            <h4 className="font-semibold">{adresse}</h4>
            <div className="flex flex-wrap gap-2">
              {sourceOffre.prix != null && <Badge variant="secondary">CHF {sourceOffre.prix.toLocaleString('fr-CH')}.-</Badge>}
              {sourceOffre.pieces != null && <Badge variant="outline">{sourceOffre.pieces} pièces</Badge>}
              {sourceOffre.surface != null && <Badge variant="outline">{sourceOffre.surface} m²</Badge>}
              <Badge>📅 {visitDateLabel}</Badge>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Clients à ajouter ({eligibleClients.length} disponibles)
            </label>
            <ClientMultiSelect
              clients={eligibleClients as any}
              selectedClientIds={selectedClientIds}
              onSelectionChange={setSelectedClientIds}
              disabled={sending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleAdd} disabled={sending || selectedClientIds.length === 0}>
            <UserPlus className="h-4 w-4 mr-2" />
            {sending ? 'Envoi...' : `Ajouter ${selectedClientIds.length} client(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

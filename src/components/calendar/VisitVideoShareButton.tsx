import { useRef, useState } from 'react';
import { Video, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getOrCreateClientConversation } from '@/lib/clientConversation';

interface Props {
  visite: any;                 // any visite from the group (must have id, adresse, date_visite, offre_id, agent_id, client_id)
  visitesGroup?: any[];        // optional pre-computed group (same adresse+date). If absent, we query siblings by adresse+date_visite
  onUploaded?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default';
  className?: string;
}

// Inline threshold: ~30 MB. Larger → send link instead of inline attachment.
const INLINE_MAX = 30 * 1024 * 1024;
// WhatsApp media hard limit ~16 MB — beyond that we send a link.
const WHATSAPP_MAX = 16 * 1024 * 1024;
// Max duration: 3 minutes (+2s tolerance for phone metadata rounding).
const MAX_DURATION_SEC = 182;

async function probeVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = url;
    v.onloadedmetadata = () => {
      const d = v.duration || 0;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0); // unknown → allow
    };
  });
}

export function VisitVideoShareButton({ visite, visitesGroup, onUploaded, variant = 'default', size = 'default', className }: Props) {
  const { user } = useAuth();
  const captureInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [durationSec, setDurationSec] = useState<number>(0);

  const openCapture = () => { setChooserOpen(false); captureInputRef.current?.click(); };
  const openFile = () => { setChooserOpen(false); fileInputRef.current?.click(); };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;

    const dur = await probeVideoDuration(f);
    if (dur && dur > MAX_DURATION_SEC) {
      toast.error(`Vidéo trop longue (${Math.round(dur)}s). Maximum : 3 minutes.`);
      return;
    }
    setDurationSec(dur);
    setPickedFile(f);
    setOpen(true);
    setDone(false);
    setProgress(0);
  };

  const doUploadAndShare = async () => {
    if (!pickedFile || !user || !visite?.id) return;
    setUploading(true);
    setProgress(5);

    try {
      // 1. Resolve group of visites sharing this address + datetime (always re-fetch to get client user_ids)
      const { data: freshGroup } = await supabase
        .from('visites')
        .select('id, client_id, agent_id, adresse, date_visite, offre_id, medias, clients!visites_client_id_fkey(id, user_id)')
        .eq('adresse', visite.adresse)
        .eq('date_visite', visite.date_visite);
      const group = (freshGroup && freshGroup.length > 0) ? freshGroup : (visitesGroup && visitesGroup.length > 0 ? visitesGroup : [visite]);

      // 2. Upload to storage
      const ext = (pickedFile.name.split('.').pop() || 'mp4').toLowerCase();
      const extMimeMap: Record<string, string> = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
        m4v: 'video/x-m4v',
        ogv: 'video/ogg',
        ogg: 'video/ogg',
        mkv: 'video/x-matroska',
      };
      const resolvedMime = pickedFile.type && pickedFile.type.startsWith('video/')
        ? pickedFile.type
        : (extMimeMap[ext] || 'video/mp4');
      const safeName = pickedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `videos/${visite.id}/${Date.now()}_${safeName}`;
      setProgress(15);

      const { error: upErr } = await supabase.storage
        .from('visite-medias')
        .upload(path, pickedFile, {
          contentType: resolvedMime,
          upsert: false,
        });
      if (upErr) throw upErr;
      setProgress(70);

      // 3. Long-lived signed URL (7 days) — will be regenerated on demand later
      const { data: signedData } = await supabase.storage
        .from('visite-medias')
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      const videoUrl = signedData?.signedUrl || '';
      const isInline = pickedFile.size <= INLINE_MAX;

      // 4. Persist reference on every visite in the group (visites.medias jsonb)
      const mediaEntry = {
        type: 'video',
        url: videoUrl,
        path,
        name: pickedFile.name,
        size: pickedFile.size,
        mime: resolvedMime,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user.id,
        shared_to_clients: true,
      };

      for (const v of group) {
        const currentMedias = Array.isArray(v.medias) ? v.medias : (v.medias ? [v.medias] : []);
        const nextMedias = [...currentMedias, mediaEntry];
        await supabase.from('visites').update({ medias: nextMedias as any }).eq('id', v.id);

        // Auto-advance offre status → 'visite_effectuee' (only from 'envoyee' or 'interesse')
        const offreId = (v as any).offre_id ?? visite.offre_id;
        if (offreId) {
          try {
            const { data: off } = await supabase
              .from('offres').select('statut').eq('id', offreId).maybeSingle();
            if (off && (off.statut === 'envoyee' || off.statut === 'interesse')) {
              await supabase.from('offres').update({ statut: 'visite_effectuee' }).eq('id', offreId);
            }
          } catch (e) { console.warn('[VisitVideoShare] offre statut update failed', e); }
        }
      }
      setProgress(80);

      // 5. Send message + notification to every unique client
      const uniqueClients = Array.from(
        new Map(group.filter((v: any) => v.client_id).map((v: any) => [v.client_id, v])).values()
      );

      let successCount = 0;
      let failureCount = 0;

      for (const v of uniqueClients) {
        const clientId = v.client_id;
        const agentId = v.agent_id || visite.agent_id;
        try {
          // Canonical conversation for this client (creates if missing,
          // upserts current agent as participant).
          const convId = await getOrCreateClientConversation(clientId);

          const messageContent = `🎥 Vidéo de la visite disponible ci-dessous.\n\n📍 ${visite.adresse}`;

          if (convId) {
            await supabase.from('messages').insert({
              conversation_id: convId,
              sender_id: user.id,
              sender_type: 'agent',
              content: messageContent,
              attachment_url: videoUrl,
              attachment_type: 'video',
              attachment_name: pickedFile.name,
              attachment_size: pickedFile.size,
              offre_id: v.offre_id ?? visite.offre_id ?? null,
              payload: {
                type: 'visite_video',
                visite_id: v.id,
                offre_id: v.offre_id ?? visite.offre_id ?? null,
                inline: isInline,
                path,
                video_url: videoUrl,
                mime: resolvedMime,
                medias: [{
                  type: 'video',
                  url: videoUrl,
                  name: pickedFile.name,
                  size: pickedFile.size,
                  mime: resolvedMime,
                  path,
                }],
              } as any,
            });
          }

          // Notification for the client (+ email via trigger_notification_email)
          let clientUserId = (v as any).clients?.user_id as string | undefined;
          if (!clientUserId && clientId) {
            const { data: cRow } = await supabase
              .from('clients')
              .select('user_id')
              .eq('id', clientId)
              .maybeSingle();
            clientUserId = cRow?.user_id || undefined;
          }
          if (clientUserId) {
            await supabase.rpc('create_notification', {
              p_user_id: clientUserId,
              p_type: 'visite_video',
              p_title: '🎥 Une vidéo de votre visite est disponible',
              p_message: `Visionnez la vidéo de ${visite.adresse} et indiquez si vous souhaitez postuler.`,
              p_link: '/client/visites',
              p_metadata: { visite_id: v.id, offre_id: v.offre_id ?? null, path } as any,
            });
            try {
              await supabase.functions.invoke('send-notification-email', {
                body: {
                  user_id: clientUserId,
                  notification_type: 'visite_video',
                  title: '🎥 Une vidéo de votre visite est disponible',
                  message: `Votre agent a partagé une vidéo de la visite au ${visite.adresse}. Connectez-vous à Logisorama pour la visionner et indiquer si vous souhaitez déposer votre candidature.`,
                  link: '/client/visites',
                },
              });
            } catch (mailErr) {
              console.warn('[VisitVideoShare] email fallback failed (non-blocking)', mailErr);
            }
          }

          // WhatsApp notification — always a link.
          try {
            const { data: clientProfile } = await supabase
              .from('profiles')
              .select('prenom')
              .eq('id', clientUserId)
              .maybeSingle();
            const { data: agentRow } = agentId
              ? await supabase
                  .from('agents')
                  .select('user_id, profiles:user_id(prenom, nom)')
                  .eq('id', agentId)
                  .maybeSingle()
              : { data: null as any };
            const agentName = agentRow?.profiles
              ? `${agentRow.profiles.prenom ?? ''} ${agentRow.profiles.nom ?? ''}`.trim() || 'votre agent'
              : 'votre agent';
            const sizeNote = pickedFile.size > WHATSAPP_MAX
              ? ` (vidéo ${(pickedFile.size / (1024 * 1024)).toFixed(0)} Mo)`
              : '';
            const waLine = `🎥 Vidéo de visite${sizeNote} pour ${visite.adresse} — ${videoUrl}`;
            await supabase.functions.invoke('send-whatsapp-notification', {
              body: {
                event_type: 'visit_video_shared',
                template_key: 'agent_message_alert',
                client_id: clientId,
                agent_id: agentId,
                preference_key: 'agent_messages_enabled',
                variables: [clientProfile?.prenom || 'client', agentName, waLine],
                context_type: 'visite',
                context_ref: v.id,
                inbox_body_text: waLine,
              },
            });
          } catch (waErr) {
            console.warn('[VisitVideoShare] WhatsApp send failed (non-blocking)', waErr);
          }

          successCount += 1;
        } catch (perClientErr) {
          failureCount += 1;
          console.error('[VisitVideoShare] failed for client', clientId, perClientErr);
        }
      }

      setProgress(100);
      setDone(true);
      const recap = failureCount > 0
        ? `Vidéo envoyée à ${successCount} client(s) (${failureCount} échec${failureCount > 1 ? 's' : ''})`
        : `Vidéo partagée à ${successCount} client(s)`;
      if (failureCount > 0 && successCount === 0) toast.error(recap);
      else toast.success(recap);
      onUploaded?.();
      setTimeout(() => {
        setOpen(false);
        setPickedFile(null);
        setDone(false);
        setProgress(0);
      }, 1200);
    } catch (err: any) {
      console.error('[VisitVideoShare] error', err);
      toast.error(err?.message || 'Erreur lors du partage de la vidéo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={captureInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={onFileChosen}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onFileChosen}
      />
      <Button variant={variant} size={size} className={className} onClick={() => setChooserOpen(true)} type="button">
        <Video className="w-4 h-4 mr-2" />
        🎥 Ajouter une vidéo
      </Button>

      <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter une vidéo de visite</DialogTitle>
            <DialogDescription>
              Filmez maintenant avec votre appareil ou importez une vidéo déjà enregistrée (max 3 min).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Button onClick={openCapture} className="justify-start" type="button">
              <Video className="w-4 h-4 mr-2" /> 🎥 Filmer maintenant
            </Button>
            <Button onClick={openFile} variant="outline" className="justify-start" type="button">
              <Video className="w-4 h-4 mr-2" /> 📁 Importer une vidéo
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChooserOpen(false)}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(o) => { if (!uploading) setOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Partager une vidéo de visite</DialogTitle>
            <DialogDescription>
              La vidéo (max 3 min, qualité originale) sera envoyée dans la messagerie de tous les
              clients concernés avec une notification. Les fichiers &gt; 30 Mo passent en lien.
              Sur WhatsApp, un lien vers la vidéo pleine qualité est toujours envoyé.
            </DialogDescription>
          </DialogHeader>

          {pickedFile && (
            <div className="space-y-3 py-2">
              <div className="text-sm">
                <div className="font-medium truncate">{pickedFile.name}</div>
                <div className="text-muted-foreground text-xs">
                  {(pickedFile.size / (1024 * 1024)).toFixed(1)} Mo
                  {durationSec > 0 && ` · ${Math.round(durationSec)}s`}
                  {pickedFile.type && ` · ${pickedFile.type}`}
                </div>
              </div>
              {(uploading || done) && (
                <>
                  <Progress value={progress} />
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {done ? <><CheckCircle2 className="w-4 h-4 text-green-600" /> Envoyé</> :
                      <><Loader2 className="w-4 h-4 animate-spin" /> Upload et envoi en cours… {progress}%</>}
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={uploading}>
              Annuler
            </Button>
            <Button onClick={doUploadAndShare} disabled={!pickedFile || uploading || done}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
              Envoyer aux clients
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

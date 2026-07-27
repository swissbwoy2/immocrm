import { useRef, useState } from 'react';
import { Video, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
      // 1. Resolve group of visites sharing this address + datetime
      let group = visitesGroup;
      if (!group || group.length === 0) {
        const { data } = await supabase
          .from('visites')
          .select('id, client_id, agent_id, adresse, date_visite, offre_id, medias, clients!visites_client_id_fkey(id, user_id)')
          .eq('adresse', visite.adresse)
          .eq('date_visite', visite.date_visite);
        group = data || [visite];
      }

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
        mime: pickedFile.type,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user.id,
        shared_to_clients: true,
      };

      for (const v of group) {
        const currentMedias = Array.isArray(v.medias) ? v.medias : (v.medias ? [v.medias] : []);
        const nextMedias = [...currentMedias, mediaEntry];
        await supabase.from('visites').update({ medias: nextMedias as any }).eq('id', v.id);
      }
      setProgress(80);

      // 5. Send message + notification to every unique client
      const uniqueClients = Array.from(
        new Map(group.filter((v: any) => v.client_id).map((v: any) => [v.client_id, v])).values()
      );

      const inlineNote = isInline
        ? "🎥 Vidéo de la visite disponible ci-dessous."
        : `🎥 Vidéo de la visite (${(pickedFile.size / (1024 * 1024)).toFixed(0)} Mo) — ouvrez le lien ci-dessous pour la regarder :`;

      for (const v of uniqueClients) {
        const clientId = v.client_id;
        const agentId = v.agent_id || visite.agent_id;

        // Find or create conversation (client_id, agent_id)
        let convId: string | null = null;
        if (agentId) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('client_id', clientId)
            .eq('agent_id', agentId)
            .maybeSingle();
          if (conv) convId = conv.id;
          else {
            const { data: created } = await supabase
              .from('conversations')
              .insert({ client_id: clientId, agent_id: agentId })
              .select('id')
              .single();
            convId = created?.id || null;
          }
        } else {
          const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('client_id', clientId)
            .limit(1)
            .maybeSingle();
          convId = conv?.id || null;
        }

        const messageContent = `${inlineNote}\n\n📍 ${visite.adresse}\n\n${isInline ? '' : `Lien : ${videoUrl}`}`;

        if (convId) {
          await supabase.from('messages').insert({
            conversation_id: convId,
            sender_id: user.id,
            sender_type: 'agent',
            content: messageContent,
            attachment_url: videoUrl,
            attachment_type: isInline ? 'video' : 'link',
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
            } as any,
          });
        }

        // Notification for the client
        const clientUserId = (v as any).clients?.user_id;
        if (clientUserId) {
          await supabase.from('notifications').insert({
            user_id: clientUserId,
            type: 'visit_video',
            title: '🎥 Vidéo de visite reçue',
            message: `Votre agent a partagé une vidéo de la visite au ${visite.adresse}.`,
            link: convId ? `/dashboard/messagerie?conv=${convId}` : '/dashboard/messagerie',
            metadata: { visite_id: v.id, offre_id: v.offre_id ?? null, inline: isInline } as any,
          });
        }

        // WhatsApp notification — always a link (WA media API not wired for freeform uploads).
        // Text-only template avoids the ~16 MB WA media limit entirely.
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
      }

      setProgress(100);
      setDone(true);
      toast.success(`Vidéo partagée à ${uniqueClients.length} client(s)`);
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

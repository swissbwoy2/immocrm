import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Loader2, MapPin, Calendar, ExternalLink, Home, Ruler, Building2, CalendarDays, Camera, ClipboardList, CheckCircle2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { formatSwissDateTime } from '@/lib/dateUtils';
import { submitVisitVideoDecision } from '@/components/client/VisitVideoDecisionCard';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { PremiumEmptyState } from '@/components/premium/PremiumEmptyState';
import { PremiumOffreDetailsDialog } from '@/components/premium/PremiumOffreDetailsDialog';

interface VideoMessage {
  id: string;
  offre_id: string;
  attachment_url: string;
  attachment_thumbnail_url: string | null;
  attachment_name: string | null;
  created_at: string;
  payload: any;
}

interface OffreData {
  id: string;
  adresse: string | null;
  prix: number | null;
  pieces: number | null;
  surface: number | null;
  etage: string | null;
  disponibilite: string | null;
  annee_construction: number | null;
  description: string | null;
  lien_annonce: string | null;
  statut: string | null;
  agent_id?: string | null;
}

interface VisiteRow {
  id: string;
  offre_id: string | null;
  client_decision: 'souhaite_postuler' | 'refuse' | null;
  agent_id: string | null;
  adresse: string | null;
  date_visite: string | null;
  compte_rendu?: any;
  compte_rendu_at?: string | null;
}

interface Item {
  message: VideoMessage;
  offre: OffreData | null;
  visite: VisiteRow | null;
}

function InfoPill({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  );
}

function VideoOfferCard({ item, onDecisionSaved }: { item: Item; onDecisionSaved: () => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState<null | 'souhaite_postuler' | 'refuse'>(null);
  const { message, offre, visite } = item;
  const address = offre?.adresse || visite?.adresse || 'Adresse non renseignée';
  const decision = visite?.client_decision ?? null;

  const infos: { icon: any; label: string }[] = [];
  if (offre?.pieces) infos.push({ icon: Home, label: `${offre.pieces} pièces` });
  if (offre?.surface) infos.push({ icon: Ruler, label: `${offre.surface} m²` });
  if (offre?.etage) infos.push({ icon: Building2, label: `Étage ${offre.etage}` });
  if (offre?.disponibilite) infos.push({ icon: CalendarDays, label: `Dispo. ${offre.disponibilite}` });
  if (offre?.annee_construction) infos.push({ icon: Calendar, label: `Construit ${offre.annee_construction}` });

  const handleDecision = async (choice: 'souhaite_postuler' | 'refuse') => {
    if (!user || !visite?.id || decision || saving) return;
    setSaving(choice);
    try {
      await submitVisitVideoDecision({
        user,
        visiteId: visite.id,
        offreId: offre?.id ?? visite.offre_id ?? null,
        agentIdHint: visite.agent_id ?? offre?.agent_id ?? null,
        address,
        choice,
      });
      toast.success(
        choice === 'souhaite_postuler'
          ? 'Merci, votre agent a été notifié de votre intérêt.'
          : 'Merci, votre choix a été enregistré.'
      );
      onDecisionSaved();
    } catch (err: any) {
      console.error('[VideoOfferCard]', err);
      toast.error(err?.message || "Impossible d’enregistrer votre choix");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="p-0">
        {/* Video */}
        <div className="bg-black">
          <video
            controls
            playsInline
            preload="metadata"
            poster={message.attachment_thumbnail_url || undefined}
            className="w-full max-h-[70vh] bg-black"
          >
            <source src={message.attachment_url} type="video/mp4" />
            <source src={message.attachment_url} />
            Votre navigateur ne peut pas lire cette vidéo.
          </video>
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-white/80 bg-black/60">
            <span className="truncate">{message.attachment_name || 'Vidéo de visite'}</span>
            <a
              href={message.attachment_url}
              download={message.attachment_name || 'visite.mp4'}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white"
            >
              📥 Télécharger
            </a>
          </div>
        </div>

        {/* Offer details */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <h3 className="text-lg font-semibold leading-snug">{address}</h3>
          </div>

          {offre?.prix != null && (
            <div className="text-2xl font-bold text-primary">
              {Number(offre.prix).toLocaleString('fr-CH')} CHF
              <span className="text-sm text-muted-foreground font-normal ml-2">/mois charges comprises</span>
            </div>
          )}

          {infos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {infos.map((info, i) => (
                <InfoPill key={i} icon={info.icon} label={info.label} />
              ))}
            </div>
          )}

          {offre?.description && (
            <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed bg-muted/30 rounded-lg p-3">
              {offre.description}
            </div>
          )}

          {offre?.lien_annonce && (
            <Button asChild variant="outline" size="sm">
              <a href={offre.lien_annonce} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir l'annonce
              </a>
            </Button>
          )}

          <div className="text-xs text-muted-foreground">
            Reçu le {formatSwissDateTime(message.created_at)}
          </div>

          {/* Compte-rendu de visite */}
          {visite?.compte_rendu && typeof visite.compte_rendu === 'object' && (
            <div className="border border-primary/20 rounded-lg p-4 bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Compte-rendu de la visite</h4>
              </div>
              <dl className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {visite.compte_rendu.ascenseur && (
                  <div><dt className="inline font-medium">🛗 Ascenseur : </dt><dd className="inline">{visite.compte_rendu.ascenseur === 'oui' ? 'Oui' : 'Non'}</dd></div>
                )}
                {visite.compte_rendu.type_sol && (
                  <div><dt className="inline font-medium">🧱 Sol : </dt><dd className="inline">{visite.compte_rendu.type_sol}</dd></div>
                )}
                {visite.compte_rendu.etat_general && (
                  <div className="sm:col-span-2"><dt className="inline font-medium">🏠 État : </dt><dd className="inline">{visite.compte_rendu.etat_general}</dd></div>
                )}
                {visite.compte_rendu.contact_regie && (
                  <div className="sm:col-span-2"><dt className="inline font-medium">🏢 Régie : </dt><dd className="inline">{visite.compte_rendu.contact_regie}</dd></div>
                )}
              </dl>
              {visite.compte_rendu.avantages && (
                <div className="text-sm"><span className="font-medium">👍 Avantages : </span><span className="whitespace-pre-wrap">{visite.compte_rendu.avantages}</span></div>
              )}
              {visite.compte_rendu.inconvenients && (
                <div className="text-sm"><span className="font-medium">👎 Inconvénients : </span><span className="whitespace-pre-wrap">{visite.compte_rendu.inconvenients}</span></div>
              )}
              {visite.compte_rendu.autres_infos && (
                <div className="text-sm"><span className="font-medium">📝 </span><span className="whitespace-pre-wrap">{visite.compte_rendu.autres_infos}</span></div>
              )}
            </div>
          )}
        </div>

        {/* Decision */}
        <div className="p-5 pt-0">
          {!visite?.id ? (
            <div className="text-xs text-muted-foreground italic text-center py-2">
              La confirmation d'intérêt sera disponible dès que la visite associée sera enregistrée.
            </div>
          ) : decision ? (
            <div className="flex justify-center">
              {decision === 'souhaite_postuler' ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 py-1.5 px-3">
                  <Check className="w-3.5 h-3.5 mr-1" /> Vous avez confirmé votre intérêt
                </Badge>
              ) : (
                <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 py-1.5 px-3">
                  <X className="w-3.5 h-3.5 mr-1" /> Non retenu
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
        </div>
      </CardContent>
    </Card>
  );
}

export default function VideosRecues() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. client
      const { data: clientRow } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!clientRow?.id) {
        setItems([]);
        return;
      }
      const clientId = clientRow.id;

      // 2. conversations
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', clientId);
      const convIds = (convs || []).map((c) => c.id);
      if (convIds.length === 0) {
        setItems([]);
        return;
      }

      // 3. video messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, offre_id, attachment_url, attachment_thumbnail_url, attachment_name, created_at, payload')
        .eq('attachment_type', 'video')
        .in('conversation_id', convIds)
        .not('attachment_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

      const videoMsgs = (msgs || []).filter((m: any) => m.offre_id && m.attachment_url) as VideoMessage[];

      // dedupe by offre_id (keep latest = first)
      const seen = new Set<string>();
      const uniqueMsgs: VideoMessage[] = [];
      for (const m of videoMsgs) {
        if (seen.has(m.offre_id)) continue;
        seen.add(m.offre_id);
        uniqueMsgs.push(m);
      }
      if (uniqueMsgs.length === 0) {
        setItems([]);
        return;
      }

      const offreIds = uniqueMsgs.map((m) => m.offre_id);

      // 4. offres
      const { data: offres } = await supabase
        .from('offres')
        .select('id, adresse, prix, pieces, surface, etage, disponibilite, annee_construction, description, lien_annonce, statut, agent_id')
        .in('id', offreIds);
      const offreMap = new Map<string, OffreData>((offres || []).map((o: any) => [o.id, o]));

      // 5. visites (for client_decision, visite id)
      const { data: visites } = await supabase
        .from('visites')
        .select('id, offre_id, client_decision, agent_id, adresse, date_visite, compte_rendu, compte_rendu_at')
        .eq('client_id', clientId)
        .in('offre_id', offreIds);
      const visiteByOffre = new Map<string, VisiteRow>();
      for (const v of (visites || []) as VisiteRow[]) {
        if (!v.offre_id) continue;
        const existing = visiteByOffre.get(v.offre_id);
        if (!existing || (v.date_visite && (!existing.date_visite || v.date_visite > existing.date_visite))) {
          visiteByOffre.set(v.offre_id, v);
        }
      }

      const built: Item[] = uniqueMsgs.map((m) => {
        // Try to match via payload.visite_id first
        const payloadVisiteId = m.payload?.visite_id;
        let visite = visiteByOffre.get(m.offre_id) || null;
        if (payloadVisiteId && (!visite || visite.id !== payloadVisiteId)) {
          const found = (visites || []).find((v: any) => v.id === payloadVisiteId) as VisiteRow | undefined;
          if (found) visite = found;
        }
        return {
          message: m,
          offre: offreMap.get(m.offre_id) || null,
          visite,
        };
      });

      setItems(built);
    } catch (err: any) {
      console.error('[VideosRecues]', err);
      toast.error("Impossible de charger les vidéos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const count = items.length;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
      <PremiumPageHeader
        title="Visite effectuée par votre agent 📷"
        subtitle={count > 0 ? `${count} bien${count > 1 ? 's' : ''} visité${count > 1 ? 's' : ''} pour vous` : 'Retrouvez ici les biens visités par votre agent, avec la vidéo et le compte-rendu'}
        icon={CheckCircle2}
      />

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="w-full aspect-video" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <PremiumEmptyState
          icon={CheckCircle2}
          title="Aucune visite effectuée pour le moment."
          description="Dès qu'un agent effectuera une visite pour vous (vidéo ou compte-rendu), elle apparaîtra ici."
        />
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <VideoOfferCard key={item.message.id} item={item} onDecisionSaved={load} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { canDecideOnOffre } from '@/lib/visitDecision';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Loader2, MapPin, Calendar, ExternalLink, Home, Ruler, Building2, CalendarDays, Camera, ClipboardList, CheckCircle2, Eye, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatSwissDateTime } from '@/lib/dateUtils';
import { submitVisitVideoDecision } from '@/components/client/VisitVideoDecisionCard';
import { PremiumOffreDetailsDialog } from '@/components/premium/PremiumOffreDetailsDialog';
import { DASH_CARD, DashPage, DashPageHeader, DashEmptyState, DashBadge } from '@/components/client/dashboard/DashPrimitives';

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

export interface CompteRenduRow {
  id: string;
  visite_id: string | null;
  offre_id: string | null;
  appreciation_globale: string | null;
  etat_general: string | null;
  interet_client: string | null;
  cuisine_type: string | null;
  cuisine_description: string | null;
  ascenseur: boolean | null;
  balcon: boolean | null;
  parking: boolean | null;
  points_forts: string[] | null;
  points_faibles: string[] | null;
  commentaire_libre: string | null;
  prochaines_etapes: string | null;
  medias: any;
  envoye_au_client_at: string | null;
  created_at?: string | null;
}

interface Item {
  key: string;
  message: VideoMessage | null;
  offre: OffreData | null;
  visite: VisiteRow | null;
  cr: CompteRenduRow | null;
}


function InfoPill({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-foreground">
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  );
}

const L_APPRECIATION: Record<string, string> = { tres_positif: 'Très positif', positif: 'Positif', mitige: 'Mitigé', negatif: 'Négatif' };
const L_ETAT: Record<string, string> = { excellent: 'Excellent', bon: 'Bon', moyen: 'Moyen', a_renover: 'À rénover' };
const L_INTERET: Record<string, string> = { tres_interesse: 'Très intéressé', interesse: 'Intéressé', hesitant: 'Hésitant', non_interesse: 'Non intéressé' };
const L_CUISINE: Record<string, string> = { agencee: 'Agencée', equipee: 'Équipée', simple: 'Simple', a_renover: 'À rénover' };

function CompteRenduBlock({ cr }: { cr: CompteRenduRow }) {
  const medias: any[] = Array.isArray(cr.medias) ? cr.medias : [];
  const rows: { label: string; value: string }[] = [];
  if (cr.appreciation_globale) rows.push({ label: 'Appréciation', value: L_APPRECIATION[cr.appreciation_globale] || cr.appreciation_globale });
  if (cr.etat_general) rows.push({ label: 'État du bien', value: L_ETAT[cr.etat_general] || cr.etat_general });
  if (cr.interet_client) rows.push({ label: 'Intérêt', value: L_INTERET[cr.interet_client] || cr.interet_client });
  if (cr.cuisine_type) rows.push({ label: 'Cuisine', value: L_CUISINE[cr.cuisine_type] || cr.cuisine_type });
  if (cr.ascenseur !== null && cr.ascenseur !== undefined) rows.push({ label: 'Ascenseur', value: cr.ascenseur ? 'Oui' : 'Non' });
  if (cr.balcon !== null && cr.balcon !== undefined) rows.push({ label: 'Balcon / terrasse', value: cr.balcon ? 'Oui' : 'Non' });
  if (cr.parking !== null && cr.parking !== undefined) rows.push({ label: 'Parking', value: cr.parking ? 'Oui' : 'Non' });

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/40 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardList className="h-4 w-4" />
        </span>
        <h4 className="text-sm font-semibold text-foreground">Compte-rendu de la visite</h4>
      </div>

      {rows.length > 0 && (
        <dl className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="inline text-muted-foreground">{r.label} : </dt>
              <dd className="inline font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {cr.cuisine_description && (
        <div className="text-sm"><span className="font-medium">Cuisine : </span><span className="whitespace-pre-wrap">{cr.cuisine_description}</span></div>
      )}
      {cr.points_forts?.length ? (
        <div className="text-sm"><span className="font-medium">Points forts : </span>{cr.points_forts.join(', ')}</div>
      ) : null}
      {cr.points_faibles?.length ? (
        <div className="text-sm"><span className="font-medium">Points faibles : </span>{cr.points_faibles.join(', ')}</div>
      ) : null}
      {cr.commentaire_libre && (
        <div className="text-sm whitespace-pre-wrap">{cr.commentaire_libre}</div>
      )}
      {cr.prochaines_etapes && (
        <div className="text-sm"><span className="font-medium">Prochaines étapes : </span><span className="whitespace-pre-wrap">{cr.prochaines_etapes}</span></div>
      )}

      {medias.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Photos, vidéos & fichiers</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {medias.map((m: any, i: number) => (
              <a
                key={i}
                href={m.url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-border/70 bg-background transition-colors hover:border-foreground/40"
              >
                {m.type === 'image' ? (
                  <img src={m.url} alt={m.name} className="w-full h-24 object-cover" />
                ) : m.type === 'video' ? (
                  <video src={m.url} controls playsInline className="w-full h-24 object-cover bg-black" />
                ) : (
                  <div className="flex h-24 items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-4 w-4" /> Fichier
                  </div>
                )}
                <div className="truncate px-2 py-1 text-[11px] text-muted-foreground">{m.name}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function VideoOfferCard({ item, onDecisionSaved, onViewOffer }: { item: Item; onDecisionSaved: () => void; onViewOffer: (offre: OffreData) => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState<null | 'souhaite_postuler' | 'refuse'>(null);
  const { message, offre, visite } = item;
  const address = offre?.adresse || visite?.adresse || 'Adresse non renseignée';
  const decision = visite?.client_decision ?? null;
  // Une vidéo existe forcément ici, donc canDecide est en pratique toujours vrai —
  // on garde le même critère partagé que l'onglet « Offres reçues ».
  const canDecide = canDecideOnOffre(offre, visite ? [visite] : []) || !!message?.attachment_url;

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
          ? 'Demande enregistrée et transmise à l’équipe.'
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
    <article className={`${DASH_CARD} overflow-hidden`}>
      <div>
        {/* Video */}
        {message?.attachment_url && (
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
              className="inline-flex shrink-0 items-center gap-1 underline-offset-2 hover:text-white hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger
            </a>
          </div>
        </div>
        )}


        {/* Offer details */}
        <div className="space-y-4 p-4 md:p-5">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <h3 className="text-base font-semibold leading-snug text-foreground">{address}</h3>
          </div>

          {offre?.prix != null && (
            <div className="text-lg font-semibold text-foreground">
              {Number(offre.prix).toLocaleString('fr-CH')} CHF
              <span className="ml-2 text-sm font-normal text-muted-foreground">/mois charges comprises</span>
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
            <div className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm leading-relaxed text-foreground/90">
              {offre.description}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {offre && (
              <Button size="sm" className="rounded-full" onClick={() => onViewOffer(offre)}>
                <Eye className="w-4 h-4 mr-2" /> Voir l'offre
              </Button>
            )}
            {offre?.lien_annonce && (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <a href={offre.lien_annonce} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Voir l'annonce
                </a>
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Reçu le {formatSwissDateTime(message?.created_at || item.cr?.envoye_au_client_at || item.visite?.date_visite || new Date().toISOString())}
          </div>

          {/* Compte-rendu structuré (visite_comptes_rendus) */}
          {item.cr && <CompteRenduBlock cr={item.cr} />}

          {/* Ancien compte-rendu libre (legacy visites.compte_rendu) */}
          {!item.cr && visite?.compte_rendu && typeof visite.compte_rendu === 'object' && (
            <div className="space-y-2 rounded-xl border border-border/70 bg-muted/40 p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <h4 className="text-sm font-semibold text-foreground">Compte-rendu de la visite</h4>
              </div>
              <dl className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {visite.compte_rendu.ascenseur && (
                  <div><dt className="inline text-muted-foreground">Ascenseur : </dt><dd className="inline font-medium">{visite.compte_rendu.ascenseur === 'oui' ? 'Oui' : 'Non'}</dd></div>
                )}
                {visite.compte_rendu.type_sol && (
                  <div><dt className="inline text-muted-foreground">Sol : </dt><dd className="inline font-medium">{visite.compte_rendu.type_sol}</dd></div>
                )}
                {visite.compte_rendu.etat_general && (
                  <div className="sm:col-span-2"><dt className="inline text-muted-foreground">État : </dt><dd className="inline font-medium">{visite.compte_rendu.etat_general}</dd></div>
                )}
                {visite.compte_rendu.contact_regie && (
                  <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Régie : </dt><dd className="inline font-medium">{visite.compte_rendu.contact_regie}</dd></div>
                )}
              </dl>
              {visite.compte_rendu.avantages && (
                <div className="text-sm"><span className="font-medium">Avantages : </span><span className="whitespace-pre-wrap">{visite.compte_rendu.avantages}</span></div>
              )}
              {visite.compte_rendu.inconvenients && (
                <div className="text-sm"><span className="font-medium">Inconvénients : </span><span className="whitespace-pre-wrap">{visite.compte_rendu.inconvenients}</span></div>
              )}
              {visite.compte_rendu.autres_infos && (
                <div className="text-sm"><span className="font-medium">Autres infos : </span><span className="whitespace-pre-wrap">{visite.compte_rendu.autres_infos}</span></div>
              )}
            </div>
          )}

        </div>

        {/* Decision */}
        <div className="border-t border-border/70 p-4 md:p-5">
          {!canDecide ? (
            <div className="py-2 text-center text-xs text-muted-foreground">
              Disponible après la visite
            </div>
          ) : decision ? (
            <div className="flex justify-center">
              {decision === 'souhaite_postuler' ? (
                <DashBadge tone="success">
                  <Check className="mr-1 h-3.5 w-3.5" /> Vous avez confirmé votre intérêt
                </DashBadge>
              ) : (
                <DashBadge tone="danger">
                  <X className="mr-1 h-3.5 w-3.5" /> Non retenu
                </DashBadge>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <Button
                size="lg"
                className="h-auto min-h-11 whitespace-normal rounded-full bg-emerald-600 py-2.5 text-white hover:bg-emerald-700"
                disabled={!!saving}
                onClick={() => handleDecision('souhaite_postuler')}
              >
                {saving === 'souhaite_postuler' ? (
                  <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2 shrink-0" />
                )}
                Je souhaite déposer ma candidature
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-auto min-h-11 whitespace-normal rounded-full py-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={!!saving}
                onClick={() => handleDecision('refuse')}
              >
                {saving === 'refuse' ? (
                  <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2 shrink-0" />
                )}
                Je ne souhaite pas postuler
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function VideosRecues() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [dialogOffre, setDialogOffre] = useState<OffreData | null>(null);

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

      // 2. comptes-rendus envoyés au client
      const { data: crs } = await supabase
        .from('visite_comptes_rendus')
        .select('*')
        .eq('client_id', clientId)
        .not('envoye_au_client_at', 'is', null)
        .order('envoye_au_client_at', { ascending: false });
      const crList = ((crs || []) as any[]) as CompteRenduRow[];

      // 3. conversations → messages vidéo
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', clientId);
      const convIds = (convs || []).map((c) => c.id);

      let uniqueMsgs: VideoMessage[] = [];
      if (convIds.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, offre_id, attachment_url, attachment_thumbnail_url, attachment_name, created_at, payload')
          .eq('attachment_type', 'video')
          .in('conversation_id', convIds)
          .not('attachment_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(500);

        const videoMsgs = (msgs || []).filter((m: any) => m.offre_id && m.attachment_url) as VideoMessage[];
        const seen = new Set<string>();
        for (const m of videoMsgs) {
          if (seen.has(m.offre_id)) continue;
          seen.add(m.offre_id);
          uniqueMsgs.push(m);
        }
      }

      if (uniqueMsgs.length === 0 && crList.length === 0) {
        setItems([]);
        return;
      }

      const offreIds = Array.from(
        new Set([
          ...uniqueMsgs.map((m) => m.offre_id),
          ...crList.map((c) => c.offre_id).filter(Boolean) as string[],
        ])
      );

      // 4. offres
      const offreMap = new Map<string, OffreData>();
      if (offreIds.length > 0) {
        const { data: offres } = await supabase
          .from('offres')
          .select('id, adresse, prix, pieces, surface, etage, disponibilite, annee_construction, description, lien_annonce, statut, agent_id')
          .in('id', offreIds);
        for (const o of (offres || []) as any[]) offreMap.set(o.id, o);
      }

      // 5. visites (décision client + rattachement des CR)
      const crVisiteIds = crList.map((c) => c.visite_id).filter(Boolean) as string[];
      const orFilters: string[] = [];
      if (offreIds.length > 0) orFilters.push(`offre_id.in.(${offreIds.join(',')})`);
      if (crVisiteIds.length > 0) orFilters.push(`id.in.(${crVisiteIds.join(',')})`);
      let visites: VisiteRow[] = [];
      if (orFilters.length > 0) {
        const { data } = await supabase
          .from('visites')
          .select('id, offre_id, client_decision, agent_id, adresse, date_visite, compte_rendu, compte_rendu_at')
          .eq('client_id', clientId)
          .or(orFilters.join(','));
        visites = (data || []) as VisiteRow[];
      }
      const visiteById = new Map<string, VisiteRow>(visites.map((v) => [v.id, v]));
      const visiteByOffre = new Map<string, VisiteRow>();
      for (const v of visites) {
        if (!v.offre_id) continue;
        const existing = visiteByOffre.get(v.offre_id);
        if (!existing || (v.date_visite && (!existing.date_visite || v.date_visite > existing.date_visite))) {
          visiteByOffre.set(v.offre_id, v);
        }
      }
      const crByVisite = new Map<string, CompteRenduRow>();
      for (const c of crList) if (c.visite_id) crByVisite.set(c.visite_id, c);

      const usedCrIds = new Set<string>();
      const built: Item[] = uniqueMsgs.map((m) => {
        const payloadVisiteId = m.payload?.visite_id;
        let visite = visiteByOffre.get(m.offre_id) || null;
        if (payloadVisiteId && (!visite || visite.id !== payloadVisiteId)) {
          const found = visiteById.get(payloadVisiteId);
          if (found) visite = found;
        }
        const cr = visite ? crByVisite.get(visite.id) ?? null : null;
        if (cr) usedCrIds.add(cr.id);
        return { key: m.id, message: m, offre: offreMap.get(m.offre_id) || null, visite, cr };
      });

      // Comptes-rendus sans vidéo associée → carte dédiée
      for (const c of crList) {
        if (usedCrIds.has(c.id)) continue;
        const visite = c.visite_id ? visiteById.get(c.visite_id) ?? null : null;
        built.push({
          key: `cr-${c.id}`,
          message: null,
          offre: c.offre_id ? offreMap.get(c.offre_id) ?? null : null,
          visite,
          cr: c,
        });
      }

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
    <DashPage>
      <DashPageHeader
        title="Visite effectuée par votre agent"
        subtitle={count > 0 ? `${count} bien${count > 1 ? 's' : ''} visité${count > 1 ? 's' : ''} pour vous` : 'Retrouvez ici les biens visités par votre agent, avec la vidéo et le compte-rendu'}
      />

      {loading ? (
        <div className="grid items-start gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className={`${DASH_CARD} overflow-hidden`}>
              <Skeleton className="w-full aspect-video rounded-none" />
              <div className="space-y-3 p-4 md:p-5">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <DashEmptyState
          icon={CheckCircle2}
          title="Aucune visite effectuée pour le moment."
          description="Dès qu'un agent effectuera une visite pour vous (vidéo ou compte-rendu), elle apparaîtra ici."
        />
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2">
          {items.map((item) => (
            <VideoOfferCard key={item.key} item={item} onDecisionSaved={load} onViewOffer={setDialogOffre} />
          ))}
        </div>
      )}

      <PremiumOffreDetailsDialog
        open={!!dialogOffre}
        onOpenChange={(o) => { if (!o) setDialogOffre(null); }}
        offre={dialogOffre}
        candidatures={[]}
        clientData={{}}
        documentsStats={{}}
        visites={[]}
        onProgressWorkflow={async () => {}}
        onPlanVisit={() => {}}
        onPostulerDirect={() => {}}
        formatStatutOffre={(statut: string) => ({ label: statut || '—', variant: 'default' as any })}
      />
    </DashPage>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { VisitLiveButton } from '@/components/calls/VisitLiveButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CalendarCheck, Clock, CheckCircle, Home, Phone, Mail, KeyRound, Building, User, Users, MessageSquare, FileText,
  Upload, Loader2, X, UserCog, Layers, Calendar, Navigation, ThumbsUp, ThumbsDown, Minus, RefreshCw,
} from 'lucide-react';
import { groupVisitesByPhysiqueAgent } from '@/utils/visitesCalculator';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AddressLink } from '@/components/AddressLink';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashBadge, DashEmptyState, DashFilterPills, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { CoursierMissionCard } from '@/components/coursier/CoursierMissionCard';
import { A_RENDRE_JOURS, etapeCoursier, finVisite, lienItineraire, type EtapeCoursier } from '@/components/coursier/coursierModel';
import { cn } from '@/lib/utils';

const ETAPES: { key: EtapeCoursier; label: string }[] = [
  { key: 'disponibles', label: 'Disponibles' },
  { key: 'mes_missions', label: 'Mes missions' },
  { key: 'a_rendre', label: 'À rendre' },
  { key: 'terminees', label: 'Terminées' },
];

const SECTION_TITLE = 'mb-2 flex items-center gap-2 text-sm font-semibold text-foreground';
const BLOC = 'rounded-xl bg-muted/50 p-3 space-y-1';

export default function CoursierMissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [coursierId, setCoursierId] = useState<string | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackMedias, setFeedbackMedias] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recommandation, setRecommandation] = useState<'recommande' | 'neutre' | 'deconseille'>('neutre');
  const [tab, setTab] = useState<EtapeCoursier>(() => {
    const t = searchParams.get('tab');
    return (ETAPES.some((e) => e.key === t) ? t : 'disponibles') as EtapeCoursier;
  });
  const tabChoisi = useRef(!!searchParams.get('tab'));
  const lienTraite = useRef(false);

  useEffect(() => {
    if (user) loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data: coursierData } = await supabase
        .from('coursiers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!coursierData) { setLoading(false); return; }
      setCoursierId(coursierData.id);

      const { data: allMissions } = await supabase
        .from('visites')
        .select('*, offres(*), clients!client_id(id, user_id, profiles:user_id(prenom, nom, email, telephone)), agents!agent_id(id, user_id, profiles:user_id(prenom, nom, email, telephone))')
        .or(`statut_coursier.eq.en_attente,coursier_id.eq.${coursierData.id}`)
        .order('date_visite', { ascending: true });

      setMissions(allMissions || []);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  /** Accepte toutes les lignes de la visite physique (tous les clients) */
  const handleAccept = async (group: any[]) => {
    if (!coursierId || !group?.length) return;
    try {
      const { error } = await supabase
        .from('visites')
        .update({ coursier_id: coursierId, statut_coursier: 'accepte' })
        .in('id', group.map((v) => v.id))
        .eq('statut_coursier', 'en_attente');


      if (error) throw error;
      toast.success('Mission acceptée !');
      loadData();
    } catch (error) {
      toast.error("Erreur lors de l'acceptation");
    }
  };

  const handleMediaUpload = async (files: FileList) => {
    if (!selectedMission) return;
    setUploadingMedia(true);
    const newMedias = [...feedbackMedias];

    for (const file of Array.from(files)) {
      try {
        const filePath = `visites-coursier/${selectedMission.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from('client-documents')
          .upload(filePath, file);

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('client-documents')
            .getPublicUrl(filePath);

          newMedias.push({ url: publicUrl, type: file.type, name: file.name });
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    setFeedbackMedias(newMedias);
    setUploadingMedia(false);
  };

  const handleComplete = async () => {
    if (!selectedMission || !feedback.trim()) {
      toast.error('Veuillez remplir le compte-rendu');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('visites')
        .update({
          statut_coursier: 'termine',
          statut: 'effectuee',
          feedback_coursier: feedback,
          medias_coursier: feedbackMedias,
          recommandation_agent: recommandation,
        })
        .in('id', (selectedMission._group || [selectedMission]).map((v: any) => v.id));

      if (error) throw error;
      toast.success('Visite terminée pour tous les clients concernés ✅');

      setCompleteOpen(false);
      setFeedback('');
      setFeedbackMedias([]);
      setRecommandation('neutre');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la complétion');
    } finally {
      setSubmitting(false);
    }
  };

  const toCards = (items: any[]) =>
    groupVisitesByPhysiqueAgent(items as any[]).map((g) => ({
      ...(g.representative as any),
      _group: g.items,
      _count: new Set(g.items.filter((v: any) => v.client_id).map((v: any) => v.client_id)).size || g.count, _delegues: g.items.filter((v: any) => v.est_deleguee === true).length,
    }));

  /** Missions regroupées puis rangées par étape (calcul d'affichage, aucune donnée modifiée). */
  const parEtape = useMemo(() => {
    const now = Date.now();
    const m: Record<EtapeCoursier, any[]> = { disponibles: [], mes_missions: [], a_rendre: [], terminees: [] };
    for (const card of toCards(missions)) {
      const e = etapeCoursier(card, card._group, coursierId, now);
      if (e) m[e].push(card);
    }
    const t = (x: any) => new Date(x.date_visite).getTime();
    m.disponibles.sort((a, b) => t(a) - t(b));
    m.mes_missions.sort((a, b) => t(a) - t(b));
    m.a_rendre.sort((a, b) => finVisite(a) - finVisite(b));
    m.terminees.sort((a, b) => t(b) - t(a));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missions, coursierId]);

  // Onglet par défaut = ce qui attend une action du coursier.
  useEffect(() => {
    if (loading || tabChoisi.current) return;
    tabChoisi.current = true;
    if (parEtape.a_rendre.length > 0) setTab('a_rendre');
    else if (parEtape.mes_missions.length > 0) setTab('mes_missions');
    else setTab('disponibles');
  }, [loading, parEtape]);

  // Lien direct depuis le tableau de bord : ?mission=<id>[&terminer=1]
  useEffect(() => {
    if (loading || lienTraite.current) return;
    const id = searchParams.get('mission');
    if (!id) return;
    lienTraite.current = true;
    const all = [...parEtape.disponibles, ...parEtape.mes_missions, ...parEtape.a_rendre, ...parEtape.terminees];
    const found = all.find((c) => c.id === id || c._group?.some((v: any) => v.id === id));
    if (found) {
      const e = (Object.keys(parEtape) as EtapeCoursier[]).find((k) => parEtape[k].includes(found));
      if (e) setTab(e);
      setSelectedMission(found);
      if (searchParams.get('terminer') === '1' && found.statut_coursier === 'accepte') setCompleteOpen(true);
      else setDetailOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    next.delete('mission'); next.delete('terminer');
    setSearchParams(next, { replace: true });
  }, [loading, parEtape, searchParams, setSearchParams]);

  const counts: Record<EtapeCoursier, number> = {
    disponibles: parEtape.disponibles.length,
    mes_missions: parEtape.mes_missions.length,
    a_rendre: parEtape.a_rendre.length,
    terminees: parEtape.terminees.length,
  };

  const openDetail = (m: any) => { setSelectedMission(m); setDetailOpen(true); };
  const openComplete = (m: any) => { setSelectedMission(m); setCompleteOpen(true); };

  const subtitle = loading
    ? 'Chargement…'
    : [
        counts.a_rendre > 0 ? `${counts.a_rendre} compte${counts.a_rendre > 1 ? 's' : ''}-rendu${counts.a_rendre > 1 ? 's' : ''} à faire` : null,
        counts.mes_missions > 0 ? `${counts.mes_missions} visite${counts.mes_missions > 1 ? 's' : ''} prévue${counts.mes_missions > 1 ? 's' : ''}` : null,
        counts.disponibles > 0 ? `${counts.disponibles} mission${counts.disponibles > 1 ? 's' : ''} disponible${counts.disponibles > 1 ? 's' : ''}` : null,
      ].filter(Boolean).join(' · ') || 'Aucune mission en attente pour le moment.';

  const EMPTY: Record<EtapeCoursier, { icon: any; title: string; description?: string }> = {
    disponibles: { icon: CalendarCheck, title: 'Aucune mission disponible pour le moment', description: 'Les nouvelles missions apparaissent ici dès qu’un agent les délègue.' },
    mes_missions: { icon: Clock, title: 'Aucune mission en cours' },
    a_rendre: { icon: FileText, title: 'Aucun compte-rendu à faire', description: `Les visites passées non terminées des ${A_RENDRE_JOURS} derniers jours apparaissent ici.` },
    terminees: { icon: CheckCircle, title: 'Aucune mission terminée' },
  };

  const liste = parEtape[tab];
  const sm = selectedMission;
  const estAMoi = !!sm && sm.coursier_id === coursierId;
  const contactTel: string | null = sm?.offres?.concierge_tel || sm?.offres?.locataire_tel || null;

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Mes missions"
        subtitle={subtitle}
        action={
          <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={() => { setLoading(true); loadData(); }} disabled={loading} aria-label="Actualiser">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Actualiser</span>
          </Button>
        }
      />

      <DashFilterPills
        label="Étapes des missions"
        value={tab}
        onChange={(v) => { tabChoisi.current = true; setTab(v as EtapeCoursier); }}
        options={ETAPES.map((e) => ({ key: e.key, label: e.label, count: counts[e.key] }))}
      />

      {loading && missions.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : liste.length === 0 ? (
        <DashEmptyState icon={EMPTY[tab].icon} title={EMPTY[tab].title} description={EMPTY[tab].description} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {liste.map((m) => (
            <CoursierMissionCard
              key={m.id}
              mission={m}
              etape={tab}
              onOpen={openDetail}
              onAccept={(x) => handleAccept(x._group)}
              onTerminer={openComplete}
              live={tab === 'mes_missions' ? <VisitLiveButton visiteId={m.id} className="h-11 w-full rounded-full" /> : undefined}
            />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border/60 p-5 pb-4">
            {sm && (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="line-clamp-2 text-lg font-semibold">
                    <AddressLink
                      address={sm.adresse}
                      showIcon={false}
                      className="text-lg font-semibold"
                    />
                  </DialogTitle>
                  <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
                    {format(new Date(sm.date_visite), "EEEE dd MMMM yyyy", { locale: fr })}{' '}
                    {sm.date_visite_fin
                      ? `de ${format(new Date(sm.date_visite), "HH:mm")} à ${format(new Date(sm.date_visite_fin), "HH:mm")}`
                      : `à ${format(new Date(sm.date_visite), "HH:mm")}`
                    }
                  </p>
                </div>
                <DashBadge tone="muted">
                  <Users className="mr-1 h-3 w-3" />
                  {sm._count || 1} client{(sm._count || 1) > 1 ? 's' : ''}
                </DashBadge>
              </div>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {sm && (
              <div className="space-y-5 p-5">
                {/* Accès rapide : itinéraire + appel du contact sur place */}
                <div className={cn('grid gap-2', contactTel ? 'grid-cols-2' : 'grid-cols-1')}>
                  <Button asChild variant="outline" className="h-11 rounded-full">
                    <a href={lienItineraire(sm.adresse)} target="_blank" rel="noopener noreferrer">
                      <Navigation className="mr-2 h-4 w-4" /> Itinéraire
                    </a>
                  </Button>
                  {contactTel && (
                    <Button asChild variant="outline" className="h-11 rounded-full">
                      <a href={`tel:${contactTel}`}><Phone className="mr-2 h-4 w-4" /> Appeler le contact</a>
                    </Button>
                  )}
                </div>

                {/* Créneau de visite */}
                <div className="rounded-xl border border-border/70 p-4">
                  <h4 className={SECTION_TITLE}>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Créneau de visite
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium first-letter:uppercase">
                        {format(new Date(sm.date_visite), "EEEE dd MMMM yyyy", { locale: fr })}
                      </p>
                      <p className="text-xl font-semibold tabular-nums text-foreground">
                        {format(new Date(sm.date_visite), "HH:mm")}
                        {sm.date_visite_fin && ` → ${format(new Date(sm.date_visite_fin), "HH:mm")}`}
                      </p>
                    </div>
                    {sm.date_visite_fin && (
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">Durée</span>
                        <p className="text-sm font-semibold">
                          {Math.round((new Date(sm.date_visite_fin).getTime() - new Date(sm.date_visite).getTime()) / 60000)} min
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prix */}
                {sm.offres?.prix && (
                  <div className="rounded-xl bg-muted/40 p-4 text-center">
                    <div className="text-2xl font-semibold text-foreground">
                      CHF {Number(sm.offres.prix).toLocaleString('fr-CH')}
                    </div>
                    <div className="text-sm text-muted-foreground">par mois</div>
                  </div>
                )}

                {/* Caractéristiques */}
                {sm.offres && (
                  <div>
                    <h4 className={SECTION_TITLE}>
                      <Home className="h-4 w-4 text-muted-foreground" />
                      Caractéristiques
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-muted/50 p-3 text-center">
                        <div className="text-lg font-semibold">{sm.offres.pieces || '-'}</div>
                        <div className="text-xs text-muted-foreground">pièces</div>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3 text-center">
                        <div className="text-lg font-semibold">{sm.offres.surface || '-'}</div>
                        <div className="text-xs text-muted-foreground">m²</div>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3 text-center">
                        <div className="text-lg font-semibold">{sm.offres.etage || '-'}</div>
                        <div className="text-xs text-muted-foreground">étage</div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      {sm.offres.type_bien && (
                        <div className="flex items-start gap-3 py-2">
                          <Building className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs text-muted-foreground">Type de bien</span>
                            <p className="text-sm font-medium">{sm.offres.type_bien}</p>
                          </div>
                        </div>
                      )}
                      {sm.offres.disponibilite && (
                        <div className="flex items-start gap-3 py-2">
                          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs text-muted-foreground">Disponibilité</span>
                            <p className="text-sm font-medium">{sm.offres.disponibilite}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {sm.offres?.description && (
                  <div className="border-t border-border/60 pt-5">
                    <h4 className={SECTION_TITLE}>Description</h4>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {sm.offres.description}
                    </p>
                  </div>
                )}

                {/* Agent responsable */}
                {sm.agents?.profiles && (
                  <div className="border-t border-border/60 pt-5">
                    <h4 className={SECTION_TITLE}>
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      Agent responsable
                    </h4>
                    <div className={BLOC}>
                      <p className="text-sm font-medium">
                        {sm.agents.profiles.prenom} {sm.agents.profiles.nom}
                      </p>
                      {sm.agents.profiles.telephone && (
                        <a href={`tel:${sm.agents.profiles.telephone}`} className="flex min-h-[32px] items-center gap-1.5 text-sm text-primary hover:underline">
                          <Phone className="h-3.5 w-3.5" />
                          {sm.agents.profiles.telephone}
                        </a>
                      )}
                      {sm.agents.profiles.email && (
                        <a href={`mailto:${sm.agents.profiles.email}`} className="flex min-h-[32px] items-center gap-1.5 text-sm text-primary hover:underline">
                          <Mail className="h-3.5 w-3.5" />
                          {sm.agents.profiles.email}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact de la visite (concierge ou locataire) */}
                <div className="border-t border-border/60 pt-5">
                  <h4 className={SECTION_TITLE}>
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Contact de la visite
                  </h4>
                  {sm.offres?.concierge_nom ? (
                    <div className={BLOC}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        Concierge
                      </div>
                      <p className="text-sm font-medium">{sm.offres.concierge_nom}</p>
                      {sm.offres.concierge_tel && (
                        <a href={`tel:${sm.offres.concierge_tel}`} className="flex min-h-[32px] items-center gap-1.5 text-sm text-primary hover:underline">
                          <Phone className="h-3.5 w-3.5" />
                          {sm.offres.concierge_tel}
                        </a>
                      )}
                    </div>
                  ) : sm.offres?.locataire_nom ? (
                    <div className={BLOC}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        Locataire actuel
                      </div>
                      <p className="text-sm font-medium">{sm.offres.locataire_nom}</p>
                      {sm.offres.locataire_tel && (
                        <a href={`tel:${sm.offres.locataire_tel}`} className="flex min-h-[32px] items-center gap-1.5 text-sm text-primary hover:underline">
                          <Phone className="h-3.5 w-3.5" />
                          {sm.offres.locataire_tel}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Aucun contact spécifique renseigné</p>
                  )}
                </div>

                {/* Client */}
                {sm.clients?.profiles && (
                  <div className="border-t border-border/60 pt-5">
                    <h4 className={SECTION_TITLE}>
                      <User className="h-4 w-4 text-muted-foreground" />
                      Client
                    </h4>
                    <div className={BLOC}>
                      <p className="text-sm font-medium">
                        {sm.clients.profiles.prenom} {sm.clients.profiles.nom}
                      </p>
                      {sm.clients.profiles.telephone && (
                        <a href={`tel:${sm.clients.profiles.telephone}`} className="flex min-h-[32px] items-center gap-1.5 text-sm text-primary hover:underline">
                          <Phone className="h-3.5 w-3.5" />
                          {sm.clients.profiles.telephone}
                        </a>
                      )}
                      {sm.clients.profiles.email && (
                        <a href={`mailto:${sm.clients.profiles.email}`} className="flex min-h-[32px] items-center gap-1.5 text-sm text-primary hover:underline">
                          <Mail className="h-3.5 w-3.5" />
                          {sm.clients.profiles.email}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Informations pratiques */}
                {(sm.offres?.code_immeuble || sm.offres?.concierge_nom || sm.offres?.locataire_nom) && (
                  <div className="border-t border-border/60 pt-5">
                    <h4 className={SECTION_TITLE}>
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      Informations pratiques
                    </h4>
                    <div className="space-y-2">
                      {sm.offres?.code_immeuble && (
                        <div className="flex items-start gap-3 py-2">
                          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs text-muted-foreground">Code immeuble</span>
                            <p className="font-mono text-sm font-medium">{sm.offres.code_immeuble}</p>
                          </div>
                        </div>
                      )}

                      {sm.offres?.concierge_nom && (
                        <div className={BLOC}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            Concierge
                          </div>
                          <p className="text-sm font-medium">{sm.offres.concierge_nom}</p>
                          {sm.offres.concierge_tel && (
                            <a href={`tel:${sm.offres.concierge_tel}`} className="flex min-h-[32px] items-center gap-1.5 text-sm text-primary hover:underline">
                              <Phone className="h-3.5 w-3.5" />
                              {sm.offres.concierge_tel}
                            </a>
                          )}
                        </div>
                      )}

                      {sm.offres?.locataire_nom && (
                        <div className={BLOC}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            Locataire actuel
                          </div>
                          <p className="text-sm font-medium">{sm.offres.locataire_nom}</p>
                          {sm.offres.locataire_tel && (
                            <a href={`tel:${sm.offres.locataire_tel}`} className="flex min-h-[32px] items-center gap-1.5 text-sm text-primary hover:underline">
                              <Phone className="h-3.5 w-3.5" />
                              {sm.offres.locataire_tel}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Commentaires agent */}
                {sm.offres?.commentaires && (
                  <div className="border-t border-border/60 pt-5">
                    <h4 className={SECTION_TITLE}>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Commentaires de l'agent
                    </h4>
                    <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                      {sm.offres.commentaires}
                    </p>
                  </div>
                )}

                {/* Notes de visite */}
                {sm.notes && (
                  <div className="rounded-xl bg-amber-500/10 p-3">
                    <p className="flex items-start gap-2 text-sm text-foreground">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <span>{sm.notes}</span>
                    </p>
                  </div>
                )}

                {/* Lien vers l'annonce */}
                {sm.offres?.lien_annonce && sm.offres.lien_annonce.trim() && (
                  <div className="border-t border-border/60 pt-5">
                    <h4 className={SECTION_TITLE}>Annonce originale</h4>
                    <LinkPreviewCard url={sm.offres.lien_annonce} showInline />
                  </div>
                )}

                {/* Feedback coursier if completed */}
                {sm.feedback_coursier && (
                  <div className="rounded-xl bg-emerald-500/10 p-3">
                    <h4 className="mb-1 text-sm font-medium text-foreground">Mon compte-rendu</h4>
                    <p className="text-sm text-muted-foreground">{sm.feedback_coursier}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions — en bas de la fiche, zone du pouce */}
          {sm && (sm.statut_coursier === 'en_attente' || (estAMoi && ['accepte', 'termine'].includes(sm.statut_coursier))) && (
            <div className="space-y-2 border-t border-border/60 bg-background p-4">
              {sm.statut_coursier === 'en_attente' && (
                <Button onClick={() => { handleAccept(sm._group || [sm]); setDetailOpen(false); }} className="h-12 w-full rounded-full">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accepter la mission
                </Button>
              )}
              {sm.statut_coursier === 'accepte' && estAMoi && (
                <Button
                  onClick={() => { setDetailOpen(false); setCompleteOpen(true); }}
                  className="h-12 w-full rounded-full"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Terminer la visite
                </Button>
              )}
              {estAMoi && sm.statut_coursier === 'accepte' && (
                <VisitLiveButton visiteId={sm.id} size="default" variant="outline" className="h-11 w-full rounded-full" />
              )}
              {estAMoi && ['accepte', 'termine'].includes(sm.statut_coursier) && (
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-full"
                  onClick={() => navigate(`/coursier/visites/${sm.id}/compte-rendu`)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Compte-rendu détaillé & envoi au client
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border/60 p-5 pb-4">
            <DialogTitle>Terminer la visite</DialogTitle>
            {sm && <p className="text-sm text-muted-foreground">{sm.adresse}</p>}
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <div className="space-y-2">
              <Label htmlFor="cr-feedback">Compte-rendu de la visite *</Label>
              <Textarea
                id="cr-feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Décrivez votre visite : état du bien, impressions, remarques..."
                rows={6}
                className="text-base md:text-sm"
              />
            </div>

            {/* Media upload */}
            <div className="space-y-2">
              <Label>Photos / vidéos (optionnel)</Label>
              <div className="flex flex-wrap gap-2">
                {feedbackMedias.map((media, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border/70">
                    {media.type?.startsWith('image') ? (
                      <img src={media.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label="Retirer ce fichier"
                      onClick={() => setFeedbackMedias(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-foreground/40">
                  {uploadingMedia ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  Ajouter
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Votre recommandation au client *</Label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Recommandation">
                {[
                  { value: 'recommande', label: 'Recommandé', icon: ThumbsUp, cls: 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
                  { value: 'neutre', label: 'Neutre', icon: Minus, cls: 'border-foreground bg-muted text-foreground' },
                  { value: 'deconseille', label: 'Déconseillé', icon: ThumbsDown, cls: 'border-destructive bg-destructive/10 text-destructive' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={recommandation === opt.value}
                    onClick={() => setRecommandation(opt.value as any)}
                    className={cn(
                      'flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border p-2 text-sm font-medium transition-colors',
                      recommandation === opt.value ? opt.cls : 'border-border bg-background text-muted-foreground hover:border-foreground/40',
                    )}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3">
              <span className="text-sm">Rémunération : au temps travaillé (pointage)</span>
              <span className="shrink-0 font-semibold text-foreground">20 CHF/h</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 bg-background p-4 sm:flex sm:justify-end">
            <Button variant="outline" className="h-12 rounded-full sm:h-11" onClick={() => setCompleteOpen(false)}>Annuler</Button>
            <Button
              onClick={handleComplete}
              disabled={submitting || !feedback.trim()}
              className="h-12 rounded-full sm:h-11"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Terminer et enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashPage>
  );
}

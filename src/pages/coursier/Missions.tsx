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
import { formatZurichDateTime } from '@/lib/dateZurich';
import { AddressLink } from '@/components/AddressLink';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashBadge, DashEmptyState, DashFilterPills, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { CoursierMissionCard } from '@/components/coursier/CoursierMissionCard';
import { A_RENDRE_JOURS, etapeCoursier, finVisite, lienItineraire, type EtapeCoursier } from '@/components/coursier/coursierModel';
import { cn } from '@/lib/utils';
import { VISIT_DIALOG_CLASS, VisitActionBar, VisitBody, VisitHero, VisitInfoTiles, VisitNote, VisitPersonRow, VisitSection, formatCHF, offrePhotoUrl } from '@/components/visites/VisitDetailParts';

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
          <Button variant="outline" className="h-11" onClick={() => { setLoading(true); loadData(); }} disabled={loading} aria-label="Actualiser">
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
              live={tab === 'mes_missions' ? <VisitLiveButton visiteId={m.id} className="h-11 w-full" /> : undefined}
            />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className={VISIT_DIALOG_CLASS} onOpenAutoFocus={(e) => e.preventDefault()}>
          {sm ? (
            <>
              <VisitHero
                TitleAs={DialogTitle}
                date={sm.date_visite}
                endDate={sm.date_visite_fin}
                kicker="Mission de visite"
                badges={
                  <DashBadge tone="muted">
                    <Users className="mr-1 h-3 w-3" />
                    {sm._count || 1} client{(sm._count || 1) > 1 ? 's' : ''}
                  </DashBadge>
                }
                address={sm.adresse}
                photoUrl={offrePhotoUrl(sm.offres)}
                title={sm.offres?.titre}
              />

              <VisitBody>
                {/* Accès rapide : itinéraire + appel du contact sur place */}
                <div className={cn('grid gap-2', contactTel ? 'grid-cols-2' : 'grid-cols-1')}>
                  <Button asChild variant="outline" className="h-12">
                    <a href={lienItineraire(sm.adresse)} target="_blank" rel="noopener noreferrer">
                      <Navigation className="h-4 w-4" /> Itinéraire
                    </a>
                  </Button>
                  {contactTel && (
                    <Button asChild variant="outline" className="h-12">
                      <a href={`tel:${contactTel}`}><Phone className="h-4 w-4" /> Appeler le contact</a>
                    </Button>
                  )}
                </div>

                {/* Infos clés */}
                <VisitInfoTiles
                  items={[
                    { icon: Clock, label: 'Durée', value: sm.date_visite_fin ? `${Math.round((new Date(sm.date_visite_fin).getTime() - new Date(sm.date_visite).getTime()) / 60000)} min` : undefined },
                    { icon: Building, label: 'Type', value: sm.offres?.type_bien },
                    { label: 'Pièces', value: sm.offres?.pieces },
                    { label: 'Surface', value: sm.offres?.surface ? `${sm.offres.surface} m²` : undefined },
                    { label: 'Étage', value: sm.offres?.etage },
                    { label: 'Loyer', value: sm.offres?.prix ? formatCHF(sm.offres.prix, ' / mois') : undefined },
                    { icon: Calendar, label: 'Disponibilité', value: sm.offres?.disponibilite },
                    { icon: KeyRound, label: 'Code immeuble', value: sm.offres?.code_immeuble ? <span className="font-mono">{sm.offres.code_immeuble}</span> : undefined },
                  ]}
                />

                {/* Contact sur place (concierge / locataire) */}
                <VisitSection icon={Phone} title="Contact de la visite">
                  {sm.offres?.concierge_nom || sm.offres?.locataire_nom ? (
                    <>
                      {sm.offres?.concierge_nom && (
                        <VisitPersonRow
                          role="Concierge"
                          name={sm.offres.concierge_nom}
                          sub={sm.offres.concierge_tel || undefined}
                          action={sm.offres.concierge_tel ? (
                            <Button asChild variant="outline" size="icon" className="h-11 w-11" aria-label={`Appeler ${sm.offres.concierge_nom}`}>
                              <a href={`tel:${sm.offres.concierge_tel}`}><Phone className="h-4 w-4" /></a>
                            </Button>
                          ) : undefined}
                        />
                      )}
                      {sm.offres?.locataire_nom && (
                        <VisitPersonRow
                          role="Locataire actuel"
                          name={sm.offres.locataire_nom}
                          sub={sm.offres.locataire_tel || undefined}
                          action={sm.offres.locataire_tel ? (
                            <Button asChild variant="outline" size="icon" className="h-11 w-11" aria-label={`Appeler ${sm.offres.locataire_nom}`}>
                              <a href={`tel:${sm.offres.locataire_tel}`}><Phone className="h-4 w-4" /></a>
                            </Button>
                          ) : undefined}
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun contact spécifique renseigné</p>
                  )}
                </VisitSection>

                {/* Participants : client + agent responsable */}
                {(sm.clients?.profiles || sm.agents?.profiles) && (
                  <VisitSection icon={Users} title="Participants">
                    {sm.clients?.profiles && (
                      <VisitPersonRow
                        role="Client"
                        name={`${sm.clients.profiles.prenom || ''} ${sm.clients.profiles.nom || ''}`.trim() || 'Client'}
                        sub={[sm.clients.profiles.telephone, sm.clients.profiles.email].filter(Boolean).join(' · ') || undefined}
                        action={
                          <div className="flex gap-1.5">
                            {sm.clients.profiles.telephone && (
                              <Button asChild variant="outline" size="icon" className="h-11 w-11" aria-label="Appeler le client">
                                <a href={`tel:${sm.clients.profiles.telephone}`}><Phone className="h-4 w-4" /></a>
                              </Button>
                            )}
                            {sm.clients.profiles.email && (
                              <Button asChild variant="outline" size="icon" className="h-11 w-11" aria-label="Écrire au client">
                                <a href={`mailto:${sm.clients.profiles.email}`}><Mail className="h-4 w-4" /></a>
                              </Button>
                            )}
                          </div>
                        }
                      />
                    )}
                    {sm.agents?.profiles && (
                      <VisitPersonRow
                        role="Agent responsable"
                        name={`${sm.agents.profiles.prenom || ''} ${sm.agents.profiles.nom || ''}`.trim() || 'Agent'}
                        sub={[sm.agents.profiles.telephone, sm.agents.profiles.email].filter(Boolean).join(' · ') || undefined}
                        action={
                          <div className="flex gap-1.5">
                            {sm.agents.profiles.telephone && (
                              <Button asChild variant="outline" size="icon" className="h-11 w-11" aria-label="Appeler l'agent">
                                <a href={`tel:${sm.agents.profiles.telephone}`}><Phone className="h-4 w-4" /></a>
                              </Button>
                            )}
                            {sm.agents.profiles.email && (
                              <Button asChild variant="outline" size="icon" className="h-11 w-11" aria-label="Écrire à l'agent">
                                <a href={`mailto:${sm.agents.profiles.email}`}><Mail className="h-4 w-4" /></a>
                              </Button>
                            )}
                          </div>
                        }
                      />
                    )}
                  </VisitSection>
                )}

                {/* Notes de visite */}
                {sm.notes && (
                  <VisitSection icon={MessageSquare} title="Notes de visite">
                    <VisitNote tone="warning">{sm.notes}</VisitNote>
                  </VisitSection>
                )}

                {/* Description + commentaires agent */}
                {(sm.offres?.description || sm.offres?.commentaires) && (
                  <VisitSection icon={Home} title="Le bien">
                    {sm.offres?.description && <VisitNote>{sm.offres.description}</VisitNote>}
                    {sm.offres?.commentaires && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Commentaires de l'agent</p>
                        <VisitNote>{sm.offres.commentaires}</VisitNote>
                      </div>
                    )}
                  </VisitSection>
                )}

                {/* Lien vers l'annonce */}
                {sm.offres?.lien_annonce && sm.offres.lien_annonce.trim() && (
                  <VisitSection icon={Layers} title="Annonce originale">
                    <div className="min-w-0 overflow-hidden">
                      <LinkPreviewCard url={sm.offres.lien_annonce} showInline />
                    </div>
                  </VisitSection>
                )}

                {/* Feedback coursier if completed */}
                {sm.feedback_coursier && (
                  <VisitSection icon={CheckCircle} title="Mon compte-rendu">
                    <VisitNote>{sm.feedback_coursier}</VisitNote>
                  </VisitSection>
                )}
              </VisitBody>

              {/* Actions — en bas de la fiche, zone du pouce */}
              {(sm.statut_coursier === 'en_attente' || (estAMoi && ['accepte', 'termine'].includes(sm.statut_coursier))) && (
                <VisitActionBar
                  primary={
                    sm.statut_coursier === 'en_attente' ? (
                      <Button onClick={() => { handleAccept(sm._group || [sm]); setDetailOpen(false); }}>
                        <CheckCircle className="h-4 w-4" />
                        Accepter la mission
                      </Button>
                    ) : sm.statut_coursier === 'accepte' && estAMoi ? (
                      <Button onClick={() => { setDetailOpen(false); setCompleteOpen(true); }}>
                        <CheckCircle className="h-4 w-4" />
                        Terminer la visite
                      </Button>
                    ) : undefined
                  }
                >
                  {estAMoi && sm.statut_coursier === 'accepte' && (
                    <VisitLiveButton visiteId={sm.id} size="default" variant="outline" className="h-11" />
                  )}
                  {estAMoi && ['accepte', 'termine'].includes(sm.statut_coursier) && (
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/coursier/visites/${sm.id}/compte-rendu`)}
                    >
                      <FileText className="h-4 w-4" />
                      Compte-rendu & envoi au client
                    </Button>
                  )}
                </VisitActionBar>
              )}
            </>
          ) : (
            <DialogTitle className="sr-only">Mission</DialogTitle>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border/60 p-5 pb-4">
            <DialogTitle>Terminer la visite</DialogTitle>
            {sm && <p className="text-sm text-muted-foreground">{sm.adresse}{sm.date_visite ? ` · ${formatZurichDateTime(sm.date_visite, { short: true })}` : ''}</p>}
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
              <Label>Photos et vidéos (optionnel)</Label>
              <div className={cn('flex flex-wrap gap-2', feedbackMedias.length === 0 && 'hidden')}>
                {feedbackMedias.map((media, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-2xl bg-muted">
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
                      className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="imr-lg-glass flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-foreground">
                  {uploadingMedia ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingMedia ? 'Envoi en cours…' : 'Ajouter photo / vidéo'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
                  />
                </label>
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
              <span className="shrink-0 font-semibold text-foreground">CHF 20/h</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 bg-background px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] sm:flex sm:justify-end">
            <Button variant="outline" className="h-12 sm:h-11" onClick={() => setCompleteOpen(false)}>Annuler</Button>
            <Button
              onClick={handleComplete}
              disabled={submitting || !feedback.trim()}
              className="h-12 sm:h-11"
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

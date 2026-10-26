import { useEffect, useState, useMemo, useCallback } from 'react';
import { isSameDay } from 'date-fns';
import { CalendarCheck, Users, Navigation, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashBadge, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { EventManagerCalendar } from '@/components/calendar/EventManagerCalendar';
import { PremiumDayEvents } from '@/components/calendar/PremiumDayEvents';
import { CalendarEvent } from '@/components/calendar/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VISIT_DIALOG_CLASS, VisitActionBar, VisitBody, VisitHero, VisitInfoTiles, VisitNote, VisitSection, formatCHF, offrePhotoUrl } from '@/components/visites/VisitDetailParts';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { VisitVideoPlayer } from '@/components/calendar/VisitVideoPlayer';
import CompteRenduVisite from '@/pages/agent/CompteRenduVisite';
import { groupVisitesByPhysiqueAgent } from '@/utils/visitesCalculator';

export default function CoursierCalendrier() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedGroup, setSelectedGroup] = useState<any[] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: coursierData } = await supabase
        .from('coursiers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!coursierData) { setLoading(false); return; }

      const { data } = await supabase
        .from('visites')
        .select('*, offres(*)')
        .eq('coursier_id', coursierData.id)
        .in('statut_coursier', ['accepte', 'termine'])
        .order('date_visite', { ascending: true })
        .limit(15000);

      setMissions((data || []).map((m: any) => ({ ...m, est_deleguee: true, source: 'deleguee' })));
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  /** Visites REGROUPÉES (adresse + date/heure + agent) — une carte par visite physique */
  const groups = useMemo(() => groupVisitesByPhysiqueAgent(missions as any[]), [missions]);

  /** Une seule ligne par visite physique pour le calendrier, enrichie du nb de clients */
  const visitesForCalendar = useMemo(
    () => groups.map((g) => ({ ...(g.representative as any), _group: g.items, _clientsCount: g.count })),
    [groups],
  );

  const dayGroups = useMemo(
    () => (selectedDate ? groups.filter((g) => isSameDay(new Date((g.representative as any).date_visite), selectedDate)) : []),
    [groups, selectedDate],
  );

  const dayVisites = useMemo(
    () => dayGroups.map((g) => ({ ...(g.representative as any), _group: g.items, _clientsCount: g.count })),
    [dayGroups],
  );

  const openGroup = (visite: any) => {
    const group = visite?._group && visite._group.length > 0 ? visite._group : [visite];
    setSelectedGroup(group);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <DashPage>
        <div className="animate-pulse space-y-4" role="status" aria-label="Chargement de l'agenda">
          <div className="h-8 w-56 rounded-lg bg-muted" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-96 rounded-[22px] bg-muted lg:col-span-2" />
            <div className="h-96 rounded-[22px] bg-muted" />
          </div>
        </div>
      </DashPage>
    );
  }

  const rep = selectedGroup?.[0];
  const clientsCount = selectedGroup
    ? new Set(selectedGroup.filter((v: any) => v.client_id).map((v: any) => v.client_id)).size
    : 0;

  return (
    <DashPage>
      <div className="space-y-6">
        <DashPageHeader
          title="Agenda des missions"
          subtitle={`${groups.length} visite${groups.length > 1 ? 's' : ''} acceptée${groups.length > 1 ? 's' : ''} ou terminée${groups.length > 1 ? 's' : ''} · touchez une visite pour le compte rendu`}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 min-w-0 w-full">
          <div className="lg:col-span-2 min-w-0 overflow-hidden">
            <EventManagerCalendar
              events={[] as CalendarEvent[]}
              visites={visitesForCalendar}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              availableTypes={['visite', 'visite_deleguee']}
              onEventClick={(item, type) => {
                if (type === 'visite') openGroup(item);
              }}
            />
          </div>

          <div className="lg:col-span-1 min-w-0 h-[440px] md:h-[600px]">
            <PremiumDayEvents
              date={selectedDate}
              events={[]}
              visites={dayVisites}
              onVisiteGroupClick={(vs) => openGroup(vs?.[0] ?? null)}
            />
          </div>
        </div>
      </div>

      {/* Fiche de visite — même contenu que l'admin, limité à ses missions */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className={VISIT_DIALOG_CLASS} onOpenAutoFocus={(e) => e.preventDefault()}>
          {rep ? (
            <>
              <VisitHero
                TitleAs={DialogTitle}
                date={rep.date_visite}
                endDate={rep.date_visite_fin}
                kicker="Détails de la visite"
                badges={
                  <>
                    <DashBadge tone={rep.statut_coursier === 'termine' ? 'success' : 'warning'}>
                      {rep.statut_coursier === 'termine' ? 'Terminée' : 'En cours'}
                    </DashBadge>
                    <DashBadge tone="muted">
                      <Users className="mr-1 h-3 w-3" />
                      {clientsCount} client{clientsCount > 1 ? 's' : ''}
                    </DashBadge>
                  </>
                }
                address={rep.adresse}
                photoUrl={offrePhotoUrl(rep.offres)}
                title={rep.offres?.titre}
              />

              <VisitBody>
                {rep.offres && (
                  <VisitInfoTiles
                    items={[
                      { label: 'Type', value: rep.offres.type_bien },
                      { label: 'Pièces', value: rep.offres.pieces },
                      { label: 'Surface', value: rep.offres.surface ? `${rep.offres.surface} m²` : undefined },
                      { label: 'Étage', value: rep.offres.etage },
                      { label: 'Loyer / prix', value: rep.offres.prix ? formatCHF(rep.offres.prix) : undefined },
                    ]}
                  />
                )}

                {rep.offres?.description && (
                  <VisitSection icon={CalendarCheck} title="Description">
                    <VisitNote>{rep.offres.description}</VisitNote>
                  </VisitSection>
                )}

                {rep.offres?.lien_annonce && (
                  <VisitSection icon={Navigation} title="Annonce">
                    <div className="min-w-0 overflow-hidden">
                      <LinkPreviewCard url={rep.offres.lien_annonce} showInline />
                    </div>
                  </VisitSection>
                )}

                {rep.notes && (
                  <VisitSection icon={Clock} title="Notes">
                    <VisitNote tone="warning">{rep.notes}</VisitNote>
                  </VisitSection>
                )}

                {/* Vidéo(s) de la visite */}
                <VisitVideoPlayer medias={rep.medias} />

                {/* Compte-rendu complet + médias + envoi à TOUS les clients du groupe */}
                <CompteRenduVisite
                  role="coursier"
                  visiteId={rep.id}
                  embedded
                  onSent={() => loadData()}
                />
              </VisitBody>

              <VisitActionBar
                primary={
                  <Button asChild>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(rep.adresse || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="h-4 w-4" /> Itinéraire
                    </a>
                  </Button>
                }
              />
            </>
          ) : (
            <DialogTitle className="sr-only">Détails de la visite</DialogTitle>
          )}
        </DialogContent>
      </Dialog>
    </DashPage>
  );
}

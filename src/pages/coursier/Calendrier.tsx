import { useEffect, useState, useMemo, useCallback } from 'react';
import { isSameDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarCheck, Users, Navigation, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { EventManagerCalendar } from '@/components/calendar/EventManagerCalendar';
import { PremiumDayEvents } from '@/components/calendar/PremiumDayEvents';
import { CalendarEvent } from '@/components/calendar/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { AddressLink } from '@/components/AddressLink';
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
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl" />)}
        </div>
      </main>
    );
  }

  const rep = selectedGroup?.[0];
  const clientsCount = selectedGroup
    ? new Set(selectedGroup.filter((v: any) => v.client_id).map((v: any) => v.client_id)).size
    : 0;

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          icon={CalendarCheck}
          title="Calendrier des missions"
          subtitle="Vos visites regroupées — compte-rendu et envoi au client depuis la fiche"
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

          <div className="lg:col-span-1 min-w-0 h-[400px] md:h-[600px]">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la visite</DialogTitle>
          </DialogHeader>

          {rep && (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <AddressLink address={rep.adresse} className="font-semibold text-lg" iconClassName="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(rep.date_visite), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  {rep.date_visite_fin && ` → ${format(new Date(rep.date_visite_fin), 'HH:mm')}`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/30">
                    <Users className="h-3 w-3 mr-1" />
                    {clientsCount} client{clientsCount > 1 ? 's' : ''}
                  </Badge>
                  <Badge className={rep.statut_coursier === 'termine'
                    ? 'bg-green-500/10 text-green-600 border-green-500/30'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}>
                    {rep.statut_coursier === 'termine' ? 'Terminée' : 'En cours'}
                  </Badge>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(rep.adresse || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Navigation className="h-3 w-3" /> Itinéraire
                  </a>
                </div>
              </div>

              {rep.offres && (
                <div>
                  <Label className="text-sm font-medium mb-3 block">Caractéristiques du bien</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {rep.offres.prix && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Prix</p>
                        <p className="font-bold text-primary">{Number(rep.offres.prix).toLocaleString('fr-CH')} CHF</p>
                      </div>
                    )}
                    {rep.offres.pieces && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Pièces</p>
                        <p className="font-bold">{rep.offres.pieces}</p>
                      </div>
                    )}
                    {rep.offres.surface && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Surface</p>
                        <p className="font-bold">{rep.offres.surface} m²</p>
                      </div>
                    )}
                    {rep.offres.etage && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Étage</p>
                        <p className="font-bold">{rep.offres.etage}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {rep.offres?.description && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Description</Label>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{rep.offres.description}</p>
                  </div>
                </div>
              )}

              {rep.offres?.lien_annonce && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Annonce</Label>
                  <LinkPreviewCard url={rep.offres.lien_annonce} showInline />
                </div>
              )}

              {rep.notes && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Notes</Label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rep.notes}</p>
                </div>
              )}

              {/* Vidéo(s) de la visite */}
              <VisitVideoPlayer medias={rep.medias} />

              {/* Compte-rendu complet + médias + envoi à TOUS les clients du groupe */}
              <div className="border border-primary/20 rounded-lg p-4 bg-muted/30">
                <CompteRenduVisite
                  role="coursier"
                  visiteId={rep.id}
                  embedded
                  onSent={() => loadData()}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

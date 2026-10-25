import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidatCandidatures } from '@/hooks/useCandidatCandidatures';
import { DayBanner, type DayUnit, type DayVisit } from '@/components/dashboard-staff/StaffDashParts';
import { formatHeure, formatJourLong, isSameDay, toDate } from '@/components/dashboard-staff/staffDashboardModel';

/**
 * Bandeau « Ma journée » pour les rôles hors admin/agent (même rendu que l'admin) :
 * client (tous parcours), candidat, propriétaire, apporteur, coursier.
 * Une seule requête légère par rôle ; le client peut fournir ses visites déjà chargées.
 */
export type MaJourneeRole = 'client' | 'candidat' | 'proprietaire' | 'apporteur' | 'coursier';

type Item = { id: string; date: Date; titre: string; sous?: string; statut?: string | null };

const ROLE_CFG: Record<MaJourneeRole, { agenda: string; agendaLabel: string; unit: DayUnit }> = {
  client: { agenda: '/client/calendrier', agendaLabel: 'Agenda', unit: { one: 'visite', many: 'visites', none: 'aucune visite', pastHint: 'Vos visites du jour sont passées : donnez votre avis à votre agent.' } },
  candidat: { agenda: '/candidat/agenda', agendaLabel: 'Agenda', unit: { one: 'visite', many: 'visites', none: 'aucune visite', pastHint: 'Vos visites du jour sont passées.' } },
  proprietaire: { agenda: '/proprietaire/calendrier', agendaLabel: 'Calendrier', unit: { one: 'rendez-vous', many: 'rendez-vous', none: 'aucun rendez-vous', pastHint: 'Vos rendez-vous du jour sont passés.' } },
  apporteur: { agenda: '/apporteur/mes-referrals', agendaLabel: 'Mes referrals', unit: { one: 'rendez-vous', many: 'rendez-vous', none: 'aucun rendez-vous', pastHint: 'Vos rendez-vous du jour sont passés.' } },
  coursier: { agenda: '/coursier/calendrier', agendaLabel: 'Calendrier', unit: { one: 'mission', many: 'missions', none: 'aucune mission', pastHint: 'Vos missions du jour sont passées : pensez au compte rendu.' } },
};

const ACTIVE = ['planifiee', 'confirmee', 'proposee', 'deleguee', 'effectuee', 'accepte', 'en_cours'];

function dayBounds(now: Date) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function visiteToItem(v: any): Item | null {
  const d = toDate(v?.date_visite);
  if (!d) return null;
  const o = v.offres ?? {};
  const adresse = v.adresse || o.adresse || '';
  const details = [o.pieces ? `${o.pieces} pièces` : null, o.surface ? `${o.surface} m²` : null].filter(Boolean).join(' · ');
  return { id: v.id, date: d, titre: adresse || o.titre || 'Visite', sous: details || undefined, statut: v.statut };
}

export function MaJourneeBanner(props: {
  role: MaJourneeRole;
  prenom?: string | null;
  /** Visites déjà chargées par la page (client) : évite une requête. */
  visites?: any[];
  className?: string;
}) {
  if (props.visites) return <JourneeCore {...props} items={(props.visites.map(visiteToItem).filter(Boolean) as Item[])} />;
  if (props.role === 'candidat') return <CandidatJournee {...props} />;
  return <FetchedJournee {...props} />;
}

function CandidatJournee(props: { role: MaJourneeRole; prenom?: string | null; className?: string }) {
  const { data } = useCandidatCandidatures();
  const items = useMemo(() => (data ?? []).filter((c) => !c.annulee && c.date_visite).map((c) => {
    const d = toDate(c.date_visite);
    return d ? { id: c.id, date: d, titre: c.adresse || 'Visite', statut: null } : null;
  }).filter(Boolean) as Item[], [data]);
  return <JourneeCore {...props} items={items} />;
}

function FetchedJournee(props: { role: MaJourneeRole; prenom?: string | null; className?: string }) {
  const { role } = props;
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const { start, end } = dayBounds(new Date());
    (async () => {
      let list: Item[] = [];
      if (role === 'client' || role === 'coursier') {
        const table = role === 'client' ? 'clients' : 'coursiers';
        const { data: c } = await (supabase as any).from(table).select('id').eq('user_id', user.id).maybeSingle();
        if (c?.id) {
          const { data } = await supabase.from('visites').select('id, date_visite, statut, adresse, offres(adresse, titre, pieces, surface)')
            .eq(role === 'client' ? 'client_id' : 'coursier_id', c.id).gte('date_visite', start).lt('date_visite', end).order('date_visite');
          list = (data ?? []).map(visiteToItem).filter(Boolean) as Item[];
        }
      } else {
        const { data } = await supabase.from('calendar_events').select('id, title, description, event_date, status')
          .eq('created_by', user.id).gte('event_date', start).lt('event_date', end).order('event_date');
        list = (data ?? []).map((e: any) => {
          const d = toDate(e.event_date);
          return d ? { id: e.id, date: d, titre: e.title || 'Rendez-vous', sous: e.description || undefined, statut: null } : null;
        }).filter(Boolean) as Item[];
      }
      if (alive) setItems(list);
    })().catch((e) => console.error('[MaJourneeBanner]', e));
    return () => { alive = false; };
  }, [user?.id, role]);
  return <JourneeCore {...props} items={items} />;
}

function JourneeCore({ role, prenom, items: all, className = '' }: { role: MaJourneeRole; prenom?: string | null; items: Item[]; className?: string }) {
  const navigate = useNavigate();
  const cfg = ROLE_CFG[role];
  const now = useMemo(() => new Date(), []);
  const items = useMemo(() => all
    .filter((i) => isSameDay(i.date, now) && (!i.statut || ACTIVE.includes(i.statut)))
    .sort((a, b) => a.date.getTime() - b.date.getTime()), [all, now]);

  const toDay = (i: Item): DayVisit => ({ id: i.id, heure: formatHeure(i.date), titre: i.titre, sous: i.sous, onClick: () => navigate(cfg.agenda) });
  const next = items.find((i) => i.statut !== 'effectuee' && i.date.getTime() >= now.getTime() - 30 * 60000) ?? null;

  return (
    <DayBanner
      className={className}
      greeting={prenom === undefined ? '' : prenom ? `Bonjour ${prenom}` : 'Bonjour'}
      dateLabel={formatJourLong(now)}
      total={items.length}
      next={next ? toDay(next) : null}
      others={items.filter((i) => i !== next).map(toDay)}
      onAgenda={() => navigate(cfg.agenda)}
      agendaLabel={cfg.agendaLabel}
      unit={cfg.unit}
    />
  );
}

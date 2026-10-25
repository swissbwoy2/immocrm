import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Check, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { useNotifications, type Notification, type UseNotificationsOptions } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { getCorrectNotificationLink } from '@/lib/notificationLinks';
import { DashEmptyState, DashFilterPills, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { NotificationCard } from './NotificationCard';
import {
  GROUPES_JOUR, estATraiter, getNotificationTypeName, getThemes, groupeJour, themeOf,
  type GroupeJour, type NotificationRole, type Theme,
} from './notificationsModel';

type Filtre = 'all' | 'unread' | 'urgent';

/** Volume chargé par rôle : identique aux anciennes pages (admin/agent/client 50, propriétaire 100, apporteur sans limite). */
const CHARGEMENT: Record<NotificationRole, UseNotificationsOptions> = {
  admin: {},
  agent: {},
  client: {},
  apporteur: { limit: null },
  proprietaire: { limit: 100 },
};

/**
 * Destination d'une notification, identique aux anciennes pages de chaque espace :
 * admin / agent / client / apporteur → logique centralisée getCorrectNotificationLink ;
 * propriétaire → lien stocké réécrit vers /proprietaire (aucune navigation sans lien).
 */
function destination(n: Notification, role: NotificationRole): string | null {
  if (role === 'proprietaire') {
    return n.link ? n.link.replace(/^\/(admin|client|agent)/, '/proprietaire') : null;
  }
  return getCorrectNotificationLink(n.type, n.link, role, n.metadata as Record<string, string> | null);
}

/**
 * Page Notifications commune à tous les espaces — « qu'est-ce que je dois faire maintenant ? » :
 * en tête, les notifications non lues qui attendent une action ; ensuite le reste, groupé par jour.
 * Filtres Toutes / Non lues / À traiter, filtre par thème et recherche ; les compteurs suivent.
 */
export function NotificationsPage({ role }: { role: NotificationRole }) {
  const { notifications, counts, loading, recordClick, markAsRead, markAllAsRead, deleteNotification, refresh } =
    useNotifications(CHARGEMENT[role]);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filtre>('all');
  const [theme, setTheme] = useState<'all' | Theme>('all');
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const themes = useMemo(() => getThemes(role), [role]);
  const aTraiterFn = (n: Notification) => estATraiter(n, role);

  const handleNotificationClick = (notification: Notification) => {
    void recordClick(notification.id);
    const url = destination(notification, role);
    if (url) navigate(url);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  // Thème + recherche : s'appliquent à tous les filtres, les compteurs suivent.
  const base = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return notifications.filter((n) => {
      if (theme !== 'all' && themeOf(n.type, role) !== theme) return false;
      if (!needle) return true;
      return `${n.title} ${n.message ?? ''} ${getNotificationTypeName(n.type, role)}`.toLowerCase().includes(needle);
    });
  }, [notifications, theme, q, role]);

  const filtreCounts: Record<Filtre, number> = {
    all: base.length,
    unread: base.filter((n) => !n.read).length,
    urgent: base.filter((n) => aTraiterFn(n)).length,
  };

  const themeCounts = useMemo(() => {
    const m = new Map<Theme, number>();
    for (const n of notifications) {
      const t = themeOf(n.type, role);
      m.set(t, (m.get(t) ?? 0) + 1);
    }
    return m;
  }, [notifications, role]);

  const visibles = useMemo(() => base.filter((n) =>
    filter === 'unread' ? !n.read : filter === 'urgent' ? estATraiter(n, role) : true,
  ), [base, filter, role]);

  // « À traiter maintenant » = non lues qui attendent une action ; le reste par jour.
  const aTraiter = visibles.filter((n) => !n.read && aTraiterFn(n));
  const reste = visibles.filter((n) => !(!n.read && aTraiterFn(n)));
  const parJour = useMemo(() => {
    const m: Record<GroupeJour, Notification[]> = { aujourdhui: [], hier: [], semaine: [], ancien: [] };
    const now = new Date();
    for (const n of reste) m[groupeJour(n.created_at, now)].push(n);
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibles]);

  const nbATraiterTotal = notifications.filter((n) => !n.read && aTraiterFn(n)).length;

  if (loading) {
    return (
      <DashPage>
        <div role="status" aria-label="Chargement des notifications">
          <div className="h-8 w-44 rounded-full bg-muted/60" />
          <div className="mt-6 h-16 rounded-2xl bg-muted/40" />
          <div className="mt-3 h-16 rounded-2xl bg-muted/40" />
        </div>
      </DashPage>
    );
  }

  const carte = (n: Notification) => (
    <NotificationCard
      key={n.id}
      role={role}
      notification={n}
      onOpen={handleNotificationClick}
      onMarkRead={(id) => markAsRead(id)}
      onDelete={(id) => deleteNotification(id)}
    />
  );

  const filtresActifs = theme !== 'all' || !!q;

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Notifications"
        subtitle={
          counts.total === 0
            ? 'Toutes vos notifications sont lues'
            : `${counts.total} notification${counts.total > 1 ? 's' : ''} non lue${counts.total > 1 ? 's' : ''}${nbATraiterTotal > 0 ? ` · ${nbATraiterTotal} à traiter` : ''}`
        }
        action={
          <>
            <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={handleRefresh} disabled={refreshing} aria-label="Actualiser">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Actualiser</span>
            </Button>
            {counts.total > 0 && (
              <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={() => markAllAsRead()}>
                <Check className="mr-2 h-4 w-4" />
                Tout marquer comme lu
              </Button>
            )}
          </>
        }
      />

      {/* Recherche pleine largeur sur mobile, thème à côté sur grand écran */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Titre, message, type…"
            aria-label="Rechercher une notification"
            className="h-11 rounded-full pl-10 pr-10"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={theme} onValueChange={(v) => setTheme(v as 'all' | Theme)}>
          <SelectTrigger className="h-11 rounded-full md:w-[230px]" aria-label="Type de notification"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types ({notifications.length})</SelectItem>
            {themes.filter((t) => (themeCounts.get(t.key) ?? 0) > 0).map((t) => (
              <SelectItem key={t.key} value={t.key}>{t.label} ({themeCounts.get(t.key)})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DashFilterPills
        label="Filtrer les notifications"
        value={filter}
        onChange={(v) => setFilter(v)}
        options={[
          { key: 'all', label: 'Toutes', count: filtreCounts.all },
          { key: 'unread', label: 'Non lues', count: filtreCounts.unread },
          { key: 'urgent', label: 'À traiter', count: filtreCounts.urgent },
        ]}
      />

      {visibles.length === 0 ? (
        <DashEmptyState
          icon={Bell}
          title={filtresActifs ? 'Aucune notification pour ces filtres' : filter === 'unread' ? 'Aucune notification non lue' : filter === 'urgent' ? 'Rien à traiter' : 'Aucune notification'}
          action={filtresActifs ? (
            <Button variant="outline" className="rounded-full" onClick={() => { setTheme('all'); setQ(''); }}>Réinitialiser les filtres</Button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-6">
          {aTraiter.length > 0 && (
            <section className="space-y-3" aria-label="À traiter maintenant">
              <h2 className="flex items-center gap-2 px-0.5 text-base font-semibold text-foreground">
                À traiter maintenant
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">{aTraiter.length}</span>
              </h2>
              <div className="space-y-3">{aTraiter.map(carte)}</div>
            </section>
          )}

          {GROUPES_JOUR.filter((g) => parJour[g.key].length > 0).map((g) => (
            <section key={g.key} className="space-y-3" aria-label={g.label}>
              <h2 className="px-0.5 text-sm font-semibold text-muted-foreground">
                {aTraiter.length > 0 ? `Informations · ${g.label}` : g.label}
              </h2>
              <div className="space-y-3">{parJour[g.key].map(carte)}</div>
            </section>
          ))}
        </div>
      )}
    </DashPage>
  );
}

export default NotificationsPage;

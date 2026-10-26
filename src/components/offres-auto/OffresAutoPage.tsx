import { lazy, Suspense, useEffect, useMemo, useState, type ElementType } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle, CalendarCheck, CalendarDays, CalendarRange, ChevronDown, Inbox, Loader2, MapPin, RefreshCw, Search, ThumbsDown, ThumbsUp, X,
} from 'lucide-react';
import { DASH_CARD, DashEmptyState, DashFilterPills, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { TablePagination, type PageSize } from '@/components/offres-auto/TablePagination';
import { fetchAllPaginated } from '@/lib/fetchAllWithRange';
import { addressIlikePatterns, addressWords, matchesAddress } from '@/lib/addressFilter';
import { cn } from '@/lib/utils';
import { OffreGroupeCard } from './OffreGroupeCard';
import {
  ETAPES_ORDRE, ONGLETS, SOURCES, groupeCle, grouper, offrePrioritaire, sourceDe,
  type ClientInfo, type Etape, type Groupe, type Row, type Source, type TabKey,
} from './offresAutoModel';

const GererOffreDialog = lazy(() => import('@/components/offres-auto/GererOffreDialog').then((m) => ({ default: m.GererOffreDialog })));

const SELECT = 'id, created_at, adresse, prix, pieces, statut, commentaires, lien_annonce, client_id, agent_id, needs_agent_action, missing_info, visites(id, date_visite, date_visite_fin, statut, est_deleguee, client_decision, client_confirme_visite_at)';

const STATUT_FILTRE: Record<string, string> = { envoyee: 'Envoyée', interesse: 'Intéressé', souhaite_postuler: 'Souhaite postuler', refuse: 'Refusé' };

type Stats = { today: number; last7: number; interesses: number; refuses: number; visites: number; aCompleter: number };
type SortKey = 'urgence' | 'recent' | 'oldest';
type Ouvrir = (groupe: Row[], offre: Row) => void;

/* ------------------------------------------------------------------ */
/* Données admin : regroupement et pagination côté serveur (RPC)       */
/* ------------------------------------------------------------------ */
function useAdminOffresAuto(p: {
  enabled: boolean; statut: string; debouncedQ: string; dateFrom: string; dateTo: string;
  manual: boolean; page: number; pageSize: PageSize; ouvrir: Ouvrir; adresse: string;
}) {
  const { enabled, statut, debouncedQ, dateFrom, dateTo, manual, page, pageSize, ouvrir, adresse } = p;
  const [loading, setLoading] = useState(false);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [totalAll, setTotalAll] = useState(0);
  const [totalManual, setTotalManual] = useState(0);
  const [stats, setStats] = useState<Stats>({ today: 0, last7: 0, interesses: 0, refuses: 0, visites: 0, aCompleter: 0 });
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link: ?offre=<id> (ou ?offreId=<id>) -> ouvre l'offre à traiter (chargée individuellement)
  useEffect(() => {
    if (!enabled) return;
    const offreId = searchParams.get('offre') || searchParams.get('offreId');
    if (!offreId) return;
    (async () => {
      const { data } = await supabase.from('offres').select(SELECT).eq('id', offreId).maybeSingle();
      if (data) {
        const [e] = await enrich([data as unknown as Row]);
        // Toute l'annonce : les autres clients qui ont reçu le même bien
        let sib: any = supabase.from('offres').select(SELECT).eq('envoi_auto', true);
        sib = e.lien_annonce ? sib.eq('lien_annonce', e.lien_annonce) : sib.eq('adresse', e.adresse ?? '');
        const { data: sibs } = await sib.limit(100);
        const groupe = await enrich(((sibs ?? []) as unknown as Row[]));
        ouvrir(groupe.length ? groupe : [e], e);
      }
      const next = new URLSearchParams(searchParams);
      next.delete('offre'); next.delete('offreId');
      setSearchParams(next, { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, searchParams, setSearchParams]);

  async function enrich(offres: Row[]): Promise<Row[]> {
    const clientIds = Array.from(new Set(offres.map((o) => o.client_id).filter(Boolean)));
    if (clientIds.length === 0) return offres;
    const { data: clientsData } = await supabase.from('clients').select('id, user_id').in('id', clientIds);
    const userIds = Array.from(new Set((clientsData ?? []).map((c) => c.user_id).filter(Boolean))) as string[];
    const clientToUser = new Map<string, string>((clientsData ?? []).map((c) => [c.id, c.user_id as string]));
    let profileByUser = new Map<string, ClientInfo>();
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase.from('profiles').select('id, prenom, nom, email').in('id', userIds);
      profileByUser = new Map((profilesData ?? []).map((pr: any) => [pr.id as string, { prenom: pr.prenom, nom: pr.nom, email: pr.email }]));
    }
    return offres.map((o) => ({ ...o, _client: profileByUser.get(clientToUser.get(o.client_id) ?? '') ?? {} }));
  }

  // Résout la recherche client (nom/email) en liste de client_id côté serveur
  async function resolveClientIds(q: string): Promise<string[] | null> {
    if (!q) return null;
    const safe = q.replace(/[%,()]/g, ' ');
    const { data: profs } = await supabase.from('profiles').select('id')
      .or(`prenom.ilike.%${safe}%,nom.ilike.%${safe}%,email.ilike.%${safe}%`).limit(500);
    const uids = (profs ?? []).map((pr: any) => pr.id);
    if (uids.length === 0) return [];
    const { data: cls } = await supabase.from('clients').select('id').in('user_id', uids).limit(1000);
    return (cls ?? []).map((c: any) => c.id);
  }

  function applyFilters<T>(q: T, clientIds: string[] | null, withStatut = true): T {
    let x: any = (q as any).eq('envoi_auto', true);
    if (dateFrom) x = x.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) { const to = new Date(dateTo); to.setHours(23, 59, 59, 999); x = x.lte('created_at', to.toISOString()); }
    if (withStatut && statut !== 'all') x = x.eq('statut', statut);
    if (clientIds) x = x.in('client_id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000']);
    return x;
  }

  /**
   * Recherche par adresse : toutes les offres automatiques de cette adresse, toutes dates confondues,
   * regroupées par annonce ici (même règle que l'agent), puis filtres statut / client / « à gérer » et pagination.
   */
  async function loadParAdresse(mots: string[], clientIds: string[] | null) {
    let q: any = supabase.from('offres').select(SELECT).eq('envoi_auto', true);
    for (const motif of addressIlikePatterns(mots)) q = q.ilike('adresse', motif);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(1000);
    if (error) { console.error('[OffresAuto] recherche par adresse', error); setGroupes([]); setTotalAll(0); setTotalManual(0); return; }
    const offres = ((data ?? []) as Row[]).filter((o) => matchesAddress(o.adresse, mots));
    const tous = grouper(await enrich(offres)).filter((g) =>
      (statut === 'all' || g.offres.some((o) => o.statut === statut))
      && (!clientIds || g.offres.some((o) => !!o.client_id && clientIds.includes(o.client_id))));
    const aGerer = tous.filter((g) => g.besoinAction);
    setTotalAll(tous.length);
    setTotalManual(aGerer.length);
    const from = (page - 1) * pageSize;
    setGroupes((manual ? aGerer : tous).slice(from, from + pageSize));
  }

  async function load() {
    if (!enabled) return;
    setLoading(true);
    try {
      const clientIds = await resolveClientIds(debouncedQ);
      const mots = addressWords(adresse);
      if (mots.length) { await loadParAdresse(mots, clientIds); return; }
      const from = (page - 1) * pageSize;
      const to = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); return d.toISOString(); })() : null;
      const args = {
        p_date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
        p_date_to: to,
        p_statut: statut !== 'all' ? statut : null,
        p_client_ids: clientIds ? (clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000']) : null,
        p_offset: from,
        p_limit: pageSize,
      };
      // Une ligne = une annonce, avec tous les clients qui l'ont reçue
      const [main, other] = await Promise.all([
        (supabase as any).rpc('offres_auto_groupes', { ...args, p_manual: manual }),
        (supabase as any).rpc('offres_auto_groupes', { ...args, p_manual: !manual, p_offset: 0, p_limit: 1 }),
      ]);
      if (main.error) { console.error('[OffresAuto] load groupes', main.error); setGroupes([]); return; }
      const data = (main.data ?? []) as any[];
      const total = Number(data[0]?.total ?? 0);
      const otherTotal = Number((other.data ?? [])[0]?.total ?? 0);
      if (manual) { setTotalManual(total); setTotalAll(otherTotal); }
      else { setTotalAll(total); setTotalManual(otherTotal); }
      const allOffres = data.flatMap((g: any) => (g.offres ?? []) as Row[]);
      const enriched = await enrich(allOffres);
      const byId = new Map(enriched.map((o) => [o.id, o]));
      setGroupes(data.map((g: any) => ({
        cle: g.groupe_cle,
        derniere: g.derniere_creation,
        besoinAction: !!g.besoin_action,
        offres: ((g.offres ?? []) as Row[]).map((o) => byId.get(o.id) ?? o),
      })));
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    if (!enabled) return;
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const start7 = new Date(now); start7.setDate(now.getDate() - 7);
    const base = () => applyFilters(supabase.from('offres').select('id', { count: 'exact', head: true }) as any, null, false) as any;
    const res = await Promise.all([
      base().gte('created_at', startToday.toISOString()),
      base().gte('created_at', start7.toISOString()),
      base().eq('statut', 'interesse'),
      base().in('statut', ['refuse', 'refusee']),
      applyFilters(supabase.from('offres').select('id, visites!inner(id)', { count: 'exact', head: true }) as any, null, false).not('visites.date_visite', 'is', null),
      base().eq('needs_agent_action', true),
    ]);
    const [today, last7, interesses, refuses, visites, aCompleter] = res.map((r: any) => r.count ?? 0);
    setStats({ today, last7, interesses, refuses, visites, aCompleter });
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [enabled, page, pageSize, statut, debouncedQ, dateFrom, dateTo, manual, adresse]);
  useEffect(() => { loadStats(); /* eslint-disable-next-line */ }, [enabled, dateFrom, dateTo]);

  return { loading, groupes, totalAll, totalManual, stats, load, refresh: () => { load(); loadStats(); } };
}

/* ------------------------------------------------------------------ */
/* Données agent : offres auto de ses clients (principal + co-agent)   */
/* ------------------------------------------------------------------ */
function useAgentOffresAuto(p: { enabled: boolean; dateFrom: string; dateTo: string; ouvrir: Ouvrir }) {
  const { enabled, dateFrom, dateTo, ouvrir } = p;
  const { user } = useAuth();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link: ?offre=<id> (ou ?offreId=<id>) -> ouvre l'offre à traiter
  useEffect(() => {
    if (!enabled) return;
    const offreId = searchParams.get('offre') || searchParams.get('offreId');
    if (!offreId || rows.length === 0) return;
    const target = rows.find((r) => r.id === offreId);
    if (!target) return;
    const cle = groupeCle(target);
    ouvrir(rows.filter((r) => groupeCle(r) === cle), target);
    const next = new URLSearchParams(searchParams);
    next.delete('offre');
    next.delete('offreId');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rows, searchParams, setSearchParams]);

  async function load() {
    if (!enabled || !user) return;
    setLoading(true);
    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!agentData) { setRows([]); return; }
      setAgentId(agentData.id);

      // Collect all client_ids assigned to this agent (principal + co)
      const [{ data: ownClients }, { data: coAssignments }] = await Promise.all([
        supabase.from('clients').select('id').eq('agent_id', agentData.id),
        supabase.from('client_agents').select('client_id').eq('agent_id', agentData.id),
      ]);
      const clientIds = Array.from(new Set([
        ...(ownClients ?? []).map((c: any) => c.id),
        ...(coAssignments ?? []).map((c: any) => c.client_id),
      ]));
      if (clientIds.length === 0) { setRows([]); return; }

      const { data, error } = await fetchAllPaginated<Row>(() => {
        let q = supabase
          .from('offres')
          .select('id, created_at, adresse, prix, pieces, statut, commentaires, lien_annonce, client_id, agent_id, needs_agent_action, missing_info, visites(id, date_visite, date_visite_fin, statut, est_deleguee, client_decision, client_confirme_visite_at)')
          .eq('envoi_auto', true)
          .in('client_id', clientIds)
          .order('created_at', { ascending: false });
        if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString());
        if (dateTo) {
          const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
          q = q.lte('created_at', to.toISOString());
        }
        return q;
      });
      if (error) { console.error('[Agent/OffresAuto] load', error); setRows([]); return; }

      const offres = (data ?? []) as Row[];
      const offreClientIds = Array.from(new Set(offres.map((o) => o.client_id).filter(Boolean)));
      if (offreClientIds.length === 0) { setRows(offres); return; }

      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, user_id')
        .in('id', offreClientIds);
      const userIds = Array.from(new Set((clientsData ?? []).map((c) => c.user_id).filter(Boolean)));
      const clientToUser = new Map<string, string>((clientsData ?? []).map((c) => [c.id, c.user_id as string]));

      let profileByUser = new Map<string, ClientInfo>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, prenom, nom, email')
          .in('id', userIds);
        profileByUser = new Map((profilesData ?? []).map((pr: any) => [pr.id as string, { prenom: pr.prenom, nom: pr.nom, email: pr.email }]));
      }

      setRows(offres.map((o) => ({
        ...o,
        _client: profileByUser.get(clientToUser.get(o.client_id) ?? '') ?? {},
      })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [enabled, user?.id, dateFrom, dateTo]);

  const stats = useMemo<Stats>(() => {
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const start7 = new Date(now); start7.setDate(now.getDate() - 7);
    const today = rows.filter((r) => new Date(r.created_at) >= startToday);
    const last7 = rows.filter((r) => new Date(r.created_at) >= start7);
    const interesses = rows.filter((r) => r.statut === 'interesse').length;
    const refuses = rows.filter((r) => r.statut === 'refuse' || r.statut === 'refusee').length;
    const visites = rows.filter((r) => (r.visites ?? []).some((v) => v.date_visite)).length;
    const aCompleter = rows.filter((r) => r.needs_agent_action).length;
    return { today: today.length, last7: last7.length, interesses, refuses, visites, aCompleter };
  }, [rows]);

  return { loading, rows, agentId, stats, load };
}

/* ------------------------------------------------------------------ */
/* Page partagée                                                        */
/* ------------------------------------------------------------------ */
function StatMini({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: number; tone?: 'success' | 'danger' | 'warning' }) {
  const pill = tone === 'success' ? 'bg-emerald-500/10 text-emerald-600'
    : tone === 'danger' ? 'bg-destructive/10 text-destructive'
    : tone === 'warning' ? 'bg-amber-500/10 text-amber-600'
    : 'bg-primary/10 text-primary';
  return (
    <div className={cn(DASH_CARD, 'flex items-center gap-3 p-3')}>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', pill)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold leading-tight text-foreground">{value}</span>
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

interface Props {
  scope: 'admin' | 'agent';
}

/**
 * Suivi des offres automatiques — une file de travail par étape de la vie d'une offre :
 * À gérer (le staff doit agir) → En attente de l'annonceur → Visite fixée → Sans réponse du client → Clôturées.
 * Une carte = une annonce (tous les clients qui l'ont reçue), avec UNE prochaine action.
 * Admin : toutes les offres, regroupées et paginées côté serveur. Agent : les offres de ses clients.
 */
export function OffresAutoPage({ scope }: Props) {
  const isAdmin = scope === 'admin';
  const [statut, setStatut] = useState<string>('all');
  const [clientQ, setClientQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  // Filtre par adresse (sans accents, mots dans n'importe quel ordre ; admin : toutes dates confondues).
  const [adresseQ, setAdresseQ] = useState('');
  const [debouncedAdresse, setDebouncedAdresse] = useState('');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    if (!isAdmin) return '';
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>('');
  const [tab, setTab] = useState<TabKey>('a_gerer');
  const [source, setSource] = useState<Source | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('urgence');
  const [plusDeFiltres, setPlusDeFiltres] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(50);
  const [editing, setEditing] = useState<Row | null>(null);
  const [editingGroupe, setEditingGroupe] = useState<Row[] | null>(null);
  const ouvrir: Ouvrir = (groupe, offre) => { setEditingGroupe(groupe); setEditing(offre); };

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(clientQ.trim()), 300); return () => clearTimeout(t); }, [clientQ]);
  useEffect(() => { const t = setTimeout(() => setDebouncedAdresse(adresseQ.trim()), 300); return () => clearTimeout(t); }, [adresseQ]);

  const admin = useAdminOffresAuto({
    enabled: isAdmin, statut, debouncedQ, dateFrom, dateTo, manual: tab === 'a_gerer', page, pageSize, ouvrir, adresse: debouncedAdresse,
  });
  const agent = useAgentOffresAuto({ enabled: !isAdmin, dateFrom, dateTo, ouvrir });

  // Agent : filtres statut et client appliqués aux offres chargées, puis regroupement par annonce.
  const agentGroupes = useMemo(() => {
    if (isAdmin) return [] as Groupe[];
    const mots = addressWords(debouncedAdresse);
    const filtered = agent.rows.filter((r) => {
      if (!matchesAddress(r.adresse, mots)) return false;
      if (statut !== 'all' && (r.statut ?? '') !== statut) return false;
      if (clientQ) {
        const q = clientQ.toLowerCase();
        const name = `${r._client?.prenom ?? ''} ${r._client?.nom ?? ''} ${r._client?.email ?? ''}`.toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
    return grouper(filtered);
  }, [isAdmin, agent.rows, statut, clientQ, debouncedAdresse]);

  const loading = isAdmin ? admin.loading : agent.loading;
  const stats = isAdmin ? admin.stats : agent.stats;
  const groupesCharges = isAdmin ? admin.groupes : agentGroupes;

  // Source (portail) : filtre visuel sur les annonces chargées ; les compteurs suivent.
  const annotees = useMemo(() => groupesCharges
    .filter((g) => source === 'all' || sourceDe(g.offres[0]?.lien_annonce) === source)
    .map((g) => ({ g, prio: offrePrioritaire(g) }))
    .filter((x): x is { g: Groupe; prio: NonNullable<ReturnType<typeof offrePrioritaire>> } => !!x.prio),
  [groupesCharges, source]);

  const parEtape = useMemo(() => {
    const m: Record<Etape, typeof annotees> = { a_gerer: [], attente_annonceur: [], visite: [], sans_reponse: [], cloturees: [] };
    for (const x of annotees) m[x.prio.next.etape].push(x);
    return m;
  }, [annotees]);

  // Admin : l'onglet « À gérer » est servi tel quel par le serveur (offres marquées « action requise »).
  const liste = useMemo(() => {
    const base = tab === 'toutes' || (isAdmin && tab === 'a_gerer') ? annotees : parEtape[tab];
    const arr = [...base];
    const t = (x: (typeof annotees)[number]) => new Date(x.g.derniere).getTime();
    if (sortKey === 'urgence') {
      arr.sort((a, b) =>
        ETAPES_ORDRE.indexOf(a.prio.next.etape) - ETAPES_ORDRE.indexOf(b.prio.next.etape)
        || Number(b.prio.next.enRetard) - Number(a.prio.next.enRetard)
        || t(a) - t(b));
    } else {
      arr.sort((a, b) => (sortKey === 'recent' ? t(b) - t(a) : t(a) - t(b)));
    }
    return arr;
  }, [annotees, parEtape, tab, sortKey, isAdmin]);

  useEffect(() => { setPage(1); }, [statut, debouncedQ, debouncedAdresse, dateFrom, dateTo, pageSize, tab, source, sortKey]);

  const counts: Record<TabKey, number | undefined> = useMemo(() => {
    const local = {
      a_gerer: parEtape.a_gerer.length,
      attente_annonceur: parEtape.attente_annonceur.length,
      visite: parEtape.visite.length,
      sans_reponse: parEtape.sans_reponse.length,
      cloturees: parEtape.cloturees.length,
      toutes: annotees.length,
    };
    if (!isAdmin) return local;
    // Admin : seuls « À gérer » et « Toutes » ont un total serveur ; les autres étapes sont
    // calculées sur la page d'annonces chargée (inconnues quand la page chargée est « À gérer »).
    const surPageToutes = tab !== 'a_gerer';
    return {
      a_gerer: source === 'all' ? admin.totalManual : (tab === 'a_gerer' ? annotees.length : undefined),
      attente_annonceur: surPageToutes ? local.attente_annonceur : undefined,
      visite: surPageToutes ? local.visite : undefined,
      sans_reponse: surPageToutes ? local.sans_reponse : undefined,
      cloturees: surPageToutes ? local.cloturees : undefined,
      toutes: source === 'all' ? admin.totalAll : (surPageToutes ? annotees.length : undefined),
    };
  }, [isAdmin, parEtape, annotees, tab, source, admin.totalManual, admin.totalAll]);

  const paged = isAdmin ? liste : liste.slice((page - 1) * pageSize, page * pageSize);
  const totalPagination = isAdmin ? (tab === 'a_gerer' ? admin.totalManual : admin.totalAll) : liste.length;

  const aGerer = counts.a_gerer ?? 0;
  const enRetard = annotees.filter((x) => x.prio.next.enRetard && x.prio.next.etape !== 'cloturees').length;
  const filtresActifs = !!clientQ || !!adresseQ || statut !== 'all' || source !== 'all' || !!dateTo || (!isAdmin && !!dateFrom);

  const refresh = () => { if (isAdmin) admin.refresh(); else agent.load(); };
  const onSaved = () => { if (isAdmin) admin.load(); else agent.load(); };

  const titreVide =
    filtresActifs ? 'Aucun résultat pour ces filtres'
      : tab === 'a_gerer' ? 'Rien à gérer pour le moment'
      : tab === 'attente_annonceur' ? 'Aucune annonce en attente de l’annonceur'
      : tab === 'visite' ? 'Aucune visite fixée'
      : tab === 'sans_reponse' ? 'Aucune offre sans réponse du client'
      : tab === 'cloturees' ? 'Aucune offre clôturée'
      : 'Aucune offre.';

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Offres automatiques"
        subtitle={
          loading && groupesCharges.length === 0
            ? 'Chargement…'
            : aGerer === 0
              ? (isAdmin ? 'Tout est à jour : aucune offre à gérer manuellement.' : 'Tout est à jour pour vos clients : aucune offre à gérer.')
              : `${aGerer} annonce${aGerer > 1 ? 's' : ''} à gérer${enRetard > 0 ? ` · ${enRetard} en retard` : ''}${isAdmin ? '' : ' · vos clients'}`
        }
        action={
          <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={refresh} disabled={loading} aria-label="Actualiser">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Actualiser</span>
          </Button>
        }
      />

      {/* Barre d'outils : recherche pleine largeur, tri et source côte à côte, filtres secondaires repliables */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={clientQ}
              onChange={(e) => setClientQ(e.target.value)}
              placeholder="Client (nom ou e-mail)…"
              aria-label="Rechercher un client"
              className="h-11 rounded-full pl-10 pr-10"
            />
            {clientQ && (
              <button type="button" onClick={() => setClientQ('')} aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="relative min-w-0 md:w-[260px]">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={adresseQ}
              onChange={(e) => setAdresseQ(e.target.value)}
              placeholder={isAdmin ? 'Adresse (toutes dates)…' : 'Adresse du bien…'}
              aria-label="Filtrer par adresse"
              className="h-11 rounded-full pl-10 pr-10"
            />
            {adresseQ && (
              <button type="button" onClick={() => setAdresseQ('')} aria-label="Effacer l'adresse"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:w-auto">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-11 rounded-full md:w-[170px]" aria-label="Trier"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="urgence">Urgent d’abord</SelectItem>
                <SelectItem value="recent">Plus récentes</SelectItem>
                <SelectItem value="oldest">Plus anciennes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={(v) => setSource(v as Source | 'all')}>
              <SelectTrigger className="h-11 rounded-full md:w-[180px]" aria-label="Source"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            className="h-11 rounded-full md:w-auto"
            onClick={() => setPlusDeFiltres((v) => !v)}
            aria-expanded={plusDeFiltres}
          >
            <ChevronDown className={cn('mr-1.5 h-4 w-4 transition-transform', plusDeFiltres && 'rotate-180')} />
            Statut et période
          </Button>
        </div>
        {plusDeFiltres && (
          <div className={cn(DASH_CARD, 'grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 md:p-5')}>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger className="h-11 rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="envoyee">Envoyée</SelectItem>
                  <SelectItem value="interesse">Intéressé</SelectItem>
                  <SelectItem value="souhaite_postuler">Souhaite postuler</SelectItem>
                  <SelectItem value="refuse">Refusé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Du</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-11 rounded-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Au</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-11 rounded-full" />
            </div>
          </div>
        )}
        {!plusDeFiltres && (statut !== 'all' || dateFrom || dateTo) && (
          <p className="px-1 text-xs text-muted-foreground">
            {[
              statut !== 'all' ? `Statut : ${STATUT_FILTRE[statut] ?? statut}` : null,
              dateFrom ? `du ${new Date(dateFrom).toLocaleDateString('fr-CH')}` : null,
              dateTo ? `au ${new Date(dateTo).toLocaleDateString('fr-CH')}` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <DashFilterPills
        label="Étapes des offres automatiques"
        value={tab}
        onChange={(v) => setTab(v as TabKey)}
        options={ONGLETS.map((o) => ({ key: o.key, label: o.label, count: counts[o.key] }))}
      />

      {isAdmin && tab !== 'a_gerer' && tab !== 'toutes' && (
        <p className="-mt-3 px-1 text-xs text-muted-foreground">
          Étape calculée sur les annonces de la page {page} ({groupesCharges.length} sur {admin.totalAll}). Changez de page ou resserrez la période pour voir les autres.
        </p>
      )}

      {loading && groupesCharges.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : paged.length === 0 ? (
        <DashEmptyState
          icon={Inbox}
          title={titreVide}
          description={tab === 'a_gerer' && !filtresActifs ? 'Les offres qui demandent un appel ou des informations manquantes arrivent ici.' : undefined}
        />
      ) : (
        <div className={cn('space-y-3', loading ? 'opacity-60 transition-opacity' : 'transition-opacity')} aria-busy={loading}>
          {paged.map((x) => <OffreGroupeCard key={x.g.cle} g={x.g} onEdit={ouvrir} />)}
        </div>
      )}

      {totalPagination > 0 && (
        <TablePagination
          total={totalPagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="annonces"
        />
      )}

      <section aria-label="Chiffres de la période" className="space-y-2">
        <h2 className="px-0.5 text-sm font-semibold text-muted-foreground">Chiffres de la période</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <StatMini icon={CalendarDays} label="Aujourd'hui" value={stats.today} />
          <StatMini icon={CalendarRange} label="7 derniers jours" value={stats.last7} />
          <StatMini icon={ThumbsUp} label="Intéressés" value={stats.interesses} tone="success" />
          <StatMini icon={ThumbsDown} label="Refusés" value={stats.refuses} tone="danger" />
          <StatMini icon={CalendarCheck} label="Visites planifiées" value={stats.visites} />
          <StatMini icon={AlertTriangle} label="À compléter" value={stats.aCompleter} tone="warning" />
        </div>
      </section>

      {editing && (
        <Suspense fallback={null}>
          <GererOffreDialog
            offre={editing as any}
            groupe={(editingGroupe ?? [editing]) as any}
            open
            onOpenChange={(v) => { if (!v) { setEditing(null); setEditingGroupe(null); } }}
            onSaved={onSaved}
            visitAgentIdOverride={isAdmin ? undefined : agent.agentId}
          />
        </Suspense>
      )}
    </DashPage>
  );
}

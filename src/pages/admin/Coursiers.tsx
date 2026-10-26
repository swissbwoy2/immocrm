import { useEffect, useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bike, Users, CheckCircle, Clock, UserPlus, Loader2, Send, Search, Phone, Mail, AlertTriangle, Copy, RefreshCw, X, FileText, Wallet, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { groupVisitesByPhysiqueAgent } from '@/utils/visitesCalculator';
import { computeCoursierTimesheets, fmtZurichTime } from '@/lib/coursierHours';
import { formatDuration } from '@/hooks/useCoursierTime';
import { DASH_CARD, DashBadge, DashEmptyState, DashFilterPills, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { TablePagination, type PageSize } from '@/components/offres-auto/TablePagination';
import { AdminCoursierMissionCard } from '@/components/coursier/AdminCoursierMissionCard';
import { etapeAdmin, finVisite, type EtapeAdmin } from '@/components/coursier/coursierModel';
import { cn } from '@/lib/utils';

type Onglet = EtapeAdmin | 'coursiers';
type SortKey = 'urgence' | 'date_asc' | 'date_desc';

const ONGLETS: { key: Onglet; label: string }[] = [
  { key: 'a_deleguer', label: 'À déléguer' },
  { key: 'sans_coursier', label: 'Sans coursier' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'a_rendre', label: 'Compte-rendu attendu' },
  { key: 'a_payer', label: 'À payer' },
  { key: 'terminees', label: 'Terminées' },
  { key: 'coursiers', label: 'Coursiers' },
];

export default function AdminCoursiers() {
  const [coursiers, setCoursiers] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [eligibleVisites, setEligibleVisites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [delegating, setDelegating] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCoursier, setNewCoursier] = useState({ email: '', prenom: '', nom: '', telephone: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoursier, setSelectedCoursier] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [tarifEdit, setTarifEdit] = useState('');
  const [savingTarif, setSavingTarif] = useState(false);
  const [payingSheet, setPayingSheet] = useState<string | null>(null);
  const [tab, setTab] = useState<Onglet>('a_deleguer');
  const [sortKey, setSortKey] = useState<SortKey>('urgence');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [refreshing, setRefreshing] = useState(false);
  const tabChoisi = useRef(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [{ data: coursiersData }, { data: missionsData }, { data: eligibleData }] = await Promise.all([
        supabase.from('coursiers').select('*, profiles:user_id(prenom, nom, email, telephone)').order('created_at', { ascending: false }),
        supabase.from('visites').select('*, offres(adresse, statut, lien_annonce), agents:agent_id(id, user_id, profiles:user_id(prenom, nom)), coursiers:coursier_id(prenom, nom, profiles:user_id(prenom, nom))').not('statut_coursier', 'is', null).order('updated_at', { ascending: false }).limit(100),
        supabase.from('visites').select('*, offres(adresse, statut), clients!client_id(user_id, profiles:user_id(prenom, nom))').is('statut_coursier', null).in('statut', ['planifiee', 'confirmee', 'proposee']).gte('date_visite', new Date().toISOString()).order('date_visite', { ascending: true }).limit(50),
      ]);
      setCoursiers(coursiersData || []);
      setMissions(missionsData || []);
      setEligibleVisites(eligibleData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  /** Délègue TOUTES les lignes visites du groupe (une par client) en une fois */
  const handleDelegateGroup = async (groupKey: string, ids: string[]) => {
    setDelegating(groupKey);
    try {
      const { error } = await supabase
        .from('visites')
        .update({ statut_coursier: 'en_attente', est_deleguee: true })
        .in('id', ids);
      if (error) throw error;
      toast.success(`Visite envoyée dans le pool coursier (${ids.length} client${ids.length > 1 ? 's' : ''})`);
      loadData();
    } catch (error) {
      console.error('Error delegating:', error);
      toast.error('Erreur lors de la délégation');
    } finally {
      setDelegating(null);
    }
  };


  const handleCreateCoursier = async () => {
    if (!newCoursier.email || !newCoursier.prenom) {
      toast.error('Email et prénom requis');
      return;
    }
    setCreating(true);
    try {
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('create-coursier', {
        body: {
          email: newCoursier.email,
          prenom: newCoursier.prenom,
          nom: newCoursier.nom,
          telephone: newCoursier.telephone,
        },
      });

      if (inviteError) throw inviteError;
      if (inviteData?.error) throw new Error(inviteData.error);
      
      toast.success(`Coursier ${newCoursier.prenom} invité avec succès`);
      setCreateOpen(false);
      setNewCoursier({ email: '', prenom: '', nom: '', telephone: '' });
      loadData();
    } catch (error: any) {
      console.error('Error creating coursier:', error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleMarkPaidGroup = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('visites')
        .update({ paye_coursier: true })
        .in('id', ids);
      if (error) throw error;
      toast.success('Visite marquée comme payée');
      await loadData();
      if (selectedCoursier) {
        setSelectedCoursier((prev: any) => prev ? { ...prev } : prev);
      }
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handlePaySheet = async (sheetKey: string, ids: string[]) => {
    setPayingSheet(sheetKey);
    try {
      await handleMarkPaidGroup(ids);
    } finally {
      setPayingSheet(null);
    }
  };

  const handleSaveTarif = async () => {
    if (!selectedCoursier) return;
    const value = parseFloat(tarifEdit);
    if (isNaN(value) || value <= 0) {
      toast.error('Tarif invalide');
      return;
    }
    setSavingTarif(true);
    try {
      const { error } = await supabase
        .from('coursiers')
        .update({ tarif_horaire: value })
        .eq('id', selectedCoursier.id);
      if (error) throw error;
      toast.success('Tarif horaire mis à jour');
      await loadData();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    } finally {
      setSavingTarif(false);
    }
  };

  const handleMarkAllPaidForAgent = async (agentId: string) => {
    const ids = unpaidMissions.filter(m => (m.agent_id || 'unknown') === agentId).map(m => m.id);
    const groupCount = unpaidGroups.filter(g => ((g.representative as any).agent_id || 'unknown') === agentId).length;
    try {
      const { error } = await supabase.from('visites').update({ paye_coursier: true }).in('id', ids);
      if (error) throw error;
      toast.success(`${groupCount} visite(s) marquée(s) comme payée(s)`);
      loadData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const clientsCountOf = (items: any[]) =>
    new Set(items.filter((v: any) => v.client_id).map((v: any) => v.client_id)).size || items.length;

  const unpaidMissions = missions.filter(m => m.statut_coursier === 'termine' && !m.paye_coursier);

  /** Missions regroupées par visite physique (adresse + date/heure + agent) */
  const missionGroups = useMemo(() => groupVisitesByPhysiqueAgent(missions as any[]), [missions]);
  const pendingGroups = useMemo(() => missionGroups.filter(g => (g.representative as any).statut_coursier === 'en_attente'), [missionGroups]);
  const activeGroups = useMemo(() => missionGroups.filter(g => (g.representative as any).statut_coursier === 'accepte'), [missionGroups]);
  const completedGroups = useMemo(() => missionGroups.filter(g => (g.representative as any).statut_coursier === 'termine'), [missionGroups]);
  const unpaidGroups = useMemo(
    () => completedGroups.filter(g => g.items.some((m: any) => !m.paye_coursier)),
    [completedGroups],
  );
  const totalUnpaid = unpaidMissions.reduce((sum, m) => sum + (m.remuneration_coursier || 0), 0);

  // Group unpaid visits (physical) by agent
  const unpaidByAgent = useMemo(() => {
    return unpaidGroups.reduce((acc: Record<string, { name: string; count: number; total: number; clients: number; groups: any[] }>, g) => {
      const rep: any = g.representative;
      const agentId = rep.agent_id || 'unknown';
      const agentName = rep.agents?.profiles?.prenom
        ? `${rep.agents.profiles.prenom} ${rep.agents.profiles.nom || ''}`.trim()
        : 'Agent inconnu';
      if (!acc[agentId]) acc[agentId] = { name: agentName, count: 0, total: 0, clients: 0, groups: [] };
      acc[agentId].count += 1;
      acc[agentId].clients += clientsCountOf(g.items);
      acc[agentId].total += g.items.reduce((s: number, m: any) => s + (m.paye_coursier ? 0 : (m.remuneration_coursier || 0)), 0);
      acc[agentId].groups.push(g);
      return acc;
    }, {});
  }, [unpaidGroups]);
  const agentBalances = Object.entries(unpaidByAgent);

  // Coursier stats (basés sur les visites physiques)
  const coursierStats = useMemo(() => {
    return coursiers.map(c => {
      const cGroups = missionGroups.filter(g => (g.representative as any).coursier_id === c.id);
      const completed = cGroups.filter(g => (g.representative as any).statut_coursier === 'termine');
      const active = cGroups.filter(g => (g.representative as any).statut_coursier === 'accepte');
      const sum = (gs: any[], onlyUnpaid = false) =>
        gs.reduce((s, g) => s + g.items.reduce((s2: number, m: any) => s2 + ((onlyUnpaid && m.paye_coursier) ? 0 : (m.remuneration_coursier || 0)), 0), 0);
      const _sheets = computeCoursierTimesheets(missions.filter((m: any) => m.coursier_id === c.id)); return { ...c, completedCount: completed.length, activeCount: active.length, earnings: _sheets.reduce((s, d) => s + d.amount, 0), unpaid: _sheets.filter(d => !d.allPaid).reduce((s, d) => s + d.amount, 0), sheets: _sheets };
    });
  }, [coursiers, missionGroups]);

  // Resynchronise le coursier sélectionné après un rechargement (paiement, tarif…)
  useEffect(() => {
    if (!detailOpen || !selectedCoursier) return;
    const fresh = coursierStats.find(c => c.id === selectedCoursier.id);
    if (fresh && fresh !== selectedCoursier) {
      setSelectedCoursier(fresh);
      setTarifEdit(String(fresh.tarif_horaire ?? 20));
    }
  }, [coursierStats, detailOpen]);

  const filteredEligible = eligibleVisites.filter(v => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (v.adresse || '').toLowerCase().includes(q) || 
           (v.offres?.adresse || '').toLowerCase().includes(q) ||
           (v.clients?.profiles?.prenom || '').toLowerCase().includes(q) ||
           (v.clients?.profiles?.nom || '').toLowerCase().includes(q);
  });

  /** Visites éligibles regroupées par visite physique */
  const eligibleGroups = useMemo(() => groupVisitesByPhysiqueAgent(eligibleVisites as any[]), [eligibleVisites]);
  const filteredEligibleGroups = useMemo(
    () => groupVisitesByPhysiqueAgent(filteredEligible as any[]),
    [filteredEligible],
  );


  const getCoursierName = (c: any) => {
    return `${c.profiles?.prenom || c.prenom || ''} ${c.profiles?.nom || c.nom || ''}`.trim() || 'Coursier';
  };

  const getCoursierInitials = (c: any) => {
    const prenom = c.profiles?.prenom || c.prenom || '';
    const nom = c.profiles?.nom || c.nom || '';
    return `${prenom[0] || ''}${nom[0] || ''}`.toUpperCase();
  };

  const getMissionCoursierName = (m: any) => {
    if (m.coursiers?.profiles?.prenom) return `${m.coursiers.profiles.prenom} ${m.coursiers.profiles.nom || ''}`.trim();
    if (m.coursiers?.prenom) return `${m.coursiers.prenom} ${m.coursiers.nom || ''}`.trim();
    const c = coursiers.find(c => c.id === m.coursier_id);
    return c ? getCoursierName(c) : 'Coursier';
  };

  /* ---------- Réorganisation de l'affichage (calculs purement visuels) ---------- */

  const coursierById = useMemo(() => new Map(coursiers.map((c) => [c.id, c])), [coursiers]);
  const contactOf = (coursierId?: string | null) => {
    const c = coursierId ? coursierById.get(coursierId) : null;
    return c ? { tel: c.profiles?.telephone || c.telephone || null, email: c.profiles?.email || c.email || null } : undefined;
  };

  const q = searchQuery.trim().toLowerCase();
  const missionCorrespond = (g: any) => {
    if (!q) return true;
    const m: any = g.representative;
    const txt = [
      m.adresse, m.offres?.adresse, m.agents?.profiles?.prenom, m.agents?.profiles?.nom,
      m.coursier_id ? getMissionCoursierName(m) : '',
    ].join(' ').toLowerCase();
    return txt.includes(q);
  };

  const parEtape = useMemo(() => {
    const now = Date.now();
    const r: Record<EtapeAdmin, any[]> = { a_deleguer: filteredEligibleGroups, sans_coursier: [], en_cours: [], a_rendre: [], a_payer: [], terminees: [] };
    for (const g of missionGroups) {
      if (!missionCorrespond(g)) continue;
      r[etapeAdmin(g.representative as any, g.items as any[], now)].push(g);
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionGroups, filteredEligibleGroups, q, coursiers]);

  const coursiersVisibles = useMemo(() => coursierStats.filter((c) => {
    if (!q) return true;
    return `${getCoursierName(c)} ${c.profiles?.email || c.email || ''} ${c.profiles?.telephone || c.telephone || ''}`.toLowerCase().includes(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [coursierStats, q]);

  const counts: Record<Onglet, number> = {
    a_deleguer: parEtape.a_deleguer.length,
    sans_coursier: parEtape.sans_coursier.length,
    en_cours: parEtape.en_cours.length,
    a_rendre: parEtape.a_rendre.length,
    a_payer: parEtape.a_payer.length,
    terminees: parEtape.terminees.length,
    coursiers: coursiersVisibles.length,
  };

  // Onglet par défaut = la première file qui attend une action de l'admin.
  useEffect(() => {
    if (loading || tabChoisi.current) return;
    tabChoisi.current = true;
    const premier = (['a_deleguer', 'sans_coursier', 'a_rendre', 'a_payer', 'en_cours'] as EtapeAdmin[]).find((k) => parEtape[k].length > 0);
    setTab(premier ?? (missionGroups.length === 0 && eligibleGroups.length === 0 ? 'coursiers' : 'a_deleguer'));
  }, [loading, parEtape, missionGroups.length, eligibleGroups.length]);

  const sorted = useMemo(() => {
    if (tab === 'coursiers') return [];
    const arr = [...parEtape[tab]];
    const t = (g: any) => new Date(g.representative.date_visite).getTime();
    if (sortKey === 'date_desc' || (sortKey === 'urgence' && tab === 'terminees')) arr.sort((a, b) => t(b) - t(a));
    else if (sortKey === 'urgence' && tab === 'a_rendre') arr.sort((a, b) => finVisite(a.representative) - finVisite(b.representative));
    else arr.sort((a, b) => t(a) - t(b));
    return arr;
  }, [parEtape, tab, sortKey]);

  useEffect(() => { setPage(1); }, [searchQuery, tab, sortKey, pageSize]);
  const paged = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const debutJour = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const finJour = debutJour + 24 * 3600 * 1000;

  const refresh = async () => {
    setRefreshing(true);
    try { await loadData(); } finally { setRefreshing(false); }
  };

  const openCoursier = (c: any) => {
    if (!c) return;
    const stats = coursierStats.find((x) => x.id === c.id) ?? c;
    setSelectedCoursier(stats);
    setTarifEdit(String(stats.tarif_horaire ?? 20));
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <DashPage>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-lg bg-muted" />
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-muted" />)}
        </div>
      </DashPage>
    );
  }

  const nbRendre = parEtape.a_rendre.length;
  const subtitle = [
    eligibleGroups.length > 0 ? `${eligibleGroups.length} visite${eligibleGroups.length > 1 ? 's' : ''} à déléguer` : null,
    pendingGroups.length > 0 ? `${pendingGroups.length} sans coursier` : null,
    nbRendre > 0 ? `${nbRendre} compte${nbRendre > 1 ? 's' : ''}-rendu${nbRendre > 1 ? 's' : ''} attendu${nbRendre > 1 ? 's' : ''}` : null,
    totalUnpaid > 0 ? `${totalUnpaid.toFixed(0)} CHF à payer` : null,
  ].filter(Boolean).join(' · ') || `Tout est à jour · ${coursiers.length} coursier${coursiers.length > 1 ? 's' : ''}`;

  const EMPTY: Record<Onglet, { icon: any; title: string; description?: string }> = {
    a_deleguer: { icon: Send, title: searchQuery ? 'Aucune visite trouvée' : 'Aucune visite éligible à la délégation', description: searchQuery ? undefined : 'Les visites planifiées à venir sans coursier apparaissent ici.' },
    sans_coursier: { icon: Clock, title: 'Aucune mission en attente de coursier' },
    en_cours: { icon: Bike, title: 'Aucune mission en cours' },
    a_rendre: { icon: FileText, title: 'Aucun compte-rendu en attente' },
    a_payer: { icon: CheckCircle, title: 'Tous les paiements sont à jour' },
    terminees: { icon: CheckCircle, title: 'Aucune mission terminée et payée' },
    coursiers: { icon: Users, title: 'Aucun coursier enregistré' },
  };

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Gestion des Coursiers"
        subtitle={subtitle}
        action={
          <>
            <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={refresh} disabled={refreshing} aria-label="Actualiser">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Actualiser</span>
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="h-10 rounded-full">
              <UserPlus className="h-4 w-4" />
              <span className="ml-2">Ajouter un coursier</span>
            </Button>
          </>
        }
      />

      {/* Barre d'outils : recherche pleine largeur sur mobile, tri à côté sur grand écran */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Adresse, client, agent, coursier…"
            aria-label="Rechercher une mission ou un coursier"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-11 rounded-full pl-10 pr-10"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {tab !== 'coursiers' && (
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-11 rounded-full md:w-[220px]" aria-label="Trier"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="urgence">Urgent d’abord</SelectItem>
              <SelectItem value="date_asc">Date de visite (proche → lointaine)</SelectItem>
              <SelectItem value="date_desc">Date de visite (récente → ancienne)</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <DashFilterPills
        label="Étapes des missions coursier"
        value={tab}
        onChange={(v) => { tabChoisi.current = true; setTab(v as Onglet); }}
        options={ONGLETS.map((o) => ({ key: o.key, label: o.label, count: counts[o.key] }))}
      />

      {/* À payer : solde par agent au-dessus du détail */}
      {tab === 'a_payer' && agentBalances.length > 0 && (
        <section className={cn(DASH_CARD, 'p-4 md:p-5')} aria-label="Solde par agent">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600"><Wallet className="h-4 w-4" /></span>
              Solde par agent
            </h2>
            <DashBadge tone="warning">Total : {totalUnpaid.toFixed(0)} CHF</DashBadge>
          </div>
          <ul className="divide-y divide-border/60">
            {agentBalances.map(([agentId, data]: [string, { name: string; count: number; total: number; clients: number; groups: any[] }]) => (
              <li key={agentId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                    {data.name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{data.name}</p>
                    <p className="text-xs text-muted-foreground">{data.count} visite{data.count > 1 ? 's' : ''} impayée{data.count > 1 ? 's' : ''} • {data.clients} client{data.clients > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-base font-semibold text-foreground">{data.total.toFixed(0)} CHF</span>
                  <Button size="sm" variant="outline" onClick={() => handleMarkAllPaidForAgent(agentId)} className="h-11 rounded-full sm:h-9">
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    Tout payer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'coursiers' ? (
        coursiersVisibles.length === 0 ? (
          <DashEmptyState
            icon={Users}
            title={searchQuery ? 'Aucun coursier trouvé' : EMPTY.coursiers.title}
            action={!searchQuery ? (
              <Button className="h-11 rounded-full" onClick={() => setCreateOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Ajouter un coursier
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {coursiersVisibles.map((c) => {
              const cGroups = missionGroups.filter((g) => (g.representative as any).coursier_id === c.id);
              const duMois = cGroups.filter((g) => (g.representative as any).statut_coursier === 'termine' && new Date((g.representative as any).date_visite).getTime() >= debutMois).length;
              const auj = cGroups.filter((g) => {
                const r: any = g.representative;
                const t = new Date(r.date_visite).getTime();
                return r.statut_coursier === 'accepte' && t >= debutJour && t < finJour;
              }).length;
              const tel = c.profiles?.telephone || c.telephone;
              const email = c.profiles?.email || c.email;
              return (
                <article key={c.id} className={cn(DASH_CARD, 'flex flex-col gap-4 p-4 md:p-5')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {getCoursierInitials(c)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">{getCoursierName(c)}</p>
                        <p className="truncate text-xs text-muted-foreground">{email}</p>
                      </div>
                    </div>
                    <DashBadge tone={c.statut === 'actif' ? 'success' : 'muted'}>{c.statut === 'actif' ? 'Actif' : c.statut}</DashBadge>
                  </div>

                  <p className={cn('text-sm font-medium', auj > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                    {auj > 0 ? `En mission aujourd'hui (${auj})` : c.activeCount > 0 ? `${c.activeCount} mission${c.activeCount > 1 ? 's' : ''} à venir` : 'Aucune mission prévue'}
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-muted/50 p-2 text-center">
                      <p className="text-lg font-semibold text-foreground">{duMois}</p>
                      <p className="text-[11px] text-muted-foreground">Ce mois</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-2 text-center">
                      <p className="text-lg font-semibold text-foreground">{c.activeCount}</p>
                      <p className="text-[11px] text-muted-foreground">En cours</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-2 text-center">
                      <p className="text-lg font-semibold text-foreground">{c.earnings.toFixed(0)}</p>
                      <p className="text-[11px] text-muted-foreground">CHF gagnés</p>
                    </div>
                  </div>
                  <p className="-mt-2 text-xs text-muted-foreground">{c.completedCount} mission{c.completedCount > 1 ? 's' : ''} terminée{c.completedCount > 1 ? 's' : ''} au total</p>

                  {c.unpaid > 0 && (
                    <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {c.unpaid.toFixed(0)} CHF à payer
                    </p>
                  )}

                  <div className="mt-auto flex gap-2">
                    <Button className="h-11 flex-1 rounded-full" variant={c.unpaid > 0 ? 'default' : 'outline'} onClick={() => openCoursier(c)}>
                      {c.unpaid > 0 ? 'Relevé et paiement' : 'Voir le détail'} <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                    {tel && (
                      <Button asChild variant="outline" className="h-11 w-11 shrink-0 rounded-full p-0" aria-label={`Appeler ${getCoursierName(c)}`}>
                        <a href={`tel:${tel}`}><Phone className="h-4 w-4" /></a>
                      </Button>
                    )}
                    {email && (
                      <Button asChild variant="outline" className="h-11 w-11 shrink-0 rounded-full p-0" aria-label={`Écrire à ${getCoursierName(c)}`}>
                        <a href={`mailto:${email}`}><Mail className="h-4 w-4" /></a>
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : sorted.length === 0 ? (
        <DashEmptyState icon={EMPTY[tab].icon} title={searchQuery && tab !== 'a_deleguer' ? 'Aucun résultat pour cette recherche' : EMPTY[tab].title} description={EMPTY[tab].description} />
      ) : (
        <div className="space-y-3">
          {paged.map((g: any) => {
            const m: any = g.representative;
            const coursier = m.coursier_id ? coursierById.get(m.coursier_id) : null;
            return (
              <AdminCoursierMissionCard
                key={g.key}
                etape={tab}
                rep={m}
                items={g.items}
                coursierNom={m.coursier_id ? getMissionCoursierName(m) : 'Coursier'}
                coursierContact={contactOf(m.coursier_id)}
                onDelegate={tab === 'a_deleguer' ? () => handleDelegateGroup(g.key, g.items.map((i: any) => i.id)) : undefined}
                delegating={delegating === g.key}
                onMarkPaid={tab === 'a_payer' ? () => handleMarkPaidGroup(g.items.filter((i: any) => !i.paye_coursier).map((i: any) => i.id)) : undefined}
                onOpenCoursier={coursier ? () => openCoursier(coursier) : undefined}
                onVoirCoursiers={() => { tabChoisi.current = true; setTab('coursiers'); }}
              />
            );
          })}
        </div>
      )}

      {tab !== 'coursiers' && sorted.length > pageSize && (
        <TablePagination
          total={sorted.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="missions"
        />
      )}

      {/* Create Coursier Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserPlus className="h-4 w-4" /></span>
              Ajouter un coursier
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input
                  value={newCoursier.prenom}
                  onChange={(e) => setNewCoursier(prev => ({ ...prev, prenom: e.target.value }))}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={newCoursier.nom}
                  onChange={(e) => setNewCoursier(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Nom"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newCoursier.email}
                onChange={(e) => setNewCoursier(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.ch"
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={newCoursier.telephone}
                onChange={(e) => setNewCoursier(prev => ({ ...prev, telephone: e.target.value }))}
                placeholder="+41 XX XXX XX XX"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 rounded-full" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button className="h-11 rounded-full" onClick={handleCreateCoursier} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Inviter le coursier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coursier Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
          {selectedCoursier && (() => {
            const sheets: any[] = selectedCoursier.sheets || [];
            const totalMinutes = sheets.reduce((s, d) => s + d.minutes, 0);
            const totalEarned = sheets.reduce((s, d) => s + d.amount, 0);
            const unpaidSheets = sheets.filter(d => !d.allPaid);
            const totalUnpaidAmount = unpaidSheets.reduce((s, d) => s + d.amount, 0);
            const allUnpaidIds = unpaidSheets.flatMap(d => d.visiteIds);
            return (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {getCoursierInitials(selectedCoursier)}
                  </div>
                  <div>
                    <span>{getCoursierName(selectedCoursier)}</span>
                    <span className="ml-2 align-middle"><DashBadge tone={selectedCoursier.statut === 'actif' ? 'success' : 'muted'}>{selectedCoursier.statut}</DashBadge></span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Contact */}
                <div className="space-y-2">
                  {(selectedCoursier.profiles?.email || selectedCoursier.email) && (
                    <a href={`mailto:${selectedCoursier.profiles?.email || selectedCoursier.email}`} className="flex min-h-[36px] items-center gap-2 text-sm text-primary hover:underline">
                      <Mail className="h-4 w-4" />
                      {selectedCoursier.profiles?.email || selectedCoursier.email}
                    </a>
                  )}
                  {(selectedCoursier.profiles?.telephone || selectedCoursier.telephone) && (
                    <a href={`tel:${selectedCoursier.profiles?.telephone || selectedCoursier.telephone}`} className="flex min-h-[36px] items-center gap-2 text-sm text-primary hover:underline">
                      <Phone className="h-4 w-4" />
                      {selectedCoursier.profiles?.telephone || selectedCoursier.telephone}
                    </a>
                  )}
                </div>

                {/* Infos paiement */}
                <div className="space-y-2 rounded-xl border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Tarif horaire</span>
                    <span className="text-sm font-semibold">{selectedCoursier.tarif_horaire ?? 20} CHF/h</span>
                  </div>
                  {selectedCoursier.iban && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">IBAN</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-medium truncate">{selectedCoursier.iban}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 shrink-0 rounded-full"
                          aria-label="Copier l'IBAN"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedCoursier.iban);
                            toast.success('IBAN copié');
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="number"
                      min="1"
                      step="0.5"
                      value={tarifEdit}
                      onChange={(e) => setTarifEdit(e.target.value)}
                      className="h-10 w-24 text-sm"
                      placeholder="20"
                    />
                    <Button size="sm" variant="outline" onClick={handleSaveTarif} disabled={savingTarif} className="h-10 rounded-full">
                      {savingTarif ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                      Enregistrer le tarif
                    </Button>
                  </div>
                </div>

                {/* Bandeau totaux */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <p className="text-lg font-semibold">{formatDuration(totalMinutes)}</p>
                    <p className="text-xs text-muted-foreground">Total heures</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <p className="text-lg font-semibold text-foreground">{totalEarned.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">CHF gagnés</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 p-3 text-center">
                    <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">{totalUnpaidAmount.toFixed(2)}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">CHF à payer</p>
                  </div>
                </div>

                {/* Relevé des heures */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Relevé des heures
                    </p>
                    {unpaidSheets.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 rounded-full"
                        disabled={payingSheet === 'all'}
                        onClick={() => handlePaySheet('all', allUnpaidIds)}
                      >
                        {payingSheet === 'all' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1 h-3.5 w-3.5" />}
                        Tout payer
                      </Button>
                    )}
                  </div>
                  {sheets.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Aucune heure enregistrée</p>
                  ) : (
                    <div className="space-y-2">
                      {sheets.map((sheet) => (
                        <div key={sheet.dateKey} className="space-y-2 rounded-xl border border-border/70 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium capitalize">{sheet.label}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-semibold">{sheet.amount.toFixed(2)} CHF</span>
                              {sheet.allPaid ? (
                                <DashBadge tone="success">Payé</DashBadge>
                              ) : (
                                <DashBadge tone="warning">Impayé</DashBadge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {sheet.sessions.map((s: any, i: number) => (
                              <span key={i}>{fmtZurichTime(s.start)} – {fmtZurichTime(s.end)}</span>
                            ))}
                            <span>• {formatDuration(sheet.minutes)}</span>
                            <span>• {sheet.clientsCount} client{sheet.clientsCount > 1 ? 's' : ''}</span>
                          </div>
                          {!sheet.allPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-10 w-full rounded-full sm:w-auto"
                              disabled={payingSheet === sheet.dateKey}
                              onClick={() => handlePaySheet(sheet.dateKey, sheet.visiteIds)}
                            >
                              {payingSheet === sheet.dateKey ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1.5 h-4 w-4" />}
                              Payer
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inscription */}
                <div className="text-xs text-muted-foreground">
                  Inscrit le {format(new Date(selectedCoursier.created_at), "dd MMMM yyyy", { locale: fr })}
                </div>
              </div>
            </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashPage>
  );
}

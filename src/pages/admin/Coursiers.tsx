import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bike, Users, CheckCircle, Clock, UserPlus, Loader2, Send, Search, Phone, Mail, AlertTriangle, RefreshCw, X, FileText, Wallet, ChevronRight, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { groupVisitesByPhysiqueAgent } from '@/utils/visitesCalculator';
import { formatDuration } from '@/hooks/useCoursierTime';
import { resumePaie, TARIF_HORAIRE_DEFAUT, type Pointage, type VisiteCoursier } from '@/lib/coursierPaie';
import { formatChf } from '@/components/coursier/coursierModel';
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
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [visitesCoursiers, setVisitesCoursiers] = useState<VisiteCoursier[]>([]);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Onglet>('a_deleguer');
  const [sortKey, setSortKey] = useState<SortKey>('urgence');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [refreshing, setRefreshing] = useState(false);
  const tabChoisi = useRef(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [{ data: coursiersData }, { data: missionsData }, { data: eligibleData }, { data: pointagesData }, { data: visitesCData }] = await Promise.all([
        supabase.from('coursiers').select('*, profiles:user_id(prenom, nom, email, telephone)').order('created_at', { ascending: false }),
        supabase.from('visites').select('*, offres(adresse, statut, lien_annonce), agents:agent_id(id, user_id, profiles:user_id(prenom, nom)), coursiers:coursier_id(prenom, nom, profiles:user_id(prenom, nom))').not('statut_coursier', 'is', null).order('updated_at', { ascending: false }).limit(1000),
        supabase.from('visites').select('*, offres(adresse, statut), clients!client_id(user_id, profiles:user_id(prenom, nom))').is('statut_coursier', null).in('statut', ['planifiee', 'confirmee', 'proposee']).gte('date_visite', new Date().toISOString()).order('date_visite', { ascending: true }).limit(50),
        // Paie : tous les pointages (salaire = temps pointé × tarif horaire).
        supabase.from('coursier_time_entries').select('*').order('started_at', { ascending: false }).limit(10000),
        supabase.from('visites').select('id, coursier_id, date_visite, date_visite_fin, adresse, statut_coursier, client_id').not('coursier_id', 'is', null).limit(10000),
      ]);
      setPointages((pointagesData as any) || []);
      setVisitesCoursiers((visitesCData as any) || []);
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

  const clientsCountOf = (items: any[]) =>
    new Set(items.filter((v: any) => v.client_id).map((v: any) => v.client_id)).size || items.length;

  /** Missions regroupées par visite physique (adresse + date/heure + agent) */
  const missionGroups = useMemo(() => groupVisitesByPhysiqueAgent(missions as any[]), [missions]);
  const pendingGroups = useMemo(() => missionGroups.filter(g => (g.representative as any).statut_coursier === 'en_attente'), [missionGroups]);
  const activeGroups = useMemo(() => missionGroups.filter(g => (g.representative as any).statut_coursier === 'accepte'), [missionGroups]);
  const completedGroups = useMemo(() => missionGroups.filter(g => (g.representative as any).statut_coursier === 'termine'), [missionGroups]);
  // Coursier stats (basés sur les visites physiques)
  const coursierStats = useMemo(() => {
    return coursiers.map(c => {
      const cGroups = missionGroups.filter(g => (g.representative as any).coursier_id === c.id);
      const completed = cGroups.filter(g => (g.representative as any).statut_coursier === 'termine');
      const active = cGroups.filter(g => (g.representative as any).statut_coursier === 'accepte');
      const tarif = Number(c.tarif_horaire ?? TARIF_HORAIRE_DEFAUT) || TARIF_HORAIRE_DEFAUT;
      const paie = resumePaie(
        pointages.filter((p) => p.coursier_id === c.id),
        visitesCoursiers.filter((v: any) => v.coursier_id === c.id),
        tarif,
      );
      return { ...c, tarif, completedCount: completed.length, activeCount: active.length, paie, unpaid: paie.montantAPayer };
    });
  }, [coursiers, missionGroups, pointages, visitesCoursiers]);
  const totalUnpaid = coursierStats.reduce((s, c) => s + c.unpaid, 0);
  const coursiersAPayer = coursierStats.filter((c) => c.unpaid > 0 || c.paie.aVerifier > 0 || c.paie.enCours);


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
      // La paie se fait au temps pointé : une mission terminée n'attend plus de paiement à la visite.
      const etape = etapeAdmin(g.representative as any, g.items as any[], now);
      r[etape === 'a_payer' ? 'terminees' : etape].push(g);
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
    a_payer: coursiersAPayer.length,
    terminees: parEtape.terminees.length,
    coursiers: coursiersVisibles.length,
  };

  // Onglet par défaut = la première file qui attend une action de l'admin.
  useEffect(() => {
    if (loading || tabChoisi.current) return;
    tabChoisi.current = true;
    const premier = (['a_deleguer', 'sans_coursier', 'a_rendre', 'a_payer', 'en_cours'] as EtapeAdmin[]).find((k) => (k === 'a_payer' ? coursiersAPayer.length : parEtape[k].length) > 0);
    setTab(premier ?? (missionGroups.length === 0 && eligibleGroups.length === 0 ? 'coursiers' : 'a_deleguer'));
  }, [loading, parEtape, missionGroups.length, eligibleGroups.length, coursiersAPayer.length]);

  const sorted = useMemo(() => {
    if (tab === 'coursiers' || tab === 'a_payer') return [];
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
    if (!c?.id) return;
    navigate(`/admin/coursiers/${c.id}`);
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
    totalUnpaid > 0 ? `${formatChf(totalUnpaid, 2)} à payer (temps pointé)` : null,
  ].filter(Boolean).join(' · ') || `Tout est à jour · ${coursiers.length} coursier${coursiers.length > 1 ? 's' : ''}`;

  const EMPTY: Record<Onglet, { icon: any; title: string; description?: string }> = {
    a_deleguer: { icon: Send, title: searchQuery ? 'Aucune visite trouvée' : 'Aucune visite éligible à la délégation', description: searchQuery ? undefined : 'Les visites planifiées à venir sans coursier apparaissent ici.' },
    sans_coursier: { icon: Clock, title: 'Aucune mission en attente de coursier' },
    en_cours: { icon: Bike, title: 'Aucune mission en cours' },
    a_rendre: { icon: FileText, title: 'Aucun compte-rendu en attente' },
    a_payer: { icon: CheckCircle, title: 'Tous les paiements sont à jour', description: 'Les coursiers sont payés au temps pointé : rien à payer ni à vérifier.' },
    terminees: { icon: CheckCircle, title: 'Aucune mission terminée' },
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

      {/* À payer : salaire au temps pointé, par coursier */}
      {tab === 'a_payer' && (
        coursiersAPayer.length === 0 ? (
          <DashEmptyState icon={CheckCircle} title={EMPTY.a_payer.title} description={EMPTY.a_payer.description} />
        ) : (
          <section className={cn(DASH_CARD, 'p-4 md:p-5')} aria-label="Salaires à payer">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600"><Wallet className="h-4 w-4" /></span>
                Salaires à payer
              </h2>
              <DashBadge tone="warning">Total : {formatChf(totalUnpaid, 2)}</DashBadge>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">Salaire = heures pointées (arrivée → départ) × tarif horaire du coursier. Vérifiez les sessions signalées avant de payer.</p>
            <ul className="divide-y divide-border/60">
              {coursiersAPayer.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">{getCoursierInitials(c)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{getCoursierName(c)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(c.paie.minutesAPayer)} non payées · {formatChf(c.tarif, 2)}/h
                        {c.paie.aVerifier > 0 && <span className="font-medium text-destructive"> · {c.paie.aVerifier} à vérifier</span>}
                        {c.paie.enCours && <span className="font-medium text-emerald-700 dark:text-emerald-400"> · en service</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-base font-semibold tabular-nums text-foreground">{formatChf(c.unpaid, 2)}</span>
                    <Button size="sm" onClick={() => openCoursier(c)} className="h-11 rounded-full sm:h-9">
                      Relevé et paiement <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
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
                      <p className="text-lg font-semibold tabular-nums text-foreground">{formatDuration(c.paie.minutesMois)}</p>
                      <p className="text-[11px] text-muted-foreground">Heures du mois</p>
                    </div>
                  </div>
                  <p className="-mt-2 text-xs text-muted-foreground">{c.completedCount} mission{c.completedCount > 1 ? 's' : ''} terminée{c.completedCount > 1 ? 's' : ''} au total</p>

                  {c.paie.enCours && (
                    <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      <Timer className="h-4 w-4 shrink-0" /> En service (compteur en marche)
                    </p>
                  )}
                  {c.unpaid > 0 && (
                    <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                      <Wallet className="h-4 w-4 shrink-0" /> {formatChf(c.unpaid, 2)} à payer · {formatDuration(c.paie.minutesAPayer)}
                    </p>
                  )}
                  {c.paie.aVerifier > 0 && (
                    <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {c.paie.aVerifier} pointage{c.paie.aVerifier > 1 ? 's' : ''} à vérifier
                    </p>
                  )}

                  <div className="mt-auto flex gap-2">
                    <Button className="h-11 flex-1 rounded-full" variant={c.unpaid > 0 ? 'default' : 'outline'} onClick={() => openCoursier(c)}>
                      {c.unpaid > 0 ? 'Relevé et paiement' : 'Gérer le coursier'} <ChevronRight className="ml-1 h-4 w-4" />
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
      ) : tab === 'a_payer' ? null : sorted.length === 0 ? (
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

    </DashPage>
  );
}

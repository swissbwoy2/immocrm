import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BadgeCheck, Banknote, BarChart3, Briefcase, Calendar, CheckCircle2,
  ChevronDown, ClipboardList, Clock, FileSignature, FileText, KeyRound, LifeBuoy, Mail, MessageSquare, Receipt,
  RefreshCw, Send, Settings2, Undo2, UserPlus, Users, Wallet, Zap,
} from 'lucide-react';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { mandatElapsedFor, mandatRemainingFor } from '@/utils/mandatDates';
import { isClientActif } from '@/lib/activeClients';
import { DashboardBanner } from '@/components/common/DashboardBanner';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';
import {
  DASH_CARD, DashBadge, DashFilterPills, DashPageHeader, DashSection, DashSectionLink, LinkRow, TodoCard,
} from '@/components/client/dashboard/DashPrimitives';
import {
  ActionGrid, DayBanner, FoldSection, KpiTile, StaffSectionTitle, StaffShell, type ActionTileItem, type DayVisit,
} from '@/components/dashboard-staff/StaffDashParts';
import {
  formatHeure, formatJourLong, inLastDays, prochaineVisite, s, totalEnAttente, variation, visitesDuJour,
} from '@/components/dashboard-staff/staffDashboardModel';
import { AdminStatsSection } from '@/components/stats/AdminStatsSection';
import { RecommendationStats } from '@/components/stats/RecommendationStats';
import { AgencyProjectionSection } from '@/components/admin/AgencyProjectionSection';
import { ChargesAgenceDialog } from '@/components/admin/dashboard/ChargesAgenceDialog';
import { RemboursementsDialog, type RemboursementRow, type PendingRefund } from '@/components/admin/dashboard/RemboursementsDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DETAIL_DIALOG, DetailHeader, DetailBody, KeyFacts, DetailSection, DetailNotice, DetailActions, dateCH } from '@/components/details/DetailPrimitives';
import {
  ACTIVATION_PAYEE, PERIODS, isTestAccount, chargeCategoryLabel, computeFinance, formatCHF, inPeriod, monthRange, periodRange,
  type ChargeRow, type DetailKey, type FinanceInput, type PeriodKey,
} from '@/lib/adminFinance';

type Row = Record<string, any>;

/** La base renvoie au plus 1000 lignes par requête : on lit page par page pour avoir TOUTES les lignes. */
async function fetchAll(build: (from: number, to: number) => any, max = 60000): Promise<{ data: Row[]; error: unknown }> {
  const out: Row[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) return { data: out, error };
    out.push(...((data as Row[]) || []));
    if (!data || data.length < 1000) break;
  }
  return { data: out, error: null };
}

/** Nombre exact de lignes (compté par la base, sans limite). */
async function countRows(q: any): Promise<number> {
  const { count, error } = await q;
  return error ? 0 : count ?? 0;
}

const VISITE_A_VENIR = ['planifiee', 'confirmee', 'proposee'];
const CANDIDATURE_A_FINALISER = ['acceptee', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe'];

/** Ligne d'un compte de résultat : libellé, détail, montant. */
function MoneyLine({ label, sub, value, tone = 'neutral', onClick }: {
  label: string; sub?: string; value: number; tone?: 'plus' | 'minus' | 'neutral'; onClick?: () => void;
}) {
  const sign = tone === 'minus' && value > 0 ? '− ' : '';
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${tone === 'minus' ? 'text-foreground/80' : 'text-foreground'}`}>
        {sign}{formatCHF(value)}
      </span>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-muted/60">{content}</button>
  ) : (
    <div className="flex items-center gap-3 px-1 py-2">{content}</div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { counts } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('mois');
  const [chargesOpen, setChargesOpen] = useState(false);
  const [rembOpen, setRembOpen] = useState(false);
  const [rembRows, setRembRows] = useState<RemboursementRow[]>([]);
  const [rembAvailable, setRembAvailable] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [detail, setDetail] = useState<{ key: DetailKey; title: string; path?: string } | null>(null);

  const [prenom, setPrenom] = useState<string>('');
  const [agents, setAgents] = useState<Row[]>([]);
  const [clients, setClients] = useState<Row[]>([]);
  const [clientAgents, setClientAgents] = useState<Row[]>([]);
  const [transactions, setTransactions] = useState<Row[]>([]);
  const [offres, setOffres] = useState<Row[]>([]); // chargées seulement pour les statistiques détaillées
  const [aPostuler, setAPostuler] = useState(0);
  const [offresAutoAGerer, setOffresAutoAGerer] = useState<number | undefined>(undefined);
  const [offresPeriode, setOffresPeriode] = useState<{ total: number; parAgent: Record<string, number> }>({ total: 0, parAgent: {} });
  const [visites, setVisites] = useState<Row[]>([]);
  const [candidatures, setCandidatures] = useState<Row[]>([]);
  const [mandates, setMandates] = useState<Row[]>([]);
  const [demandes, setDemandes] = useState<Row[]>([]);
  const [registre, setRegistre] = useState<Row[]>([]);
  const [achats, setAchats] = useState<Row[]>([]);
  const [fiches, setFiches] = useState<Row[]>([]);
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [chargesAvailable, setChargesAvailable] = useState(true);
  const [usersAvecCredits, setUsersAvecCredits] = useState<Set<string> | null>(null);

  const loadRemboursements = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('remboursements')
      .select('id, date_remboursement, client_nom, montant, moyen, client_id, notes')
      .order('date_remboursement', { ascending: false })
      .limit(5000);
    if (error) { setRembAvailable(false); setRembRows([]); }
    else { setRembAvailable(true); setRembRows((data || []) as RemboursementRow[]); }
  }, []);

  const loadCharges = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('charges_agence')
      .select('id, libelle, categorie, montant, recurrence, date_debut, date_fin, notes')
      .order('date_debut', { ascending: false })
      .limit(5000);
    if (error) {
      setChargesAvailable(false);
      setCharges([]);
    } else {
      setChargesAvailable(true);
      setCharges((data || []) as ChargeRow[]);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const safe = <T,>(r: { data: T | null; error: unknown }, fallback: T): T => (r.error ? fallback : (r.data ?? fallback));

      const [
        meRes, agentsRes, clientsRes, caRes, trRes, aPostulerCount, visitesRes, candRes, mandRes, demRes, regRes, achatRes, fichesRes, creditsRes, offresAutoCount,
      ] = await Promise.all([
        user?.id ? supabase.from('profiles').select('prenom').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from('agents').select('id, user_id, statut'),
        fetchAll((a, b) => supabase
          .from('clients')
          .select('id, user_id, agent_id, statut, budget_max, date_ajout, created_at, demande_mandat_id, type_recherche, commission_split, mandat_date_signature, mandate_pause_days, mandate_paused_at, mandate_official_end_date, refund_status, refund_requested_at, refund_processed_at, cancellation_requested_at')
          .order('id').range(a, b)),
        fetchAll((a, b) => supabase.from('client_agents').select('client_id, agent_id, commission_split, is_primary').order('client_id').range(a, b)),
        fetchAll((a, b) => supabase.from('transactions').select('*').order('id').range(a, b)),
        countRows(supabase.from('offres').select('id', { count: 'exact', head: true }).eq('statut', 'souhaite_postuler')),
        fetchAll((a, b) => supabase.from('visites').select('id, statut, date_visite, client_decision, agent_id, adresse, client_id').order('id').range(a, b)),
        fetchAll((a, b) => supabase.from('candidatures').select('id, statut, date_depot, created_at, signature_effectuee, signature_effectuee_at, cles_remises, cles_remises_at').order('id').range(a, b)),
        fetchAll((a, b) => supabase.from('mandates').select('id, acompte_montant, created_at').order('id').range(a, b)),
        fetchAll((a, b) => supabase.from('demandes_mandat').select('id, statut, date_paiement, montant_acompte, created_at, type_recherche, prenom, nom, email').order('id').range(a, b)),
        fetchAll((a, b) => supabase
          .from('registre_commissions')
          .select('id, date_conclusion, honoraire_total, commission_agent, commission_agence, montant_acompte, statut_paiement, type_affaire, agent_id, agent_prenom, agent_nom, client_prenom, client_nom, client_email')
          .order('id').range(a, b)),
        fetchAll((a, b) => supabase.from('purchase_projects').select('id, date_paiement_acompte, montant_acompte').not('date_paiement_acompte', 'is', null).order('id').range(a, b)),
        fetchAll((a, b) => supabase
          .from('fiches_salaire')
          .select('annee, mois, statut, mode_remuneration, cout_total_employeur, salaire_net, montant_commissions, employes(mode_remuneration, prenom, nom)')
          .order('id').range(a, b)),
        fetchAll((a, b) => supabase.from('user_credits').select('user_id, coins_mandat').order('user_id').range(a, b)),
        // Compteur « Offres auto à gérer » : même filtre que la statistique « à compléter » de /admin/offres-auto (SELECT count, head).
        countRows(supabase.from('offres').select('id', { count: 'exact', head: true }).eq('envoi_auto', true).eq('needs_agent_action', true)),
      ]);

      setPrenom((meRes as any)?.data?.prenom || '');

      const agentsData = safe(agentsRes as any, [] as Row[]);
      const agentUserIds = agentsData.map((a) => a.user_id).filter(Boolean);
      const clientsData = safe(clientsRes as any, [] as Row[]);
      const clientUserIds = clientsData.map((c) => c.user_id).filter(Boolean);
      const [agentProfiles, clientProfiles] = await Promise.all([
        agentUserIds.length ? supabase.from('profiles').select('id, nom, prenom, actif').in('id', agentUserIds) : Promise.resolve({ data: [], error: null }),
        clientUserIds.length ? supabase.from('profiles').select('id, nom, prenom').in('id', clientUserIds) : Promise.resolve({ data: [], error: null }),
      ]);
      const apMap = new Map(((agentProfiles as any).data || []).map((p: Row) => [p.id, p]));
      setAgents(agentsData.map((a) => {
        const p: Row = (apMap.get(a.user_id) as Row) || {};
        return { id: a.id, user_id: a.user_id, actif: p.actif ?? false, prenom: p.prenom || '', nom: p.nom || '' };
      }));

      const demandesData = safe(demRes as any, [] as Row[]);
      const demMap = new Map(demandesData.map((d) => [d.id, d]));
      const cpMap = new Map(((clientProfiles as any).data || []).map((p: Row) => [p.id, p]));
      setClients(clientsData.map((c) => {
        const p: Row = (cpMap.get(c.user_id) as Row) || {};
        const d: Row = (c.demande_mandat_id ? demMap.get(c.demande_mandat_id) : undefined) || {};
        return {
          ...c,
          prenom: p.prenom || d.prenom || '',
          nom: p.nom || d.nom || '',
          agentId: c.agent_id,
          budgetMax: c.budget_max || 0,
          montantActivation: Number(d.montant_acompte) || 300,
        };
      }));
      setDemandes(demandesData);
      setClientAgents(safe(caRes as any, [] as Row[]));
      setTransactions(safe(trRes as any, [] as Row[]).map((t) => ({ ...t, dateConclusion: t.date_transaction, partAgence: t.part_agence, commissionTotale: t.commission_totale })));
      setAPostuler(aPostulerCount as number);
      setOffresAutoAGerer(offresAutoCount as number);
      setVisites(safe(visitesRes as any, [] as Row[]));
      setCandidatures(safe(candRes as any, [] as Row[]));
      setMandates(safe(mandRes as any, [] as Row[]));
      setRegistre(safe(regRes as any, [] as Row[]));
      setAchats(safe(achatRes as any, [] as Row[]));
      setFiches(safe(fichesRes as any, [] as Row[]).map((f) => ({ ...f, mode_remuneration: f.mode_remuneration || f.employes?.mode_remuneration || null, label: [f.employes?.prenom, f.employes?.nom].filter(Boolean).join(' ') || null })));
      setUsersAvecCredits(
        (creditsRes as any).error
          ? null
          : new Set(((creditsRes as any).data || []).filter((r: Row) => Number(r.coins_mandat ?? 0) > 0 && r.user_id).map((r: Row) => r.user_id as string)),
      );
      await Promise.all([loadCharges(), loadRemboursements()]);
    } catch (e) {
      console.error('[AdminDashboard]', e);
      toast.error('Erreur de chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadCharges, loadRemboursements]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleAgentStatus = async (agentUserId: string, current: boolean) => {
    const { error } = await supabase.from('profiles').update({ actif: !current }).eq('id', agentUserId);
    if (error) { toast.error('Erreur lors du changement de statut'); return; }
    setAgents((prev) => prev.map((a) => (a.user_id === agentUserId ? { ...a, actif: !current } : a)));
    toast.success(`Agent ${!current ? 'activé' : 'désactivé'}`);
  };

  /* ---------- Finances ---------- */
  const financeInput: FinanceInput = useMemo(() => ({
    registre: registre as any,
    activations: demandes as any,
    acomptesAchat: achats as any,
    // Remboursements versés = journal « remboursements » (+ anciennes fiches marquées traitées sans ligne au journal).
    refunds: [
      ...rembRows.map((r) => ({ refund_status: 'processed', refund_processed_at: r.date_remboursement, refund_requested_at: null, montant: Number(r.montant), label: r.client_nom })),
      ...clients
        .filter((c) => c.refund_status === 'processed' && !rembRows.some((r) => r.client_id === c.id))
        .map((c) => ({ refund_status: c.refund_status, refund_processed_at: c.refund_processed_at, refund_requested_at: c.refund_requested_at, montant: c.montantActivation, label: `${c.prenom || ''} ${c.nom || ''}`.trim() || null })),
    ],
    fiches: fiches as any,
    charges,
  }), [registre, demandes, achats, clients, fiches, charges, rembRows]);

  const p = useMemo(() => periodRange(period), [period]);

  // Offres envoyées sur la période : comptées par la base (plusieurs milliers de lignes, jamais tronquées).
  useEffect(() => {
    let alive = true;
    const base = () => supabase
      .from('offres')
      .select('id', { count: 'exact', head: true })
      .gte('date_envoi', p.start.toISOString())
      .lt('date_envoi', p.end.toISOString());
    (async () => {
      const [total, ...parAgent] = await Promise.all([
        countRows(base()),
        ...agents.map((a) => countRows(base().eq('agent_id', a.id))),
      ]);
      if (!alive) return;
      const map: Record<string, number> = {};
      agents.forEach((a, i) => { map[a.id] = parAgent[i] ?? 0; });
      setOffresPeriode({ total, parAgent: map });
    })();
    return () => { alive = false; };
  }, [p, agents]);

  // Lignes d'offres complètes : seulement à l'ouverture des statistiques détaillées.
  useEffect(() => {
    if (!showMore || offres.length) return;
    fetchAll((a, b) => supabase.from('offres').select('id, date_envoi, created_at, agent_id').order('id').range(a, b))
      .then((r) => setOffres(r.data));
  }, [showMore, offres.length]);
  const fin = useMemo(() => computeFinance(financeInput, p), [financeInput, p]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const r = monthRange(now.getFullYear(), now.getMonth() - 11 + i);
      const f = computeFinance(financeInput, r);
      return { label: r.label, recettes: f.recettes, depenses: f.depenses, benefice: f.benefice };
    });
  }, [financeInput]);
  const maxMonth = Math.max(1, ...months.map((m) => Math.max(m.recettes, m.depenses)));

  /* ---------- Activité ---------- */
  const actifs = useMemo(() => clients.filter((c) => isClientActif(c as any, usersAvecCredits)), [clients, usersAvecCredits]);
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const ago30 = new Date(now.getTime() - 30 * 86400000);

  const activite = useMemo(() => ({
    mandatsSignes: clients.filter((c) => inPeriod(c.mandat_date_signature, p)).length,
    offresEnvoyees: offresPeriode.total,
    visitesEffectuees: visites.filter((v) => v.statut === 'effectuee' && inPeriod(v.date_visite, p)).length,
    candidaturesDeposees: candidatures.filter((c) => inPeriod(c.date_depot || c.created_at, p)).length,
    bauxSignes: candidatures.filter((c) => inPeriod(c.signature_effectuee_at, p)).length,
  }), [clients, offresPeriode, visites, candidatures, p]);

  const funnel = [
    { label: 'Offres envoyées', value: activite.offresEnvoyees },
    { label: 'Visites effectuées', value: activite.visitesEffectuees },
    { label: 'Candidatures déposées', value: activite.candidaturesDeposees },
    { label: 'Baux signés', value: activite.bauxSignes },
    { label: 'Affaires conclues', value: fin.affaires },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  /* ---------- À traiter ---------- */
  const todo = useMemo(() => {
    const refundsPending = clients.filter((c) => c.refund_status === 'pending');
    const cancellations = clients.filter((c) => c.cancellation_requested_at && c.statut === 'actif' && c.refund_status !== 'processed');
    // Mandats signés en attente de paiement depuis 45 jours au plus (les plus anciens sont des demandes abandonnées).
    const ago45 = new Date(now.getTime() - 45 * 86400000);
    const activationsAttente = demandes.filter((d) => ['en_attente', 'facture_envoyee'].includes(d.statut) && new Date(d.created_at) >= ago45 && !isTestAccount(d.prenom, d.nom, d.email));
    const visitesSansRetour = visites.filter((v) => {
      const d = v.date_visite ? new Date(v.date_visite) : null;
      return v.statut === 'effectuee' && !v.client_decision && d && d >= ago30;
    });
    const visitesAVenir = visites.filter((v) => {
      const d = v.date_visite ? new Date(v.date_visite) : null;
      return VISITE_A_VENIR.includes(v.statut) && d && d >= now && d <= in7;
    });
    // Candidatures en attente de réponse déposées ces 60 derniers jours (les plus anciennes sont des dossiers clos jamais mis à jour).
    const ago60 = new Date(now.getTime() - 60 * 86400000);
    const candEnAttente = candidatures.filter((c) => {
      const d = new Date(c.date_depot || c.created_at);
      return c.statut === 'en_attente' && d >= ago60;
    });
    const candAFinaliser = candidatures.filter((c) => CANDIDATURE_A_FINALISER.includes(c.statut) && !c.cles_remises);
    const sansAgent = actifs.filter((c) => !c.agentId);
    const critiques = actifs.filter((c) => { const d = mandatElapsedFor(c as any); return d >= 60 && d < 90; });
    const expires = clients.filter((c) => c.statut === 'actif' && mandatElapsedFor(c as any) >= 90);
    // Registre : « Payé / À payer » = commission versée ou non À L'AGENT (pas le paiement du client).
    const agentsAVerser = registre.filter((r) => (r.statut_paiement ?? '') !== 'paye' && Number(r.commission_agent || 0) > 0);
    return {
      refundsPending, refundsPendingMontant: refundsPending.reduce((s, c) => s + (c.montantActivation || 0), 0),
      cancellations, activationsAttente, aPostuler, visitesSansRetour, visitesAVenir,
      candEnAttente, candAFinaliser, sansAgent, critiques, expires, agentsAVerser,
      agentsAVerserMontant: agentsAVerser.reduce((s, r) => s + Number(r.commission_agent || 0), 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, demandes, aPostuler, visites, candidatures, actifs, registre]);

  /* ---------- Équipe ---------- */
  const team = useMemo(() => agents.map((a) => {
    const mesClients = actifs.filter((c) => c.agentId === a.id);
    const crit = mesClients.filter((c) => { const d = mandatElapsedFor(c as any); return d >= 60 && d < 90; }).length;
    const reg = registre.filter((r) => r.agent_id === a.id && inPeriod(r.date_conclusion, p));
    return {
      id: a.id as string,
      user_id: a.user_id as string,
      prenom: (a.prenom || '') as string,
      nom: (a.nom || '') as string,
      actif: !!a.actif,
      clients: mesClients.length,
      critiques: crit,
      affaires: reg.length,
      commission: reg.reduce((s, r) => s + Number(r.commission_agent || 0), 0),
      offres: offresPeriode.parAgent[a.id] ?? 0,
    };
  }).sort((x, y) => Number(y.actif) - Number(x.actif) || y.clients - x.clients), [agents, actifs, registre, offresPeriode, p]);

  /* ---------- Projection (section existante conservée) ---------- */
  const agencyProjections = actifs.map((client) => {
    const ca = clientAgents.find((x) => x.client_id === client.id && x.is_primary);
    const split = ca?.commission_split || client.commission_split || 45;
    const budget = client.budgetMax || 0;
    const agent = agents.find((a) => a.id === client.agentId);
    return {
      clientId: client.id,
      clientName: `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Client',
      agentName: agent ? `${agent.prenom} ${agent.nom}` : 'Non assigné',
      budgetMax: budget,
      commissionSplit: split,
      partAgence: Math.round(budget * ((100 - split) / 100)),
    };
  });
  const totalCommissionAgence = agencyProjections.reduce((s, x) => s + x.partAgence, 0);

  /* ---------- Comparaison au mois précédent (données déjà chargées) ---------- */
  const prevRange = period === 'mois'
    ? periodRange('mois_precedent')
    : period === 'mois_precedent'
      ? monthRange(now.getFullYear(), now.getMonth() - 2)
      : null;
  const prevFin = prevRange ? computeFinance(financeInput, prevRange) : null;
  const prevActivite = prevRange ? {
    mandatsSignes: clients.filter((c) => inPeriod(c.mandat_date_signature, prevRange)).length,
    visitesEffectuees: visites.filter((v) => v.statut === 'effectuee' && inPeriod(v.date_visite, prevRange)).length,
    candidaturesDeposees: candidatures.filter((c) => inPeriod(c.date_depot || c.created_at, prevRange)).length,
    bauxSignes: candidatures.filter((c) => inPeriod(c.signature_effectuee_at, prevRange)).length,
  } : null;
  const deltaLabel = period === 'mois' ? 'vs mois passé' : 'vs mois d’avant';

  /* ---------- Ma journée ---------- */
  const agentNom = (id?: string | null) => {
    const a = agents.find((x) => x.id === id);
    return a ? `${a.prenom || ''} ${a.nom || ''}`.trim() || 'Agent' : 'Sans agent';
  };
  const duJour = visitesDuJour(visites as any[], now);
  const prochaine = prochaineVisite(duJour, now);
  const STATUT_VISITE: Record<string, string> = { planifiee: 'Planifiée', confirmee: 'Confirmée', proposee: 'Proposée', deleguee: 'Déléguée', effectuee: 'Effectuée' };
  const toDayVisit = (v: Row): DayVisit => ({
    id: v.id,
    heure: formatHeure(v.date_visite),
    titre: v.adresse || `Visite · ${agentNom(v.agent_id)}`,
    sous: [
      (() => { const c = clients.find((x) => x.id === v.client_id); return c ? `${c.prenom ?? ''} ${c.nom ?? ''}`.trim() : null; })(),
      agentNom(v.agent_id),
      STATUT_VISITE[v.statut] || v.statut,
    ].filter(Boolean).join(' · '),
    onClick: () => navigate('/admin/calendrier'),
  });

  /* ---------- Cette semaine ---------- */
  const semaine = {
    visitesEffectuees: visites.filter((v) => v.statut === 'effectuee' && inLastDays(v.date_visite, 7, now)).length,
    candidaturesDeposees: candidatures.filter((c) => inLastDays(c.date_depot || c.created_at, 7, now)).length,
    bauxSignes: candidatures.filter((c) => inLastDays(c.signature_effectuee_at, 7, now)).length,
    activationsEncaissees: demandes.filter((d) => inLastDays(d.date_paiement, 7, now) && !isTestAccount(d.prenom, d.nom, d.email)).length,
    mandatsEcheance: actifs.filter((c) => { const r = mandatRemainingFor(c as any); return r > 0 && r <= 7; }).length,
  };

  if (loading) {
    return (
      <StaffShell>
        <div className="space-y-4" role="status" aria-label="Chargement du tableau de bord">
          <div className="h-32 rounded-2xl bg-muted/60" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-24 rounded-2xl bg-muted/40" />)}</div>
          <div className="h-64 rounded-2xl bg-muted/40" />
        </div>
      </StaffShell>
    );
  }

  /* ---------- À traiter : raccourcis triés par urgence ---------- */
  const mandatsATraiter = todo.critiques.length + todo.expires.length + todo.cancellations.length;
  const actions: ActionTileItem[] = [
    {
      key: 'refunds', icon: Undo2, label: 'Remboursements', count: todo.refundsPending.length, tone: 'danger',
      phrase: todo.refundsPending.length > 0 ? `${formatCHF(todo.refundsPendingMontant)} à rembourser sous 30 jours` : (rembAvailable ? `${rembRows.length} remboursement${s(rembRows.length)} enregistré${s(rembRows.length)}` : 'Journal à activer'),
      detail: "Demandes de remboursement : à rembourser dans les 30 jours après l'échéance. Ouvre le journal pour marquer remboursé.",
      onClick: () => setRembOpen(true),
    },
    {
      key: 'mandats', icon: Clock, label: 'Mandats à traiter', count: mandatsATraiter,
      tone: todo.expires.length + todo.cancellations.length > 0 ? 'danger' : 'warning',
      phrase: mandatsATraiter > 0
        ? [todo.expires.length && `${todo.expires.length} échu${s(todo.expires.length)}`, todo.critiques.length && `${todo.critiques.length} à ≤ 30 j`, todo.cancellations.length && `${todo.cancellations.length} annulation${s(todo.cancellations.length)}`].filter(Boolean).join(' · ') + ' : prévenir le client'
        : 'Aucune échéance proche',
      detail: 'Selon la date de signature ou de renouvellement : prévenir le client et préparer la reconduction. Annulations : vérifier le délai et la règle de remboursement.',
      onClick: () => navigate('/admin/mandats'),
    },
    {
      key: 'activations', icon: Banknote, label: "Demandes d'activation", count: todo.activationsAttente.length, tone: 'warning',
      phrase: todo.activationsAttente.length > 0 ? 'À encaisser : envoyer la facture ou confirmer le paiement' : 'Aucune activation en attente',
      detail: 'Mandats signés ces 45 derniers jours, en attente de paiement (facture envoyée ou à envoyer).',
      onClick: () => navigate('/admin/demandes-activation'),
    },
    {
      key: 'postuler', icon: Send, label: 'Postulations', count: todo.aPostuler, tone: 'warning',
      phrase: todo.aPostuler > 0 ? 'Préparer et déposer le dossier à la gérance' : 'Aucune postulation à déposer',
      detail: 'Des clients veulent postuler : préparer et envoyer le dossier à la gérance.',
      onClick: () => navigate('/admin/postulations'),
    },
    {
      key: 'offresAuto', icon: Zap, label: 'Offres auto à gérer', count: offresAutoAGerer, tone: 'warning',
      phrase: offresAutoAGerer === undefined ? 'Fixer les visites des offres envoyées' : offresAutoAGerer > 0 ? 'Visite à fixer ou offre à compléter' : 'Aucune action requise',
      onClick: () => navigate('/admin/offres-auto'),
    },
    {
      key: 'candidatures', icon: FileSignature, label: 'Candidatures', count: todo.candEnAttente.length + todo.candAFinaliser.length, tone: 'primary',
      phrase: `${todo.candEnAttente.length} en attente de la gérance · ${todo.candAFinaliser.length} à finaliser`,
      detail: 'En attente : déposées ces 60 derniers jours sans réponse de la gérance. À finaliser : bail, signature, état des lieux, clés.',
      onClick: () => navigate('/admin/candidatures'),
    },
    {
      key: 'retours', icon: MessageSquare, label: 'Visites sans retour', count: todo.visitesSansRetour.length, tone: 'warning',
      phrase: todo.visitesSansRetour.length > 0 ? 'Relancer le client : postule-t-il ?' : 'Tous les retours sont reçus',
      detail: "Visites effectuées ces 30 derniers jours sans décision du client : relancer pour savoir s'il postule.",
      onClick: () => navigate('/admin/visites'),
    },
    {
      key: 'sansAgent', icon: UserPlus, label: 'Clients sans agent', count: todo.sansAgent.length, tone: 'warning',
      phrase: todo.sansAgent.length > 0 ? 'Assigner un agent pour démarrer le suivi' : 'Tous les clients actifs sont suivis',
      onClick: () => navigate('/admin/assignations'),
    },
    {
      key: 'messages', icon: Mail, label: 'Messages non lus', count: counts.new_message, tone: 'primary',
      phrase: counts.new_message > 0 ? 'Répondre aux conversations en attente' : 'Messagerie à jour',
      onClick: () => navigate('/admin/messagerie'),
    },
    {
      key: 'agents', icon: Receipt, label: 'Commissions à verser', count: todo.agentsAVerser.length, tone: 'primary',
      phrase: todo.agentsAVerser.length > 0 ? `${formatCHF(todo.agentsAVerserMontant)} à verser aux agents` : 'Aucune commission en attente',
      detail: todo.agentsAVerser.length > 0 ? todo.agentsAVerser.map((r) => `${r.agent_prenom || 'Agent'} — ${[r.client_prenom, r.client_nom].filter(Boolean).join(' ')}`).join(' · ') + ' : marqué « À payer » dans le registre.' : undefined,
      onClick: () => navigate('/admin/registre-commissions'),
    },
  ];
  const enAttente = totalEnAttente(actions);
  const pointsOuverts = actions.filter((a) => (a.count ?? 0) > 0).length;

  const chargesCat = Object.entries(fin.chargesParCategorie).sort((a, b) => b[1] - a[1]);
  const beneficePositif = fin.benefice >= 0;
  const deltaBenefice = prevFin ? variation(fin.benefice, prevFin.benefice) : null;

  const teamRetards = team.map((a) => ({
    ...a,
    visitesJour: duJour.filter((v) => v.agent_id === a.id).length,
    sansRetour: todo.visitesSansRetour.filter((v) => v.agent_id === a.id).length,
  }));

  const subtitle = [
    pointsOuverts === 0 ? 'Tout est à jour' : `${pointsOuverts} point${s(pointsOuverts)} à traiter (${enAttente} élément${s(enAttente)})`,
    `bénéfice ${p.label.toLowerCase()} ${beneficePositif ? '' : '− '}${formatCHF(Math.abs(fin.benefice))}`,
  ].join(' · ');

  return (
    <PullToRefresh onRefresh={loadData} className="relative flex-1 overflow-y-auto">
      <StaffShell>
        {/* Bannière : tout en haut */}
        <DashboardBanner wrapperClassName="mb-0" />

        <div className="space-y-3">
          <DashPageHeader
            title="Tableau de bord"
            subtitle={subtitle}
            action={
              <Button variant="outline" size="sm" className="h-11 rounded-full sm:h-10" onClick={loadData} aria-label="Actualiser">
                <RefreshCw className="h-4 w-4" /><span className="ml-2 hidden sm:inline">Actualiser</span>
              </Button>
            }
          />

          {/* (a) Ma journée + (b) À traiter : premier écran */}
          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-4">
              <SectionErrorBoundary sectionName="AdminHeader">
                <DayBanner
                  greeting={prenom ? `Bonjour ${prenom}` : 'Bonjour'}
                  dateLabel={formatJourLong(now)}
                  total={duJour.length}
                  next={prochaine ? toDayVisit(prochaine) : null}
                  others={duJour.filter((v) => v !== prochaine).map(toDayVisit)}
                  onAgenda={() => navigate('/admin/calendrier')}
                  agendaLabel="Calendrier"
                />
              </SectionErrorBoundary>
            </div>
            <section className="min-w-0 space-y-2 lg:col-span-8" aria-label="À traiter">
              <h2 className="px-0.5 text-base font-semibold text-foreground">
                À traiter <span className="font-normal text-muted-foreground">· urgent d’abord</span>
              </h2>
              <ActionGrid items={actions} />
            </section>
          </div>
        </div>

        {/* (c) Cette semaine */}
        <section className="space-y-3" aria-label="Cette semaine">
          <StaffSectionTitle title="Cette semaine" subtitle="7 derniers jours et 7 prochains jours" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            <KpiTile icon={Calendar} label="Visites à venir" value={todo.visitesAVenir.length} phrase="planifiées d’ici 7 jours" onClick={() => navigate('/admin/calendrier')} />
            <KpiTile icon={CheckCircle2} label="Visites effectuées" value={semaine.visitesEffectuees} phrase="ces 7 derniers jours" onClick={() => navigate('/admin/visites')} />
            <KpiTile icon={ClipboardList} label="Candidatures" value={semaine.candidaturesDeposees} phrase="déposées en 7 jours" onClick={() => navigate('/admin/candidatures')} />
            <KpiTile icon={KeyRound} label="Baux signés" value={semaine.bauxSignes} phrase="en 7 jours" onClick={() => navigate('/admin/candidatures')} />
            <KpiTile icon={Banknote} label="Activations" value={semaine.activationsEncaissees} phrase="encaissées en 7 jours" onClick={() => navigate('/admin/demandes-activation')} />
            <KpiTile icon={Clock} label="Mandats" value={semaine.mandatsEcheance} phrase={semaine.mandatsEcheance > 0 ? 'échoient dans 7 jours : prévenir' : 'aucune échéance sous 7 jours'} onClick={() => navigate('/admin/mandats')} />
          </div>
        </section>

        {/* (d) Performance */}
        <section className="space-y-3" aria-label="Performance">
          <StaffSectionTitle title="Performance" subtitle={`Résultat et activité · ${p.label.toLowerCase()}`} />
          <DashFilterPills options={PERIODS.map((x) => ({ key: x.key, label: x.label }))} value={period} onChange={(k) => setPeriod(k as PeriodKey)} label="Période" />

          <div className="grid gap-3 lg:grid-cols-12">
            {/* Bénéfice */}
            <div className={`${DASH_CARD} flex flex-col justify-between p-5 lg:col-span-4`}>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bénéfice réel · {p.label.toLowerCase()}</p>
                <p className={`mt-1 text-[34px] font-semibold leading-tight tracking-tight tabular-nums ${beneficePositif ? 'text-foreground' : 'text-destructive'}`}>
                  {beneficePositif ? '' : '− '}{formatCHF(Math.abs(fin.benefice))}
                </p>
                {deltaBenefice && (
                  <p className={`mt-0.5 text-xs font-medium ${deltaBenefice.up ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>
                    {deltaBenefice.up ? '▲' : '▼'} {deltaBenefice.pct} % <span className="font-normal text-muted-foreground">{deltaLabel}</span>
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {fin.marge !== null && <DashBadge tone={beneficePositif ? 'success' : 'danger'}>Marge {fin.marge} %</DashBadge>}
                  <DashBadge tone="muted">{fin.affaires} affaire{fin.affaires > 1 ? 's' : ''}</DashBadge>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-3">
                  <p className="flex items-center gap-1 text-xs font-medium text-emerald-700"><ArrowUpRight className="h-3.5 w-3.5" /> Recettes</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{formatCHF(fin.recettes)}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><ArrowDownRight className="h-3.5 w-3.5" /> Dépenses</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{formatCHF(fin.depenses)}</p>
                </div>
              </div>
            </div>

            {/* Recettes */}
            <div className={`${DASH_CARD} p-4 md:p-5 lg:col-span-4`}>
              <h3 className="mb-1 text-base font-semibold text-foreground">Recettes</h3>
              <div className="divide-y divide-border/60">
                <MoneyLine label="Commissions" sub={`${fin.affairesLocation} location · ${fin.affairesAchat} achat/vente`} value={fin.commissions} tone="plus" onClick={() => setDetail({ key: 'commissions', title: 'Commissions', path: '/admin/registre-commissions' })} />
                <MoneyLine label="Activations de mandat" sub={`${fin.activationsCount} encaissée${fin.activationsCount > 1 ? 's' : ''}`} value={fin.activations} tone="plus" onClick={() => setDetail({ key: 'activations', title: 'Activations de mandat encaissées', path: '/admin/demandes-activation' })} />
                <MoneyLine label="Acomptes achat" value={fin.acomptesAchat} tone="plus" onClick={() => setDetail({ key: 'acomptesAchat', title: 'Acomptes achat encaissés' })} />
              </div>
            </div>

            {/* Dépenses */}
            <div className={`${DASH_CARD} p-4 md:p-5 lg:col-span-4`}>
              <h3 className="mb-1 text-base font-semibold text-foreground">Dépenses</h3>
              <div className="divide-y divide-border/60">
                <MoneyLine label="Remboursements versés" sub={`${fin.remboursementsCount} client${fin.remboursementsCount > 1 ? 's' : ''}`} value={fin.remboursements} tone="minus" onClick={() => setRembOpen(true)} />
                <MoneyLine label="Salaires (coût employeur)" sub="Fiches de salaire validées ou payées" value={fin.salaires} tone="minus" onClick={() => setDetail({ key: 'salaires', title: 'Salaires (coût employeur)', path: '/admin/salaires' })} />
                <MoneyLine label="Commissions agents" sub="Hors commissions déjà sur fiche de salaire" value={fin.commissionsAgents} tone="minus" onClick={() => setDetail({ key: 'commissionsAgents', title: 'Commissions agents', path: '/admin/salaires-agents' })} />
                <MoneyLine label="Charges de l'agence" sub={chargesAvailable ? (chargesCat[0] ? `dont ${chargeCategoryLabel(chargesCat[0][0]).toLowerCase()} ${formatCHF(chargesCat[0][1])}` : 'Aucune charge saisie') : 'À activer'} value={fin.charges} tone="minus" onClick={() => setChargesOpen(true)} />
              </div>
            </div>
          </div>

          {!chargesAvailable && (
            <TodoCard icon={AlertTriangle} tone="muted" title="Charges de l'agence à activer" description="Le bénéfice ne compte pas encore le loyer, la publicité ni les autres frais : collez le fichier SQL « charges_agence » dans l'éditeur SQL de Lovable Cloud." />
          )}

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            <KpiTile icon={FileText} label="Mandats signés" value={activite.mandatsSignes} delta={prevActivite ? variation(activite.mandatsSignes, prevActivite.mandatsSignes) : null} deltaLabel={deltaLabel} phrase="nouveaux clients engagés" onClick={() => navigate('/admin/mandats')} />
            <KpiTile icon={Send} label="Offres envoyées" value={activite.offresEnvoyees} phrase="biens proposés aux clients" onClick={() => navigate('/admin/offres-envoyees')} />
            <KpiTile icon={Calendar} label="Visites effectuées" value={activite.visitesEffectuees} delta={prevActivite ? variation(activite.visitesEffectuees, prevActivite.visitesEffectuees) : null} deltaLabel={deltaLabel} phrase="biens visités par les clients" onClick={() => navigate('/admin/calendrier')} />
            <KpiTile icon={ClipboardList} label="Candidatures" value={activite.candidaturesDeposees} delta={prevActivite ? variation(activite.candidaturesDeposees, prevActivite.candidaturesDeposees) : null} deltaLabel={deltaLabel} phrase="dossiers déposés" onClick={() => navigate('/admin/candidatures')} />
            <KpiTile icon={KeyRound} label="Baux signés" value={activite.bauxSignes} delta={prevActivite ? variation(activite.bauxSignes, prevActivite.bauxSignes) : null} deltaLabel={deltaLabel} phrase="clients relogés" onClick={() => navigate('/admin/candidatures')} />
            <KpiTile icon={BadgeCheck} label="Affaires conclues" value={fin.affaires} delta={prevFin ? variation(fin.affaires, prevFin.affaires) : null} deltaLabel={deltaLabel} phrase="au registre des commissions" onClick={() => navigate('/admin/registre-commissions')} />
          </div>
        </section>

        {/* Équipe : qui est en retard sur quoi */}
        <FoldSection
          id="equipe"
          title="Équipe"
          subtitle={`${actifs.length} clients actifs · ${todo.sansAgent.length} sans agent · ${team.filter((a) => a.actif).length} agent${s(team.filter((a) => a.actif).length)} actif${s(team.filter((a) => a.actif).length)}`}
          action={<DashSectionLink label="Agents" onClick={() => navigate('/admin/agents')} />}
        >
          <div className={`${DASH_CARD} hidden overflow-hidden lg:block`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Clients actifs</th>
                  <th className="px-4 py-3 font-medium">Mandats ≤ 30 j</th>
                  <th className="px-4 py-3 font-medium">Visites sans retour</th>
                  <th className="px-4 py-3 font-medium">Visites aujourd’hui</th>
                  <th className="px-4 py-3 font-medium">Offres ({p.label.toLowerCase()})</th>
                  <th className="px-4 py-3 font-medium">Affaires</th>
                  <th className="px-4 py-3 font-medium">Commission agent</th>
                  <th className="px-4 py-3 font-medium">Actif</th>
                </tr>
              </thead>
              <tbody>
                {teamRetards.map((a) => (
                  <tr key={a.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => navigate(`/admin/agents/${a.id}`)} className="font-semibold text-foreground hover:underline">{a.prenom} {a.nom}</button>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{a.clients}</td>
                    <td className="px-4 py-3 tabular-nums">{a.critiques > 0 ? <DashBadge tone="warning">{a.critiques}</DashBadge> : <span className="text-muted-foreground">0</span>}</td>
                    <td className="px-4 py-3 tabular-nums">{a.sansRetour > 0 ? <DashBadge tone="warning">{a.sansRetour}</DashBadge> : <span className="text-muted-foreground">0</span>}</td>
                    <td className="px-4 py-3 tabular-nums">{a.visitesJour}</td>
                    <td className="px-4 py-3 tabular-nums">{a.offres}</td>
                    <td className="px-4 py-3 tabular-nums">{a.affaires}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCHF(a.commission)}</td>
                    <td className="px-4 py-3"><Switch checked={a.actif} onCheckedChange={() => toggleAgentStatus(a.user_id, a.actif)} aria-label={`Activer ${a.prenom}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {teamRetards.map((a) => {
              const retards = [
                a.critiques > 0 && `${a.critiques} mandat${s(a.critiques)} ≤ 30 j`,
                a.sansRetour > 0 && `${a.sansRetour} visite${s(a.sansRetour)} sans retour`,
              ].filter(Boolean).join(' · ');
              return (
                <div key={a.id} className={`${DASH_CARD} p-4`}>
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={() => navigate(`/admin/agents/${a.id}`)} className="min-h-11 truncate text-left font-semibold text-foreground">{a.prenom} {a.nom}</button>
                    <Switch checked={a.actif} onCheckedChange={() => toggleAgentStatus(a.user_id, a.actif)} aria-label={`Activer ${a.prenom}`} />
                  </div>
                  {retards && <p className="text-xs font-medium text-amber-700 dark:text-amber-400">À relancer : {retards}</p>}
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {[['Clients', a.clients], ['≤ 30 j', a.critiques], ['Offres', a.offres], ['Affaires', a.affaires]].map(([l, v]) => (
                      <div key={l as string} className="rounded-lg bg-muted/60 py-2">
                        <p className="text-base font-semibold tabular-nums text-foreground">{v as number}</p>
                        <p className="text-[11px] text-muted-foreground">{l as string}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {a.visitesJour} visite{s(a.visitesJour)} aujourd’hui{a.commission > 0 ? ` · Commission agent : ${formatCHF(a.commission)}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </FoldSection>

        {/* (e) Analyses */}
        <FoldSection id="analyses" title="Analyses" subtitle="Évolution sur 12 mois, entonnoir de conversion, statistiques détaillées">
          <div className="grid gap-3 lg:grid-cols-12">
            {/* 12 mois */}
            <div className={`${DASH_CARD} p-4 md:p-5 lg:col-span-7`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">12 derniers mois</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Recettes</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-foreground/25" /> Dépenses</span>
                </div>
              </div>
              <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-[560px] items-end gap-2">
                  {months.map((m, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5" title={`${m.label} · recettes ${formatCHF(m.recettes)} · dépenses ${formatCHF(m.depenses)} · bénéfice ${formatCHF(m.benefice)}`}>
                      <div className="flex h-32 w-full items-end justify-center gap-0.5">
                        <div className="w-1/2 max-w-[14px] rounded-t bg-primary" style={{ height: `${Math.max(2, (m.recettes / maxMonth) * 100)}%` }} />
                        <div className="w-1/2 max-w-[14px] rounded-t bg-foreground/25" style={{ height: `${Math.max(2, (m.depenses / maxMonth) * 100)}%` }} />
                      </div>
                      <span className={`text-[11px] font-semibold tabular-nums ${m.benefice < 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {Math.abs(m.benefice) >= 1000 ? `${m.benefice < 0 ? '−' : ''}${Math.round(Math.abs(m.benefice) / 1000)}k` : Math.round(m.benefice)}
                      </span>
                      <span className="text-[11px] capitalize text-muted-foreground">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Le chiffre sous chaque mois est le bénéfice réel (recettes − dépenses). Touchez une ligne des recettes ou des dépenses pour voir le détail.</p>
            </div>

            {/* Entonnoir */}
            <div className={`${DASH_CARD} p-4 md:p-5 lg:col-span-5`}>
              <h3 className="mb-3 text-base font-semibold text-foreground">De l'offre à l'affaire conclue</h3>
              <div className="space-y-2.5">
                {funnel.map((f, i) => {
                  const prev = i > 0 ? funnel[i - 1].value : 0;
                  const taux = i > 0 && prev > 0 ? Math.round((f.value / prev) * 100) : null;
                  return (
                    <div key={f.label} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-sm text-foreground sm:w-40">{f.label}</span>
                      <div className="h-7 flex-1 overflow-hidden rounded-lg bg-muted">
                        <div className="flex h-full items-center rounded-lg bg-primary/80 px-2 text-xs font-semibold text-primary-foreground" style={{ width: `${Math.max(6, (f.value / funnelMax) * 100)}%` }}>
                          {f.value}
                        </div>
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">{taux !== null ? `${taux} %` : ''}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Le pourcentage compare chaque étape à la précédente, sur la période choisie ({p.label.toLowerCase()}).</p>
            </div>
          </div>

          {/* Statistiques détaillées (sections existantes conservées, chargées à l'ouverture) */}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className={`${DASH_CARD} flex w-full items-center gap-3 p-4 text-left`}
            aria-expanded={showMore}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"><BarChart3 className="h-[18px] w-[18px]" /></span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-foreground">Statistiques détaillées</span>
              <span className="block text-xs text-muted-foreground">Comparaisons par période, recommandations, commissions potentielles</span>
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>
          {showMore && (
            <div className="space-y-4">
              <div>
                <AdminStatsSection
                  agents={agents}
                  clients={clients}
                  transactions={transactions}
                  offres={offres}
                  registreCommissions={registre}
                  mandates={mandates}
                  candidatures={candidatures}
                />
              </div>
              <div className={`${DASH_CARD} overflow-hidden`}><RecommendationStats /></div>
              <AgencyProjectionSection projections={agencyProjections} totalCommissionAgence={totalCommissionAgence} />
            </div>
          )}
        </FoldSection>

        {/* Accès rapides : pages de gestion qui ne sont pas déjà dans « À traiter » */}
        <DashSection title="Accès rapides">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <LinkRow icon={Users} label="Clients" sub={`${actifs.length} actifs · ${clients.length} au total`} onClick={() => navigate('/admin/clients')} />
            <LinkRow icon={Calendar} label="Visites et calendrier" sub={`${todo.visitesAVenir.length} dans les 7 jours`} onClick={() => navigate('/admin/calendrier')} />
            <LinkRow icon={LifeBuoy} label="Support" sub="Demandes d'aide des utilisateurs" onClick={() => navigate('/admin/support')} />
            <LinkRow icon={Wallet} label="Registre des commissions" sub={`${registre.length} affaires enregistrées`} onClick={() => navigate('/admin/registre-commissions')} />
            <LinkRow icon={Briefcase} label="Salaires" sub="Fiches de salaire et coût employeur" onClick={() => navigate('/admin/salaires')} />
            <LinkRow icon={Settings2} label="Charges de l'agence" sub={chargesAvailable ? `${charges.length} ligne${charges.length > 1 ? 's' : ''}` : 'À activer'} onClick={() => setChargesOpen(true)} />
          </div>
        </DashSection>
      </StaffShell>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className={DETAIL_DIALOG}>
          {detail && (() => {
            const rows = fin.details[detail.key];
            const total = rows.reduce((s, r) => s + r.montant, 0);
            return (
              <>
                <DetailHeader
                  titleAs={DialogTitle}
                  descriptionAs={DialogDescription}
                  title={detail.title}
                  subtitle={`${p.label} · ${rows.length} ligne${rows.length > 1 ? 's' : ''}`}
                />
                <DetailBody>
                  <KeyFacts items={[{ label: 'Total', value: formatCHF(total), emphasis: true, wide: true }]} />
                  <DetailSection>
                    {rows.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">Rien sur cette période.</p>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {rows.map((r, i) => (
                          <div key={i} className="flex min-h-[52px] items-center gap-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-medium text-foreground">{r.label}</p>
                              <p className="truncate text-[13px] text-muted-foreground">
                                {r.date ? dateCH(r.date) : '—'}{r.note ? ` · ${r.note}` : ''}
                              </p>
                            </div>
                            <span className="shrink-0 text-[15px] font-semibold tabular-nums text-foreground">{formatCHF(r.montant)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </DetailSection>
                  {detail.key === 'commissionsAgents' && fin.commissionsSurFiches > 0 && (
                    <DetailNotice>Moins {formatCHF(fin.commissionsSurFiches)} déjà payés sur les fiches de salaire de la période.</DetailNotice>
                  )}
                  <p className="text-[13px] text-muted-foreground">Les comptes de test (adresse @immo-rama.ch ou nom « Test ») ne sont jamais comptés.</p>
                </DetailBody>
                <DetailActions>
                  <Button variant="outline" onClick={() => setDetail(null)}>Fermer</Button>
                  {detail.path && (
                    <Button onClick={() => { const to = detail.path as string; setDetail(null); navigate(to); }}>
                      Ouvrir la page
                    </Button>
                  )}
                </DetailActions>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <RemboursementsDialog
        open={rembOpen}
        onOpenChange={setRembOpen}
        available={rembAvailable}
        rows={rembRows}
        pending={todo.refundsPending.map((c): PendingRefund => ({
          clientId: c.id,
          demandeId: c.demande_mandat_id ?? null,
          nom: `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Client',
          demandeLe: c.refund_requested_at ?? null,
          montant: c.montantActivation || 300,
        }))}
        onChanged={loadData}
      />

      <ChargesAgenceDialog open={chargesOpen} onOpenChange={setChargesOpen} charges={charges} available={chargesAvailable} onChanged={loadCharges} />
    </PullToRefresh>
  );
}

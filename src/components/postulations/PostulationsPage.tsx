import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Mailbox, Search, X } from 'lucide-react';
import { DashPage, DashPageHeader, DashFilterPills, DashEmptyState } from '@/components/client/dashboard/DashPrimitives';
import { fetchAllPaginated } from '@/lib/fetchAllWithRange';
import { TablePagination, type PageSize } from '@/components/offres-auto/TablePagination';
import { toast } from 'sonner';
import { PostulationCard, DossierSeulCard } from './PostulationCard';
import {
  attente, choisirDossier, nomClient, prochaineAction,
  type ClientInfo, type Dossier, type Etape, type JobInfo, type Row,
} from './postulationsModel';

type SortKey = 'urgence' | 'recent' | 'oldest' | 'client_az';
type PeriodKey = 'all' | '7d' | '30d';

interface Props {
  scope: 'agent' | 'admin';
  title?: string;
}

/** Dossiers préparés des 30 derniers jours ; pour un agent, seulement ceux de ses clients. */
async function chargerDossiers(allowedClientIds: string[] | null): Promise<Dossier[]> {
  const depuis = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await (supabase as any)
    .from('postulations_preparees')
    .select('*')
    .gte('created_at', depuis)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return []; // table absente ou droits insuffisants : rien à afficher
  const list = (data ?? []) as Dossier[];
  if (!allowedClientIds) return list;
  const autorises = new Set(allowedClientIds);
  return list.filter((d) => d.client_id && autorises.has(d.client_id));
}

const ETAPES: { key: Etape; label: string }[] = [
  { key: 'a_traiter', label: 'À traiter' },
  { key: 'en_cours', label: 'En préparation' },
  { key: 'deposees', label: 'Déposées' },
  { key: 'historique', label: 'Dossiers envoyés / refusés' },
];

/**
 * Postulations — une seule file de travail, rangée par étape :
 * À traiter (une action du staff est attendue) → En préparation (la routine travaille) → Déposées.
 * Chaque demande réunit la demande du client, la préparation automatique et le dossier préparé,
 * avec UNE prochaine action. Cartes empilées sur mobile, trois colonnes sur grand écran.
 */
export function PostulationsPage({ scope, title }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientQ, setClientQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyDossier, setBusyDossier] = useState<string | null>(null);
  const [tab, setTab] = useState<Etape>('a_traiter');
  const [sortKey, setSortKey] = useState<SortKey>('urgence');
  const [period, setPeriod] = useState<PeriodKey>('all');

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      let allowedClientIds: string[] | null = null;

      if (scope === 'agent') {
        const { data: agentData } = await supabase
          .from('agents').select('id').eq('user_id', user.id).maybeSingle();
        if (!agentData) { setRows([]); setDossiers([]); return; }
        const [{ data: own }, { data: co }] = await Promise.all([
          supabase.from('clients').select('id').eq('agent_id', agentData.id),
          supabase.from('client_agents').select('client_id').eq('agent_id', agentData.id),
        ]);
        allowedClientIds = Array.from(new Set([
          ...(own ?? []).map((c: any) => c.id),
          ...(co ?? []).map((c: any) => c.client_id),
        ]));
        if (allowedClientIds.length === 0) { setRows([]); setDossiers([]); return; }
      }

      const { data, error } = await fetchAllPaginated<Row>(() => {
        let q = supabase
          .from('offres')
          .select('id, created_at, updated_at, date_envoi, postulation_demandee_at, adresse, prix, pieces, statut, lien_annonce, client_id, agent_id')
          .in('statut', ['souhaite_postuler', 'candidature_deposee'])
          .order('created_at', { ascending: false });
        if (allowedClientIds) q = q.in('client_id', allowedClientIds);
        return q;
      });
      if (error) { console.error('[Postulations] load', error); setRows([]); return; }

      const offres = (data ?? []) as Row[];

      const clientIds = Array.from(new Set(offres.map((o) => o.client_id).filter(Boolean)));
      if (clientIds.length === 0) { setRows([]); setDossiers(await chargerDossiers(allowedClientIds)); return; }

      const { data: clients } = await supabase
        .from('clients').select('id, user_id').in('id', clientIds);
      const userIds = Array.from(new Set((clients ?? []).map((c) => c.user_id).filter(Boolean)));
      const clientToUser = new Map<string, string>((clients ?? []).map((c) => [c.id, c.user_id as string]));

      let profileByUser = new Map<string, ClientInfo>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, prenom, nom, email').in('id', userIds);
        profileByUser = new Map((profiles ?? []).map((p: any) => [p.id as string, { prenom: p.prenom, nom: p.nom, email: p.email }]));
      }

      const jobByOffre = new Map<string, JobInfo>();
      const offreIds = offres.map((o) => o.id);
      for (let i = 0; i < offreIds.length; i += 200) {
        const { data: jobs } = await supabase
          .from('postulation_jobs')
          .select('id, offre_id, status, priority, created_at, ai_result')
          .in('offre_id', offreIds.slice(i, i + 200));
        for (const j of jobs ?? []) jobByOffre.set(j.offre_id, j as unknown as JobInfo);
      }

      // Dossiers préparés (routine Postulation + Surveillance) des 30 derniers jours, rattachés à leur offre.
      const dossiersCharges = await chargerDossiers(allowedClientIds);
      const parOffre = new Map<string, Dossier[]>();
      for (const d of dossiersCharges) {
        if (!d.offre_id) continue;
        parOffre.set(d.offre_id, [...(parOffre.get(d.offre_id) ?? []), d]);
      }

      setDossiers(dossiersCharges);
      setRows(offres.map((o) => ({
        ...o,
        _job: jobByOffre.get(o.id),
        _dossier: choisirDossier(parOffre.get(o.id) ?? []),
        demande_at: o.postulation_demandee_at ?? o.created_at ?? null,
        _client: profileByUser.get(clientToUser.get(o.client_id) ?? '') ?? {},
      })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id, scope]);

  // Recherche et période s'appliquent à toutes les étapes : les compteurs suivent.
  const correspond = (texte: string, date?: string | null) => {
    if (period !== 'all') {
      if (!date) return false;
      const cutoff = Date.now() - (period === '7d' ? 7 : 30) * 24 * 3600 * 1000;
      if (new Date(date).getTime() < cutoff) return false;
    }
    return !clientQ || texte.toLowerCase().includes(clientQ.toLowerCase());
  };

  const rowsVisibles = useMemo(() => rows.filter((r) => correspond(
    `${r._client?.prenom ?? ''} ${r._client?.nom ?? ''} ${r._client?.email ?? ''} ${r.adresse ?? ''}`,
    r.demande_at,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  )), [rows, clientQ, period]);

  // Dossiers sans demande en attente dans la liste (offre déjà traitée ou non liée).
  const offresListees = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const dossiersVisibles = useMemo(() => dossiers.filter((d) => correspond(
    `${d.client_nom ?? ''} ${d.adresse_bien ?? ''} ${d.objet ?? ''} ${d.regie_nom ?? ''} ${d.destinataire_email ?? ''}`,
    d.created_at,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  )), [dossiers, clientQ, period]);
  const orphelins = useMemo(() => dossiersVisibles.filter((d) => !d.offre_id || !offresListees.has(d.offre_id)), [dossiersVisibles, offresListees]);
  const orphelinsATraiter = orphelins.filter((d) => d.statut === 'a_valider' || d.statut === 'erreur');
  const orphelinsEnCours = orphelins.filter((d) => d.statut === 'prepare' || d.statut === 'valide');
  const historique = dossiersVisibles.filter((d) => d.statut === 'envoye' || d.statut === 'refuse');

  const parEtape = useMemo(() => {
    const m: Record<Etape, Row[]> = { a_traiter: [], en_cours: [], deposees: [], historique: [] };
    for (const r of rowsVisibles) m[prochaineAction(r).etape].push(r);
    return m;
  }, [rowsVisibles]);

  const counts: Record<Etape, number> = {
    a_traiter: parEtape.a_traiter.length + orphelinsATraiter.length,
    en_cours: parEtape.en_cours.length + orphelinsEnCours.length,
    deposees: parEtape.deposees.length,
    historique: historique.length,
  };
  const enRetard = rows.filter((r) => attente(r).enRetard).length;

  const sorted = useMemo(() => {
    const arr = [...parEtape[tab]];
    const t = (r: Row) => new Date(r.demande_at || r.created_at || 0).getTime();
    if (sortKey === 'client_az') {
      arr.sort((a, b) => nomClient(a._client).localeCompare(nomClient(b._client), 'fr'));
    } else if (sortKey === 'urgence') {
      // Décisions sur un dossier d'abord, puis les plus anciennes demandes.
      arr.sort((a, b) => Number(!!prochaineAction(b).decision) - Number(!!prochaineAction(a).decision) || t(a) - t(b));
    } else {
      arr.sort((a, b) => (sortKey === 'recent' ? t(b) - t(a) : t(a) - t(b)));
    }
    return arr;
  }, [parEtape, tab, sortKey]);

  useEffect(() => { setPage(1); }, [clientQ, pageSize, tab, sortKey, period]);
  const paged = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  const decider = async (d: Dossier, statut: 'valide' | 'refuse') => {
    setBusyDossier(d.id);
    const patch: Record<string, unknown> = { statut, updated_at: new Date().toISOString() };
    if (statut === 'valide') { patch.valide_par = user?.id ?? null; patch.valide_le = new Date().toISOString(); }
    const { error } = await (supabase as any).from('postulations_preparees').update(patch).eq('id', d.id);
    setBusyDossier(null);
    if (error) { toast.error('Impossible d’enregistrer la décision'); return; }
    toast.success(statut === 'valide' ? 'Validé : la routine l’enverra au prochain passage' : 'Dossier refusé');
    // Mise à jour locale immédiate (la carte change d'étape sans recharger la page).
    const maj = (x: Dossier) => (x.id === d.id ? { ...x, ...patch } as Dossier : x);
    setDossiers((prev) => prev.map(maj));
    setRows((prev) => prev.map((r) => (r._dossier?.id === d.id ? { ...r, _dossier: maj(r._dossier) } : r)));
  };

  const markCandidatureDeposee = async (row: Row) => {
    setSavingId(row.id);
    try {
      const { error } = await supabase
        .from('offres')
        .update({ statut: 'candidature_deposee' })
        .eq('id', row.id);
      if (error) throw error;

      // Notify the client (best-effort)
      try {
        const { data: cli } = await supabase
          .from('clients').select('user_id').eq('id', row.client_id).maybeSingle();
        if (cli?.user_id) {
          await supabase.rpc('create_notification', {
            p_user_id: cli.user_id,
            p_type: 'candidature_deposee',
            p_title: '📮 Votre candidature a été déposée',
            p_message: `Votre candidature pour ${row.adresse ?? 'le logement'} a été déposée.`,
            p_link: '/client/mes-candidatures',
            p_metadata: { offre_id: row.id } as any,
          });
        }
      } catch (nerr) {
        console.warn('[Postulations] notification failed (non-blocking)', nerr);
      }

      toast.success('Candidature marquée comme déposée');
      // Keep the row visible: switch its status locally instead of removing it.
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, statut: 'candidature_deposee' } : r));
    } catch (err: any) {
      console.error('[Postulations] mark deposee', err);
      toast.error(err?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingId(null);
    }
  };

  const deleteOffre = async (row: Row) => {
    setDeletingId(row.id);
    try {
      const { error } = await supabase.from('offres').delete().eq('id', row.id);
      if (error) throw error;
      toast.success('Offre supprimée');
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err: any) {
      console.error('[Postulations] delete offre', err);
      toast.error(err?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const listeVide = tab === 'historique'
    ? historique.length === 0
    : paged.length === 0 && (tab === 'a_traiter' ? orphelinsATraiter.length === 0 : tab === 'en_cours' ? orphelinsEnCours.length === 0 : true);

  const carte = (r: Row) => (
    <PostulationCard
      key={r.id}
      r={r}
      scope={scope}
      saving={savingId === r.id}
      deleting={deletingId === r.id}
      busyDossier={!!r._dossier && busyDossier === r._dossier.id}
      onDeposer={markCandidatureDeposee}
      onSupprimer={deleteOffre}
      onDecider={decider}
    />
  );

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title={title || 'Postulations'}
        subtitle={
          loading && rows.length === 0
            ? 'Chargement…'
            : counts.a_traiter === 0
              ? 'Tout est à jour : aucune action en attente.'
              : `${counts.a_traiter} demande${counts.a_traiter > 1 ? 's' : ''} à traiter${enRetard > 0 ? ` · ${enRetard} en attente depuis plus de 24 h` : ''}`
        }
        action={
          <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={load} disabled={loading} aria-label="Actualiser">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Actualiser</span>
          </Button>
        }
      />

      {/* Barre d'outils : recherche plein écran sur mobile, tri et période à côté sur grand écran */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={clientQ}
            onChange={(e) => setClientQ(e.target.value)}
            placeholder="Client, e-mail, adresse, régie…"
            aria-label="Rechercher une postulation"
            className="h-11 rounded-full pl-10 pr-10"
          />
          {clientQ && (
            <button type="button" onClick={() => setClientQ('')} aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:w-auto">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-11 rounded-full md:w-[190px]" aria-label="Trier"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="urgence">Urgent d’abord</SelectItem>
              <SelectItem value="recent">Plus récentes</SelectItem>
              <SelectItem value="oldest">Plus anciennes</SelectItem>
              <SelectItem value="client_az">Par client (A–Z)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="h-11 rounded-full md:w-[170px]" aria-label="Période"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les dates</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DashFilterPills
        label="Étapes des postulations"
        value={tab}
        onChange={(v) => setTab(v as Etape)}
        options={ETAPES.map((e) => ({ key: e.key, label: e.label, count: counts[e.key] }))}
      />

      {loading && rows.length === 0 && dossiers.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : listeVide ? (
        <DashEmptyState
          icon={Mailbox}
          title={
            clientQ || period !== 'all' ? 'Aucun résultat pour ces filtres'
              : tab === 'a_traiter' ? 'Rien à traiter pour le moment'
              : tab === 'en_cours' ? 'Aucune préparation en cours'
              : tab === 'deposees' ? 'Aucune candidature déposée'
              : 'Aucun dossier envoyé ou refusé ces 30 derniers jours'
          }
          description={tab === 'a_traiter' && !clientQ ? 'Les demandes de postulation des clients arrivent ici dès qu’une action de votre part est nécessaire.' : undefined}
        />
      ) : tab === 'historique' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {historique.map((d) => <DossierSeulCard key={d.id} d={d} scope={scope} busy={busyDossier === d.id} onDecider={decider} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {paged.map(carte)}

          {/* Dossiers préparés dont l'offre n'est plus en attente dans la liste */}
          {(tab === 'a_traiter' ? orphelinsATraiter : tab === 'en_cours' ? orphelinsEnCours : []).length > 0 && (
            <section className="space-y-3 pt-2" aria-label="Autres dossiers préparés">
              <h2 className="px-0.5 text-sm font-semibold text-muted-foreground">Autres dossiers préparés</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(tab === 'a_traiter' ? orphelinsATraiter : orphelinsEnCours).map((d) => (
                  <DossierSeulCard key={d.id} d={d} scope={scope} busy={busyDossier === d.id} onDecider={decider} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {tab !== 'historique' && sorted.length > pageSize && (
        <TablePagination
          total={sorted.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="demandes"
        />
      )}
    </DashPage>
  );
}

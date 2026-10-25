import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, RefreshCw, ExternalLink, CheckCircle2, Mailbox, Trash2 } from 'lucide-react';
import { DASH_CARD, DashPage, DashPageHeader, DashFilterPills, DashBadge, DashEmptyState } from '@/components/client/dashboard/DashPrimitives';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchAllPaginated } from '@/lib/fetchAllWithRange';
import { TablePagination, type PageSize } from '@/components/offres-auto/TablePagination';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DossiersPreparesPanel } from './DossiersPreparesPanel';
import { toast } from 'sonner';

type PostulationTab = 'a_faire' | 'deposees';

type ClientInfo = { prenom?: string | null; nom?: string | null; email?: string | null };

type Row = {
  id: string;
  created_at: string;
  updated_at: string;
  date_envoi?: string | null;
  postulation_demandee_at?: string | null;
  adresse: string | null;
  prix: number | null;
  pieces: number | null;
  statut: string | null;
  lien_annonce: string | null;
  client_id: string;
  agent_id?: string | null;
  demande_at?: string | null;
  _client?: ClientInfo;
  _job?: JobInfo;
};

type JobInfo = {
  id: string;
  status: string;
  priority: string | null;
  created_at: string;
  ai_result: { missing_items?: string[]; concise_staff_summary?: string } | null;
};

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';
const JOB_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  queued: { label: 'En file', tone: 'muted' },
  processing: { label: 'Analyse…', tone: 'neutral' },
  ready: { label: 'Prêt', tone: 'success' },
  blocked: { label: 'Bloqué', tone: 'warning' },
  failed: { label: 'Erreur', tone: 'danger' },
  completed: { label: 'Terminé', tone: 'success' },
};
const PRIORITY_LABEL: Record<string, string> = { low: 'Basse', normal: 'Normale', high: 'Haute', urgent: 'Urgente' };

type SortKey = 'recent' | 'oldest' | 'client_az';
type PeriodKey = 'all' | '7d' | '30d';

interface Props {
  scope: 'agent' | 'admin';
  title?: string;
}

export function PostulationsPage({ scope, title }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientQ, setClientQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(50);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<PostulationTab>('a_faire');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [period, setPeriod] = useState<PeriodKey>('all');

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      let allowedClientIds: string[] | null = null;

      if (scope === 'agent') {
        const { data: agentData } = await supabase
          .from('agents').select('id').eq('user_id', user.id).maybeSingle();
        if (!agentData) { setRows([]); return; }
        const [{ data: own }, { data: co }] = await Promise.all([
          supabase.from('clients').select('id').eq('agent_id', agentData.id),
          supabase.from('client_agents').select('client_id').eq('agent_id', agentData.id),
        ]);
        allowedClientIds = Array.from(new Set([
          ...(own ?? []).map((c: any) => c.id),
          ...(co ?? []).map((c: any) => c.client_id),
        ]));
        if (allowedClientIds.length === 0) { setRows([]); return; }
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
      if (clientIds.length === 0) { setRows([]); return; }

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

      setRows(offres.map((o) => ({
        ...o,
        _job: jobByOffre.get(o.id),
        demande_at: o.postulation_demandee_at ?? o.created_at ?? null,
        _client: profileByUser.get(clientToUser.get(o.client_id) ?? '') ?? {},
      })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id, scope]);

  const counts = useMemo(() => ({
    a_faire: rows.filter((r) => r.statut === 'souhaite_postuler').length,
    deposees: rows.filter((r) => r.statut === 'candidature_deposee').length,
  }), [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    const targetStatut = tab === 'a_faire' ? 'souhaite_postuler' : 'candidature_deposee';
    if (r.statut !== targetStatut) return false;
    if (period !== 'all') {
      if (!r.demande_at) return false;
      const d = new Date(r.demande_at).getTime();
      const cutoff = Date.now() - (period === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000;
      if (d < cutoff) return false;
    }
    if (!clientQ) return true;
    const q = clientQ.toLowerCase();
    const name = `${r._client?.prenom ?? ''} ${r._client?.nom ?? ''} ${r._client?.email ?? ''} ${r.adresse ?? ''}`.toLowerCase();
    return name.includes(q);
  }), [rows, clientQ, tab, period]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const t = (r: Row) => new Date(r.demande_at || r.created_at || 0).getTime();
    if (sortKey === 'client_az') {
      arr.sort((a, b) => {
        const na = `${a._client?.nom ?? ''} ${a._client?.prenom ?? ''}`.trim().toLowerCase();
        const nb = `${b._client?.nom ?? ''} ${b._client?.prenom ?? ''}`.trim().toLowerCase();
        return na.localeCompare(nb, 'fr');
      });
    } else {
      arr.sort((a, b) => (sortKey === 'recent' ? t(b) - t(a) : t(a) - t(b)));
    }
    return arr;
  }, [filtered, sortKey]);

  useEffect(() => { setPage(1); }, [clientQ, pageSize, tab, sortKey, period]);
  const paged = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

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

  return (
    <DashPage className="space-y-6">
      <DashPageHeader
        title={title || 'Postulations à faire'}
        subtitle="Offres pour lesquelles le client a demandé à déposer sa candidature."
        action={
          <Button variant="outline" size="sm" className="rounded-full" onClick={load} disabled={loading} aria-label="Actualiser">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        }
      />

      <DossiersPreparesPanel />

      <div>
      <DashFilterPills
        label="Onglets postulations"
        value={tab}
        onChange={(v) => setTab(v as PostulationTab)}
        options={[
          { key: 'a_faire', label: 'À faire', count: counts.a_faire },
          { key: 'deposees', label: 'Déposées', count: counts.deposees },
        ]}
      />

      <div className={`${DASH_CARD} grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-4 md:p-5`}>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Recherche (client, email, adresse)</label>
            <Input value={clientQ} onChange={(e) => setClientQ(e.target.value)} placeholder="Rechercher…" className="rounded-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Trier par</label>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Plus récentes</SelectItem>
                <SelectItem value="oldest">Plus anciennes</SelectItem>
                <SelectItem value="client_az">Par client (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Période</label>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
              <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 md:col-span-4">
            <DashBadge tone={tab === 'a_faire' ? 'warning' : 'success'}>
              {filtered.length} {tab === 'a_faire' ? 'à traiter' : 'déposée(s)'}
            </DashBadge>
          </div>
      </div>
      </div>

      {paged.length === 0 ? (
        <DashEmptyState icon={Mailbox} title={tab === 'a_faire' ? 'Aucune postulation en attente.' : 'Aucune candidature déposée.'} />
      ) : (
        <div className={`${DASH_CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground">
                <TableHead>Demandé le</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Prix (CHF/mois CC)</TableHead>
                <TableHead>Pcs</TableHead>
                <TableHead>Annonce</TableHead>
                <TableHead>Préparation</TableHead>
                <TableHead className="text-right">{tab === 'a_faire' ? 'Action' : 'Statut'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&>tr]:border-border/70 [&>tr:hover]:bg-muted/50">
              {paged.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {r.demande_at ? format(new Date(r.demande_at), 'dd MMM HH:mm', { locale: fr }) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{r._client?.prenom ?? ''} {r._client?.nom ?? ''}</div>
                    <div className="text-xs text-muted-foreground">{r._client?.email ?? ''}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.adresse ?? '—'}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{r.prix ? `${Number(r.prix).toLocaleString('fr-CH')} CHF` : '—'}</TableCell>
                  <TableCell className="text-sm">{r.pieces ?? '—'}</TableCell>
                  <TableCell>
                    {r.lien_annonce ? (
                      <a href={r.lien_annonce} target="_blank" rel="noreferrer"
                         className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                        <ExternalLink className="h-3.5 w-3.5" /> Voir l'annonce
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs min-w-[180px]">
                    {r._job ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <DashBadge tone={JOB_STATUS[r._job.status]?.tone ?? 'neutral'}>
                            {JOB_STATUS[r._job.status]?.label ?? r._job.status}
                          </DashBadge>
                          {r._job.priority && (
                            <DashBadge tone="neutral">Priorité {PRIORITY_LABEL[r._job.priority] ?? r._job.priority}</DashBadge>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          Demande : {format(new Date(r._job.created_at), 'dd MMM HH:mm', { locale: fr })}
                        </div>
                        {(r._job.ai_result?.missing_items?.length ?? 0) > 0 && (
                          <ul className="list-disc pl-4 text-amber-700 dark:text-amber-400">
                            {r._job.ai_result!.missing_items!.slice(0, 6).map((m) => <li key={m}>{m}</li>)}
                          </ul>
                        )}
                        {r._job.ai_result?.concise_staff_summary && (
                          <p className="text-muted-foreground">{r._job.ai_result.concise_staff_summary}</p>
                        )}
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      {r.statut === 'candidature_deposee' ? (
                        <DashBadge tone="success">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Déposée
                        </DashBadge>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-full"
                          disabled={savingId === r.id}
                          onClick={() => markCandidatureDeposee(r)}
                        >
                          {savingId === r.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                          )}
                          Candidature déposée
                        </Button>
                      )}
                      {scope === 'admin' && (
                        <ConfirmDialog
                          trigger={
                            <Button variant="destructive" size="sm" className="rounded-full" disabled={deletingId === r.id}>
                              {deletingId === r.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          }
                          title="Supprimer l'offre"
                          description="Supprimer définitivement cette offre ? Cette action est irréversible et retire aussi la candidature/visite liée."
                          confirmText="Supprimer"
                          cancelText="Annuler"
                          variant="destructive"
                          onConfirm={() => deleteOffre(r)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      <TablePagination
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </DashPage>
  );
}

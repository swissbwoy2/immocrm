import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, RefreshCw, ExternalLink, CheckCircle2, Mailbox } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchAllPaginated } from '@/lib/fetchAllWithRange';
import { TablePagination, type PageSize } from '@/components/offres-auto/TablePagination';
import { toast } from 'sonner';

type PostulationTab = 'a_faire' | 'deposees';

type ClientInfo = { prenom?: string | null; nom?: string | null; email?: string | null };

type Row = {
  id: string;
  created_at: string;
  adresse: string | null;
  prix: number | null;
  pieces: number | null;
  statut: string | null;
  lien_annonce: string | null;
  client_id: string;
  agent_id?: string | null;
  _client?: ClientInfo;
};

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
  const [tab, setTab] = useState<PostulationTab>('a_faire');

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
          .select('id, created_at, adresse, prix, pieces, statut, lien_annonce, client_id, agent_id')
          .in('statut', ['souhaite_postuler', 'candidature_deposee'])
          .order('created_at', { ascending: false });
        if (allowedClientIds) q = q.in('client_id', allowedClientIds);
        return q;
      });
      if (error) { console.error('[Postulations] load', error); setRows([]); return; }

      const offres = (data ?? []) as Row[];
      const clientIds = Array.from(new Set(offres.map((o) => o.client_id).filter(Boolean)));
      if (clientIds.length === 0) { setRows(offres); return; }

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

      setRows(offres.map((o) => ({
        ...o,
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
    if (!clientQ) return true;
    const q = clientQ.toLowerCase();
    const name = `${r._client?.prenom ?? ''} ${r._client?.nom ?? ''} ${r._client?.email ?? ''} ${r.adresse ?? ''}`.toLowerCase();
    return name.includes(q);
  }), [rows, clientQ, tab]);

  useEffect(() => { setPage(1); }, [clientQ, pageSize, tab]);
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mailbox className="w-6 h-6 text-primary" /> {title || 'Postulations à faire'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Offres pour lesquelles le client a demandé à déposer sa candidature.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as PostulationTab)}>
        <TabsList>
          <TabsTrigger value="a_faire" className="gap-2">
            À faire
            <Badge variant="secondary" className="bg-violet-100 text-violet-800 border-violet-300">{counts.a_faire}</Badge>
          </TabsTrigger>
          <TabsTrigger value="deposees" className="gap-2">
            Déposées
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-300">{counts.deposees}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Recherche (client, email, adresse)</label>
            <Input value={clientQ} onChange={(e) => setClientQ(e.target.value)} placeholder="Rechercher…" />
          </div>
          <div className="flex items-end">
            <Badge variant="outline" className={tab === 'a_faire' ? 'bg-violet-100 text-violet-800 border-violet-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}>
              {filtered.length} {tab === 'a_faire' ? 'à traiter' : 'déposée(s)'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {paged.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12 border rounded-lg">
          {tab === 'a_faire' ? 'Aucune postulation en attente.' : 'Aucune candidature déposée.'}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Prix (CHF/mois CC)</TableHead>
                <TableHead>Pcs</TableHead>
                <TableHead>Annonce</TableHead>
                <TableHead className="text-right">{tab === 'a_faire' ? 'Action' : 'Statut'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {format(new Date(r.created_at), 'dd MMM HH:mm', { locale: fr })}
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
                         className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs">
                        <ExternalLink className="h-3.5 w-3.5" /> Voir l'annonce
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.statut === 'candidature_deposee' ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Déposée
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={savingId === r.id}
                        onClick={() => markCandidatureDeposee(r)}
                      >
                        {savingId === r.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        ✅ Candidature déposée
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TablePagination
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

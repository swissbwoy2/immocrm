import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statutLabel } from '@/hooks/useCandidatCandidatures';
import { CAND_SELECT, bienLabel } from './CandidatureRelocationDetail';

const STATUTS = ['en_attente', 'visite_effectuee', 'candidature_deposee', 'documents_demandes', 'retenu_bailleur', 'bail_signe', 'etat_lieux_effectue', 'cles_remises', 'refuse', 'refusee', 'desiste'];
const fmtD = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' }) : '—';
const bad = (s: string) => ['refuse', 'refusee', 'desiste'].includes(s);

export default function CandidaturesRelocation() {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).from('candidatures_location').select(CAND_SELECT)
        .order('date_depot', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(15000);
      if (error) toast.error(error.message);
      setRows(data ?? []); setLoading(false);
    })();
  }, []);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (filter === 'tous' || r.statut === filter) &&
      (!t || [r.prenom, r.nom, r.email, r.telephone, bienLabel(r)].filter(Boolean).join(' ').toLowerCase().includes(t)));
  }, [rows, filter, q]);
  const go = (id: string) => nav(`/admin/candidatures-relocation/${id}`);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
        <h1 className="text-2xl font-bold text-foreground">Candidats location <span className="text-base font-normal text-muted-foreground">({list.length})</span></h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher nom, e-mail, téléphone, adresse…" className="min-h-[44px] pl-9" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="min-h-[44px] sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              {STATUTS.map((k) => <SelectItem key={k} value={k}>{statutLabel(k)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : list.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Aucun candidat.</CardContent></Card>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {list.map((r) => (
                <Card key={r.id} className="cursor-pointer active:bg-muted/40" onClick={() => go(r.id)}>
                  <CardContent className="space-y-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground">{r.prenom} {r.nom}</p>
                      <Badge variant={bad(r.statut) ? 'destructive' : 'secondary'}>{statutLabel(r.statut)}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{r.email} · {r.telephone}</p>
                    <p className="truncate text-sm">{bienLabel(r)}</p>
                    <p className="text-xs text-muted-foreground">Dépôt : {fmtD(r.date_depot)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr><th className="p-3">Nom</th><th className="p-3">E-mail</th><th className="p-3">Téléphone</th><th className="p-3">Annonce</th><th className="p-3">Statut</th><th className="p-3">Dépôt</th></tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/40" onClick={() => go(r.id)}>
                      <td className="p-3 font-medium">{r.prenom} {r.nom}</td>
                      <td className="max-w-[200px] truncate p-3">{r.email}</td>
                      <td className="p-3">{r.telephone}</td>
                      <td className="max-w-[240px] truncate p-3">{bienLabel(r)}</td>
                      <td className="p-3"><Badge variant={bad(r.statut) ? 'destructive' : 'secondary'}>{statutLabel(r.statut)}</Badge></td>
                      <td className="p-3">{fmtD(r.date_depot)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

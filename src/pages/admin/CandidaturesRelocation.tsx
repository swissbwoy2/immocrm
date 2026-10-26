import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statutLabel } from '@/hooks/useCandidatCandidatures';
import { CAND_SELECT, bienLabel } from './CandidatureRelocationDetail';
import { GenerateurLienPostulation } from '@/components/admin/GenerateurLienPostulation';
import { DashPage, DashPageHeader, DASH_CARD, DashBadge, DashEmptyState } from '@/components/client/dashboard/DashPrimitives';

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
    <DashPage className="space-y-4">
        <DashPageHeader title="Candidats location" subtitle={`${list.length} candidat${list.length > 1 ? 's' : ''}`} />
        <GenerateurLienPostulation />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher nom, e-mail, téléphone, adresse…" className="min-h-[44px] rounded-full pl-9" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="min-h-[44px] rounded-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              {STATUTS.map((k) => <SelectItem key={k} value={k}>{statutLabel(k)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : list.length === 0 ? (
          <DashEmptyState icon={Users} title="Aucun candidat." />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {list.map((r) => (
                <div key={r.id} className={`${DASH_CARD} cursor-pointer space-y-1 p-4 active:bg-muted/50`} onClick={() => go(r.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground">{r.prenom} {r.nom}</p>
                      <DashBadge tone={bad(r.statut) ? 'danger' : 'muted'}>{statutLabel(r.statut)}</DashBadge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{r.email} · {r.telephone}</p>
                    <p className="truncate text-sm">{bienLabel(r)}</p>
                    <p className="text-xs text-muted-foreground">Dépôt : {fmtD(r.date_depot)}</p>
                </div>
              ))}
            </div>
            <div className={`${DASH_CARD} hidden overflow-hidden md:block`}>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/70 text-left text-xs font-medium text-muted-foreground">
                  <tr className="[&>th]:font-medium"><th className="p-3">Nom</th><th className="p-3">E-mail</th><th className="p-3">Téléphone</th><th className="p-3">Annonce</th><th className="p-3">Statut</th><th className="p-3">Dépôt</th></tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {list.map((r) => (
                    <tr key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => go(r.id)}>
                      <td className="p-3 font-medium">{r.prenom} {r.nom}</td>
                      <td className="max-w-[200px] truncate p-3">{r.email}</td>
                      <td className="p-3">{r.telephone}</td>
                      <td className="max-w-[240px] truncate p-3">{bienLabel(r)}</td>
                      <td className="p-3"><DashBadge tone={bad(r.statut) ? 'danger' : 'muted'}>{statutLabel(r.statut)}</DashBadge></td>
                      <td className="p-3">{fmtD(r.date_depot)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}
    </DashPage>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Key, MapPin, Calendar, Users, Camera, FileText, Phone, Mail, Search,
  Building2, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';

interface RelouerRequest {
  id: string;
  status: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  property_street: string | null;
  property_zip: string | null;
  property_city: string | null;
  property_type: string | null;
  rooms: number | null;
  surface: number | null;
  rent_net: number | null;
  availability_date: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new_request: { label: 'Nouvelle', color: 'bg-blue-100 text-blue-700' },
  to_qualify: { label: 'À qualifier', color: 'bg-amber-100 text-amber-800' },
  missing_information: { label: 'Infos manquantes', color: 'bg-amber-100 text-amber-800' },
  waiting_documents: { label: 'Docs en attente', color: 'bg-amber-100 text-amber-800' },
  waiting_photos: { label: 'Photos en attente', color: 'bg-amber-100 text-amber-800' },
  ready_to_publish: { label: 'Prêt à publier', color: 'bg-emerald-100 text-emerald-700' },
  published: { label: 'Publié', color: 'bg-emerald-100 text-emerald-700' },
  visits_scheduled: { label: 'Visites en cours', color: 'bg-indigo-100 text-indigo-700' },
  applications_received: { label: 'Candidatures reçues', color: 'bg-indigo-100 text-indigo-700' },
  sent_to_agency: { label: 'Transmis régie', color: 'bg-purple-100 text-purple-700' },
  rented: { label: 'Reloué', color: 'bg-emerald-200 text-emerald-800' },
  cancelled: { label: 'Annulé', color: 'bg-zinc-100 text-zinc-600' },
  archived: { label: 'Archivé', color: 'bg-zinc-100 text-zinc-600' },
};

export default function AdminRelouer() {
  const [requests, setRequests] = useState<RelouerRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    document.title = 'Logements à relouer — Admin | Logisorama';
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('relouer_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      console.error(error);
      setRequests([]);
    } else {
      setRequests((data as any) || []);
    }

    // photo / doc counts per request
    if (data && data.length) {
      const ids = data.map((r: any) => r.id);
      const [{ data: photos }, { data: docs }, { data: cands }] = await Promise.all([
        supabase.from('relouer_photos').select('request_id').in('request_id', ids),
        supabase.from('relouer_documents').select('request_id').in('request_id', ids),
        supabase.from('relouer_candidates').select('request_id').in('request_id', ids),
      ]);
      const tally = (rows: any[] | null, key: string) => {
        const acc: Record<string, number> = {};
        (rows || []).forEach((r) => {
          acc[`${key}:${r.request_id}`] = (acc[`${key}:${r.request_id}`] || 0) + 1;
        });
        return acc;
      };
      setCounts({
        ...tally(photos, 'photo'),
        ...tally(docs, 'doc'),
        ...tally(cands, 'cand'),
      });
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (q.trim()) {
        const needle = q.toLowerCase();
        const hay = [
          r.prenom, r.nom, r.email, r.telephone,
          r.property_street, r.property_city, r.property_zip,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [requests, q, statusFilter]);

  const kpi = useMemo(() => {
    const k = {
      total: requests.length,
      new: 0,
      missingPhotos: 0,
      missingDocs: 0,
      readyToPublish: 0,
      visits: 0,
      applications: 0,
      rentedThisMonth: 0,
      noAgent: 0,
    };
    const thisMonth = new Date();
    thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
    requests.forEach((r) => {
      if (r.status === 'new_request') k.new++;
      if ((counts[`photo:${r.id}`] || 0) === 0) k.missingPhotos++;
      if ((counts[`doc:${r.id}`] || 0) === 0) k.missingDocs++;
      if (r.status === 'ready_to_publish' || r.status === 'published') k.readyToPublish++;
      if (r.status === 'visits_scheduled') k.visits++;
      if ((counts[`cand:${r.id}`] || 0) > 0) k.applications++;
      if (r.status === 'rented' && new Date(r.updated_at) >= thisMonth) k.rentedThisMonth++;
      if (!r.assigned_agent_id) k.noAgent++;
    });
    return k;
  }, [requests, counts]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header premium bleu clair */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <Key className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Logements à relouer</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Dossiers de clients reloueurs — recherche de repreneur et transmission à la régie.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
          <Kpi label="Total" value={kpi.total} icon={Building2} />
          <Kpi label="Nouvelles" value={kpi.new} icon={AlertCircle} color="text-blue-600" />
          <Kpi label="Photos manquantes" value={kpi.missingPhotos} icon={Camera} color="text-amber-600" />
          <Kpi label="Docs manquants" value={kpi.missingDocs} icon={FileText} color="text-amber-600" />
          <Kpi label="Prêts à publier" value={kpi.readyToPublish} icon={CheckCircle2} color="text-emerald-600" />
          <Kpi label="Visites en cours" value={kpi.visits} icon={Calendar} color="text-indigo-600" />
          <Kpi label="Candidatures" value={kpi.applications} icon={Users} color="text-indigo-600" />
          <Kpi label="Reloués ce mois" value={kpi.rentedThisMonth} icon={CheckCircle2} color="text-emerald-600" />
          <Kpi label="Sans agent" value={kpi.noAgent} icon={Clock} color="text-rose-600" />
        </div>
      </div>

      <Card className="p-4 mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, email, adresse…)" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">Aucune demande</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const st = STATUS_LABELS[r.status] || { label: r.status, color: 'bg-zinc-100 text-zinc-700' };
            return (
              <Link key={r.id} to={`/admin/relouer/${r.id}`} className="block group">
                <Card className="p-5 hover:shadow-lg hover:border-sky-300 transition-all h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-semibold flex-shrink-0">
                        {(r.prenom?.[0] || '?') + (r.nom?.[0] || '')}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{r.prenom} {r.nom}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                      </div>
                    </div>
                    <Badge className={`${st.color} border-0 text-[10px]`}>{st.label}</Badge>
                  </div>

                  <div className="text-sm text-foreground flex items-start gap-1.5 mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      {[r.property_street, r.property_zip, r.property_city].filter(Boolean).join(', ') || '—'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span>{r.property_type || 'Logement'}</span>
                    {r.rooms != null && <span>· {r.rooms} pièces</span>}
                    {r.surface != null && <span>· {r.surface} m²</span>}
                    {r.rent_net != null && <span>· {r.rent_net} CHF</span>}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> {counts[`photo:${r.id}`] || 0}</span>
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {counts[`doc:${r.id}`] || 0}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {counts[`cand:${r.id}`] || 0}</span>
                    </div>
                    {!r.assigned_agent_id && <Badge variant="outline" className="text-rose-600 border-rose-200 text-[10px]">Sans agent</Badge>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color = 'text-foreground' }: { label: string; value: number; icon: any; color?: string }) {
  return (
    <div className="rounded-xl bg-white border border-sky-100 p-3 flex items-center gap-3">
      <Icon className={`h-5 w-5 ${color}`} />
      <div className="min-w-0">
        <div className={`text-xl font-bold ${color}`}>{value}</div>
        <div className="text-[11px] text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}

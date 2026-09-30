import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarCheck, ChevronDown, ChevronRight, ExternalLink, Loader2, Power, Users } from 'lucide-react';
import { fetchCreneauxReservations, isCreneauFull, capaciteLabel } from '@/lib/creneauxCapacite';
import { parseCapacite } from '@/components/admin/AnnonceCreneauxManager';

interface Row {
  id: string; date_heure: string; actif: boolean; capacite_max: number | null; annonce_id: string;
  annonce?: { id: string; titre: string; slug: string | null } | null; reservations: number;
}
interface Visiteur { id: string; creneau_id: string; prenom: string | null; nom: string | null; email: string | null; telephone: string | null; statut: string | null }

const fmt = (iso: string) => new Date(iso).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminVisites() {
  const [rows, setRows] = useState<Row[]>([]);
  const [visiteurs, setVisiteurs] = useState<Record<string, Visiteur[]>>({});
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState<'avenir' | 'passes'>('avenir');
  const [annonceFilter, setAnnonceFilter] = useState('all');
  const [fullOnly, setFullOnly] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('annonce_creneaux')
      .select('id, date_heure, actif, capacite_max, annonce_id, annonce:annonces_publiques(id, titre, slug)')
      .order('date_heure', { ascending: true })
      .limit(15000);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list = (data ?? []) as any[];
    const ids = list.map((c) => c.id);
    const counts = await fetchCreneauxReservations(ids);
    const map: Record<string, Visiteur[]> = {};
    for (let i = 0; i < ids.length; i += 200) {
      const { data: v } = await supabase
        .from('candidatures_location')
        .select('id, creneau_id, prenom, nom, email, telephone, statut')
        .in('creneau_id', ids.slice(i, i + 200))
        .order('created_at', { ascending: true })
        .limit(15000);
      (v ?? []).forEach((r: any) => { (map[r.creneau_id] ||= []).push(r); });
    }
    setVisiteurs(map);
    setRows(list.map((c) => ({ ...c, reservations: counts[c.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const annonces = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.annonce_id, r.annonce?.titre || 'Annonce'));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const l = rows.filter((r) => {
      const t = new Date(r.date_heure).getTime();
      if (periode === 'avenir' ? t < now : t >= now) return false;
      if (annonceFilter !== 'all' && r.annonce_id !== annonceFilter) return false;
      if (fullOnly && !isCreneauFull(r.reservations, r.capacite_max)) return false;
      return true;
    });
    return periode === 'passes' ? l.reverse() : l;
  }, [rows, periode, annonceFilter, fullOnly]);

  const update = async (id: string, patch: { actif?: boolean; capacite_max?: number | null }, ok: string) => {
    setBusy(true);
    const { error } = await supabase.from('annonce_creneaux').update(patch).eq('id', id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(ok);
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const editCap = (r: Row) => {
    const v = window.prompt('Nombre max de visiteurs (vide = illimité)', r.capacite_max?.toString() ?? '');
    if (v === null) return;
    const n = parseCapacite(v);
    if (n === 'invalid') return toast.error('Nombre invalide');
    update(r.id, { capacite_max: n }, 'Capacité mise à jour');
  };

  return (
    <div className="h-full space-y-4 overflow-auto p-4 md:p-6">
      <PremiumPageHeader title="Visites" subtitle="Créneaux de visite des annonces, capacité et visiteurs inscrits" icon={CalendarCheck} />

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={periode === 'avenir' ? 'default' : 'outline'} onClick={() => setPeriode('avenir')}>À venir</Button>
        <Button size="sm" variant={periode === 'passes' ? 'default' : 'outline'} onClick={() => setPeriode('passes')}>Passés</Button>
        <Select value={annonceFilter} onValueChange={setAnnonceFilter}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Annonce" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les annonces</SelectItem>
            {annonces.map(([id, t]) => <SelectItem key={id} value={id}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant={fullOnly ? 'default' : 'outline'} onClick={() => setFullOnly((v) => !v)}>Complets uniquement</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucun créneau.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const full = isCreneauFull(r.reservations, r.capacite_max);
            const vis = visiteurs[r.id] ?? [];
            return (
              <Fragment key={r.id}>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
                  <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}>
                    {open[r.id] ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize text-foreground">{fmt(r.date_heure)}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.annonce?.titre || 'Annonce'}</p>
                    </div>
                  </button>
                  {r.annonce && (
                    <Link to={`/annonces/${r.annonce.slug || r.annonce.id}`} target="_blank" className="text-muted-foreground hover:text-primary" title="Voir la fiche">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                  <span className="text-xs text-muted-foreground">{capaciteLabel(r.reservations, r.capacite_max)}</span>
                  {full && <Badge variant="destructive">Complet</Badge>}
                  <Badge variant={r.actif ? 'default' : 'secondary'}>{r.actif ? 'Actif' : 'Inactif'}</Badge>
                  <Button size="icon" variant="ghost" title="Modifier la capacité" disabled={busy} onClick={() => editCap(r)}><Users className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title={r.actif ? 'Désactiver' : 'Activer'} disabled={busy}
                    onClick={() => update(r.id, { actif: !r.actif }, r.actif ? 'Créneau désactivé' : 'Créneau activé')}>
                    <Power className="h-4 w-4" />
                  </Button>
                </div>
                {open[r.id] && (
                  <div className="ml-6 rounded-lg border border-border bg-muted/30 p-3">
                    {vis.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun visiteur inscrit.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-xs text-muted-foreground">
                            <tr><th className="py-1 pr-3">Nom</th><th className="pr-3">E-mail</th><th className="pr-3">Téléphone</th><th>Statut</th></tr>
                          </thead>
                          <tbody>
                            {vis.map((v) => (
                              <tr key={v.id} className="border-t border-border">
                                <td className="py-1.5 pr-3">{[v.prenom, v.nom].filter(Boolean).join(' ') || '—'}</td>
                                <td className="pr-3">{v.email ? <a className="hover:text-primary" href={`mailto:${v.email}`}>{v.email}</a> : '—'}</td>
                                <td className="pr-3">{v.telephone ? <a className="hover:text-primary" href={`tel:${v.telephone}`}>{v.telephone}</a> : '—'}</td>
                                <td><Badge variant="outline">{v.statut || '—'}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

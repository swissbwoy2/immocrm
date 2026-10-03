import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statutLabel } from '@/hooks/useCandidatCandidatures';
import { RelocationTimeline } from '@/components/candidature/RelocationTimeline';
import { AdminGenererDocuments } from '@/components/candidature/AdminGenererDocuments';

const STATUTS = ['candidature_deposee', 'documents_demandes', 'retenu_bailleur', 'refusee', 'bail_signe', 'etat_lieux_effectue', 'cles_remises'];
const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', dateStyle: 'short', timeStyle: 'short' }) : '—';
const SELECT = '*, annonces_publiques(titre, adresse, ville, slug), annonce_creneaux(date_heure)';

export default function CandidaturesRelocation() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');
  const [sel, setSel] = useState<any | null>(null);
  const [demande, setDemande] = useState<any | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [motif, setMotif] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await (supabase as any).from('candidatures_location').select(SELECT)
      .in('statut', STATUTS).order('date_depot', { ascending: false, nullsFirst: false }).limit(15000);
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const open = async (r: any) => {
    setSel(r); setMotif(''); setDate(''); setDemande(null); setDocs([]);
    if (!r.user_id) return;
    const [{ data: d }, { data: dc }] = await Promise.all([
      (supabase as any).from('demandes_location_candidat').select('*').eq('user_id', r.user_id).maybeSingle(),
      supabase.from('documents').select('id, nom, type_document, url, date_upload').eq('user_id', r.user_id).order('date_upload', { ascending: false }),
    ]);
    setDemande(d); setDocs(dc ?? []);
  };

  const list = useMemo(() => filter === 'tous' ? rows : rows.filter((r) => r.statut === filter), [rows, filter]);

  const act = async (action: string) => {
    if (!sel || busy) return;
    if (action === 'refusee' && !motif.trim()) { toast.error('Indiquez un motif de refus'); return; }
    if (action === 'date_etat_lieux' && !date) { toast.error('Choisissez une date'); return; }
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_update_candidature_location', {
      _id: sel.id, _action: action, _date: date ? new Date(date).toISOString() : null, _motif: motif || null,
    });
    if (error) { setBusy(false); toast.error(error.message); return; }
    supabase.functions.invoke('candidature-relocation-notify', { body: { candidature_id: sel.id, etape: action } }).catch(() => {});
    toast.success('Étape mise à jour');
    const { data } = await (supabase as any).from('candidatures_location').select(SELECT).eq('id', sel.id).maybeSingle();
    setSel(data); setDate(''); setBusy(false);
    load();
  };

  const openDoc = async (path: string) => {
    const { data } = await supabase.storage.from('client-documents').createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const bien = (r: any) => r.annonces_publiques ? [r.annonces_publiques.adresse, r.annonces_publiques.ville].filter(Boolean).join(', ') || r.annonces_publiques.titre : '—';
  const s = sel?.statut;
  const md = demande?.mandat_data ?? {};

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Candidatures relocation</h1>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              {STATUTS.map((k) => <SelectItem key={k} value={k}>{statutLabel(k)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : list.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Aucune candidature.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((r) => (
              <Card key={r.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => open(r)}>
                <CardContent className="space-y-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{r.prenom} {r.nom}</p>
                    <Badge variant={r.statut === 'refusee' ? 'destructive' : 'secondary'}>{statutLabel(r.statut)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.email} · {r.telephone}</p>
                  <p className="truncate text-sm text-foreground">{bien(r)}</p>
                  <p className="text-xs text-muted-foreground">Visite : {fmt(r.annonce_creneaux?.date_heure || r.date_visite)} · Dépôt : {fmt(r.date_depot)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {sel && (
            <>
              <DialogHeader><DialogTitle>{sel.prenom} {sel.nom} — {statutLabel(sel.statut)}</DialogTitle></DialogHeader>
              <div className="space-y-4 text-sm">
                <section className="grid gap-1 sm:grid-cols-2">
                  <p><span className="text-muted-foreground">E-mail :</span> <a className="text-primary" href={`mailto:${sel.email}`}>{sel.email}</a></p>
                  <p><span className="text-muted-foreground">Téléphone :</span> <a className="text-primary" href={`tel:${sel.telephone}`}>{sel.telephone}</a></p>
                  <p><span className="text-muted-foreground">Permis :</span> {sel.type_permis || '—'}</p>
                  <p><span className="text-muted-foreground">Nationalité :</span> {sel.nationalite || '—'}</p>
                  <p><span className="text-muted-foreground">Profession :</span> {sel.profession || '—'} {sel.employeur ? `(${sel.employeur})` : ''}</p>
                  <p><span className="text-muted-foreground">Revenus :</span> {sel.revenus_mensuels ? `${sel.revenus_mensuels} CHF` : '—'}</p>
                  <p><span className="text-muted-foreground">Occupants :</span> {sel.nombre_occupants ?? '—'}</p>
                  <p><span className="text-muted-foreground">Adresse actuelle :</span> {sel.adresse_actuelle || '—'}</p>
                </section>
                <section>
                  <p className="font-semibold">Annonce & visite</p>
                  <p>{bien(sel)} — visite {fmt(sel.annonce_creneaux?.date_heure || sel.date_visite)}</p>
                  {sel.annonces_publiques?.slug && <a className="text-primary" target="_blank" rel="noreferrer" href={`/annonces/${sel.annonces_publiques.slug}`}>Voir l'annonce</a>}
                </section>
                {demande && (
                  <section>
                    <p className="font-semibold">Critères (demande de location)</p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {Object.entries(md).filter(([, v]) => v !== '' && v != null && typeof v !== 'object').slice(0, 40).map(([k, v]) => (
                        <p key={k}><span className="text-muted-foreground">{k} :</span> {String(v)}</p>
                      ))}
                    </div>
                  </section>
                )}
                <section>
                  <p className="font-semibold">Pièces téléversées</p>
                  {docs.length === 0 ? <p className="text-muted-foreground">Aucune pièce.</p> : docs.map((d) => (
                    <button key={d.id} className="block text-left text-primary underline" onClick={() => openDoc(d.url)}>{d.type_document || d.nom} — {d.nom}</button>
                  ))}
                </section>
                {['candidature_deposee', 'documents_demandes', 'retenu_bailleur', 'bail_signe'].includes(s) && (
                  <section className="space-y-1"><p className="font-semibold">Documents</p><AdminGenererDocuments candidatureId={sel.id} onDone={refresh} /></section>
                )}
                <section><p className="mb-1 font-semibold">Suivi</p><RelocationTimeline r={sel} /></section>
                <section className="space-y-2 border-t pt-3">
                  <p className="font-semibold">Actions</p>
                  {['candidature_deposee', 'documents_demandes'].includes(s) && (
                    <div className="flex flex-wrap gap-2">
                      {s === 'candidature_deposee' && <Button size="sm" variant="outline" disabled={busy} onClick={() => act('documents_demandes')}>Demander les documents</Button>}
                      <Button size="sm" disabled={busy} onClick={() => act('retenu_bailleur')}>Attribuer / retenu</Button>
                    </div>
                  )}
                  {['candidature_deposee', 'documents_demandes', 'retenu_bailleur'].includes(s) && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif du refus" className="min-h-[44px]" />
                      <Button size="sm" variant="destructive" disabled={busy} onClick={() => act('refusee')}>Refuser</Button>
                    </div>
                  )}
                  {['retenu_bailleur', 'bail_signe', 'etat_lieux_effectue'].includes(s) && (
                    <div className="space-y-2">
                      <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
                      <div className="flex flex-wrap gap-2">
                        {s === 'retenu_bailleur' && <Button size="sm" disabled={busy} onClick={() => act('bail_signe')}>Bail signé</Button>}
                        {s === 'bail_signe' && <Button size="sm" variant="outline" disabled={busy} onClick={() => act('date_etat_lieux')}>Fixer date état des lieux</Button>}
                        {s === 'bail_signe' && <Button size="sm" disabled={busy} onClick={() => act('etat_lieux_effectue')}>État des lieux effectué</Button>}
                        {s === 'etat_lieux_effectue' && <Button size="sm" disabled={busy} onClick={() => act('cles_remises')}>Remise des clés</Button>}
                      </div>
                      <p className="text-xs text-muted-foreground">La date est facultative pour bail signé / remise des clés (maintenant par défaut), obligatoire pour l'état des lieux.</p>
                    </div>
                  )}
                  {s === 'retenu_bailleur' && <p className="text-xs text-muted-foreground">Conclusion confirmée par le candidat : {sel.candidat_confirme_at ? fmt(sel.candidat_confirme_at) : 'pas encore'}</p>}
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

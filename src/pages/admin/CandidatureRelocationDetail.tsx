import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { statutLabel } from '@/hooks/useCandidatCandidatures';
import { RelocationTimeline } from '@/components/candidature/RelocationTimeline';
import { CandidateDocumentsSection } from '@/components/CandidateDocumentsSection';
import { AdminGenererDocuments } from '@/components/candidature/AdminGenererDocuments';

export const CAND_SELECT = '*, annonces_publiques(titre, adresse, ville, slug), annonce_creneaux(date_heure)';
export const fmtDT = (d?: string | null) => d ? new Date(d).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', dateStyle: 'short', timeStyle: 'short' }) : '—';
export const bienLabel = (r: any) => r?.annonces_publiques ? [r.annonces_publiques.adresse, r.annonces_publiques.ville].filter(Boolean).join(', ') || r.annonces_publiques.titre : '—';
const human = (k: string) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const val = (v: any) => typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : String(v);

function DataBlock({ data, title }: { data: any; title?: string }) {
  if (data == null || data === '') return null;
  if (Array.isArray(data)) {
    if (!data.length) return null;
    return <div className="space-y-2">{data.map((d, i) => <DataBlock key={i} data={d} title={`${title ?? 'Élément'} ${i + 1}`} />)}</div>;
  }
  if (typeof data !== 'object') return <p>{val(data)}</p>;
  const flat = Object.entries(data).filter(([, v]) => v !== '' && v != null && typeof v !== 'object');
  const nested = Object.entries(data).filter(([, v]) => v && typeof v === 'object');
  return (
    <div className="space-y-2 rounded-lg border p-3">
      {title && <p className="font-semibold">{title}</p>}
      {flat.length > 0 && <div className="grid gap-1 sm:grid-cols-2">{flat.map(([k, v]) => <p key={k} className="break-words"><span className="text-muted-foreground">{human(k)} :</span> {val(v)}</p>)}</div>}
      {nested.map(([k, v]) => <DataBlock key={k} data={v} title={human(k)} />)}
    </div>
  );
}

export default function CandidatureRelocationDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [sel, setSel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<any[]>([]);
  const [motif, setMotif] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusOpen, setRefusOpen] = useState(false);
  const [refusMotif, setRefusMotif] = useState('');

  const reload = async () => {
    const { data, error } = await (supabase as any).from('candidatures_location').select(CAND_SELECT).eq('id', id).maybeSingle();
    if (error) toast.error(error.message);
    setSel(data); setLoading(false);
    if (data?.user_id) {
      const { data: dc } = await supabase.from('documents').select('id, nom, type_document, url, date_upload').eq('user_id', data.user_id).order('date_upload', { ascending: false });
      setDocs(dc ?? []);
    }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const refresh = async () => {
    await reload();
    qc.invalidateQueries({ queryKey: ['candidature-docs', id] });
    qc.invalidateQueries({ queryKey: ['candidat-candidatures'] });
  };

  const preselection = async (retenu: boolean, m?: string) => {
    if (!sel || busy) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_valider_preselection', { p_candidature_id: sel.id, p_retenu: retenu, p_motif: m?.trim() || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(retenu ? 'Candidat retenu en pré-sélection' : 'Candidature refusée');
    setRefusOpen(false); setRefusMotif('');
    refresh();
  };

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
    setDate(''); setBusy(false);
    refresh();
  };

  const openDoc = async (path: string) => {
    const { data } = await supabase.storage.from('client-documents').createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (loading) return <div className="flex flex-1 items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!sel) return <div className="p-8 text-sm text-muted-foreground">Candidature introuvable. <Link className="text-primary" to="/admin/candidatures-relocation">Retour</Link></div>;
  const s = sel.statut;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-4 p-4 text-sm md:p-8">
        <Button asChild variant="ghost" size="sm" className="min-h-[44px]"><Link to="/admin/candidatures-relocation"><ArrowLeft className="mr-1 h-4 w-4" />Candidats location</Link></Button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-foreground">{sel.prenom} {sel.nom}</h1>
          <Badge variant={['refusee', 'refuse', 'desiste'].includes(s) ? 'destructive' : 'secondary'}>{statutLabel(s)}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">ID {sel.id} · dépôt {fmtDT(sel.date_depot)}</p>

        {s === 'candidature_deposee' && (
          <Card><CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
            <ConfirmDialog
              trigger={<Button className="min-h-[44px] flex-1" disabled={busy}>Retenir en pré-sélection</Button>}
              title="Retenir en pré-sélection ?"
              description="Le candidat sera notifié et invité à transmettre ses documents."
              onConfirm={() => preselection(true)}
            />
            <Button variant="destructive" className="min-h-[44px] flex-1" disabled={busy} onClick={() => setRefusOpen(true)}>Refuser</Button>
          </CardContent></Card>
        )}

        <Card><CardContent className="grid gap-1 p-4 sm:grid-cols-2">
          <p><span className="text-muted-foreground">E-mail :</span> <a className="text-primary" href={`mailto:${sel.email}`}>{sel.email}</a></p>
          <p><span className="text-muted-foreground">Téléphone :</span> <a className="text-primary" href={`tel:${sel.telephone}`}>{sel.telephone}</a></p>
          <p><span className="text-muted-foreground">Permis :</span> {sel.type_permis || '—'}</p>
          <p><span className="text-muted-foreground">Nationalité :</span> {sel.nationalite || '—'}</p>
          <p><span className="text-muted-foreground">Profession :</span> {sel.profession || '—'} {sel.employeur ? `(${sel.employeur})` : ''}</p>
          <p><span className="text-muted-foreground">Revenus :</span> {sel.revenus_mensuels ? `${sel.revenus_mensuels} CHF` : '—'}</p>
          <p><span className="text-muted-foreground">Occupants :</span> {sel.nombre_occupants ?? '—'}</p>
          <p><span className="text-muted-foreground">Adresse actuelle :</span> {sel.adresse_actuelle || '—'}</p>
        </CardContent></Card>

        <Card><CardContent className="space-y-1 p-4">
          <p className="font-semibold">Annonce visitée</p>
          <p>{bienLabel(sel)} — visite {fmtDT(sel.annonce_creneaux?.date_heure || sel.date_visite)}</p>
          {sel.annonces_publiques?.slug && <Link className="text-primary" to={`/annonces/${sel.annonces_publiques.slug}`}>Voir l'annonce</Link>}
        </CardContent></Card>

        {sel.demande_data && (
          <section className="space-y-2">
            <p className="font-semibold">Demande de location</p>
            <DataBlock data={sel.demande_data} />
            <p className="text-xs text-muted-foreground">Prêt à louer : {sel.confirme_pret_louer ? 'Oui' : 'Non'} · Références autorisées : {sel.autorise_references ? 'Oui' : 'Non'} · Confirmé {fmtDT(sel.confirme_at)}</p>
          </section>
        )}

        <Card><CardContent className="p-4"><p className="mb-1 font-semibold">Suivi</p><RelocationTimeline r={sel} /></CardContent></Card>

        <Card><CardContent className="space-y-2 p-4">
          <p className="font-semibold">Pièces téléversées</p>
          {docs.length === 0 ? <p className="text-muted-foreground">Aucune pièce.</p> : docs.map((d) => (
            <button key={d.id} className="block min-h-[36px] text-left text-primary underline" onClick={() => openDoc(d.url)}>{d.type_document || d.nom} — {d.nom}</button>
          ))}
          {['documents_demandes', 'retenu_bailleur', 'bail_signe', 'etat_lieux_effectue', 'cles_remises'].includes(s) && sel.user_id && (
            <div className="border-t pt-2"><CandidateDocumentsSection clientId="" clientUserId={sel.user_id} clientName="Pièces justificatives du candidat" candidates={[]} candidatureId={sel.id} readOnly /></div>
          )}
          {['candidature_deposee', 'documents_demandes', 'retenu_bailleur', 'bail_signe'].includes(s) && (
            <div className="space-y-1 border-t pt-2"><p className="font-semibold">Documents de candidature</p><AdminGenererDocuments candidatureId={sel.id} onDone={refresh} /></div>
          )}
        </CardContent></Card>

        <Card><CardContent className="space-y-2 p-4">
          <p className="font-semibold">Actions</p>
          {['candidature_deposee', 'documents_demandes'].includes(s) && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => act('retenu_bailleur')}>Attribuer / retenu</Button>
            </div>
          )}
          {['documents_demandes', 'retenu_bailleur'].includes(s) && (
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
            </div>
          )}
        </CardContent></Card>
      </div>

      <Dialog open={refusOpen} onOpenChange={setRefusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Refuser la candidature</DialogTitle></DialogHeader>
          <Textarea value={refusMotif} onChange={(e) => setRefusMotif(e.target.value)} placeholder="Motif (optionnel)" className="min-h-[88px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefusOpen(false)}>Annuler</Button>
            <Button variant="destructive" disabled={busy} onClick={() => preselection(false, refusMotif)}>Confirmer le refus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

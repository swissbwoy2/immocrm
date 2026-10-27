import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Bike, CalendarPlus, CheckCircle, ChevronDown, Clock, Copy, Loader2, Mail,
  MapPin, Pencil, Phone, Plus, RotateCcw, Save, Timer, Undo2, Wallet, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DASH_CARD, DashBadge, DashEmptyState, DashFilterPills, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { formatDuration } from '@/hooks/useCoursierTime';
import { cleMois, formatChf, libelleMois } from '@/components/coursier/coursierModel';
import {
  formatZurichDay, formatZurichTime, isoToZurichDateInput, isoToZurichTimeInput, zurichDateTimeToIso,
} from '@/lib/dateZurich';
import {
  TARIF_HORAIRE_DEFAUT, alertesPointage, finSuggeree, minutesPointage, montantPointage, resumePaie,
  visitesDuJourPointage, visitesPhysiques, type Pointage, type VisiteCoursier,
} from '@/lib/coursierPaie';
import { cn } from '@/lib/utils';

/** « 21.10 » (jour suisse). */
const jourMois = (iso: string) => new Intl.DateTimeFormat('fr-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit' }).format(new Date(iso));

type Filtre = 'a_payer' | 'a_verifier' | 'payes' | 'exclus' | 'tous';

const STATUTS = [
  { value: 'actif', label: 'Actif' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'inactif', label: 'Inactif' },
];

const STATUT_MISSION: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' | 'primary' }> = {
  en_attente: { label: 'Sans coursier', tone: 'warning' },
  accepte: { label: 'Acceptée', tone: 'primary' },
  termine: { label: 'Compte-rendu fait', tone: 'success' },
};

/** Fin saisie avant le début : la session s'est terminée le lendemain. */
function finDepuisSaisie(date: string, heureDebut: string, heureFin: string): { debut: string | null; fin: string | null } {
  const debut = zurichDateTimeToIso(date, heureDebut);
  let fin = zurichDateTimeToIso(date, heureFin);
  if (debut && fin && new Date(fin).getTime() <= new Date(debut).getTime()) {
    fin = new Date(new Date(fin).getTime() + 24 * 3600 * 1000).toISOString();
  }
  return { debut, fin };
}

export default function AdminCoursierDetail() {
  const { coursierId } = useParams<{ coursierId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [coursier, setCoursier] = useState<any>(null);
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [visites, setVisites] = useState<any[]>([]);

  // Profil
  const [form, setForm] = useState({ prenom: '', nom: '', telephone: '', iban: '', tarif: '', statut: 'actif' });
  const [savingProfil, setSavingProfil] = useState(false);

  // Pointages
  const [filtre, setFiltre] = useState<Filtre>('a_payer');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [moisOuverts, setMoisOuverts] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{ ids: string[]; montant: number; minutes: number } | null>(null);
  const [paying, setPaying] = useState(false);

  // Correction / ajout
  const [edit, setEdit] = useState<{ mode: 'corriger' | 'ajouter' | 'exclure'; p?: Pointage } | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editDebut, setEditDebut] = useState('');
  const [editFin, setEditFin] = useState('');
  const [editMotif, setEditMotif] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Journal des courses
  const [coursesVisibles, setCoursesVisibles] = useState(20);

  const tarif = Number(coursier?.tarif_horaire ?? TARIF_HORAIRE_DEFAUT) || TARIF_HORAIRE_DEFAUT;

  const load = useCallback(async () => {
    if (!coursierId) return;
    try {
      const [{ data: c, error: cErr }, { data: pts, error: pErr }, { data: vis, error: vErr }] = await Promise.all([
        supabase.from('coursiers').select('*, profiles:user_id(prenom, nom, email, telephone)').eq('id', coursierId).maybeSingle(),
        supabase.from('coursier_time_entries').select('*').eq('coursier_id', coursierId).order('started_at', { ascending: false }).limit(5000),
        supabase.from('visites')
          .select('id, date_visite, date_visite_fin, adresse, statut, statut_coursier, client_id, offres(adresse), clients!client_id(profiles:user_id(prenom, nom))')
          .eq('coursier_id', coursierId).order('date_visite', { ascending: false }).limit(5000),
      ]);
      if (cErr) throw cErr;
      if (pErr) throw pErr;
      if (vErr) throw vErr;
      setCoursier(c);
      setPointages((pts as any) || []);
      setVisites((vis as any) || []);
      if (c) {
        setForm({
          prenom: (c as any).profiles?.prenom || c.prenom || '',
          nom: (c as any).profiles?.nom || c.nom || '',
          telephone: (c as any).profiles?.telephone || c.telephone || '',
          iban: c.iban || '',
          tarif: String(c.tarif_horaire ?? TARIF_HORAIRE_DEFAUT),
          statut: c.statut || 'actif',
        });
      }
    } catch (e: any) {
      console.error('[CoursierDetail] load', e);
      toast.error('Impossible de charger le coursier');
    } finally {
      setLoading(false);
    }
  }, [coursierId]);

  useEffect(() => { load(); }, [load]);

  const visitesPaie: VisiteCoursier[] = useMemo(() => visites.map((v) => ({
    id: v.id, date_visite: v.date_visite, date_visite_fin: v.date_visite_fin,
    adresse: v.adresse || v.offres?.adresse, statut_coursier: v.statut_coursier, client_id: v.client_id,
  })), [visites]);

  const resume = useMemo(() => resumePaie(pointages, visitesPaie, tarif), [pointages, visitesPaie, tarif]);

  const alertesParId = useMemo(() => {
    const m = new Map<string, ReturnType<typeof alertesPointage>>();
    for (const p of pointages) m.set(p.id, alertesPointage(p, visitesPaie));
    return m;
  }, [pointages, visitesPaie]);

  const cloturees = pointages.filter((p) => p.ended_at);
  const filtres: Record<Filtre, Pointage[]> = useMemo(() => ({
    a_payer: cloturees.filter((p) => !p.paye && !p.exclue),
    a_verifier: cloturees.filter((p) => !p.paye && !p.exclue && (alertesParId.get(p.id)?.length ?? 0) > 0),
    payes: cloturees.filter((p) => p.paye),
    exclus: cloturees.filter((p) => p.exclue),
    tous: cloturees,
  }), [cloturees, alertesParId]);

  const liste = filtres[filtre];
  const parMois = useMemo(() => {
    const map = new Map<string, Pointage[]>();
    for (const p of liste) {
      const k = cleMois(p.started_at);
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [liste]);

  useEffect(() => { setSelection(new Set()); }, [filtre]);

  const nom = `${form.prenom} ${form.nom}`.trim() || 'Coursier';
  const email = coursier?.profiles?.email || coursier?.email || '';

  /* ---------------- Actions ---------------- */

  const saveProfil = async () => {
    if (!coursier) return;
    const t = parseFloat(form.tarif.replace(',', '.'));
    if (!form.prenom.trim()) { toast.error('Le prénom est obligatoire'); return; }
    if (isNaN(t) || t <= 0) { toast.error('Tarif horaire invalide'); return; }
    setSavingProfil(true);
    try {
      const { error } = await supabase.from('coursiers').update({
        prenom: form.prenom.trim(), nom: form.nom.trim(), telephone: form.telephone.trim(),
        iban: form.iban.replace(/\s+/g, ' ').trim(), tarif_horaire: t, statut: form.statut,
      }).eq('id', coursier.id);
      if (error) throw error;
      const { error: pErr } = await supabase.from('profiles').update({
        prenom: form.prenom.trim(), nom: form.nom.trim(), telephone: form.telephone.trim(),
      }).eq('id', coursier.user_id);
      if (pErr) throw pErr;
      toast.success('Coursier mis à jour');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Enregistrement impossible');
    } finally {
      setSavingProfil(false);
    }
  };

  const ouvrirPaiement = (ids: string[]) => {
    const ps = pointages.filter((p) => ids.includes(p.id) && p.ended_at && !p.paye && !p.exclue);
    if (ps.length === 0) return;
    setPayDialog({
      ids: ps.map((p) => p.id),
      minutes: ps.reduce((s, p) => s + minutesPointage(p), 0),
      montant: ps.reduce((s, p) => s + montantPointage(p, tarif), 0),
    });
  };

  const confirmerPaiement = async () => {
    if (!payDialog) return;
    setPaying(true);
    try {
      const { error } = await supabase.from('coursier_time_entries')
        .update({ paye: true, tarif_paye: tarif })
        .in('id', payDialog.ids);
      if (error) throw error;
      toast.success(`${payDialog.ids.length} pointage${payDialog.ids.length > 1 ? 's' : ''} marqué${payDialog.ids.length > 1 ? 's' : ''} payé${payDialog.ids.length > 1 ? 's' : ''}`);
      setPayDialog(null);
      setSelection(new Set());
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Paiement non enregistré');
    } finally {
      setPaying(false);
    }
  };

  const annulerPaiement = async (p: Pointage) => {
    setBusyId(p.id);
    try {
      const { error } = await supabase.from('coursier_time_entries').update({ paye: false }).eq('id', p.id);
      if (error) throw error;
      toast.success('Paiement annulé : le pointage est de nouveau à payer');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  const reintegrer = async (p: Pointage) => {
    setBusyId(p.id);
    try {
      const { error } = await supabase.from('coursier_time_entries').update({ exclue: false }).eq('id', p.id);
      if (error) throw error;
      toast.success('Pointage réintégré');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  const ouvrirEdition = (mode: 'corriger' | 'ajouter' | 'exclure', p?: Pointage) => {
    setEdit({ mode, p });
    setEditMotif('');
    if (p) {
      setEditDate(isoToZurichDateInput(p.started_at));
      setEditDebut(isoToZurichTimeInput(p.started_at));
      setEditFin(p.ended_at ? isoToZurichTimeInput(p.ended_at) : '');
    } else {
      setEditDate(isoToZurichDateInput(new Date().toISOString()));
      setEditDebut('');
      setEditFin('');
    }
  };

  const enregistrerEdition = async () => {
    if (!edit || !coursier) return;
    if (!editMotif.trim()) { toast.error('Indiquez le motif'); return; }
    setSavingEdit(true);
    try {
      if (edit.mode === 'exclure' && edit.p) {
        const { error } = await supabase.from('coursier_time_entries')
          .update({ exclue: true, motif_correction: editMotif.trim() }).eq('id', edit.p.id);
        if (error) throw error;
        toast.success('Pointage exclu de la paie');
      } else {
        const { debut, fin } = finDepuisSaisie(editDate, editDebut, editFin);
        if (!debut || !fin) { toast.error('Date, heure d’arrivée et heure de départ obligatoires'); setSavingEdit(false); return; }
        if (new Date(fin).getTime() - new Date(debut).getTime() > 16 * 3600 * 1000) {
          toast.error('Une session ne peut pas dépasser 16 heures'); setSavingEdit(false); return;
        }
        if (edit.mode === 'corriger' && edit.p) {
          const { error } = await supabase.from('coursier_time_entries')
            .update({ started_at: debut, ended_at: fin, motif_correction: editMotif.trim() }).eq('id', edit.p.id);
          if (error) throw error;
          toast.success('Pointage corrigé');
        } else {
          const { error } = await supabase.from('coursier_time_entries').insert({
            coursier_id: coursier.id, started_at: debut, ended_at: fin,
            motif_correction: editMotif.trim(), ajoute_par_admin: true,
          } as any);
          if (error) throw error;
          toast.success('Pointage ajouté');
        }
      }
      setEdit(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Enregistrement impossible');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleSel = (id: string) => setSelection((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  /* ---------------- Rendu ---------------- */

  if (loading) {
    return (
      <DashPage>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-lg bg-muted" />
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-muted" />)}
        </div>
      </DashPage>
    );
  }

  if (!coursier) {
    return (
      <DashPage>
        <DashEmptyState icon={Bike} title="Coursier introuvable" action={
          <Button className="h-11 rounded-full" onClick={() => navigate('/admin/coursiers')}><ArrowLeft className="mr-2 h-4 w-4" />Retour aux coursiers</Button>
        } />
      </DashPage>
    );
  }

  const selectionAPayer = Array.from(selection).filter((id) => {
    const p = pointages.find((x) => x.id === id);
    return p && p.ended_at && !p.paye && !p.exclue;
  });
  const montantSelection = selectionAPayer.reduce((s, id) => s + montantPointage(pointages.find((x) => x.id === id)!, tarif), 0);

  const courses = visitesPhysiques(visitesPaie);
  const coursesTriees = [...courses].reverse();
  const enCours = resume.enCours;
  const alertesEnCours = enCours ? alertesParId.get(enCours.id) ?? [] : [];

  const kpis = [
    { icon: Wallet, label: 'À payer', value: formatChf(resume.montantAPayer, 2), sub: `${formatDuration(resume.minutesAPayer)} non payées`, tone: 'bg-amber-500/10 text-amber-600' },
    { icon: AlertTriangle, label: 'À vérifier', value: String(resume.aVerifier), sub: resume.aVerifier ? 'pointages suspects' : 'aucun pointage suspect', tone: resume.aVerifier ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600' },
    { icon: Clock, label: 'Ce mois', value: formatChf(resume.montantMois, 2), sub: `${formatDuration(resume.minutesMois)} pointées`, tone: 'bg-primary/10 text-primary' },
    { icon: CheckCircle, label: 'Déjà payé', value: formatChf(resume.montantPaye, 2), sub: `${formatDuration(resume.minutesPayees)} payées`, tone: 'bg-emerald-500/10 text-emerald-600' },
  ];

  return (
    <DashPage className="space-y-6">
      <button type="button" onClick={() => navigate('/admin/coursiers')} className="-mb-2 inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Coursiers
      </button>

      <DashPageHeader
        title={nom}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2">
          <DashBadge tone={form.statut === 'actif' ? 'success' : 'muted'}>{STATUTS.find((s) => s.value === coursier.statut)?.label ?? coursier.statut}</DashBadge>
          <span>Payé au temps pointé · {formatChf(tarif, 2)} / heure</span>
        </span>}
        action={
          <Button className="h-11 rounded-full" onClick={() => ouvrirEdition('ajouter')}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter un pointage
          </Button>
        }
      />

      {/* Session en cours (départ oublié ?) */}
      {enCours && (
        <section className={cn(DASH_CARD, 'flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-5', alertesEnCours.length && 'ring-1 ring-destructive/40')}>
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', alertesEnCours.length ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600')}>
              <Timer className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                En service depuis {formatZurichTime(enCours.started_at)} ({formatZurichDay(enCours.started_at)}) · {formatDuration(minutesPointage(enCours))}
              </p>
              <p className="text-sm text-muted-foreground">{alertesEnCours[0]?.label ?? 'Session ouverte par le coursier.'}</p>
            </div>
          </div>
          <Button variant={alertesEnCours.length ? 'destructive' : 'outline'} className="h-11 rounded-full" onClick={() => ouvrirEdition('corriger', enCours)}>
            <Pencil className="mr-2 h-4 w-4" /> Clôturer à la bonne heure
          </Button>
        </section>
      )}

      {/* Totaux */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(({ icon: Icon, label, value, sub, tone }) => (
          <div key={label} className={`${DASH_CARD} flex min-h-[112px] flex-col justify-between p-3 sm:p-4`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}><Icon className="h-[18px] w-[18px]" /></span>
            <span className="mt-2 block min-w-0">
              <span className="block truncate text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">{value}</span>
              <span className="block truncate text-xs font-medium text-foreground">{label}</span>
              <span className="block truncate text-xs text-muted-foreground">{sub}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------- Pointages ---------- */}
        <section className="min-w-0 space-y-3" aria-label="Pointages">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Relevé des heures</h2>
              <p className="text-sm text-muted-foreground">Chaque session pointée (arrivée → départ). Salaire = durée × {formatChf(tarif, 2)}/h.</p>
            </div>
            {filtres.a_payer.length > 0 && (
              <Button variant="outline" className="h-11 rounded-full" onClick={() => ouvrirPaiement(filtres.a_payer.map((p) => p.id))}>
                <CheckCircle className="mr-2 h-4 w-4" /> Tout payer · {formatChf(resume.montantAPayer, 2)}
              </Button>
            )}
          </div>

          <DashFilterPills
            label="Filtrer les pointages"
            value={filtre}
            onChange={(k) => setFiltre(k as Filtre)}
            options={[
              { key: 'a_payer', label: 'À payer', count: filtres.a_payer.length },
              { key: 'a_verifier', label: 'À vérifier', count: filtres.a_verifier.length },
              { key: 'payes', label: 'Payés', count: filtres.payes.length },
              { key: 'exclus', label: 'Exclus', count: filtres.exclus.length },
              { key: 'tous', label: 'Tous', count: filtres.tous.length },
            ]}
          />

          {selectionAPayer.length > 0 && (
            <div className={cn(DASH_CARD, 'sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 p-3')}>
              <p className="text-sm font-medium text-foreground">{selectionAPayer.length} sélectionné{selectionAPayer.length > 1 ? 's' : ''} · {formatChf(montantSelection, 2)}</p>
              <div className="flex gap-2">
                <Button variant="ghost" className="h-10 rounded-full" onClick={() => setSelection(new Set())}>Désélectionner</Button>
                <Button className="h-10 rounded-full" onClick={() => ouvrirPaiement(selectionAPayer)}><CheckCircle className="mr-2 h-4 w-4" />Payer la sélection</Button>
              </div>
            </div>
          )}

          {parMois.length === 0 ? (
            <DashEmptyState icon={Clock} title={filtre === 'a_payer' ? 'Rien à payer' : filtre === 'a_verifier' ? 'Aucun pointage suspect' : 'Aucun pointage'} description={filtre === 'a_payer' ? 'Tous les pointages clôturés sont payés ou exclus.' : undefined} />
          ) : parMois.map(([cle, ps], idx) => {
            const ouvert = moisOuverts[cle] ?? idx < 2;
            const valables = ps.filter((p) => !p.exclue);
            const minutes = valables.reduce((s, p) => s + minutesPointage(p), 0);
            const montant = valables.reduce((s, p) => s + montantPointage(p, tarif), 0);
            const aPayerMois = ps.filter((p) => !p.paye && !p.exclue);
            const tousSel = aPayerMois.length > 0 && aPayerMois.every((p) => selection.has(p.id));
            return (
              <section key={cle} className={cn(DASH_CARD, 'overflow-hidden')}>
                <div className="flex items-center gap-3 p-4 md:p-5">
                  {aPayerMois.length > 0 && (
                    <Checkbox
                      checked={tousSel}
                      onCheckedChange={(v) => setSelection((s) => {
                        const n = new Set(s);
                        aPayerMois.forEach((p) => (v ? n.add(p.id) : n.delete(p.id)));
                        return n;
                      })}
                      aria-label={`Sélectionner ${libelleMois(cle)}`}
                    />
                  )}
                  <button type="button" onClick={() => setMoisOuverts((o) => ({ ...o, [cle]: !ouvert }))} aria-expanded={ouvert} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold capitalize text-foreground">{libelleMois(cle)}</span>
                      <span className="block text-sm text-muted-foreground">{ps.length} session{ps.length > 1 ? 's' : ''} · {formatDuration(minutes)}</span>
                    </span>
                    <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">{formatChf(montant, 2)}</span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', ouvert && 'rotate-180')} />
                  </button>
                </div>
                {ouvert && (
                  <ul className="divide-y divide-border/60 border-t border-border/60">
                    {ps.map((p) => (
                      <LignePointage
                        key={p.id}
                        p={p}
                        tarif={tarif}
                        alertes={alertesParId.get(p.id) ?? []}
                        visitesJour={visitesPhysiques(visitesDuJourPointage(p, visitesPaie))}
                        suggestion={finSuggeree(p, visitesPaie)}
                        selected={selection.has(p.id)}
                        onSelect={() => toggleSel(p.id)}
                        busy={busyId === p.id}
                        onCorriger={() => ouvrirEdition('corriger', p)}
                        onExclure={() => ouvrirEdition('exclure', p)}
                        onReintegrer={() => reintegrer(p)}
                        onPayer={() => ouvrirPaiement([p.id])}
                        onAnnulerPaiement={() => annulerPaiement(p)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </section>

        {/* ---------- Colonne droite : profil + courses ---------- */}
        <div className="min-w-0 space-y-6">
          <section className={cn(DASH_CARD, 'space-y-4 p-4 md:p-5')} aria-label="Profil du coursier">
            <h2 className="text-base font-semibold text-foreground">Profil et paie</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="c-prenom">Prénom *</Label><Input id="c-prenom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="rounded-full" /></div>
              <div className="space-y-1.5"><Label htmlFor="c-nom">Nom</Label><Input id="c-nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="rounded-full" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="c-tel">Téléphone</Label><Input id="c-tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="rounded-full" placeholder="+41 79 000 00 00" /></div>
            <div className="space-y-1.5">
              <Label htmlFor="c-iban">IBAN</Label>
              <div className="flex gap-2">
                <Input id="c-iban" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })} className="rounded-full" placeholder="CH00 0000 0000 0000 0000 0" />
                {form.iban && (
                  <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" aria-label="Copier l'IBAN" onClick={() => { navigator.clipboard.writeText(form.iban); toast.success('IBAN copié'); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="c-tarif">Tarif (CHF/h)</Label><Input id="c-tarif" inputMode="decimal" value={form.tarif} onChange={(e) => setForm({ ...form, tarif: e.target.value })} className="rounded-full" /></div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                  <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Un nouveau tarif s'applique aux heures pas encore payées ; les heures déjà payées gardent le tarif du paiement.</p>
            <div className="space-y-1 text-sm">
              {email && <a href={`mailto:${email}`} className="flex min-h-9 items-center gap-2 text-primary hover:underline"><Mail className="h-4 w-4" />{email}</a>}
              {form.telephone && <a href={`tel:${form.telephone}`} className="flex min-h-9 items-center gap-2 text-primary hover:underline"><Phone className="h-4 w-4" />{form.telephone}</a>}
            </div>
            <Button className="h-11 w-full rounded-full" onClick={saveProfil} disabled={savingProfil}>
              {savingProfil ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Enregistrer
            </Button>
          </section>

          <section className={cn(DASH_CARD, 'p-4 md:p-5')} aria-label="Journal des courses">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">Journal des courses</h2>
              <DashBadge tone="muted">{courses.length} visite{courses.length > 1 ? 's' : ''}</DashBadge>
            </div>
            {coursesTriees.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Aucune visite attribuée.</p>
            ) : (
              <>
                <ul className="divide-y divide-border/60">
                  {coursesTriees.slice(0, coursesVisibles).map((c) => {
                    const v = visites.find((x) => x.date_visite === c.date_visite && ((x.adresse || x.offres?.adresse || 'Adresse non renseignée') === c.adresse));
                    const st = STATUT_MISSION[v?.statut_coursier ?? ''] ;
                    return (
                      <li key={c.cle} className="flex items-start gap-3 py-2.5">
                        <span className="w-[46px] shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
                          {jourMois(c.date_visite)}<br />{formatZurichTime(c.date_visite)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-1.5 text-sm text-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="break-words">{c.adresse}</span></span>
                          <span className="text-xs text-muted-foreground">{c.clients} client{c.clients > 1 ? 's' : ''}</span>
                        </span>
                        {st && <DashBadge tone={st.tone}>{st.label}</DashBadge>}
                      </li>
                    );
                  })}
                </ul>
                {coursesTriees.length > coursesVisibles && (
                  <Button variant="ghost" className="mt-2 h-10 w-full rounded-full" onClick={() => setCoursesVisibles((n) => n + 30)}>
                    Voir plus ({coursesTriees.length - coursesVisibles})
                  </Button>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* Paiement */}
      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme payé</DialogTitle>
            <DialogDescription>
              {payDialog ? `${payDialog.ids.length} pointage${payDialog.ids.length > 1 ? 's' : ''} · ${formatDuration(payDialog.minutes)} · ${formatChf(payDialog.montant, 2)} à ${formatChf(tarif, 2)}/h.` : ''}
              {' '}Enregistrez le paiement après avoir fait le virement à {nom}. Vous pourrez l'annuler si besoin.
            </DialogDescription>
          </DialogHeader>
          {form.iban && <p className="rounded-2xl bg-muted/60 px-3 py-2 text-sm"><span className="text-muted-foreground">IBAN : </span><span className="font-medium">{form.iban}</span></p>}
          <DialogFooter>
            <Button variant="outline" className="h-11 rounded-full" onClick={() => setPayDialog(null)}>Annuler</Button>
            <Button className="h-11 rounded-full" onClick={confirmerPaiement} disabled={paying}>
              {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Payé · {payDialog ? formatChf(payDialog.montant, 2) : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Corriger / ajouter / exclure */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit?.mode === 'ajouter' ? 'Ajouter un pointage' : edit?.mode === 'exclure' ? 'Exclure ce pointage de la paie' : edit?.p && !edit.p.ended_at ? 'Clôturer la session' : 'Corriger le pointage'}
            </DialogTitle>
            <DialogDescription>
              {edit?.mode === 'exclure'
                ? 'La session reste visible dans l’historique mais ne sera pas payée.'
                : 'Heures en heure suisse. L’heure pointée d’origine reste visible pour vous et pour le coursier.'}
            </DialogDescription>
          </DialogHeader>
          {edit?.p && (
            <p className="rounded-2xl bg-muted/60 px-3 py-2 text-sm">
              Pointé : {formatZurichDay(edit.p.started_at)} · {formatZurichTime(edit.p.started_at)} → {edit.p.ended_at ? formatZurichTime(edit.p.ended_at) : 'en cours'}
              {' · '}{formatDuration(minutesPointage(edit.p))}
            </p>
          )}
          {edit && edit.mode !== 'exclure' && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="e-date">Date</Label><Input id="e-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="rounded-full" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="e-debut">Arrivée</Label><Input id="e-debut" type="time" value={editDebut} onChange={(e) => setEditDebut(e.target.value)} className="rounded-full" /></div>
                <div className="space-y-1.5"><Label htmlFor="e-fin">Départ</Label><Input id="e-fin" type="time" value={editFin} onChange={(e) => setEditFin(e.target.value)} className="rounded-full" /></div>
              </div>
              {edit.p && (() => {
                const s = finSuggeree(edit.p, visitesPaie);
                return s ? (
                  <button type="button" onClick={() => setEditFin(isoToZurichTimeInput(s))} className="imr-lg-glass inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground">
                    <RotateCcw className="h-4 w-4" /> Départ suggéré : {formatZurichTime(s)} (dernière visite + 30 min)
                  </button>
                ) : null;
              })()}
              {(() => {
                const { debut, fin } = finDepuisSaisie(editDate, editDebut, editFin);
                if (!debut || !fin) return null;
                const min = Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 60000);
                return <p className="text-sm text-muted-foreground">Durée retenue : <strong className="text-foreground">{formatDuration(min)}</strong> · {formatChf((min / 60) * tarif, 2)}</p>;
              })()}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="e-motif">Motif *</Label>
            <Textarea id="e-motif" rows={2} value={editMotif} onChange={(e) => setEditMotif(e.target.value)} placeholder={edit?.mode === 'exclure' ? 'Ex. : compteur lancé par erreur' : 'Ex. : départ oublié, fin de la dernière visite à 18h30'} />
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 rounded-full" onClick={() => setEdit(null)}>Annuler</Button>
            <Button className="h-11 rounded-full" variant={edit?.mode === 'exclure' ? 'destructive' : 'default'} onClick={enregistrerEdition} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : edit?.mode === 'exclure' ? <XCircle className="mr-2 h-4 w-4" /> : edit?.mode === 'ajouter' ? <CalendarPlus className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              {edit?.mode === 'exclure' ? 'Exclure' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashPage>
  );
}

function LignePointage({
  p, tarif, alertes, visitesJour, suggestion, selected, onSelect, busy, onCorriger, onExclure, onReintegrer, onPayer, onAnnulerPaiement,
}: {
  p: Pointage; tarif: number; alertes: { code: string; label: string }[];
  visitesJour: { cle: string; date_visite: string; adresse: string; clients: number }[];
  suggestion: string | null; selected: boolean; onSelect: () => void; busy: boolean;
  onCorriger: () => void; onExclure: () => void; onReintegrer: () => void; onPayer: () => void; onAnnulerPaiement: () => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const minutes = minutesPointage(p);
  const montant = montantPointage(p, tarif);
  const corrige = !!p.corrige_at && (p.original_started_at || p.original_ended_at);
  const payable = !p.paye && !p.exclue;

  return (
    <li className={cn('px-4 py-3 md:px-5', p.exclue && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <div className="pt-1">
          {payable ? <Checkbox checked={selected} onCheckedChange={onSelect} aria-label="Sélectionner ce pointage" /> : <span className="block h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-foreground">{formatZurichDay(p.started_at)}</p>
            {p.paye && <DashBadge tone="success">Payé{p.paye_at ? ` le ${formatZurichDay(p.paye_at, { weekday: false, year: false })}` : ''}</DashBadge>}
            {p.exclue && <DashBadge tone="muted">Exclu</DashBadge>}
            {corrige && <DashBadge tone="primary">Corrigé</DashBadge>}
            {p.ajoute_par_admin && <DashBadge tone="primary">Ajouté par l'admin</DashBadge>}
            {alertes.map((a) => <DashBadge key={a.code} tone="danger">{a.label}</DashBadge>)}
          </div>
          <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
            {formatZurichTime(p.started_at)} → {p.ended_at ? formatZurichTime(p.ended_at) : 'en cours'} · {formatDuration(minutes)}
          </p>
          {corrige && (
            <p className="text-xs text-muted-foreground">
              Pointé à l'origine : {p.original_started_at ? formatZurichTime(p.original_started_at) : '—'} → {p.original_ended_at ? formatZurichTime(p.original_ended_at) : 'non clôturé'}
            </p>
          )}
          {p.motif_correction && <p className="text-xs text-muted-foreground">Motif : {p.motif_correction}</p>}
          <button type="button" onClick={() => setOuvert((o) => !o)} className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-medium text-primary">
            {visitesJour.length} visite{visitesJour.length > 1 ? 's' : ''} ce jour-là <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', ouvert && 'rotate-180')} />
          </button>
          {ouvert && (
            <ul className="mt-1 space-y-1">
              {visitesJour.length === 0 && <li className="text-xs text-muted-foreground">Aucune visite attribuée à ce coursier ce jour-là.</li>}
              {visitesJour.map((v) => (
                <li key={v.cle} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="w-10 shrink-0 tabular-nums text-foreground">{formatZurichTime(v.date_visite)}</span>
                  <span className="min-w-0 break-words">{v.adresse} · {v.clients} client{v.clients > 1 ? 's' : ''}</span>
                </li>
              ))}
              {suggestion && payable && <li className="text-xs text-foreground">Départ suggéré : {formatZurichTime(suggestion)}</li>}
            </ul>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-sm font-semibold tabular-nums', p.exclue ? 'text-muted-foreground line-through' : 'text-foreground')}>{formatChf(p.exclue ? (minutes / 60) * tarif : montant, 2)}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 pl-7">
        {payable && (
          <>
            <Button size="sm" variant={alertes.length ? 'default' : 'outline'} className="h-9 rounded-full" onClick={onCorriger}><Pencil className="mr-1.5 h-3.5 w-3.5" />Corriger</Button>
            <Button size="sm" variant="outline" className="h-9 rounded-full" onClick={onPayer}><CheckCircle className="mr-1.5 h-3.5 w-3.5" />Payer</Button>
            <Button size="sm" variant="ghost" className="h-9 rounded-full text-destructive hover:text-destructive" onClick={onExclure}><XCircle className="mr-1.5 h-3.5 w-3.5" />Exclure</Button>
          </>
        )}
        {p.exclue && (
          <Button size="sm" variant="outline" className="h-9 rounded-full" disabled={busy} onClick={onReintegrer}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Undo2 className="mr-1.5 h-3.5 w-3.5" />}Réintégrer
          </Button>
        )}
        {p.paye && (
          <Button size="sm" variant="ghost" className="h-9 rounded-full" disabled={busy} onClick={onAnnulerPaiement}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Undo2 className="mr-1.5 h-3.5 w-3.5" />}Annuler le paiement
          </Button>
        )}
      </div>
    </li>
  );
}

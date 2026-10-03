import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { rowToFormData } from '@/hooks/useCandidatCriteres';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Loader2, Lock, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCandidatCandidatures, RETENU_BAILLEUR } from '@/hooks/useCandidatCandidatures';
import { MandatFormData, initialFormData } from '@/components/mandat/types';
import MandatFormStep1 from '@/components/mandat/MandatFormStep1';
import MandatFormStep2 from '@/components/mandat/MandatFormStep2';
import MandatFormStep3 from '@/components/mandat/MandatFormStep3';
import MandatFormStep4 from '@/components/mandat/MandatFormStep4';
import MandatFormStep5 from '@/components/mandat/MandatFormStep5';

// Mêmes questions que /nouveau-mandat (parcours location) — SANS documents ni signature.
const STEPS = [
  { key: 'perso', title: 'Informations personnelles', C: MandatFormStep1 },
  { key: 'situation', title: 'Situation actuelle', C: MandatFormStep2 },
  { key: 'finance', title: 'Situation financière', C: MandatFormStep3 },
  { key: 'candidats', title: 'Candidats', C: MandatFormStep5 },
  { key: 'criteres', title: 'Critères de recherche', C: MandatFormStep4 },
] as const;
const PIECES = ['Fiches de salaire', 'Extrait des poursuites', 'Contrat de travail', "Pièce d'identité"];
const MANDAT_DRAFT_KEY = 'mandat_form_data';
const num = (v: unknown) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

export default function CandidatDemande() {
  const { user, switchRole } = useAuth() as any;
  const navigate = useNavigate();
  const { data: candidatures = [] } = useCandidatCandidatures();
  const retenu = candidatures.some((c) => c.statut === RETENU_BAILLEUR || c.statut === 'documents_demandes');
  const [form, setForm] = useState<MandatFormData>({ ...initialFormData, journey: 'rental' as any });
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [annonceId, setAnnonceId] = useState<string>('');
  const [visitees, setVisitees] = useState<{ id: string; label: string }[]>([]);
  const [sp] = useSearchParams();
  const candId = sp.get('candidature');
  const qc = useQueryClient();
  type CoCand = { prenom: string; nom: string; date_naissance: string; lien: string };
  const [extra, setExtra] = useState<{ civilite: string; type_contrat: string; date_emmenagement_souhaitee: string; co_candidats: CoCand[] }>({ civilite: '', type_contrat: '', date_emmenagement_souhaitee: '', co_candidats: [] });
  const [errors, setErrors] = useState<string[]>([]);
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    if (!candId) return;
    (async () => {
      const { data: r } = await (supabase as any).from('candidatures_location').select('annonce_id, civilite, type_contrat, date_emmenagement_souhaitee, co_candidats').eq('id', candId).maybeSingle();
      if (!r) return;
      if (r.annonce_id) setAnnonceId(r.annonce_id);
      setExtra({ civilite: r.civilite ?? '', type_contrat: r.type_contrat ?? '', date_emmenagement_souhaitee: r.date_emmenagement_souhaitee ?? '', co_candidats: Array.isArray(r.co_candidats) ? r.co_candidats : [] });
    })();
  }, [candId]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: rows } = await (supabase as any).from('candidatures_location')
        .select('annonce_id, creneau_id, annonces_publiques(titre, adresse, ville), annonce_creneaux(date_heure)')
        .eq('user_id', user.id).not('annonce_id', 'is', null).not('creneau_id', 'is', null);
      const map = new Map<string, string>();
      (rows ?? []).forEach((r: any) => {
        if (map.has(r.annonce_id)) return;
        const a = r.annonces_publiques ?? {};
        const lieu = [a.adresse, a.ville].filter(Boolean).join(', ');
        const d = r.annonce_creneaux?.date_heure
          ? new Date(r.annonce_creneaux.date_heure).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', dateStyle: 'short', timeStyle: 'short' })
          : '';
        map.set(r.annonce_id, [a.titre || 'Annonce', lieu, d && `visite ${d}`].filter(Boolean).join(' — '));
      });
      setVisitees(Array.from(map, ([id, label]) => ({ id, label })));
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase as any).from('demandes_location_candidat').select('*').eq('user_id', user.id).maybeSingle();
      if (data?.annonce_id) setAnnonceId(data.annonce_id);
      const base: MandatFormData = { ...initialFormData, journey: 'rental' as any, email: user.email ?? '' };
      if (data?.mandat_data) setForm({ ...base, ...data.mandat_data });
      else if (data) setForm({ ...base, prenom: data.prenom ?? '', nom: data.nom ?? '', email: data.email ?? base.email, telephone: data.telephone ?? '',
        date_naissance: data.date_naissance ?? '', nationalite: data.nationalite ?? '', type_permis: data.type_permis ?? '', etat_civil: data.etat_civil ?? '',
        adresse: data.adresse_actuelle ?? '', loyer_actuel: data.loyer_actuel ?? 0, motif_changement: data.motif_changement ?? '', profession: data.profession ?? '',
        employeur: data.employeur ?? '', revenus_mensuels: data.revenus_mensuels ?? 0, nombre_occupants: data.nombre_occupants ?? 1,
        region_recherche: data.region_recherchee ?? '', budget_max: data.budget_max ?? 0 });
      else {
        const [{ data: crit }, { data: prof }] = await Promise.all([
          (supabase as any).from('candidat_criteres').select('*').eq('user_id', user.id).maybeSingle(),
          (supabase as any).from('profiles').select('prenom, nom, telephone').eq('id', user.id).maybeSingle(),
        ]);
        const f = crit ? rowToFormData(crit) : initialFormData;
        const keep = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v != null && !(typeof v === 'number' && v === 0)));
        setForm({ ...base, ...keep, prenom: prof?.prenom ?? '', nom: prof?.nom ?? '', telephone: prof?.telephone ?? '', email: base.email, journey: 'rental' as any });
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const onChange = (d: Partial<MandatFormData>) => setForm((p) => ({ ...p, ...d }));

  const save = async () => {
    if (!user?.id || saving) return;
    setSaving(true);
    const { signature_data, documents_uploades, ...mandat_data } = form as any;
    const payload = {
      user_id: user.id, mandat_data, updated_at: new Date().toISOString(), annonce_id: annonceId || null,
      prenom: form.prenom || null, nom: form.nom || null, email: form.email || user.email, telephone: form.telephone || null,
      date_naissance: form.date_naissance || null, nationalite: form.nationalite || null, type_permis: form.type_permis || null,
      etat_civil: form.etat_civil || null, adresse_actuelle: form.adresse || null, loyer_actuel: num(form.loyer_actuel),
      motif_changement: form.motif_changement || null, profession: form.profession || null, employeur: form.employeur || null,
      revenus_mensuels: num(form.revenus_mensuels), nombre_occupants: num(form.nombre_occupants),
      region_recherchee: form.region_recherche || null, budget_max: num(form.budget_max), pieces_min: num(parseFloat(form.pieces_recherche)),
    };
    const { error } = await (supabase as any).from('demandes_location_candidat').upsert(payload, { onConflict: 'user_id' });
    if (error) { setSaving(false); return toast.error(error.message); }
    if (annonceId) {
      // Report sur la candidature de la visite (colonnes existantes de candidatures_location uniquement).
      const { error: cErr } = await (supabase as any).from('candidatures_location').update({
        prenom: payload.prenom, nom: payload.nom, email: payload.email, telephone: payload.telephone,
        date_naissance: payload.date_naissance, nationalite: payload.nationalite, type_permis: payload.type_permis,
        profession: payload.profession, employeur: payload.employeur, revenus_mensuels: payload.revenus_mensuels,
        adresse_actuelle: payload.adresse_actuelle, loyer_actuel: payload.loyer_actuel, motif_changement: payload.motif_changement,
        nombre_occupants: payload.nombre_occupants, updated_at: payload.updated_at,
      }).eq('user_id', user.id).eq('annonce_id', annonceId);
      if (cErr) toast.warning("Demande enregistrée, mais la candidature liée n'a pas pu être mise à jour.");
    }
    setSaving(false);
    toast.success('Demande enregistrée');
    setSaved(true);
  };

  const deposer = async () => {
    if (!candId || depositing) return;
    const errs: string[] = [];
    if (!form.prenom) errs.push('Prénom manquant (étape 1)');
    if (!form.nom) errs.push('Nom manquant (étape 1)');
    if (!form.telephone) errs.push('Téléphone manquant (étape 1)');
    if (!num(form.revenus_mensuels)) errs.push('Revenus mensuels manquants (étape 3)');
    if (!extra.civilite) errs.push('Civilité manquante');
    if (!extra.date_emmenagement_souhaitee) errs.push("Date d'emménagement souhaitée manquante");
    if (extra.co_candidats.some((c) => !c.prenom || !c.nom)) errs.push('Nom et prénom requis pour chaque co-candidat');
    setErrors(errs);
    if (errs.length) return;
    setDepositing(true);
    const { error: uErr } = await (supabase as any).from('candidatures_location').update({
      civilite: extra.civilite, type_contrat: extra.type_contrat || null, date_emmenagement_souhaitee: extra.date_emmenagement_souhaitee,
      co_candidats: extra.co_candidats, prenom: form.prenom, nom: form.nom, telephone: form.telephone,
      date_naissance: form.date_naissance || null, nationalite: form.nationalite || null, type_permis: form.type_permis || null,
      profession: form.profession || null, employeur: form.employeur || null, revenus_mensuels: num(form.revenus_mensuels),
      loyer_actuel: num(form.loyer_actuel), adresse_actuelle: form.adresse || null, motif_changement: form.motif_changement || null,
      nombre_occupants: num(form.nombre_occupants),
    }).eq('id', candId);
    if (uErr) { setDepositing(false); return toast.error(uErr.message); }
    const { error } = await (supabase as any).rpc('candidat_deposer_candidature', { _id: candId });
    if (error) { setDepositing(false); return toast.error(error.message); }
    supabase.functions.invoke('candidature-relocation-notify', { body: { candidature_id: candId, etape: 'candidature_deposee' } }).catch(() => {});
    await save();
    setDepositing(false);
    toast.success('Candidature déposée');
    qc.invalidateQueries({ queryKey: ['candidat-candidatures'] });
    navigate('/candidat/candidatures');
  };

  const switchToClient = async () => {
    if (switching) return;
    setSwitching(true);
    const { error } = await supabase.rpc('activate_candidat_searches' as any);
    if (error) { setSwitching(false); return toast.error(error.message); }
    // Pré-remplit le vrai mandat avec les réponses (même compte, pas de nouvelle inscription).
    try {
      const { signature_data, documents_uploades, ...rest } = form as any;
      localStorage.setItem(MANDAT_DRAFT_KEY, JSON.stringify({ ...rest, journey: 'rental' }));
    } catch { /* ignore */ }
    try { await switchRole?.('client'); } catch { /* ignore */ }
    window.location.href = '/client';
  };

  const upload = async (piece: string, file: File) => {
    if (!user?.id) return;
    setUploading(piece);
    try {
      const path = `${user.id}/candidat/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('client-documents').upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from('documents').insert({ user_id: user.id, nom: file.name, type: file.type || 'application/octet-stream', taille: file.size, url: path, type_document: piece });
      if (error) throw error;
      toast.success(`${piece} envoyé`);
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'envoi");
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const total = STEPS.length + (candId ? 1 : 0);
  const isExtra = !!candId && step === STEPS.length;
  const Step = (isExtra ? null : STEPS[step].C) as any;
  const last = step === total - 1;
  const setCo = (i: number, k: keyof CoCand, v: string) => setExtra((p) => ({ ...p, co_candidats: p.co_candidats.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Ma demande de location</h1>
          <p className="text-sm text-muted-foreground">Mêmes questions que le mandat de recherche — aucune pièce justificative ni signature à cette étape.</p>
          <p className="text-xs text-muted-foreground/80">
            Aucun document justificatif n'est demandé à cette étape — vos pièces ne seront requises que si votre dossier est retenu par un propriétaire. Vos données sont traitées conformément à la Loi fédérale sur la protection des données (LPD/nLPD) et uniquement pour le traitement de votre demande de location.
          </p>
        </header>

        <div className="space-y-2">
          <Label htmlFor="annonce-visitee">Rattacher ma demande à une offre visitée</Label>
          <Select value={annonceId} onValueChange={setAnnonceId} disabled={visitees.length === 0}>
            <SelectTrigger id="annonce-visitee" className="min-h-[44px]"><SelectValue placeholder="Choisir une offre visitée" /></SelectTrigger>
            <SelectContent>
              {visitees.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {visitees.length === 0 && (
            <p className="text-xs text-muted-foreground">Réservez d'abord une visite sur une annonce pour pouvoir y rattacher votre demande.</p>
          )}
        </div>

        <div className="flex gap-1" aria-label="Progression">
          {[...STEPS, ...(candId ? [{ key: 'depot', title: 'Dépôt' }] : [])].map((s, i) => (
            <button key={s.key} type="button" onClick={() => setStep(i)} aria-label={s.title}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{step + 1}. {isExtra ? 'Dépôt de la candidature' : STEPS[step].title}</CardTitle></CardHeader>
          <CardContent>
            {isExtra ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><Label>Civilité *</Label>
                    <Select value={extra.civilite} onValueChange={(v) => setExtra((p) => ({ ...p, civilite: v }))}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>{['Madame', 'Monsieur'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Type de contrat</Label>
                    <Select value={extra.type_contrat} onValueChange={(v) => setExtra((p) => ({ ...p, type_contrat: v }))}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>{['CDI', 'CDD', 'Indépendant', 'Temporaire', 'Étudiant', 'Retraité', 'Sans emploi'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Date d'emménagement souhaitée *</Label>
                    <Input type="date" className="min-h-[44px]" value={extra.date_emmenagement_souhaitee} onChange={(e) => setExtra((p) => ({ ...p, date_emmenagement_souhaitee: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Co-candidats</Label>
                  {extra.co_candidats.map((c, i) => (
                    <div key={i} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-2">
                      <Input placeholder="Prénom *" value={c.prenom} onChange={(e) => setCo(i, 'prenom', e.target.value)} className="min-h-[44px]" />
                      <Input placeholder="Nom *" value={c.nom} onChange={(e) => setCo(i, 'nom', e.target.value)} className="min-h-[44px]" />
                      <Input type="date" value={c.date_naissance} onChange={(e) => setCo(i, 'date_naissance', e.target.value)} className="min-h-[44px]" />
                      <Input placeholder="Lien (conjoint, colocataire…)" value={c.lien} onChange={(e) => setCo(i, 'lien', e.target.value)} className="min-h-[44px]" />
                      <Button variant="ghost" size="sm" className="sm:col-span-2" onClick={() => setExtra((p) => ({ ...p, co_candidats: p.co_candidats.filter((_, j) => j !== i) }))}>Retirer</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="min-h-[40px]" onClick={() => setExtra((p) => ({ ...p, co_candidats: [...p.co_candidats, { prenom: '', nom: '', date_naissance: '', lien: '' }] }))}>+ Ajouter un co-candidat</Button>
                </div>
                {errors.length > 0 && <ul className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
              </div>
            ) : <Step data={form} onChange={onChange} />}
          </CardContent>
        </Card>

        <div className="flex justify-between gap-2">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)} className="min-h-[44px]">
            <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
          </Button>
          {last && candId ? (
            <Button onClick={deposer} disabled={depositing} className="min-h-[44px]">
              {depositing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Déposer ma candidature
            </Button>
          ) : last ? (
            <Button onClick={save} disabled={saving} className="min-h-[44px]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer ma demande
            </Button>
          ) : (
            <Button onClick={() => setStep(step + 1)} className="min-h-[44px]">
              Suivant <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {saved && (
          <Card className="border-primary/40">
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm text-muted-foreground">
                Votre demande est enregistrée. Vous pouvez aussi confier votre recherche à nos agents pour recevoir d'autres appartements :
                l'activation se fait avec le même compte, en complétant et signant le mandat de recherche (un acompte est dû à l'activation).
              </p>
              <Button onClick={switchToClient} disabled={switching} className="min-h-[44px] w-full sm:w-auto">
                {switching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Basculez pour voir d'autres appartements
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Mes pièces</CardTitle></CardHeader>
          <CardContent>
            {!retenu ? (
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Vos documents vous seront demandés uniquement si votre dossier est retenu par un propriétaire.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {PIECES.map((p) => (
                  <label key={p} className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
                    {uploading === p ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-primary" />}
                    <span className="text-sm font-medium">{p}</span>
                    <input type="file" className="sr-only" accept="application/pdf,image/*" disabled={!!uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(p, f); e.target.value = ''; }} />
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Lock, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  const retenu = candidatures.some((c) => c.statut === RETENU_BAILLEUR);
  const [form, setForm] = useState<MandatFormData>({ ...initialFormData, journey: 'rental' as any });
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase as any).from('demandes_location_candidat').select('*').eq('user_id', user.id).maybeSingle();
      const base: MandatFormData = { ...initialFormData, journey: 'rental' as any, email: user.email ?? '' };
      if (data?.mandat_data) setForm({ ...base, ...data.mandat_data });
      else if (data) setForm({ ...base, prenom: data.prenom ?? '', nom: data.nom ?? '', email: data.email ?? base.email, telephone: data.telephone ?? '',
        date_naissance: data.date_naissance ?? '', nationalite: data.nationalite ?? '', type_permis: data.type_permis ?? '', etat_civil: data.etat_civil ?? '',
        adresse: data.adresse_actuelle ?? '', loyer_actuel: data.loyer_actuel ?? 0, motif_changement: data.motif_changement ?? '', profession: data.profession ?? '',
        employeur: data.employeur ?? '', revenus_mensuels: data.revenus_mensuels ?? 0, nombre_occupants: data.nombre_occupants ?? 1,
        region_recherche: data.region_recherchee ?? '', budget_max: data.budget_max ?? 0 });
      else setForm(base);
      setLoading(false);
    })();
  }, [user?.id]);

  const onChange = (d: Partial<MandatFormData>) => setForm((p) => ({ ...p, ...d }));

  const save = async () => {
    if (!user?.id || saving) return;
    setSaving(true);
    const { signature_data, documents_uploades, ...mandat_data } = form as any;
    const payload = {
      user_id: user.id, mandat_data, updated_at: new Date().toISOString(),
      prenom: form.prenom || null, nom: form.nom || null, email: form.email || user.email, telephone: form.telephone || null,
      date_naissance: form.date_naissance || null, nationalite: form.nationalite || null, type_permis: form.type_permis || null,
      etat_civil: form.etat_civil || null, adresse_actuelle: form.adresse || null, loyer_actuel: num(form.loyer_actuel),
      motif_changement: form.motif_changement || null, profession: form.profession || null, employeur: form.employeur || null,
      revenus_mensuels: num(form.revenus_mensuels), nombre_occupants: num(form.nombre_occupants),
      region_recherchee: form.region_recherche || null, budget_max: num(form.budget_max), pieces_min: num(parseFloat(form.pieces_recherche)),
    };
    const { error } = await (supabase as any).from('demandes_location_candidat').upsert(payload, { onConflict: 'user_id' });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Demande enregistrée');
    setSaved(true);
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

  const Step = STEPS[step].C as any;
  const last = step === STEPS.length - 1;

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

        <div className="flex gap-1" aria-label="Progression">
          {STEPS.map((s, i) => (
            <button key={s.key} type="button" onClick={() => setStep(i)} aria-label={s.title}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{step + 1}. {STEPS[step].title}</CardTitle></CardHeader>
          <CardContent><Step data={form} onChange={onChange} /></CardContent>
        </Card>

        <div className="flex justify-between gap-2">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)} className="min-h-[44px]">
            <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
          </Button>
          {last ? (
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

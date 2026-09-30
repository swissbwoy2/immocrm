import { useEffect, useState } from 'react';
import { Loader2, Lock, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCandidatCandidatures, RETENU_BAILLEUR } from '@/hooks/useCandidatCandidatures';

type Field = { key: string; label: string; type?: string };
const SECTIONS: { title: string; fields: Field[] }[] = [
  { title: 'Identité', fields: [
    { key: 'prenom', label: 'Prénom' }, { key: 'nom', label: 'Nom' },
    { key: 'email', label: 'E-mail', type: 'email' }, { key: 'telephone', label: 'Téléphone', type: 'tel' },
    { key: 'date_naissance', label: 'Date de naissance', type: 'date' }, { key: 'nationalite', label: 'Nationalité' },
    { key: 'type_permis', label: 'Type de permis' }, { key: 'etat_civil', label: 'État civil' },
  ] },
  { title: 'Logement actuel', fields: [
    { key: 'adresse_actuelle', label: 'Adresse actuelle' }, { key: 'loyer_actuel', label: 'Loyer actuel (CHF)', type: 'number' },
  ] },
  { title: 'Situation professionnelle', fields: [
    { key: 'profession', label: 'Profession' }, { key: 'employeur', label: 'Employeur' },
    { key: 'type_contrat', label: 'Type de contrat' }, { key: 'revenus_mensuels', label: 'Revenus mensuels nets (CHF)', type: 'number' },
  ] },
  { title: 'Recherche', fields: [
    { key: 'nombre_occupants', label: 'Nombre de personnes', type: 'number' }, { key: 'date_entree_souhaitee', label: "Date d'entrée souhaitée", type: 'date' },
    { key: 'region_recherchee', label: 'Région recherchée' }, { key: 'budget_max', label: 'Budget max (CHF)', type: 'number' },
    { key: 'pieces_min', label: 'Pièces minimum', type: 'number' },
  ] },
];
const NUMERIC = ['loyer_actuel', 'revenus_mensuels', 'nombre_occupants', 'budget_max', 'pieces_min'];
const PIECES = ['Fiches de salaire', 'Extrait des poursuites', 'Contrat de travail', "Pièce d'identité"];

export default function CandidatDemande() {
  const { user } = useAuth();
  const { data: candidatures = [] } = useCandidatCandidatures();
  const retenu = candidatures.some((c) => c.statut === RETENU_BAILLEUR);
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase as any).from('demandes_location_candidat').select('*').eq('user_id', user.id).maybeSingle();
      setForm(data ?? { email: user.email });
      setLoading(false);
    })();
  }, [user?.id]);

  const save = async () => {
    if (!user?.id || saving) return;
    setSaving(true);
    const payload: Record<string, any> = { user_id: user.id, motif_changement: form.motif_changement ?? null, updated_at: new Date().toISOString() };
    SECTIONS.flatMap((s) => s.fields).forEach(({ key }) => {
      const v = form[key];
      payload[key] = v === '' || v === undefined ? null : NUMERIC.includes(key) ? Number(v) : v;
    });
    const { error } = await (supabase as any).from('demandes_location_candidat').upsert(payload, { onConflict: 'user_id' });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Demande enregistrée');
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Ma demande de location</h1>
          <p className="text-sm text-muted-foreground">Aucune pièce justificative n'est demandée à cette étape.</p>
        </header>

        {SECTIONS.map((s) => (
          <Card key={s.title}>
            <CardHeader><CardTitle className="text-base">{s.title}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {s.fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input id={f.key} type={f.type || 'text'} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
              {s.title === 'Logement actuel' && (
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="motif">Motif du changement</Label>
                  <Textarea id="motif" value={form.motif_changement ?? ''} onChange={(e) => setForm({ ...form, motif_changement: e.target.value })} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Button onClick={save} disabled={saving} className="min-h-[44px] w-full sm:w-auto">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer ma demande
        </Button>

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

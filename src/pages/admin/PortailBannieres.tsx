import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Save, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { PortailBanniere } from '@/components/public/PortailBannieres';

const BUCKET = 'portail-bannieres';
const table = () => supabase.from('portail_bannieres' as any);

function Row({ b, onChanged }: { b: PortailBanniere; onChanged: () => void }) {
  const [titre, setTitre] = useState(b.titre || '');
  const [lien, setLien] = useState(b.lien || '');
  const [ordre, setOrdre] = useState(String(b.ordre ?? 0));
  const [busy, setBusy] = useState(false);

  const update = async (patch: Record<string, unknown>) => {
    setBusy(true);
    const { error } = await table().update({ ...patch, updated_at: new Date().toISOString() }).eq('id', b.id);
    setBusy(false);
    if (error) return toast.error("Enregistrement impossible");
    toast.success('Bannière mise à jour');
    onChanged();
  };

  const remove = async () => {
    if (!confirm('Supprimer cette bannière ?')) return;
    const { error } = await table().delete().eq('id', b.id);
    if (error) return toast.error('Suppression impossible');
    toast.success('Bannière supprimée');
    onChanged();
  };

  return (
    <Card>
      <CardContent className="p-4 grid gap-4 md:grid-cols-[240px_1fr]">
        <img src={b.image_url} alt={b.titre || ''} className="w-full h-auto rounded-lg border border-border" />
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Titre</Label><Input value={titre} onChange={(e) => setTitre(e.target.value)} /></div>
            <div><Label>Lien</Label><Input value={lien} onChange={(e) => setLien(e.target.value)} placeholder="/nouveau-mandat ou https://…" /></div>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-24"><Label>Ordre</Label><Input type="number" value={ordre} onChange={(e) => setOrdre(e.target.value)} /></div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={b.actif} disabled={busy} onCheckedChange={(v) => update({ actif: v })} />
              <span className="text-sm">{b.actif ? 'Active' : 'Inactive'}</span>
            </div>
            <Button size="sm" disabled={busy} onClick={() => update({ titre: titre || null, lien: lien || null, ordre: Number(ordre) || 0 })}>
              <Save className="h-4 w-4 mr-1" />Enregistrer
            </Button>
            <Button size="sm" variant="destructive" onClick={remove}><Trash2 className="h-4 w-4 mr-1" />Supprimer</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPortailBannieres() {
  const qc = useQueryClient();
  const { data = [], refetch } = useQuery({
    queryKey: ['portail-bannieres-admin'],
    queryFn: async () => {
      const { data, error } = await table().select('*').order('ordre').order('created_at');
      if (error) throw error;
      return (data || []) as unknown as PortailBanniere[];
    },
  });
  const [file, setFile] = useState<File | null>(null);
  const [titre, setTitre] = useState('');
  const [lien, setLien] = useState('');
  const [ordre, setOrdre] = useState('0');
  const [actif, setActif] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ['portail-bannieres-public'] });
  };

  const add = async () => {
    if (!file) return toast.error('Choisissez une image');
    setSaving(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { error } = await table().insert({
        image_url: pub.publicUrl, titre: titre || null, lien: lien || null, ordre: Number(ordre) || 0, actif,
      });
      if (error) throw error;
      toast.success('Bannière ajoutée');
      setFile(null); setTitre(''); setLien(''); setOrdre('0'); setActif(true);
      refresh();
    } catch {
      toast.error("Ajout impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Bannières du portail</h1>
      <Card>
        <CardHeader><CardTitle>Ajouter une bannière</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div><Label>Image *</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Titre</Label><Input value={titre} onChange={(e) => setTitre(e.target.value)} /></div>
            <div><Label>Lien</Label><Input value={lien} onChange={(e) => setLien(e.target.value)} placeholder="/nouveau-mandat ou https://…" /></div>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-24"><Label>Ordre</Label><Input type="number" value={ordre} onChange={(e) => setOrdre(e.target.value)} /></div>
            <div className="flex items-center gap-2 pb-2"><Switch checked={actif} onCheckedChange={setActif} /><span className="text-sm">Active</span></div>
            <Button onClick={add} disabled={saving}><Upload className="h-4 w-4 mr-1" />{saving ? 'Envoi…' : 'Ajouter'}</Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {data.length === 0 && <p className="text-muted-foreground text-sm">Aucune bannière.</p>}
        {data.map((b) => <Row key={`${b.id}-${b.actif}`} b={b} onChanged={refresh} />)}
      </div>
    </div>
  );
}

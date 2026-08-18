import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFormulaires, useFormulaireChamps } from '../hooks/useFormulaires';
import { STANDARD_FIELD_KEYS, keyLabel } from '../keys';
import type { FormulaireChamp, FormulaireLocation } from '../types';
import { FORM_BUCKET, fetchBytes, uploadPdf } from '../lib/storage';
import { usePdfDocument } from '../lib/pdfjs';
import { autoMapFieldName, detectAcroFields, shouldUseAcroform } from '../lib/acroform';
import PdfPage from '../components/PdfPage';
import DraggableBox from '../components/DraggableBox';
import AcroformMapper from '../components/AcroformMapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { ArrowLeft, Copy, FileText, Plus, Save, Trash2, Upload, Loader2 } from 'lucide-react';

export default function ModelesDemandeLocation() {
  const { user } = useAuth();
  const { formulaires, loading, reload } = useFormulaires();
  const [editing, setEditing] = useState<FormulaireLocation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [nom, setNom] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [annexe, setAnnexe] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const createModele = async () => {
    if (!nom.trim() || !file) {
      toast.error('Un nom et un PDF sont requis');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('formulaires_location')
        .insert({ nom: nom.trim(), created_by: user?.id ?? null })
        .select()
        .single();
      if (error) throw error;

      const path = await uploadPdf(`${data.id}/template.pdf`, file);
      let annexePath: string | null = null;
      if (annexe) annexePath = await uploadPdf(`${data.id}/annexe.pdf`, annexe);

      const bytes = new Uint8Array(await file.arrayBuffer());
      let nbPages = 1;
      try {
        const { PDFDocument } = await import('pdf-lib');
        nbPages = (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount();
      } catch { /* noop */ }

      // Détection AcroForm + auto-mapping
      const detected = await detectAcroFields(bytes);
      const mode = shouldUseAcroform(detected) ? 'acroform' : 'overlay';

      await supabase
        .from('formulaires_location')
        .update({ fichier_pdf_url: path, annexe_pdf_url: annexePath, nb_pages: nbPages, mode })
        .eq('id', data.id);

      let auto = 0;
      if (mode === 'acroform') {
        const rows = detected
          .map((f) => ({ f, m: autoMapFieldName(f.name) }))
          .filter(({ m }) => !!m.cle_champ)
          .map(({ f, m }) => ({
            formulaire_id: data.id,
            cle_champ: m.cle_champ as string,
            nom_champ_pdf: f.name,
            type_champ: f.type,
            page: 1, pos_x: 0, pos_y: 0, largeur: 0, hauteur: 0, taille_police: 10, alignement: 'left',
          }));
        auto = rows.length;
        if (rows.length) await supabase.from('formulaire_champs').insert(rows as any);
      }

      toast.success(
        mode === 'acroform'
          ? `PDF interactif détecté — ${auto}/${detected.length} champ(s) mappés automatiquement`
          : 'Modèle créé (mode coordonnées)',
      );
      setCreateOpen(false);
      setNom('');
      setFile(null);
      setAnnexe(null);
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const toggleActif = async (f: FormulaireLocation) => {
    await supabase.from('formulaires_location').update({ actif: !f.actif }).eq('id', f.id);
    reload();
  };

  const duplicate = async (f: FormulaireLocation) => {
    const { data, error } = await supabase
      .from('formulaires_location')
      .insert({
        nom: `${f.nom} (copie)`,
        fichier_pdf_url: f.fichier_pdf_url,
        annexe_pdf_url: f.annexe_pdf_url,
        nb_pages: f.nb_pages,
        actif: false,
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error || !data) {
      toast.error('Duplication impossible');
      return;
    }
    const { data: champs } = await supabase.from('formulaire_champs').select('*').eq('formulaire_id', f.id);
    if (champs?.length) {
      await supabase.from('formulaire_champs').insert(
        champs.map(({ id, created_at, updated_at, ...c }: any) => ({ ...c, formulaire_id: data.id })),
      );
    }
    toast.success('Modèle dupliqué');
    reload();
  };

  const remove = async (f: FormulaireLocation) => {
    await supabase.from('formulaires_location').delete().eq('id', f.id);
    toast.success('Modèle supprimé');
    reload();
  };

  if (editing) {
    return <MappingEditor formulaire={editing} onBack={() => { setEditing(null); reload(); }} />;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Modèles de demande de location</h1>
          <p className="text-sm text-muted-foreground">Importez un PDF et placez les champs pour un remplissage exact, sans IA.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nouveau modèle
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
      ) : formulaires.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun modèle pour l'instant.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {formulaires.map((f) => (
            <Card key={f.id} className="border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between gap-2 text-base">
                  <span className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{f.nom}</span>
                  </span>
                  <Badge variant={f.actif ? 'default' : 'secondary'}>{f.actif ? 'Actif' : 'Inactif'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="outline" className="text-[11px]">
                  {f.mode === 'acroform' ? 'Champs natifs (PDF interactif)' : 'Coordonnées (PDF plat)'}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {f.nb_pages} page(s){f.annexe_pdf_url ? ' • annexe jointe' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setEditing(f)}>Éditer le mapping</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActif(f)}>{f.actif ? 'Désactiver' : 'Activer'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate(f)} className="gap-1"><Copy className="h-3.5 w-3.5" />Dupliquer</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(f)} className="gap-1 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau modèle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du modèle</Label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Demande de location — Régie X" />
            </div>
            <div className="space-y-2">
              <Label>Formulaire PDF</Label>
              <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-2">
              <Label>Annexe PDF (optionnelle)</Label>
              <Input type="file" accept="application/pdf" onChange={(e) => setAnnexe(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createModele} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --------------------------- Éditeur de mapping --------------------------- */

function MappingEditor({ formulaire, onBack }: { formulaire: FormulaireLocation; onBack: () => void }) {
  const { champs, setChamps, reload } = useFormulaireChamps(formulaire.id);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const { doc, numPages } = usePdfDocument(bytes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);

  useEffect(() => {
    fetchBytes(FORM_BUCKET, formulaire.fichier_pdf_url).then(setBytes);
  }, [formulaire.fichier_pdf_url]);

  useEffect(() => {
    const update = () => setWidth(Math.min(900, (containerRef.current?.clientWidth ?? 700) - 8));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const selected = useMemo(() => champs.find((c) => c.id === selectedId) ?? null, [champs, selectedId]);

  const addField = (page: number, pt: { x: number; y: number }) => {
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const champ: FormulaireChamp = {
      id: tmpId,
      formulaire_id: formulaire.id,
      cle_champ: 'prenom',
      page,
      pos_x: Math.round(pt.x),
      pos_y: Math.round(pt.y),
      largeur: 160,
      hauteur: 16,
      taille_police: 10,
      alignement: 'left',
    };
    setChamps((prev) => [...prev, champ]);
    setSelectedId(tmpId);
  };

  const patch = (id: string, next: Partial<FormulaireChamp>) =>
    setChamps((prev) => prev.map((c) => (c.id === id ? { ...c, ...next } : c)));

  const removeField = (id: string) => {
    if (!id.startsWith('tmp-')) setDeleted((d) => [...d, id]);
    setChamps((prev) => prev.filter((c) => c.id !== id));
    setSelectedId(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (deleted.length) await supabase.from('formulaire_champs').delete().in('id', deleted);
      const news = champs.filter((c) => c.id.startsWith('tmp-'));
      const existing = champs.filter((c) => !c.id.startsWith('tmp-'));
      if (news.length) {
        await supabase.from('formulaire_champs').insert(
          news.map(({ id, ...c }) => ({ ...c, formulaire_id: formulaire.id })),
        );
      }
      for (const c of existing) {
        await supabase
          .from('formulaire_champs')
          .update({
            cle_champ: c.cle_champ, page: c.page, pos_x: c.pos_x, pos_y: c.pos_y,
            largeur: c.largeur, hauteur: c.hauteur, taille_police: c.taille_police, alignement: c.alignement,
          })
          .eq('id', c.id);
      }
      setDeleted([]);
      await reload();
      toast.success('Mapping enregistré');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const isAcro = mode === 'acroform';

  const switchMode = async () => {
    const next = isAcro ? 'overlay' : 'acroform';
    await supabase.from('formulaires_location').update({ mode: next }).eq('id', formulaire.id);
    setMode(next);
    toast.success(next === 'acroform' ? 'Mode champs natifs activé' : 'Mode coordonnées activé');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{formulaire.nom}</h2>
            <p className="text-xs text-muted-foreground">
              {isAcro
                ? `Remplissage par nom de champ • ${champs.length} correspondance(s)`
                : `Touchez le PDF pour ajouter un champ • ${champs.length} champ(s)`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={switchMode}>
            {isAcro ? 'Passer en mode coordonnées' : 'Passer en champs natifs'}
          </Button>
          {!isAcro && (
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
            </Button>
          )}
        </div>
      </div>

      {isAcro && (
        <div className="flex-1 overflow-auto">
          <AcroformMapper formulaire={{ ...formulaire, mode: 'acroform' }} />
        </div>
      )}
      {!isAcro && (


      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        <div ref={containerRef} className="flex-1 overflow-auto bg-muted/40 p-3 space-y-6">
          {!doc && <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>}
          {doc && Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
            <div key={p} className="space-y-1">
              <p className="text-center text-xs text-muted-foreground">Page {p}</p>
              <PdfPage doc={doc} pageNumber={p} width={width} onPointerDownPage={(pt) => addField(p, pt)}>
                {(scale) =>
                  champs.filter((c) => c.page === p).map((c) => (
                    <DraggableBox
                      key={c.id}
                      x={Number(c.pos_x)} y={Number(c.pos_y)} w={Number(c.largeur)} h={Number(c.hauteur)}
                      scale={scale}
                      selected={c.id === selectedId}
                      label={keyLabel(c.cle_champ)}
                      onSelect={() => setSelectedId(c.id)}
                      onChange={({ x, y, w, h }) => patch(c.id, { pos_x: x, pos_y: y, largeur: w, hauteur: h })}
                    />
                  ))
                }
              </PdfPage>
            </div>
          ))}
        </div>

        <div className="w-full lg:w-80 shrink-0 border-t lg:border-l lg:border-t-0">
          <ScrollArea className="h-56 lg:h-full">
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-sm">Champ sélectionné</h3>
              {!selected ? (
                <p className="text-sm text-muted-foreground">Touchez une zone du PDF pour créer un champ, puis sélectionnez sa clé.</p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Clé standard</Label>
                    <Select value={selected.cle_champ} onValueChange={(v) => patch(selected.id, { cle_champ: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STANDARD_FIELD_KEYS.map((k) => (
                          <SelectItem key={k.key} value={k.key}>{k.groupe} — {k.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5"><Label className="text-xs">X</Label>
                      <Input type="number" value={Math.round(Number(selected.pos_x))} onChange={(e) => patch(selected.id, { pos_x: Number(e.target.value) })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Y</Label>
                      <Input type="number" value={Math.round(Number(selected.pos_y))} onChange={(e) => patch(selected.id, { pos_y: Number(e.target.value) })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Largeur</Label>
                      <Input type="number" value={Math.round(Number(selected.largeur))} onChange={(e) => patch(selected.id, { largeur: Number(e.target.value) })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Hauteur</Label>
                      <Input type="number" value={Math.round(Number(selected.hauteur))} onChange={(e) => patch(selected.id, { hauteur: Number(e.target.value) })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Police</Label>
                      <Input type="number" value={Number(selected.taille_police)} onChange={(e) => patch(selected.id, { taille_police: Number(e.target.value) })} /></div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Alignement</Label>
                      <Select value={selected.alignement} onValueChange={(v: any) => patch(selected.id, { alignement: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Gauche</SelectItem>
                          <SelectItem value="center">Centré</SelectItem>
                          <SelectItem value="right">Droite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-xs text-muted-foreground">Page {selected.page}</span>
                    <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => removeField(selected.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Modèle actif</Label>
                  <Switch
                    defaultChecked={formulaire.actif}
                    onCheckedChange={async (v) => {
                      await supabase.from('formulaires_location').update({ actif: v }).eq('id', formulaire.id);
                    }}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

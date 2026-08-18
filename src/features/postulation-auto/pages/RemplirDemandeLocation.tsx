import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFormulaires, useFormulaireChamps } from '../hooks/useFormulaires';
import { keyLabel, SIGNATURE_KEY } from '../keys';
import type { FormulaireChamp } from '../types';
import { FORM_BUCKET, SIGN_BUCKET, dataUrlToBlob, fetchBytes } from '../lib/storage';
import { usePdfDocument } from '../lib/pdfjs';
import { fillPdfTemplate } from '../lib/fillPdf';
import { buildPostulationValues } from '../lib/buildValues';
import PdfPage from '../components/PdfPage';
import DraggableBox from '../components/DraggableBox';
import SignaturePad from '@/components/mandat/SignaturePad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, FileSignature, Loader2, MapPin, Wand2 } from 'lucide-react';

interface ClientOption { id: string; label: string }
interface OffreOption { id: string; label: string }

const storageKey = (f: string, c: string, o: string) => `postulation-auto:pos:${f}:${c}:${o || 'none'}`;

export default function RemplirDemandeLocation() {
  const { user } = useAuth();
  const { formulaires } = useFormulaires(true);
  const [formulaireId, setFormulaireId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [offreId, setOffreId] = useState<string>('');
  const [lieu, setLieu] = useState('Genève');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [offres, setOffres] = useState<OffreOption[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [tempSignature, setTempSignature] = useState('');
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);

  const formulaire = useMemo(() => formulaires.find((f) => f.id === formulaireId) ?? null, [formulaires, formulaireId]);
  const isAcro = formulaire?.mode === 'acroform';
  const { champs, reload: reloadChamps } = useFormulaireChamps(formulaireId || null);
  const { doc, numPages } = usePdfDocument(isAcro ? previewBytes ?? bytes : bytes);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);

  /* Aperçu WYSIWYG du remplissage natif */
  useEffect(() => {
    if (!isAcro || !bytes) { setPreviewBytes(null); return; }
    let cancelled = false;
    fillAcroFormTemplate({ templateBytes: bytes.slice(0), champs, values, signatureDataUrl: signature })
      .then((out) => { if (!cancelled) setPreviewBytes(out); })
      .catch(() => { if (!cancelled) setPreviewBytes(null); });
    return () => { cancelled = true; };
  }, [isAcro, bytes, champs, values, signature]);

  useEffect(() => {
    const update = () => setWidth(Math.min(900, (containerRef.current?.clientWidth ?? 700) - 8));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* Chargement des clients */
  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.from('clients').select('id, user_id').limit(2000);
      const ids = (rows ?? []).map((r: any) => r.user_id).filter(Boolean);
      const { data: profs } = ids.length
        ? await supabase.from('profiles').select('id, prenom, nom').in('id', ids)
        : { data: [] as any[] };
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setClients(
        (rows ?? []).map((r: any) => {
          const p = byId.get(r.user_id);
          return { id: r.id, label: `${p?.prenom ?? ''} ${p?.nom ?? ''}`.trim() || 'Client sans nom' };
        }).sort((a, b) => a.label.localeCompare(b.label)),
      );
    })();
  }, []);

  /* Offres du client */
  useEffect(() => {
    if (!clientId) { setOffres([]); setOffreId(''); return; }
    (async () => {
      const { data } = await supabase
        .from('offres')
        .select('id, adresse, prix, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100);
      setOffres((data ?? []).map((o: any) => ({ id: o.id, label: `${o.adresse ?? 'Sans adresse'}${o.prix ? ` — CHF ${o.prix}` : ''}` })));
    })();
  }, [clientId]);

  /* PDF du modèle */
  useEffect(() => {
    setBytes(null);
    if (formulaire?.fichier_pdf_url) fetchBytes(FORM_BUCKET, formulaire.fichier_pdf_url).then(setBytes);
  }, [formulaire?.fichier_pdf_url]);

  /* Signature enregistrée de l'agent */
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from('agent_signatures').select('signature_path').eq('user_id', user.id).maybeSingle();
      if (!data?.signature_path) return;
      const { data: blob } = await supabase.storage.from(SIGN_BUCKET).download(data.signature_path);
      if (!blob) return;
      const reader = new FileReader();
      reader.onload = () => setSignature(String(reader.result));
      reader.readAsDataURL(blob);
    })();
  }, [user?.id]);

  /* Positions mémorisées pour cette candidature */
  useEffect(() => {
    if (!formulaireId) return;
    try {
      const raw = localStorage.getItem(storageKey(formulaireId, clientId, offreId));
      setOverrides(raw ? JSON.parse(raw) : {});
    } catch { setOverrides({}); }
  }, [formulaireId, clientId, offreId]);

  const persistOverrides = useCallback((next: typeof overrides) => {
    setOverrides(next);
    if (!formulaireId) return;
    try { localStorage.setItem(storageKey(formulaireId, clientId, offreId), JSON.stringify(next)); } catch { /* noop */ }
  }, [formulaireId, clientId, offreId]);

  const loadValues = async () => {
    if (!clientId || !user?.id) { toast.error('Sélectionnez un client'); return; }
    setBusy(true);
    try {
      const { values: v } = await buildPostulationValues({ clientId, offreId: offreId || null, agentUserId: user.id, lieu });
      setValues(v);
      toast.success('Données chargées (contact = vos coordonnées)');
    } finally {
      setBusy(false);
    }
  };

  const effectiveChamps: FormulaireChamp[] = useMemo(
    () => champs.map((c) => {
      const o = overrides[c.id];
      return o ? { ...c, pos_x: o.x, pos_y: o.y, largeur: o.w, hauteur: o.h } : c;
    }),
    [champs, overrides],
  );

  const saveSignature = async () => {
    if (!tempSignature || !user?.id) return;
    const path = `${user.id}/signature.png`;
    const { error } = await supabase.storage.from(SIGN_BUCKET).upload(path, dataUrlToBlob(tempSignature), {
      upsert: true, contentType: 'image/png',
    });
    if (error) { toast.error('Enregistrement de la signature impossible'); return; }
    await supabase.from('agent_signatures').upsert({ user_id: user.id, signature_path: path }, { onConflict: 'user_id' });
    setSignature(tempSignature);
    setSignOpen(false);
    toast.success('Signature enregistrée, elle sera appliquée automatiquement');
  };

  const memorizePosition = async (champId: string) => {
    const o = overrides[champId];
    if (!o) return;
    await supabase.from('formulaire_champs')
      .update({ pos_x: o.x, pos_y: o.y, largeur: o.w, hauteur: o.h })
      .eq('id', champId);
    await reloadChamps();
    toast.success('Position mémorisée pour ce modèle');
  };

  const generate = async () => {
    if (!bytes || !formulaire) { toast.error('Sélectionnez un modèle'); return; }
    setGenerating(true);
    try {
      const annexeBytes = formulaire.annexe_pdf_url ? await fetchBytes(FORM_BUCKET, formulaire.annexe_pdf_url) : null;
      const fill = isAcro ? fillAcroFormTemplate : fillPdfTemplate;
      const out = await fill({
        templateBytes: bytes,
        annexeBytes,
        champs: isAcro ? champs : effectiveChamps,
        values,
        signatureDataUrl: signature,
      });
      const blob = new Blob([out.slice().buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `demande-location-${Date.now()}.pdf`;
      a.click();
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success('PDF généré');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur de génération');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="border-b px-4 py-3 md:px-8">
        <h1 className="text-xl md:text-2xl font-bold">Postulation automatique</h1>
        <p className="text-sm text-muted-foreground">Remplissage exact du formulaire depuis le mapping du modèle — sans IA.</p>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-80 shrink-0 overflow-auto border-b lg:border-b-0 lg:border-r p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Modèle</Label>
            <Select value={formulaireId} onValueChange={setFormulaireId}>
              <SelectTrigger><SelectValue placeholder="Choisir un modèle" /></SelectTrigger>
              <SelectContent>
                {formulaires.map((f) => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Offre / bien</Label>
            <Select value={offreId} onValueChange={setOffreId} disabled={!clientId}>
              <SelectTrigger><SelectValue placeholder="Choisir une offre" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {offres.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lieu de signature</Label>
            <Input value={lieu} onChange={(e) => setLieu(e.target.value)} />
          </div>

          <Button onClick={loadValues} disabled={busy} className="w-full gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Charger les données
          </Button>

          <Card className="border-primary/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileSignature className="h-4 w-4 text-primary" />Signature</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {signature ? (
                <img src={signature} alt="Signature enregistrée" className="h-16 w-full object-contain rounded border bg-white" />
              ) : (
                <p className="text-xs text-muted-foreground">Aucune signature enregistrée.</p>
              )}
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setTempSignature(''); setSignOpen(true); }}>
                {signature ? 'Re-signer' : 'Signer maintenant'}
              </Button>
            </CardContent>
          </Card>

          {selectedId && overrides[selectedId] && (
            <Button variant="secondary" size="sm" className="w-full gap-2" onClick={() => memorizePosition(selectedId)}>
              <MapPin className="h-4 w-4" /> Mémoriser cette position pour ce modèle
            </Button>
          )}

          <Button onClick={generate} disabled={generating || !bytes} className="w-full gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Générer le PDF rempli
          </Button>

          <p className="text-[11px] leading-4 text-muted-foreground">
            Les champs « e-mail » et « téléphone » de contact sont toujours renseignés avec VOS coordonnées d'agent, jamais celles du client.
          </p>
        </div>

        <div ref={containerRef} className="flex-1 overflow-auto bg-muted/40 p-3 space-y-6">
          {!formulaireId && <p className="py-16 text-center text-sm text-muted-foreground">Choisissez un modèle pour afficher l'aperçu.</p>}
          {formulaireId && !doc && <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {doc && Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
            <div key={p} className="space-y-1">
              <p className="text-center text-xs text-muted-foreground">Page {p}</p>
              <PdfPage doc={doc} pageNumber={p} width={width}>
                {(scale) =>
                  effectiveChamps.filter((c) => c.page === p).map((c) => {
                    const isSign = c.cle_champ === SIGNATURE_KEY;
                    const text = isSign ? '' : values[c.cle_champ] ?? '';
                    return (
                      <DraggableBox
                        key={c.id}
                        x={Number(c.pos_x)} y={Number(c.pos_y)} w={Number(c.largeur)} h={Number(c.hauteur)}
                        scale={scale}
                        variant="value"
                        selected={selectedId === c.id}
                        onSelect={() => setSelectedId(c.id)}
                        onChange={({ x, y, w, h }) => persistOverrides({ ...overrides, [c.id]: { x, y, w, h } })}
                      >
                        <div
                          data-overlay="true"
                          className="pointer-events-none flex h-full w-full items-center overflow-hidden whitespace-nowrap px-[1px]"
                          style={{
                            fontSize: Number(c.taille_police) * scale,
                            justifyContent: c.alignement === 'center' ? 'center' : c.alignement === 'right' ? 'flex-end' : 'flex-start',
                          }}
                        >
                          {isSign ? (
                            signature ? <img src={signature} alt="signature" className="h-full object-contain" /> : <span className="text-[9px] text-muted-foreground">signature</span>
                          ) : (
                            <span className="text-foreground">{text || <span className="text-muted-foreground/60">{keyLabel(c.cle_champ)}</span>}</span>
                          )}
                        </div>
                      </DraggableBox>
                    );
                  })
                }
              </PdfPage>
            </div>
          ))}
          {doc && champs.length === 0 && (
            <div className="text-center"><Badge variant="secondary">Ce modèle n'a aucun champ mappé</Badge></div>
          )}
        </div>
      </div>

      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Votre signature</DialogTitle></DialogHeader>
          <SignaturePad value={tempSignature} onChange={setTempSignature} />
          <DialogFooter>
            <Button onClick={saveSignature} disabled={!tempSignature}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

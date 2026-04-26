import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ScanLine, Trash2, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import WebDocumentScanner from './WebDocumentScanner';
import {
  pagesToPdf,
  pageToJpegFile,
  type CapturedPage,
} from '@/hooks/useDocumentScanner';
import { requiresRectoVerso, getDocumentLabel } from '@/config/documentTypes';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentType: string;
  /** Force recto/verso même si type non listé. */
  forceRectoVerso?: boolean;
  /** Nom de fichier suggéré (sans extension). */
  baseFileName?: string;
  onComplete: (file: File) => Promise<void> | void;
}

/**
 * Scanner universel multi-pages avec workflow recto/verso.
 * - Plateforme native : utilise la caméra Capacitor
 * - Web : ouvre WebDocumentScanner (getUserMedia)
 */
export default function UniversalDocumentScanner({
  open,
  onOpenChange,
  documentType,
  forceRectoVerso,
  baseFileName,
  onComplete,
}: Props) {
  const requireRV = forceRectoVerso ?? requiresRectoVerso(documentType);
  const minPages = requireRV ? 2 : 1;
  const stepLabels = requireRV ? ['Recto', 'Verso'] : [];

  const [pages, setPages] = useState<CapturedPage[]>([]);
  const [webOpen, setWebOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => setPages([]);

  const close = () => {
    reset();
    setWebOpen(false);
    onOpenChange(false);
  };

  const startCapture = () => {
    // Web app : on passe toujours par le scanner navigateur (getUserMedia + input capture)
    setWebOpen(true);
  };

  const onWebCapture = (page: CapturedPage) => {
    setPages((prev) => [...prev, page]);
    setWebOpen(false);
  };

  const removePage = (idx: number) => setPages((prev) => prev.filter((_, i) => i !== idx));

  const finish = async () => {
    if (pages.length < minPages) {
      toast.error(
        requireRV
          ? `Veuillez scanner ${minPages} pages (recto + verso) pour ${getDocumentLabel(documentType)}.`
          : 'Veuillez scanner au moins une page.'
      );
      return;
    }
    setBusy(true);
    try {
      const baseName =
        baseFileName ||
        `${documentType}_${new Date().toISOString().slice(0, 10)}`;
      const file =
        pages.length === 1
          ? pageToJpegFile(pages[0], baseName)
          : await pagesToPdf(pages, baseName);
      await onComplete(file);
      close();
    } catch (e) {
      console.error('[UniversalDocumentScanner] finish error', e);
      toast.error('Erreur lors de la finalisation du document.');
    } finally {
      setBusy(false);
    }
  };

  const currentStepLabel = requireRV
    ? stepLabels[pages.length] || `Page ${pages.length + 1}`
    : `Page ${pages.length + 1}`;

  return (
    <>
      <Dialog open={open && !webOpen} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              Scanner — {getDocumentLabel(documentType)}
            </DialogTitle>
            <DialogDescription>
              {requireRV
                ? `Scannez le recto puis le verso. Les deux pages seront fusionnées en un seul PDF.`
                : `Scannez votre document. Vous pouvez ajouter plusieurs pages.`}
            </DialogDescription>
          </DialogHeader>

          {/* Étapes recto/verso */}
          {requireRV && (
            <div className="flex gap-2">
              {stepLabels.map((label, i) => {
                const done = i < pages.length;
                const current = i === pages.length;
                return (
                  <div
                    key={label}
                    className={`flex-1 rounded-lg border-2 p-3 text-center text-sm transition-colors ${
                      done
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                        : current
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-muted text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold">{label}</div>
                    {done && <Check className="mx-auto h-4 w-4 mt-1" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pages capturées */}
          {pages.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-auto">
              {pages.map((p, i) => (
                <div key={i} className="relative group">
                  <img
                    src={p.dataUrl}
                    alt={`Page ${i + 1}`}
                    className="w-full h-24 object-cover rounded border"
                  />
                  <button
                    onClick={() => removePage(i)}
                    className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-90"
                    aria-label="Supprimer la page"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
                    {requireRV && stepLabels[i] ? stepLabels[i] : `P${i + 1}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={startCapture}
              disabled={busy}
              className="w-full gap-2 min-h-[48px]"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pages.length === 0 ? (
                <ScanLine className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {pages.length === 0
                ? `Scanner ${currentStepLabel.toLowerCase()}`
                : pages.length < minPages
                ? `Scanner ${currentStepLabel.toLowerCase()}`
                : 'Ajouter une page'}
            </Button>

            <Button
              type="button"
              variant="default"
              onClick={finish}
              disabled={busy || pages.length < minPages}
              className="w-full min-h-[48px] gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Valider et envoyer ({pages.length} page{pages.length > 1 ? 's' : ''})
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={close}
              disabled={busy}
              className="w-full"
            >
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {webOpen && (
        <WebDocumentScanner
          stepLabel={currentStepLabel}
          onCapture={onWebCapture}
          onCancel={() => setWebOpen(false)}
        />
      )}
    </>
  );
}

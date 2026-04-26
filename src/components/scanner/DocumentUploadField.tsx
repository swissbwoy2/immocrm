import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ScanLine, Upload, FileWarning } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';
import UniversalDocumentScanner from './UniversalDocumentScanner';
import { requiresRectoVerso, getDocumentLabel } from '@/config/documentTypes';

interface Props {
  documentType: string;
  /** Surcharge le label si besoin. */
  label?: string;
  /** Texte d'aide affiché sous les boutons. */
  helperText?: string;
  /** Si true, désactive les deux boutons. */
  disabled?: boolean;
  /** Nom de fichier (sans extension). */
  baseFileName?: string;
  /** Force recto/verso même si type non listé. */
  forceRectoVerso?: boolean;
  /** Accept attribute pour upload classique. */
  accept?: string;
  /** Callback appelé avec le file final (PDF fusionné si recto/verso uploadé). */
  onFile: (file: File) => Promise<void> | void;
}

async function mergeFilesToPdf(files: File[], fileName: string): Promise<File> {
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const lower = file.name.toLowerCase();

    if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
      const src = await PDFDocument.load(bytes);
      const pages = await pdfDoc.copyPages(src, src.getPageIndices());
      pages.forEach((p) => pdfDoc.addPage(p));
    } else if (
      file.type === 'image/jpeg' ||
      file.type === 'image/jpg' ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg')
    ) {
      const img = await pdfDoc.embedJpg(bytes);
      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    } else if (file.type === 'image/png' || lower.endsWith('.png')) {
      const img = await pdfDoc.embedPng(bytes);
      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    } else {
      throw new Error(`Format non supporté pour la fusion : ${file.name}`);
    }
  }

  const out = await pdfDoc.save();
  const buf = new ArrayBuffer(out.byteLength);
  new Uint8Array(buf).set(out);
  const safeName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  return new File([buf], safeName, { type: 'application/pdf' });
}

/**
 * Champ universel d'upload de document.
 * Affiche un bouton "Scanner" (caméra) et un bouton "Téléverser" (file picker).
 * Si le type requiert recto+verso, l'upload classique demande 2 fichiers et les fusionne.
 */
export default function DocumentUploadField({
  documentType,
  label,
  helperText,
  disabled,
  baseFileName,
  forceRectoVerso,
  accept = '.pdf,.jpg,.jpeg,.png',
  onFile,
}: Props) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const requireRV = forceRectoVerso ?? requiresRectoVerso(documentType);
  const expected = requireRV ? 2 : 1;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const incoming = Array.from(list);
    if (fileRef.current) fileRef.current.value = '';

    if (!requireRV) {
      // Un seul fichier autorisé (le premier)
      setBusy(true);
      try {
        await onFile(incoming[0]);
      } finally {
        setBusy(false);
      }
      return;
    }

    // requireRV : il faut 2 fichiers (recto + verso). On accumule.
    const next = [...pendingFiles, ...incoming].slice(0, expected);
    setPendingFiles(next);

    if (next.length < expected) {
      toast.info(
        `Page ${next.length}/${expected} ajoutée. Sélectionnez la ${
          next.length === 1 ? 'page verso' : 'page suivante'
        }.`
      );
      return;
    }

    // On a recto + verso, on fusionne
    setBusy(true);
    try {
      const baseName = baseFileName || `${documentType}_${new Date().toISOString().slice(0, 10)}`;
      // Si les 2 fichiers sont déjà des PDF unique-page ou un mix, on fusionne en PDF.
      const merged = await mergeFilesToPdf(next, baseName);
      await onFile(merged);
      setPendingFiles([]);
    } catch (err) {
      console.error('[DocumentUploadField] merge error', err);
      toast.error("Impossible de fusionner les fichiers. Vérifiez le format (PDF, JPG, PNG).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <div className="text-sm font-medium">{label}</div>}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setScannerOpen(true)}
          disabled={disabled || busy}
          className="gap-2 min-h-[48px] border-dashed border-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
          Scanner
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || busy}
          className="gap-2 min-h-[48px] border-dashed border-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Téléverser
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={requireRV}
        onChange={handleFileChange}
      />

      {requireRV && (
        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2">
          <FileWarning className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Recto et verso obligatoires</strong> pour {getDocumentLabel(documentType).toLowerCase()}.
            {pendingFiles.length > 0 && (
              <> {pendingFiles.length}/{expected} fichier(s) sélectionné(s).</>
            )}
          </span>
        </div>
      )}

      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}

      <UniversalDocumentScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        documentType={documentType}
        forceRectoVerso={forceRectoVerso}
        baseFileName={baseFileName}
        onComplete={async (file) => {
          setBusy(true);
          try {
            await onFile(file);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

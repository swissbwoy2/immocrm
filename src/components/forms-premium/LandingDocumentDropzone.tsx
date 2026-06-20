import { useRef, useState, useCallback } from 'react';
import { Upload, ScanLine, Trash2, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import UniversalDocumentScanner from '@/components/scanner/UniversalDocumentScanner';

export interface UploadedPreview {
  name: string;
  url?: string;
  isImage: boolean;
  size?: number;
}

interface Props {
  documentType: string;
  badge?: string;
  helper?: string;
  baseFileName?: string;
  forceRectoVerso?: boolean;
  preview?: UploadedPreview | null;
  disabled?: boolean;
  multiple?: boolean;
  compact?: boolean;
  onFile: (file: File) => Promise<void> | void;
  onRemove?: () => void;
}

const ACCEPT = '.pdf,.jpg,.jpeg,.png';

export function LandingDocumentDropzone({
  documentType,
  badge,
  helper,
  baseFileName,
  forceRectoVerso,
  preview,
  disabled,
  multiple = false,
  compact = false,
  onFile,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return;
      const arr = Array.from(files);
      setBusy(true);
      try {
        for (const f of arr) {
          await onFile(f);
          if (!multiple) break;
        }
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onFile, multiple],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const hasFile = !!preview;

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={[
          'relative rounded-2xl border-2 border-dashed transition-all duration-300',
          compact ? 'p-3' : 'p-5 sm:p-6',
          hasFile
            ? 'border-primary/50 bg-primary/5'
            : drag
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/30 hover:border-primary/50',
        ].join(' ')}
      >
        {!hasFile && (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-2">
            <div className={`rounded-full bg-primary/10 p-3 ${compact ? 'p-2' : ''}`}>
              <Upload className={`text-primary ${compact ? 'h-4 w-4' : 'h-6 w-6'}`} />
            </div>
            <p className={`text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
              Glissez votre fichier ou cliquez
            </p>
            <p className="text-[10px] text-muted-foreground">PDF, JPG, PNG · max 10 MB</p>

            <div className={`flex flex-wrap items-center justify-center gap-2 ${compact ? 'mt-1' : 'mt-2'}`}>
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => setScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
                Scanner
              </button>
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background border border-border text-xs font-medium text-foreground hover:border-primary/50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Fichier
              </button>
            </div>
          </div>
        )}

        {hasFile && preview && (
          <div className="flex items-center gap-3">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
              {preview.isImage && preview.url ? (
                <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
              ) : (
                <FileText className="h-7 w-7 text-primary" />
              )}
              <div className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground p-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{preview.name}</p>
              <p className="text-[11px] text-primary mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Document validé
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled || busy}
                  className="text-[11px] text-primary hover:text-primary/80 underline-offset-2 hover:underline cursor-pointer"
                >
                  Remplacer
                </button>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  disabled={disabled || busy}
                  className="text-[11px] text-primary hover:text-primary/80 underline-offset-2 hover:underline cursor-pointer"
                >
                  Re-scanner
                </button>
              </div>
            </div>

            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                disabled={disabled || busy}
                aria-label="Supprimer"
                className="p-2 rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {badge && (
          <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
            {badge}
          </span>
        )}
      </div>

      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPT}
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
      />

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

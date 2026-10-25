import { useRef, useState } from 'react';
import { ArrowLeft, Camera, FolderUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AUTRE_ACCEPT,
  DOSSIER_ACCEPT,
  dossierDocumentsFor,
  type DossierDocumentOption,
} from '@/config/clientDocumentCatalog';
import {
  fileDocumentToDossier,
  validateDossierFile,
  type ClientDossierContext,
  type FiledDocument,
} from '@/lib/clientDossier';

interface Props {
  dossier: ClientDossierContext;
  /** Appelé une fois la pièce enregistrée dans le dossier (pour l'annoncer dans la conversation). */
  onFiled: (doc: FiledDocument) => Promise<void> | void;
  /** Appareil photo natif (application mobile) ; sinon l'appareil photo du navigateur. */
  takePhoto?: () => Promise<File | null>;
  isNative?: boolean;
  onDone: () => void;
}

/**
 * Choix de la pièce à ajouter au dossier depuis la messagerie :
 * le fichier est classé au bon endroit dès l'envoi (type, personne concernée).
 */
export function DossierDocumentPicker({ dossier, onFiled, takePhoto, isNative, onDone }: Props) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<DossierDocumentOption | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const options = dossierDocumentsFor(dossier.journey);

  const handleFile = async (file: File | null | undefined) => {
    if (!file || !selected) return;
    const problem = validateDossierFile(file, selected.type);
    if (problem) {
      toast({ title: 'Fichier refusé', description: problem, variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const doc = await fileDocumentToDossier({
        ctx: dossier,
        file,
        type: selected.type,
        label: selected.label,
        candidateId,
      });
      await onFiled(doc);
      toast({ title: 'Ajouté à ton dossier', description: `${selected.label}${doc.personLabel ? ` — ${doc.personLabel}` : ''}` });
      setSelected(null);
      setCandidateId(null);
      onDone();
    } catch (err) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
      toast({ title: "Le document n'a pas pu être ajouté", description: message || 'Réessaie dans un instant.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const openCamera = async () => {
    if (isNative && takePhoto) {
      const file = await takePhoto();
      await handleFile(file);
      return;
    }
    cameraInputRef.current?.click();
  };

  if (!selected) {
    return (
      <div className="flex flex-col">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground px-2 pt-1 pb-1">
          Ajouter à mon dossier
        </p>
        <div className="max-h-72 overflow-y-auto flex flex-col">
          {options.map((opt) => (
            <Button
              key={opt.type}
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start h-auto py-2 text-left whitespace-normal"
              onClick={() => setSelected(opt)}
            >
              <span className="mr-2" aria-hidden>{opt.emoji}</span>
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const accept = selected.type === 'autre' ? AUTRE_ACCEPT : DOSSIER_ACCEPT;

  return (
    <div className="flex flex-col gap-2 p-1">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />

      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={busy} onClick={() => setSelected(null)} aria-label="Retour à la liste">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium leading-tight">
          <span className="mr-1" aria-hidden>{selected.emoji}</span>{selected.label}
        </p>
      </div>
      {selected.hint && <p className="text-xs text-muted-foreground px-1">{selected.hint}</p>}

      {dossier.persons.length > 0 && (
        <div className="px-1">
          <p className="text-xs text-muted-foreground mb-1">Ce document concerne :</p>
          <div className="flex flex-wrap gap-1">
            {[{ id: null as string | null, label: 'Moi' }, ...dossier.persons].map((p) => (
              <button
                key={p.id ?? 'moi'}
                type="button"
                disabled={busy}
                onClick={() => setCandidateId(p.id)}
                aria-pressed={candidateId === p.id}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  candidateId === p.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1 pt-1">
        <Button type="button" size="sm" variant="secondary" className="justify-start" disabled={busy} onClick={() => void openCamera()}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
          Prendre une photo
        </Button>
        <Button type="button" size="sm" variant="secondary" className="justify-start" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          <FolderUp className="h-4 w-4 mr-2" />
          Choisir un fichier
        </Button>
      </div>
    </div>
  );
}

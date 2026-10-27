import { useState } from 'react';
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
  /** Annonce la pièce dans la conversation ; false si l'annonce a échoué (la pièce reste au dossier). */
  onFiled: (doc: FiledDocument) => Promise<boolean | void> | boolean | void;
  /**
   * Ouvre l'appareil photo ou le choix de fichier. Les champs de fichier vivent dans l'uploader
   * (toujours monté) : le fichier arrive même si le menu se ferme pendant le choix.
   */
  pickFile: (opts: { camera: boolean; accept: string }) => Promise<File | null>;
  /** Pendant l'envoi, le menu ne doit pas se fermer. */
  onBusyChange?: (busy: boolean) => void;
  onDone: () => void;
}

/**
 * Choix de la pièce à ajouter au dossier depuis la messagerie :
 * le fichier est classé au bon endroit dès l'envoi (type, personne concernée).
 */
export function DossierDocumentPicker({ dossier, onFiled, pickFile, onBusyChange, onDone }: Props) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<DossierDocumentOption | null>(null);
  // undefined = personne pas encore choisie. Avec un garant, un conjoint… le choix est obligatoire :
  // « Moi » n'est plus pris d'office (pièces de Banaz rangées chez Shakhawan, 27.10.2026).
  const hasOthers = dossier.persons.length > 0;
  const [candidateId, setCandidateId] = useState<string | null | undefined>(hasOthers ? undefined : null);
  const personMissing = candidateId === undefined;
  const [busy, setBusyState] = useState(false);
  const setBusy = (value: boolean) => { setBusyState(value); onBusyChange?.(value); };

  const options = dossierDocumentsFor(dossier.journey);

  // Le type et la personne sont figés au moment du choix : un menu refermé entre-temps ne change rien.
  const handleFile = async (file: File | null | undefined, option: DossierDocumentOption, personId: string | null) => {
    if (!file) return;
    const problem = validateDossierFile(file, option.type);
    if (problem) {
      toast({ title: 'Fichier refusé', description: problem, variant: 'destructive' });
      return;
    }
    let doc: FiledDocument;
    try {
      doc = await fileDocumentToDossier({ ctx: dossier, file, type: option.type, label: option.label, candidateId: personId });
    } catch (err) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
      toast({ title: "Le document n'a pas pu être ajouté", description: message || 'Réessaie dans un instant.', variant: 'destructive' });
      return;
    }
    let announced: boolean | void = true;
    try {
      announced = await onFiled(doc);
    } catch {
      announced = false;
    }
    const what = `${option.label}${doc.personLabel ? ` — ${doc.personLabel}` : ''}`;
    toast(announced === false
      ? { title: 'Ajouté à ton dossier', description: `${what}. Il n'a pas pu être annoncé dans la conversation.` }
      : { title: 'Ajouté à ton dossier', description: what });
    setSelected(null);
    setCandidateId(hasOthers ? undefined : null);
    onDone();
  };

  const choose = async (camera: boolean) => {
    if (!selected || busy || candidateId === undefined) return;
    const option = selected;
    const personId = candidateId;
    // Pas d'état « occupé » pendant le choix : si la personne annule, rien ne reste bloqué.
    const file = await pickFile({ camera, accept: camera ? 'image/*' : option.type === 'autre' ? AUTRE_ACCEPT : DOSSIER_ACCEPT });
    if (!file) return;
    setBusy(true);
    try {
      await handleFile(file, option, personId);
    } finally {
      setBusy(false);
    }
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

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={busy} onClick={() => setSelected(null)} aria-label="Retour à la liste">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium leading-tight">
          <span className="mr-1" aria-hidden>{selected.emoji}</span>{selected.label}
        </p>
      </div>
      {selected.hint && <p className="text-xs text-muted-foreground px-1">{selected.hint}</p>}

      {hasOthers && (
        <div className="px-1">
          <p className={cn('text-xs mb-1', personMissing ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            À qui appartient ce document ?
          </p>
          <div className="flex flex-wrap gap-1">
            {[{ id: null as string | null, label: dossier.selfLabel || 'Moi' }, ...dossier.persons].map((p) => (
              <button
                key={p.id ?? 'moi'}
                type="button"
                disabled={busy}
                onClick={() => setCandidateId(p.id)}
                aria-pressed={candidateId === p.id}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  candidateId === p.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {personMissing && (
            <p className="text-xs text-muted-foreground mt-1">Choisis d'abord la personne, puis envoie le document.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 pt-1">
        <Button type="button" size="sm" variant="secondary" className="justify-start" disabled={busy || personMissing} onClick={() => void choose(true)}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
          Prendre une photo
        </Button>
        <Button type="button" size="sm" variant="secondary" className="justify-start" disabled={busy || personMissing} onClick={() => void choose(false)}>
          <FolderUp className="h-4 w-4 mr-2" />
          Choisir un fichier
        </Button>
      </div>
    </div>
  );
}

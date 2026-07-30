import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Paperclip, Loader2, FileText, FileImage, FileType, File as FileIcon, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BUCKET = 'visite-medias';
const MAX_SIZE = 25 * 1024 * 1024; // 25 Mo / fichier
const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.txt';

export interface CompteRenduDoc {
  type: 'document';
  name: string;
  url: string;
  path?: string;
  mime?: string;
  size?: number;
  uploaded_at?: string;
  uploaded_by?: string;
}

function isVideoMedia(m: any): boolean {
  if (!m || typeof m !== 'object') return false;
  if (typeof m.mime === 'string' && m.mime.startsWith('video/')) return true;
  if (typeof m.type === 'string' && (m.type === 'video' || m.type.startsWith('video/'))) return true;
  if (typeof m.name === 'string' && /\.(mp4|webm|mov|m4v|ogv|ogg|mkv)$/i.test(m.name)) return true;
  return false;
}

/** Documents (non-vidéo) attachés au compte-rendu. */
export function getCompteRenduDocs(medias: any): CompteRenduDoc[] {
  const arr = Array.isArray(medias) ? medias : medias ? [medias] : [];
  return arr.filter((m: any) => m && typeof m === 'object' && m.url && !isVideoMedia(m)) as CompteRenduDoc[];
}

function iconFor(doc: CompteRenduDoc) {
  const src = `${doc.mime || ''} ${doc.name || ''}`.toLowerCase();
  if (src.includes('pdf')) return FileText;
  if (/(image|\.jpe?g|\.png)/.test(src)) return FileImage;
  if (/(word|\.docx?|officedocument)/.test(src)) return FileType;
  return FileIcon;
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

async function resolveUrl(doc: CompteRenduDoc): Promise<string> {
  if (doc.path) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.path, 60 * 60);
    if (data?.signedUrl) return data.signedUrl;
  }
  return doc.url;
}

interface Props {
  /** Visite courante (doit contenir id, medias). */
  visite: any;
  /** Groupe de visites (même adresse + date) pour propager les pièces jointes. */
  visitesGroup?: any[];
  /** Lecture seule (côté client). */
  readOnly?: boolean;
  onChanged?: () => void;
}

export function VisitCompteRenduAttachments({ visite, visitesGroup, readOnly = false, onChanged }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<CompteRenduDoc[]>(() => getCompteRenduDocs(visite?.medias));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busyPath, setBusyPath] = useState<string | null>(null);

  const resolveGroup = async () => {
    if (visitesGroup && visitesGroup.length > 0) return visitesGroup;
    const { data } = await supabase
      .from('visites')
      .select('id, medias, adresse, date_visite')
      .eq('adresse', visite.adresse)
      .eq('date_visite', visite.date_visite);
    return data && data.length > 0 ? data : [visite];
  };

  const persist = async (mutate: (current: any[]) => any[]) => {
    const group = await resolveGroup();
    for (const v of group) {
      const { data: fresh } = await supabase.from('visites').select('medias').eq('id', v.id).maybeSingle();
      const current = Array.isArray(fresh?.medias) ? (fresh!.medias as any[]) : [];
      const next = mutate(current);
      const { error } = await supabase.from('visites').update({ medias: next as any }).eq('id', v.id);
      if (error) throw error;
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user || !visite?.id) return;
    const list = Array.from(files);

    const tooBig = list.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
      toast.error(`« ${tooBig.name} » dépasse la taille maximale de 25 Mo.`);
      return;
    }

    setUploading(true);
    setProgress(5);
    const added: CompteRenduDoc[] = [];

    try {
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `documents/${visite.id}/${Date.now()}_${i}_${safeName}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, f, { contentType: f.type || 'application/octet-stream', upsert: false });
        if (upErr) throw upErr;

        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 60 * 60 * 24 * 365);

        added.push({
          type: 'document',
          name: f.name,
          url: signed?.signedUrl || '',
          path,
          mime: f.type || 'application/octet-stream',
          size: f.size,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user.id,
        });

        setProgress(10 + Math.round(((i + 1) / list.length) * 70));
      }

      await persist((current) => [...current, ...added]);
      setProgress(100);
      setDocs((d) => [...d, ...added]);
      toast.success(`${added.length} pièce(s) jointe(s) ajoutée(s) au compte-rendu`);
      onChanged?.();
    } catch (e: any) {
      console.error('[CompteRenduAttachments] upload error', e);
      toast.error(e?.message || "Erreur lors de l'envoi du fichier");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleOpen = async (doc: CompteRenduDoc) => {
    setBusyPath(doc.path || doc.url);
    try {
      const url = await resolveUrl(doc);
      if (!url) {
        toast.error('Fichier indisponible');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setBusyPath(null);
    }
  };

  const handleDelete = async (doc: CompteRenduDoc) => {
    setBusyPath(doc.path || doc.url);
    try {
      await persist((current) =>
        current.filter((m: any) => !(m && (doc.path ? m.path === doc.path : m.url === doc.url))),
      );
      if (doc.path) {
        try { await supabase.storage.from(BUCKET).remove([doc.path]); } catch { /* non bloquant */ }
      }
      setDocs((d) => d.filter((m) => (doc.path ? m.path !== doc.path : m.url !== doc.url)));
      toast.success('Pièce jointe supprimée');
      onChanged?.();
    } catch (e: any) {
      console.error('[CompteRenduAttachments] delete error', e);
      toast.error(e?.message || 'Suppression impossible');
    } finally {
      setBusyPath(null);
    }
  };

  if (readOnly && docs.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-primary" />
          Pièces jointes du compte-rendu
        </span>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
            📎 Joindre un fichier / document
          </Button>
        )}
      </div>

      {!readOnly && (
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      )}

      {uploading && (
        <div className="space-y-1">
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">Envoi en cours… {progress}%</p>
        </div>
      )}

      {docs.length === 0 ? (
        !readOnly && (
          <p className="text-xs text-muted-foreground">
            PDF, Word, images ou texte — 25 Mo max par fichier (ex. demande de location scannée).
          </p>
        )
      ) : (
        <ul className="space-y-2">
          {docs.map((doc, i) => {
            const Icon = iconFor(doc);
            const key = doc.path || `${doc.url}-${i}`;
            const busy = busyPath === (doc.path || doc.url);
            return (
              <li
                key={key}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-2"
              >
                <Icon className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(doc.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleOpen(doc)}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="ml-1 hidden sm:inline">Ouvrir</span>
                </Button>
                {!readOnly && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" disabled={busy} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette pièce jointe ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          « {doc.name} » sera définitivement retiré du compte-rendu.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(doc)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

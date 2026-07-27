import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoMedia {
  url: string;
  mime?: string;
  type?: string;
  name?: string;
  size?: number;
  path?: string;
}

interface Props {
  medias?: any;
  title?: string;
}

function isVideoMedia(m: any): boolean {
  if (!m || typeof m !== 'object' || !m.url) return false;
  if (typeof m.mime === 'string' && m.mime.startsWith('video/')) return true;
  if (typeof m.type === 'string' && (m.type === 'video' || m.type.startsWith('video/'))) return true;
  if (typeof m.name === 'string' && /\.(mp4|webm|mov|m4v|ogv|ogg|mkv)$/i.test(m.name)) return true;
  if (typeof m.url === 'string' && /\.(mp4|webm|mov|m4v|ogv|ogg|mkv)/i.test(m.url)) return true;
  return false;
}

function resolveMime(m: VideoMedia): string {
  if (m.mime && m.mime.startsWith('video/')) return m.mime;
  if (m.type && m.type.startsWith('video/')) return m.type;
  const src = (m.name || m.url || '').toLowerCase();
  if (src.endsWith('.webm')) return 'video/webm';
  if (src.endsWith('.mov') || src.endsWith('.m4v')) return 'video/quicktime';
  if (src.endsWith('.ogv') || src.endsWith('.ogg')) return 'video/ogg';
  if (src.endsWith('.mkv')) return 'video/x-matroska';
  return 'video/mp4';
}

export function VisitVideoPlayer({ medias, title = '🎥 Vidéo(s) de la visite' }: Props) {
  const list: VideoMedia[] = Array.isArray(medias) ? medias.filter(isVideoMedia) : [];
  if (list.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="space-y-3">
        {list.map((m, i) => {
          const mime = resolveMime(m);
          return (
            <div key={i} className="rounded-lg overflow-hidden border border-border bg-black/5">
              <video
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[70vh] bg-black rounded-t-lg"
              >
                <source src={m.url} type={mime} />
                Votre navigateur ne peut pas lire cette vidéo.
              </video>
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground">
                <span className="truncate">
                  {m.name || `Vidéo ${i + 1}`}
                  {typeof m.size === 'number' && ` · ${(m.size / (1024 * 1024)).toFixed(1)} Mo`}
                </span>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                >
                  <a href={m.url} download={m.name || 'visite.mp4'} target="_blank" rel="noreferrer">
                    <Download className="w-3.5 h-3.5 mr-1" /> Télécharger
                  </a>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

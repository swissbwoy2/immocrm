import { Card } from '@/components/ui/card';
import { Play, Video } from 'lucide-react';

interface Props {
  title: string;
  src?: string;
  poster?: string;
  duration?: string;
}

export function VideoBlock({ title, src, poster, duration }: Props) {
  if (!src) {
    return (
      <Card className="aspect-video flex flex-col items-center justify-center bg-muted/30 border-dashed gap-3">
        <div className="p-4 bg-primary/10 rounded-full">
          <Video className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center px-4">
          <div className="font-semibold">{title}</div>
          <p className="text-sm text-muted-foreground mt-1">Vidéo bientôt disponible</p>
          {duration && <p className="text-xs text-muted-foreground mt-1">Durée prévue : {duration}</p>}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <video
        controls
        poster={poster}
        className="w-full aspect-video bg-black"
        preload="metadata"
      >
        <source src={src} type="video/mp4" />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>
      <div className="p-3 flex items-center gap-2 text-sm">
        <Play className="w-4 h-4 text-primary" />
        <span className="font-medium">{title}</span>
        {duration && <span className="ml-auto text-muted-foreground text-xs">{duration}</span>}
      </div>
    </Card>
  );
}

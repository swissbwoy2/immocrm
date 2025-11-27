import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertCircle, Video } from "lucide-react";
import { ConversionProgress } from "@/hooks/useVideoConverter";

interface VideoConversionProgressProps {
  progress: ConversionProgress;
}

export const VideoConversionProgress = ({ progress }: VideoConversionProgressProps) => {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3 mb-3">
        {progress.stage === 'loading' && (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        {progress.stage === 'converting' && (
          <Video className="h-5 w-5 text-primary animate-pulse" />
        )}
        {progress.stage === 'done' && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
        {progress.stage === 'error' && (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )}
        <span className="text-sm font-medium">{progress.message}</span>
      </div>
      
      {(progress.stage === 'loading' || progress.stage === 'converting') && (
        <Progress value={progress.progress} className="h-2" />
      )}
      
      {progress.stage === 'converting' && progress.progress > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Cette opération peut prendre quelques minutes selon la taille de la vidéo.
        </p>
      )}
    </div>
  );
};

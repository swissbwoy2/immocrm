import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertCircle, Video, AlertTriangle } from "lucide-react";
import { ConversionProgress } from "@/hooks/useVideoConverter";

interface VideoConversionProgressProps {
  progress: ConversionProgress;
  onContinue?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
}

export const VideoConversionProgress = ({ 
  progress, 
  onContinue, 
  onCancel, 
  showActions = false 
}: VideoConversionProgressProps) => {
  const isWarning = progress.stage === 'error' || progress.stage === 'skipped';
  
  return (
    <div className={`p-4 rounded-lg border ${isWarning ? 'border-orange-500/50 bg-orange-500/10' : 'bg-card'}`}>
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
        {progress.stage === 'skipped' && (
          <AlertTriangle className="h-5 w-5 text-orange-500" />
        )}
        <span className={`text-sm font-medium ${isWarning ? 'text-orange-700 dark:text-orange-300' : ''}`}>
          {progress.message}
        </span>
      </div>
      
      {(progress.stage === 'loading' || progress.stage === 'converting') && (
        <Progress value={progress.progress} className="h-2" />
      )}
      
      {progress.stage === 'converting' && progress.progress > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Cette opération peut prendre quelques minutes selon la taille de la vidéo.
        </p>
      )}

      {isWarning && showActions && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onContinue}
            className="flex-1 px-3 py-2 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            Continuer quand même
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
};

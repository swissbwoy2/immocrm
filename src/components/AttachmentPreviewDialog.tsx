import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Image as ImageIcon, File } from "lucide-react";

interface AttachmentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  previewUrl: string | null;
}

export function AttachmentPreviewDialog({ 
  open, 
  onOpenChange, 
  file, 
  previewUrl 
}: AttachmentPreviewDialogProps) {
  if (!file || !previewUrl) return null;

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImage ? <ImageIcon className="h-5 w-5" /> : isPdf ? <FileText className="h-5 w-5" /> : <File className="h-5 w-5" />}
            {file.name}
            <span className="text-sm font-normal text-muted-foreground">
              ({formatFileSize(file.size)})
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto min-h-0">
          {isImage ? (
            <div className="flex items-center justify-center p-4">
              <img 
                src={previewUrl} 
                alt={file.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={previewUrl}
              className="w-full h-[70vh] border rounded-lg"
              title={file.name}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <File className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">{file.name}</p>
              <p className="text-muted-foreground">{file.type || 'Type inconnu'}</p>
              <p className="text-muted-foreground">{formatFileSize(file.size)}</p>
              <p className="text-sm text-muted-foreground mt-4">
                Aperçu non disponible pour ce type de fichier
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

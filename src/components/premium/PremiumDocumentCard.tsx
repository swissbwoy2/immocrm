import { FileText, Download, Trash2, Image, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Document {
  id: string;
  nom: string;
  type: string;
  taille: number;
  date_upload: string;
  url?: string;
}

interface PremiumDocumentCardProps {
  document: Document;
  onDownload?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  delay?: number;
  className?: string;
}

export function PremiumDocumentCard({
  document,
  onDownload,
  onDelete,
  delay = 0,
  className
}: PremiumDocumentCardProps) {
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText;
    if (type.includes('image')) return Image;
    return File;
  };
  
  const getFileType = (type: string) => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('png')) return 'PNG';
    if (type.includes('jpeg') || type.includes('jpg')) return 'JPG';
    return 'Fichier';
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const FileIcon = getFileIcon(document.type);
  const fileType = getFileType(document.type);
  
  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-xl',
        'bg-gradient-to-br from-card/90 via-card/80 to-card/70',
        'backdrop-blur-xl border border-border/50',
        'p-4 shadow-lg',
        'group hover:shadow-xl hover:-translate-y-1',
        'transition-all duration-500',
        'animate-fade-in',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Animated gradient border on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40 animate-gradient-x" />
        <div className="absolute inset-[1px] rounded-xl bg-card" />
      </div>
      
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      
      <div className="relative z-10">
        {/* Header with icon and name */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn(
            'relative p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110',
            'bg-gradient-to-br from-primary/20 to-primary/10'
          )}>
            <FileIcon className="w-5 h-5 text-primary" />
            {/* Glow effect */}
            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate mb-1" title={document.nom}>
              {document.nom}
            </p>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={cn(
                  'text-xs px-2 py-0.5',
                  document.type.includes('pdf') ? 'bg-red-500/20 text-red-700 dark:text-red-300' :
                  document.type.includes('image') ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                  'bg-muted text-muted-foreground'
                )}
              >
                {fileType}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(document.taille)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Date */}
        <p className="text-xs text-muted-foreground mb-3">
          Ajouté le {new Date(document.date_upload).toLocaleDateString('fr-CH')}
        </p>
        
        {/* Actions */}
        <div className="flex gap-2">
          {onDownload && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 group/btn relative overflow-hidden"
              onClick={() => onDownload(document)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500" />
              <Download className="w-3.5 h-3.5 mr-1.5 group-hover/btn:scale-110 transition-transform" />
              Télécharger
            </Button>
          )}
          
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="hover:bg-red-500/10 hover:text-red-500 transition-colors"
              onClick={() => onDelete(document)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Empty state component for no documents
export function PremiumDocumentEmptyState({ onUpload }: { onUpload?: () => void }) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl',
      'bg-gradient-to-br from-card/90 via-card/80 to-card/70',
      'backdrop-blur-xl border border-dashed border-border/50',
      'p-8 shadow-lg',
      'group hover:border-primary/30 transition-all duration-300'
    )}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-4">
          Aucun document uploadé
        </p>
        {onUpload && (
          <Button onClick={onUpload} size="sm" className="group/btn relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
            Ajouter un document
          </Button>
        )}
      </div>
    </div>
  );
}

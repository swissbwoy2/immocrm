import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image, Video, FileText, X, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useVideoConverter } from "@/hooks/useVideoConverter";
import { VideoConversionProgress } from "@/components/VideoConversionProgress";

export interface AttachmentData {
  url: string;
  type: string;
  name: string;
  size: number;
}

interface OfferAttachmentUploaderProps {
  onAttachmentsChange: (attachments: AttachmentData[]) => void;
  attachments: AttachmentData[];
}

const formatFileSize = (size: number): string => {
  if (size >= 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  } else if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(size / 1024).toFixed(0)} KB`;
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
  if (type.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
  return <FileText className="h-5 w-5 text-orange-500" />;
};

export const OfferAttachmentUploader = ({ onAttachmentsChange, attachments }: OfferAttachmentUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { convertToMp4, isConverting, conversionProgress, needsConversion, resetProgress } = useVideoConverter();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxSize = 1024 * 1024 * 1024; // 1GB
    const newAttachments: AttachmentData[] = [];

    setUploading(true);
    resetProgress();
    
    try {
      for (const file of Array.from(files)) {
        if (file.size > maxSize) {
          toast({
            title: "Fichier trop volumineux",
            description: `${file.name} dépasse 1GB`,
            variant: "destructive",
          });
          continue;
        }

        let fileToUpload = file;
        
        // Convert video if needed
        if (file.type.startsWith('video/') && needsConversion(file)) {
          toast({
            title: "Conversion en cours",
            description: `Conversion de ${file.name} en MP4...`,
          });
          const result = await convertToMp4(file);
          fileToUpload = result.file;
          
          // If conversion was skipped, show warning
          if (result.skipped && result.reason) {
            toast({
              title: "Conversion impossible",
              description: result.reason,
              variant: "default",
            });
          }
        }

        const fileExt = fileToUpload.name.split('.').pop();
        const filePath = `offers/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, fileToUpload);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: "Erreur d'upload",
            description: `Impossible d'uploader ${fileToUpload.name}`,
            variant: "destructive",
          });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);

        newAttachments.push({
          url: urlData.publicUrl,
          type: fileToUpload.type,
          name: fileToUpload.name,
          size: fileToUpload.size,
        });
      }

      if (newAttachments.length > 0) {
        onAttachmentsChange([...attachments, ...newAttachments]);
        toast({
          title: "Fichiers uploadés",
          description: `${newAttachments.length} fichier(s) ajouté(s)`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Show conversion progress */}
      {isConverting && conversionProgress && (
        <VideoConversionProgress progress={conversionProgress} />
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, index) => (
            <Card key={index} className="p-3 flex items-center gap-3">
              {attachment.type.startsWith('image/') ? (
                <img 
                  src={attachment.url} 
                  alt={attachment.name} 
                  className="h-12 w-12 object-cover rounded"
                />
              ) : (
                <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
                  {getFileIcon(attachment.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(index)}>
                <X className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || isConverting}
      >
        {uploading || isConverting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {isConverting ? 'Conversion...' : 'Upload en cours...'}
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter des fichiers (max 1GB)
          </>
        )}
      </Button>
      
      <p className="text-xs text-muted-foreground text-center">
        Photos, vidéos (conversion auto en MP4), PDF, documents Word/Excel acceptés
      </p>
    </div>
  );
};

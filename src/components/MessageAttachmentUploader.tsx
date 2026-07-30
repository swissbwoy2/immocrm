import { useState, useRef } from "react";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image, Video, FileText, Mic, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useVideoConverter, ConversionResult } from "@/hooks/useVideoConverter";
import { VideoConversionProgress } from "@/components/VideoConversionProgress";
import { generateVideoThumbnail } from "@/lib/videoThumbnail";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AttachmentData {
  url: string;
  type: string;
  name: string;
  size: number;
  thumbnail_url?: string;
}

interface MessageAttachmentUploaderProps {
  onAttachmentReady: (attachment: AttachmentData | null) => void;
  conversationId: string;
  /** Optionnel : rend l'aperçu contrôlé par le parent (vidé automatiquement après envoi). */
  value?: AttachmentData | null;
}

const normalizeAttachmentType = (mimeType: string): 'image' | 'video' | 'document' | 'audio' => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document'; // Par défaut pour PDF, DOC, XLSX, etc.
};

export const MessageAttachmentUploader = ({ onAttachmentReady, conversationId, value }: MessageAttachmentUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [internalPreview, setInternalPreview] = useState<AttachmentData | null>(null);
  const isControlled = value !== undefined;
  const preview = isControlled ? value : internalPreview;
  const setPreview = (a: AttachmentData | null) => setInternalPreview(a);
  const [pendingFile, setPendingFile] = useState<{ file: File; type: 'image' | 'video' | 'document'; result: ConversionResult } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { takePhoto, isNative } = useNativeCamera();
  const { convertToMp4, isConverting, conversionProgress, needsConversion, resetProgress } = useVideoConverter();

  const uploadFile = async (fileToUpload: File) => {
    const fileExt = fileToUpload.name.split('.').pop();
    const baseName = `${Date.now()}`;
    const filePath = `${conversationId}/${baseName}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(filePath, fileToUpload);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(filePath);

    let thumbnailUrl: string | undefined;
    // Pour les vidéos, génère et upload une miniature JPEG (utilisée par WhatsApp)
    if (fileToUpload.type.startsWith('video/')) {
      try {
        const thumb = await generateVideoThumbnail(fileToUpload, 1);
        if (thumb) {
          const thumbPath = `${conversationId}/${baseName}.thumb.jpg`;
          const { error: thumbErr } = await supabase.storage
            .from('message-attachments')
            .upload(thumbPath, thumb, { contentType: 'image/jpeg' });
          if (!thumbErr) {
            thumbnailUrl = supabase.storage.from('message-attachments').getPublicUrl(thumbPath).data.publicUrl;
          }
        }
      } catch (e) {
        console.warn('thumbnail generation failed', e);
      }
    }

    const attachment: AttachmentData = {
      url: urlData.publicUrl,
      type: normalizeAttachmentType(fileToUpload.type),
      name: fileToUpload.name,
      size: fileToUpload.size,
      thumbnail_url: thumbnailUrl,
    };

    setPreview(attachment);
    onAttachmentReady(attachment);

    toast({
      title: "Fichier uploadé",
      description: "Vous pouvez maintenant envoyer le message",
    });
  };

  const handleFileSelect = async (file: File, type: 'image' | 'video' | 'document') => {
    // Reset state from previous uploads
    resetProgress();
    setPendingFile(null);
    
    // Validation de taille - 1GB max pour tous les fichiers
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (file.size > maxSize) {
      toast({
        title: "Fichier trop volumineux",
        description: "Taille max: 1GB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Convert video if needed
      if (type === 'video' && needsConversion(file)) {
        toast({
          title: "Conversion en cours",
          description: "La vidéo sera convertie en MP4 pour une meilleure compatibilité.",
        });
        
        const result = await convertToMp4(file);
        
        // If conversion was skipped or failed, ask user what to do
        if (result.skipped && result.reason) {
          setPendingFile({ file: result.file, type, result });
          setUploading(false);
          return;
        }
        
        await uploadFile(result.file);
      } else {
        await uploadFile(file);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: "Impossible d'uploader le fichier",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleContinueWithOriginal = async () => {
    if (!pendingFile) return;
    
    setUploading(true);
    try {
      await uploadFile(pendingFile.file);
      toast({
        title: "Attention",
        description: "La vidéo a été uploadée mais pourrait ne pas être lisible sur certains navigateurs.",
        variant: "default",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: "Impossible d'uploader le fichier",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setPendingFile(null);
      resetProgress();
    }
  };

  const handleCancelUpload = () => {
    setPendingFile(null);
    resetProgress();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        await handleFileSelect(audioFile, 'document');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      toast({
        title: "Erreur microphone",
        description: "Impossible d'accéder au microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    onAttachmentReady(null);
  };

  const triggerFileInput = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const triggerCamera = async (mode: 'image' | 'video') => {
    // Natif (Capacitor) : la caméra système pour la photo
    if (isNative && mode === 'image') {
      const file = await takePhoto();
      if (file) await handleFileSelect(file, 'image');
      return;
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.accept = mode === 'video' ? 'video/*' : 'image/*';
      cameraInputRef.current.setAttribute('capture', 'environment');
      cameraInputRef.current.click();
    }
  };

  // Show conversion progress or warning with actions
  if (isConverting && conversionProgress) {
    return (
      <div className="mb-2">
        <VideoConversionProgress progress={conversionProgress} />
      </div>
    );
  }

  // Show warning with action buttons when conversion was skipped/failed
  if (pendingFile && conversionProgress && (conversionProgress.stage === 'skipped' || conversionProgress.stage === 'error')) {
    return (
      <div className="mb-2">
        <VideoConversionProgress 
          progress={conversionProgress} 
          onContinue={handleContinueWithOriginal}
          onCancel={handleCancelUpload}
          showActions={true}
        />
      </div>
    );
  }

  if (preview) {
    return (
      <Card className="p-3 mb-2 flex items-center gap-3">
        <div className="flex-1">
          {preview.type === 'image' && (
            <img src={preview.url} alt={preview.name} className="h-16 w-16 object-cover rounded" />
          )}
          {preview.type === 'video' && (
            <Video className="h-8 w-8 text-muted-foreground" />
          )}
          {preview.type === 'audio' && (
            <Mic className="h-8 w-8 text-muted-foreground" />
          )}
          {preview.type === 'document' && (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-xs text-muted-foreground mt-1">{preview.name}</p>
          <p className="text-xs text-muted-foreground">
            {preview.size >= 1024 * 1024 * 1024 
              ? `${(preview.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
              : preview.size >= 1024 * 1024 
                ? `${(preview.size / (1024 * 1024)).toFixed(1)} MB`
                : `${(preview.size / 1024).toFixed(0)} KB`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
            handleFileSelect(file, type);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const type = file.type.startsWith('video/') ? 'video' : 'image';
            handleFileSelect(file, type);
          }
          e.target.value = '';
        }}
      />

      {uploading ? (
        <Button variant="ghost" size="sm" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      ) : recording ? (
        <Button variant="ghost" size="sm" onClick={stopRecording} className="text-red-500">
          <Mic className="h-4 w-4 animate-pulse" />
        </Button>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" title="Ajouter une pièce jointe">
              <Image className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground px-2 pt-1">Caméra</div>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => triggerCamera('video')}
              >
                <Video className="h-4 w-4 mr-2" />
                Filmer une vidéo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => triggerCamera('image')}
              >
                <Image className="h-4 w-4 mr-2" />
                Prendre une photo
              </Button>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground px-2 pt-2">Galerie / fichiers</div>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => triggerFileInput('image/*')}
              >
                <Image className="h-4 w-4 mr-2" />
                Photo (galerie)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => triggerFileInput('video/*')}
              >
                <Video className="h-4 w-4 mr-2" />
                Vidéo (galerie)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => triggerFileInput('.pdf,.doc,.docx,.xls,.xlsx,.txt')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Document
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={startRecording}
              >
                <Mic className="h-4 w-4 mr-2" />
                Message vocal
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

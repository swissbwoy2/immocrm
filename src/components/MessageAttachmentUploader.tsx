import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Paperclip, Image, Video, FileText, Mic, X, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AttachmentData {
  url: string;
  type: string;
  name: string;
  size: number;
}

interface MessageAttachmentUploaderProps {
  onAttachmentReady: (attachment: AttachmentData | null) => void;
  conversationId: string;
}

export const MessageAttachmentUploader = ({ onAttachmentReady, conversationId }: MessageAttachmentUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState<AttachmentData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const handleFileSelect = async (file: File, type: 'image' | 'video' | 'document') => {
    // Validation de taille
    const maxSize = type === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Fichier trop volumineux",
        description: `Taille max: ${type === 'video' ? '50MB' : '10MB'}`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${conversationId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      const attachment: AttachmentData = {
        url: urlData.publicUrl,
        type: file.type,
        name: file.name,
        size: file.size,
      };

      setPreview(attachment);
      onAttachmentReady(attachment);

      toast({
        title: "Fichier uploadé",
        description: "Vous pouvez maintenant envoyer le message",
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
    }
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
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  if (preview) {
    return (
      <Card className="p-3 mb-2 flex items-center gap-3">
        <div className="flex-1">
          {preview.type.startsWith('image/') && (
            <img src={preview.url} alt={preview.name} className="h-16 w-16 object-cover rounded" />
          )}
          {preview.type.startsWith('video/') && (
            <Video className="h-8 w-8 text-muted-foreground" />
          )}
          {preview.type.startsWith('audio/') && (
            <Mic className="h-8 w-8 text-muted-foreground" />
          )}
          {!preview.type.startsWith('image/') && !preview.type.startsWith('video/') && !preview.type.startsWith('audio/') && (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-xs text-muted-foreground mt-1">{preview.name}</p>
          <p className="text-xs text-muted-foreground">{(preview.size / 1024).toFixed(0)} KB</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex items-center gap-2">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Paperclip className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => triggerFileInput('image/*')}>
              <Image className="h-4 w-4 mr-2" />
              Photo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerFileInput('video/*')}>
              <Video className="h-4 w-4 mr-2" />
              Vidéo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerFileInput('.pdf,.doc,.docx,.xls,.xlsx,.txt')}>
              <FileText className="h-4 w-4 mr-2" />
              Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={startRecording}>
              <Mic className="h-4 w-4 mr-2" />
              Message vocal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

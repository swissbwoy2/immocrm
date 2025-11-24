import { useState } from "react";
import { FileText, Download, Image as ImageIcon, Video, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface MessageAttachmentProps {
  url: string;
  type: string;
  name: string;
  size: number;
}

export const MessageAttachment = ({ url, type, name, size }: MessageAttachmentProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Image
  if (type.startsWith('image/')) {
    return (
      <>
        <div 
          className="cursor-pointer group relative overflow-hidden rounded-lg max-w-xs"
          onClick={() => setLightboxOpen(true)}
        >
          <img 
            src={url} 
            alt={name} 
            className="w-full h-auto transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-4xl">
            <img src={url} alt={name} className="w-full h-auto" />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Video
  if (type.startsWith('video/')) {
    return (
      <div className="max-w-md">
        <video controls className="w-full rounded-lg">
          <source src={url} type={type} />
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      </div>
    );
  }

  // Audio
  if (type.startsWith('audio/')) {
    return (
      <Card className="p-4 max-w-sm">
        <div className="flex items-center gap-3 mb-2">
          <Music className="h-8 w-8 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Message vocal</p>
            <p className="text-xs text-muted-foreground">{formatSize(size)}</p>
          </div>
        </div>
        <audio controls className="w-full">
          <source src={url} type={type} />
          Votre navigateur ne supporte pas la lecture audio.
        </audio>
      </Card>
    );
  }

  // Document
  return (
    <Card className="p-4 max-w-sm">
      <div className="flex items-center gap-3">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{formatSize(size)}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

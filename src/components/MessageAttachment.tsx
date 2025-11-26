import { useState } from "react";
import { FileText, Download, Image as ImageIcon, Video, Music, Eye, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MessageAttachmentProps {
  url: string;
  type: string;
  name: string;
  size: number;
}

export const MessageAttachment = ({ url, type, name, size }: MessageAttachmentProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    a.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const isPDF = type === 'application/pdf' || name.toLowerCase().endsWith('.pdf') || type === 'document' && name.toLowerCase().endsWith('.pdf');
  const isOfficeDoc = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(name);
  const isImage = type.startsWith('image/') || type === 'image';
  const isVideo = type.startsWith('video/') || type === 'video' || /\.(mov|mp4|webm|avi|mkv)$/i.test(name);
  const isAudio = type.startsWith('audio/') || type === 'audio' || /\.(mp3|wav|ogg|m4a|webm)$/i.test(name);

  // Image
  if (isImage) {
    return (
      <>
        <div 
          className="cursor-pointer group relative overflow-hidden rounded-lg max-w-xs"
          onClick={() => setLightboxOpen(true)}
        >
          <img 
            src={url} 
            alt={name} 
            className="w-full h-auto max-h-64 object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
            <p className="text-xs text-white truncate">{name}</p>
          </div>
        </div>
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
            <div className="relative">
              <img src={url} alt={name} className="w-full h-auto max-h-[85vh] object-contain" />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-3">
                <p className="text-sm text-white">{name}</p>
                <p className="text-xs text-white/70">{formatSize(size)}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Video
  if (isVideo) {
    // Detect unsupported formats that most browsers can't play
    const isUnsupportedFormat = /\.(mov|avi|mkv|wmv|flv)$/i.test(name);
    
    // Determine video MIME type from extension if not provided
    const videoMimeType = type.startsWith('video/') ? type : 
      name.toLowerCase().endsWith('.mov') ? 'video/quicktime' :
      name.toLowerCase().endsWith('.mp4') ? 'video/mp4' :
      name.toLowerCase().endsWith('.webm') ? 'video/webm' :
      name.toLowerCase().endsWith('.avi') ? 'video/x-msvideo' :
      'video/mp4';

    // Pour les formats non supportés ou si erreur, afficher une carte avec téléchargement
    if (isUnsupportedFormat || videoError) {
      return (
        <Card className="p-4 max-w-sm">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Video className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(size)}</p>
              {isUnsupportedFormat && (
                <p className="text-xs text-orange-500 mt-1">
                  Format {name.split('.').pop()?.toUpperCase()} - téléchargez pour visionner
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" className="w-full mt-3" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger la vidéo
          </Button>
        </Card>
      );
    }

    return (
      <>
        <Card className="max-w-md overflow-hidden">
          <div className="relative">
            <video 
              controls 
              className="w-full max-h-64 object-contain bg-black"
              preload="metadata"
              onError={() => setVideoError(true)}
            >
              <source src={url} type={videoMimeType} />
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
          <div className="p-2 flex items-center justify-between border-t">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(size)}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)} title="Plein écran">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload} title="Télécharger">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
        
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
            <video 
              controls 
              autoPlay
              className="w-full max-h-[85vh] object-contain bg-black"
              onError={() => setVideoError(true)}
            >
              <source src={url} type={videoMimeType} />
            </video>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Audio
  if (isAudio) {
    const audioMimeType = type.startsWith('audio/') ? type :
      name.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' :
      name.toLowerCase().endsWith('.wav') ? 'audio/wav' :
      name.toLowerCase().endsWith('.ogg') ? 'audio/ogg' :
      name.toLowerCase().endsWith('.m4a') ? 'audio/mp4' :
      'audio/webm';

    return (
      <Card className="p-4 max-w-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Music className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Message vocal</p>
            <p className="text-xs text-muted-foreground">{formatSize(size)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
        <audio controls className="w-full h-10">
          <source src={url} type={audioMimeType} />
          Votre navigateur ne supporte pas la lecture audio.
        </audio>
      </Card>
    );
  }

  // PDF - Preview with iframe
  if (isPDF) {
    return (
      <>
        <Card className="p-4 max-w-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(size)}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4 mr-1" />
              Aperçu
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Télécharger
            </Button>
          </div>
        </Card>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="flex items-center justify-between">
                <span className="truncate">{name}</span>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
              </DialogTitle>
            </DialogHeader>
            <iframe 
              src={`${url}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full border-0"
              title={name}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Office documents - Open in new tab or Google Docs viewer
  if (isOfficeDoc) {
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
    
    return (
      <>
        <Card className="p-4 max-w-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(size)}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4 mr-1" />
              Aperçu
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Télécharger
            </Button>
          </div>
        </Card>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="flex items-center justify-between">
                <span className="truncate">{name}</span>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
              </DialogTitle>
            </DialogHeader>
            <iframe 
              src={googleViewerUrl}
              className="w-full h-full border-0"
              title={name}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Other documents - Download only
  return (
    <Card className="p-4 max-w-sm">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{formatSize(size)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

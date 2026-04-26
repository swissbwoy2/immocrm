import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, X } from 'lucide-react';
import { enhanceScan, type CapturedPage } from '@/hooks/useDocumentScanner';

interface Props {
  onCapture: (page: CapturedPage) => void;
  onCancel: () => void;
  /** Texte affiché au-dessus de la prévisualisation (ex: "Recto", "Verso"). */
  stepLabel?: string;
}

/**
 * Scanner web basé sur getUserMedia + canvas.
 * Affiche un viewfinder, capture, applique amélioration de contraste, retourne dataURL.
 */
export default function WebDocumentScanner({ onCapture, onCancel, stepLabel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 2560 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch (e) {
        setError(
          "Impossible d'accéder à la caméra. Veuillez autoriser l'accès ou utiliser le téléversement de fichier."
        );
      }
    };
    start();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const raw = canvas.toDataURL('image/jpeg', 0.92);
    const enhanced = await enhanceScan(raw);
    onCapture({ dataUrl: enhanced, width: canvas.width, height: canvas.height });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/10">
          <X className="h-5 w-5" />
        </Button>
        <div className="text-sm font-medium">
          {stepLabel ? `Scan — ${stepLabel}` : 'Scanner un document'}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
          className="text-white hover:bg-white/10"
          aria-label="Changer de caméra"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-white text-center max-w-sm px-6">
            <p className="text-sm">{error}</p>
            <Button variant="secondary" className="mt-4" onClick={onCancel}>
              Retour
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="max-h-full max-w-full object-contain"
            />
            {/* Cadre A4 indicatif */}
            <div className="pointer-events-none absolute inset-8 border-2 border-white/40 rounded-lg" />
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!error && (
        <div className="p-6 flex justify-center">
          <button
            onClick={capture}
            className="h-16 w-16 rounded-full bg-white border-4 border-white/50 active:scale-95 transition-transform"
            aria-label="Capturer"
          />
        </div>
      )}
    </div>
  );
}

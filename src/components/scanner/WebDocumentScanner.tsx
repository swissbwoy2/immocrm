import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, X, ImageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { enhanceScan, fileToCapturedPage, type CapturedPage } from '@/hooks/useDocumentScanner';
import {
  isIOSDevice,
  hasGetUserMedia,
  isSecureContextOk,
  isInIframe,
  preferInputCapture,
  getCameraErrorMessage,
} from '@/utils/cameraSupport';

interface Props {
  onCapture: (page: CapturedPage) => void;
  onCancel: () => void;
  /** Texte affiché au-dessus de la prévisualisation (ex: "Recto", "Verso"). */
  stepLabel?: string;
}

type Mode = 'choose' | 'live' | 'error';

/**
 * Scanner web 100 % navigateur.
 * - Safari iOS / iOS en général : propose en priorité l'appareil photo natif via
 *   <input type="file" accept="image/*" capture="environment"> (méthode la plus fiable).
 * - Tous les autres navigateurs : propose getUserMedia en priorité, mais le démarre
 *   uniquement APRÈS le clic utilisateur (exigence Safari pour conserver le geste).
 * - Toujours un fallback "Choisir une image" (galerie / fichier).
 */
export default function WebDocumentScanner({ onCapture, onCancel, stepLabel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('choose');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const iframe = isInIframe();
  const secure = isSecureContextOk();
  const gum = hasGetUserMedia();
  const iOS = isIOSDevice();
  const preferNative = preferInputCapture();

  const cleanupStream = (s: MediaStream | null) => {
    s?.getTracks().forEach((t) => t.stop());
  };

  const closeAll = () => {
    cleanupStream(stream);
    setStream(null);
    onCancel();
  };

  /** Démarre getUserMedia — appelé UNIQUEMENT depuis un onClick (geste utilisateur). */
  const startLiveCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setError(null);
    if (!gum) {
      setError("Votre navigateur ne supporte pas l'accès direct à la caméra. Utilisez l'appareil photo de votre téléphone.");
      setMode('error');
      return;
    }
    if (!secure) {
      setError("Accès caméra impossible : le site doit être en HTTPS. Ouvrez https://logisorama.ch.");
      setMode('error');
      return;
    }

    setBusy(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(s);
      setFacingMode(mode);
      setMode('live');
      // Attache le stream après que la <video> est rendue
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {
            /* autoplay bloqué — l'utilisateur peut tap pour relancer */
          });
        }
      });
    } catch (e) {
      console.error('[WebDocumentScanner] getUserMedia error', e);
      cleanupStream(stream);
      setStream(null);
      setError(getCameraErrorMessage(e));
      setMode('error');
    } finally {
      setBusy(false);
    }
  };

  const switchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    cleanupStream(stream);
    setStream(null);
    startLiveCamera(next);
  };

  const captureFromVideo = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setBusy(true);
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const raw = canvas.toDataURL('image/jpeg', 0.92);
      const enhanced = await enhanceScan(raw);
      cleanupStream(stream);
      setStream(null);
      onCapture({ dataUrl: enhanced, width: canvas.width, height: canvas.height });
    } finally {
      setBusy(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const page = await fileToCapturedPage(file);
      // Améliore légèrement la photo (contraste/luminosité)
      const enhanced = await enhanceScan(page.dataUrl);
      onCapture({ ...page, dataUrl: enhanced });
    } catch (err) {
      console.error('[WebDocumentScanner] file error', err);
      setError("Impossible de lire l'image sélectionnée.");
      setMode('error');
    } finally {
      setBusy(false);
    }
  };

  // ===== RENDER =====

  // Écran 1 : choix méthode
  if (mode === 'choose') {
    return (
      <div className="fixed inset-0 z-[200] bg-background flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={closeAll} aria-label="Fermer">
            <X className="h-5 w-5" />
          </Button>
          <div className="text-sm font-medium">
            {stepLabel ? `Scanner — ${stepLabel}` : 'Scanner un document'}
          </div>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-auto p-6 flex flex-col gap-3 max-w-md mx-auto w-full">
          {iframe && (
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Pour un scan optimal sur Safari, ouvrez l'application directement sur{' '}
                <strong>logisorama.ch</strong> (et non depuis cette prévisualisation).
              </span>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Choisissez comment ajouter votre document :
          </p>

          {/* Bouton 1 — Appareil photo natif (input capture) — recommandé sur iOS */}
          <Button
            type="button"
            size="lg"
            variant={preferNative ? 'default' : 'outline'}
            className="min-h-[64px] gap-3 text-base justify-start px-5"
            onClick={() => captureInputRef.current?.click()}
            disabled={busy}
          >
            <Camera className="h-6 w-6 shrink-0" />
            <div className="flex flex-col items-start text-left">
              <span className="font-semibold">Appareil photo</span>
              <span className="text-xs opacity-80 font-normal">
                Ouvre l'app caméra de votre téléphone
              </span>
            </div>
            {preferNative && (
              <span className="ml-auto text-[10px] uppercase tracking-wide bg-primary-foreground/20 px-2 py-0.5 rounded">
                Recommandé
              </span>
            )}
          </Button>

          {/* Bouton 2 — getUserMedia (live) — recommandé hors iOS */}
          {gum && (
            <Button
              type="button"
              size="lg"
              variant={preferNative ? 'outline' : 'default'}
              className="min-h-[64px] gap-3 text-base justify-start px-5"
              onClick={() => startLiveCamera('environment')}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-6 w-6 shrink-0 animate-spin" />
              ) : (
                <Camera className="h-6 w-6 shrink-0" />
              )}
              <div className="flex flex-col items-start text-left">
                <span className="font-semibold">Scanner en direct</span>
                <span className="text-xs opacity-80 font-normal">
                  Caméra avec aperçu en temps réel
                </span>
              </div>
              {!preferNative && (
                <span className="ml-auto text-[10px] uppercase tracking-wide bg-primary-foreground/20 px-2 py-0.5 rounded">
                  Recommandé
                </span>
              )}
            </Button>
          )}

          {/* Bouton 3 — fallback galerie */}
          <Button
            type="button"
            size="lg"
            variant="ghost"
            className="min-h-[56px] gap-3 text-base justify-start px-5"
            onClick={() => galleryInputRef.current?.click()}
            disabled={busy}
          >
            <ImageIcon className="h-5 w-5 shrink-0" />
            <span>Choisir depuis la galerie</span>
          </Button>

          {iOS && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              💡 Sur iPhone, l'option « Appareil photo » est la plus fiable.
            </p>
          )}
        </div>

        {/* Inputs cachés */}
        <input
          ref={captureInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelected}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Écran 2 : caméra live
  if (mode === 'live') {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col">
        <div className="flex items-center justify-between p-4 text-white">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              cleanupStream(stream);
              setStream(null);
              setMode('choose');
            }}
            className="text-white hover:bg-white/10"
            aria-label="Retour"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-sm font-medium">
            {stepLabel ? `Scan — ${stepLabel}` : 'Scanner un document'}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={switchCamera}
            className="text-white hover:bg-white/10"
            aria-label="Changer de caméra"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative flex-1 overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="max-h-full max-w-full object-contain"
          />
          <div className="pointer-events-none absolute inset-8 border-2 border-white/40 rounded-lg" />
        </div>

        <div className="p-6 flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            onClick={captureFromVideo}
            disabled={busy}
            className="h-16 w-16 rounded-full bg-white border-4 border-white/50 active:scale-95 transition-transform disabled:opacity-50"
            aria-label="Capturer"
          >
            {busy && <Loader2 className="h-6 w-6 animate-spin mx-auto text-black" />}
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Écran 3 : erreur
  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={closeAll} aria-label="Fermer">
          <X className="h-5 w-5" />
        </Button>
        <div className="text-sm font-medium">Erreur caméra</div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-4 max-w-md mx-auto w-full">
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>

        <Button
          type="button"
          size="lg"
          className="min-h-[56px] gap-2"
          onClick={() => captureInputRef.current?.click()}
        >
          <Camera className="h-5 w-5" />
          Utiliser l'appareil photo à la place
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-[56px] gap-2"
          onClick={() => galleryInputRef.current?.click()}
        >
          <ImageIcon className="h-5 w-5" />
          Choisir depuis la galerie
        </Button>

        <Button type="button" variant="ghost" onClick={() => setMode('choose')}>
          Retour
        </Button>
      </div>

      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

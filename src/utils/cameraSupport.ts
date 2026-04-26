/**
 * Détection des capacités caméra du navigateur (web-only).
 * Utilisé par le scanner de documents pour choisir la meilleure stratégie.
 */

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPad récents se présentent comme MacIntel + touch
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
}

export function isIOSSafari(): boolean {
  return isIOSDevice() && isSafariBrowser();
}

export function hasGetUserMedia(): boolean {
  return typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';
}

export function isSecureContextOk(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.isSecureContext;
}

export function isInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin iframe
  }
}

/**
 * Sur iOS Safari, l'input capture est plus fiable que getUserMedia.
 * Sur Android Chrome, getUserMedia fonctionne très bien.
 * Sur desktop, getUserMedia est la seule option.
 */
export function preferInputCapture(): boolean {
  return isIOSDevice();
}

export function getCameraErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return "Erreur inconnue lors de l'accès à la caméra.";
  const name = (err as { name?: string }).name;
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return "Accès caméra refusé. Allez dans Réglages → Safari → Caméra et autorisez l'accès, puis rechargez la page.";
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return "Aucune caméra détectée sur cet appareil.";
    case 'NotReadableError':
    case 'TrackStartError':
      return "La caméra est utilisée par une autre application. Fermez les autres apps et réessayez.";
    case 'OverconstrainedError':
      return "La caméra ne supporte pas la résolution demandée. Réessayez.";
    case 'SecurityError':
      return "Accès caméra bloqué (contexte non sécurisé). Ouvrez l'app sur https://logisorama.ch.";
    case 'AbortError':
      return "Capture annulée.";
    default:
      return (err as { message?: string }).message || "Impossible d'accéder à la caméra.";
  }
}

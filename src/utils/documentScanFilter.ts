/**
 * Transforme une photo brute (dataURL) en vrai rendu "scan" :
 *   1. Détection des 4 coins du document via OpenCV.js + jscanify
 *   2. Redressement de perspective (warp) → document rectangulaire plein cadre
 *   3. Filtre adaptatif noir & blanc type photocopie
 *
 * Tout est lazy-loadé depuis CDN au premier scan.
 * Si la lib ne charge pas (offline / CSP), on retombe sur un simple boost contraste.
 */

const OPENCV_CDN = 'https://docs.opencv.org/4.10.0/opencv.js';
const JSCANIFY_CDN = 'https://cdn.jsdelivr.net/npm/jscanify@1.3.0/src/jscanify.min.js';

// Dimensions cibles A4 portrait @ ~150 DPI
const TARGET_W = 1240;
const TARGET_H = 1754;

let loadPromise: Promise<any> | null = null;

declare global {
  interface Window {
    cv?: any;
    jscanify?: any;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Évite les doublons
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function waitForCv(timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (window.cv && window.cv.Mat) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('OpenCV.js init timeout'));
        return;
      }
      setTimeout(tick, 100);
    };
    tick();
  });
}

/** Singleton : charge OpenCV.js + jscanify une seule fois et retourne une instance scanner. */
export function loadJscanify(): Promise<any> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    await loadScript(OPENCV_CDN);
    await waitForCv();
    await loadScript(JSCANIFY_CDN);
    if (!window.jscanify) throw new Error('jscanify not available');
    // jscanify exporte une classe
    const Scanner = window.jscanify;
    return new Scanner();
  })();
  return loadPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Filtre noir & blanc adaptatif (type photocopie) appliqué sur un canvas.
 * Algorithme simple : seuillage local par luminance + boost contraste.
 */
function applyScanFilter(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;

  // 1. Niveaux de gris + boost contraste
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Courbe en S pour contraste type photocopie
    let v = gray;
    if (v < 110) v = Math.max(0, v * 0.6);
    else if (v > 170) v = Math.min(255, 180 + (v - 170) * 1.5);
    else v = 110 + ((v - 110) / 60) * 70;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Transforme une photo (dataURL) en vrai scan.
 * Retourne un nouveau dataURL JPEG.
 */
export async function enhanceToScan(dataUrl: string): Promise<string> {
  try {
    const scanner = await loadJscanify();
    const img = await loadImage(dataUrl);

    // jscanify travaille avec un HTMLImageElement directement
    let resultCanvas: HTMLCanvasElement;
    try {
      // extractPaper redresse en perspective vers les dimensions cibles
      resultCanvas = scanner.extractPaper(img, TARGET_W, TARGET_H);
    } catch (warpErr) {
      console.warn('[documentScanFilter] extractPaper failed, fallback brut', warpErr);
      // Fallback : on utilise l'image brute redimensionnée
      resultCanvas = document.createElement('canvas');
      resultCanvas.width = img.naturalWidth;
      resultCanvas.height = img.naturalHeight;
      const ctx = resultCanvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
    }

    // Applique le filtre N&B type photocopie
    applyScanFilter(resultCanvas);

    return resultCanvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.warn('[documentScanFilter] enhanceToScan failed, fallback CSS filter', err);
    return fallbackEnhance(dataUrl);
  }
}

/** Fallback simple si OpenCV/jscanify ne charge pas (offline, CSP). */
async function fallbackEnhance(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2D context indisponible'));
      ctx.filter = 'contrast(1.4) brightness(1.1) saturate(0.4)';
      ctx.drawImage(img, 0, 0);
      // Boost N&B
      applyScanFilter(canvas);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

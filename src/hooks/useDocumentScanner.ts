import { useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PDFDocument } from 'pdf-lib';

/**
 * Hook centralisé pour le scan de documents.
 * - Sur mobile natif : utilise @capacitor/camera (haute résolution, source caméra arrière)
 * - Sur web : utilise getUserMedia via WebDocumentScanner (composant React)
 *
 * Toujours retourne un File (image ou PDF fusionné multi-pages).
 */

export type CapturedPage = {
  /** dataURL base64 (image/jpeg) */
  dataUrl: string;
  /** Largeur en px */
  width: number;
  /** Hauteur en px */
  height: number;
};

export function isNativeScanner(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Capture une page via la caméra native (Capacitor).
 */
export async function captureNativePage(): Promise<CapturedPage> {
  const photo = await Camera.getPhoto({
    quality: 92,
    allowEditing: true, // recadrage natif
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
    correctOrientation: true,
    saveToGallery: false,
    width: 2480, // ~A4 @ 300dpi
    height: 3508,
  });

  const dataUrl = photo.dataUrl ?? '';
  const dims = await getImageDimensions(dataUrl);
  return { dataUrl, ...dims };
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Améliore une image scannée (contraste, luminosité) via canvas.
 * Optionnel pour le mode web.
 */
export async function enhanceScan(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2D context indisponible'));
      // Filtre léger: contraste + luminosité légèrement augmentés
      ctx.filter = 'contrast(1.15) brightness(1.05) saturate(0.95)';
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Fusionne plusieurs pages capturées (images JPEG dataURL) en un seul PDF.
 */
export async function pagesToPdf(pages: CapturedPage[], fileName: string): Promise<File> {
  const pdfDoc = await PDFDocument.create();

  for (const page of pages) {
    const bytes = dataUrlToUint8Array(page.dataUrl);
    const img = await pdfDoc.embedJpg(bytes);
    const pdfPage = pdfDoc.addPage([img.width, img.height]);
    pdfPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }

  const pdfBytes = await pdfDoc.save();
  // pdfBytes is a Uint8Array; wrap in a fresh ArrayBuffer copy to satisfy BlobPart typing
  const buf = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(buf).set(pdfBytes);
  const safeName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  return new File([buf], safeName, { type: 'application/pdf' });
}

/**
 * Convertit une page unique en File JPEG (sans passer par PDF).
 */
export function pageToJpegFile(page: CapturedPage, fileName: string): File {
  const bytes = dataUrlToUint8Array(page.dataUrl);
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const safeName = fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')
    ? fileName
    : `${fileName}.jpg`;
  return new File([buf], safeName, { type: 'image/jpeg' });
}

/**
 * État de progression pour le composant scanner.
 */
export function useDocumentScanner() {
  const [pages, setPages] = useState<CapturedPage[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const addPage = useCallback((p: CapturedPage) => setPages((prev) => [...prev, p]), []);
  const removePage = useCallback(
    (idx: number) => setPages((prev) => prev.filter((_, i) => i !== idx)),
    []
  );
  const reset = useCallback(() => setPages([]), []);

  const captureNative = useCallback(async () => {
    setIsCapturing(true);
    try {
      const page = await captureNativePage();
      addPage(page);
      return page;
    } finally {
      setIsCapturing(false);
    }
  }, [addPage]);

  return { pages, addPage, removePage, reset, captureNative, isCapturing, setPages };
}

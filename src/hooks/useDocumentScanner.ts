import { useCallback, useState } from 'react';
import { PDFDocument } from 'pdf-lib';

/**
 * Hook centralisé pour le scan de documents (100% web).
 * Le scan passe par WebDocumentScanner (getUserMedia ou input capture selon le navigateur).
 * Toujours retourne un File (image JPEG ou PDF fusionné multi-pages).
 */

export type CapturedPage = {
  /** dataURL base64 (image/jpeg) */
  dataUrl: string;
  /** Largeur en px */
  width: number;
  /** Hauteur en px */
  height: number;
};

/**
 * Conservé pour compatibilité ; en web pur, on n'utilise jamais le scanner natif Capacitor.
 */
export function isNativeScanner(): boolean {
  return false;
}

export async function captureNativePage(): Promise<CapturedPage> {
  throw new Error('Native scanner unavailable in web app');
}

export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Améliore une image scannée (contraste, luminosité) via canvas.
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
 * Convertit un File image en CapturedPage (dataUrl + dimensions).
 * Utilisé quand l'utilisateur passe par <input type="file" capture="environment">.
 */
export async function fileToCapturedPage(file: File): Promise<CapturedPage> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const dims = await getImageDimensions(dataUrl);
  return { dataUrl, ...dims };
}

/**
 * Fusionne plusieurs pages capturées (images JPEG dataURL) en un seul PDF.
 */
export async function pagesToPdf(pages: CapturedPage[], fileName: string): Promise<File> {
  const pdfDoc = await PDFDocument.create();

  for (const page of pages) {
    const bytes = dataUrlToUint8Array(page.dataUrl);
    // Détecte JPG vs PNG via le préfixe data:
    const isPng = page.dataUrl.startsWith('data:image/png');
    const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    const pdfPage = pdfDoc.addPage([img.width, img.height]);
    pdfPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }

  const pdfBytes = await pdfDoc.save();
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
  const safeName =
    fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')
      ? fileName
      : `${fileName}.jpg`;
  return new File([buf], safeName, { type: 'image/jpeg' });
}

export function useDocumentScanner() {
  const [pages, setPages] = useState<CapturedPage[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const addPage = useCallback((p: CapturedPage) => setPages((prev) => [...prev, p]), []);
  const removePage = useCallback(
    (idx: number) => setPages((prev) => prev.filter((_, i) => i !== idx)),
    []
  );
  const reset = useCallback(() => setPages([]), []);

  return { pages, addPage, removePage, reset, isCapturing, setIsCapturing, setPages };
}

import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';

interface Document {
  id: string;
  nom: string;
  url: string;
  type: string;
  type_document?: string;
}

export async function downloadFileAsBlob(doc: Document): Promise<Blob | null> {
  try {
    // Si l'URL est une data URL (base64)
    if (doc.url.startsWith('data:')) {
      const base64Data = doc.url.split(',')[1];
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return new Blob([bytes], { type: doc.type });
    }

    // Sinon télécharger depuis le storage
    const { data, error } = await supabase.storage
      .from('client-documents')
      .download(doc.url);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error downloading file ${doc.nom}:`, error);
    return null;
  }
}

export function isSupported(doc: Document): boolean {
  const type = doc.type.toLowerCase();
  return type.includes('pdf') || type.includes('image/jpeg') || type.includes('image/jpg') || type.includes('image/png');
}

export async function imageToPdfPage(imageBlob: Blob): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  const imageBytes = await imageBlob.arrayBuffer();
  let image;
  
  if (imageBlob.type.includes('png')) {
    image = await pdfDoc.embedPng(imageBytes);
  } else {
    image = await pdfDoc.embedJpg(imageBytes);
  }
  
  // Taille A4 en points (72 points = 1 inch)
  const a4Width = 595.28;
  const a4Height = 841.89;
  
  // Calculer l'échelle pour que l'image tienne sur la page A4 avec des marges
  const margin = 40;
  const maxWidth = a4Width - (margin * 2);
  const maxHeight = a4Height - (margin * 2);
  
  const imgWidth = image.width;
  const imgHeight = image.height;
  
  let scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
  if (scale > 1) scale = 1; // Ne pas agrandir les petites images
  
  const scaledWidth = imgWidth * scale;
  const scaledHeight = imgHeight * scale;
  
  const page = pdfDoc.addPage([a4Width, a4Height]);
  
  // Centrer l'image sur la page
  const x = (a4Width - scaledWidth) / 2;
  const y = (a4Height - scaledHeight) / 2;
  
  page.drawImage(image, {
    x,
    y,
    width: scaledWidth,
    height: scaledHeight,
  });
  
  return await pdfDoc.save();
}

export async function mergeDocuments(
  documents: Document[],
  onProgress?: (current: number, total: number, status: string) => void
): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();
  const total = documents.length;
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    
    onProgress?.(i + 1, total, `Traitement de ${doc.nom}...`);
    
    if (!isSupported(doc)) {
      console.warn(`Skipping unsupported document: ${doc.nom}`);
      continue;
    }
    
    const blob = await downloadFileAsBlob(doc);
    if (!blob) {
      console.warn(`Failed to download: ${doc.nom}`);
      continue;
    }
    
    const arrayBuffer = await blob.arrayBuffer();
    
    try {
      let pdfBytes: ArrayBuffer | Uint8Array;
      
      if (doc.type.includes('pdf')) {
        pdfBytes = arrayBuffer;
      } else if (doc.type.includes('image')) {
        pdfBytes = await imageToPdfPage(blob);
      } else {
        continue;
      }
      
      const pdfToMerge = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
      
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    } catch (error) {
      console.error(`Error processing ${doc.nom}:`, error);
    }
  }
  
  onProgress?.(total, total, 'Finalisation du document...');
  
  const mergedPdfBytes = await mergedPdf.save();
  return new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
}

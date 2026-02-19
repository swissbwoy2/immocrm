import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';
import { getStoragePath } from '@/lib/documentUtils';

interface Document {
  id: string;
  nom: string;
  url: string;
  type: string;
  type_document?: string;
}

interface PersonDocuments {
  personName: string;
  personType: string; // 'client' | 'garant' | 'colocataire' | etc.
  documents: Document[];
}

// Classe d'erreur personnalisée pour identifier les documents problématiques
export class DocumentProcessingError extends Error {
  constructor(public documentName: string, public originalError: Error | unknown) {
    super(`Erreur lors du traitement de "${documentName}": ${originalError instanceof Error ? originalError.message : String(originalError)}`);
    this.name = 'DocumentProcessingError';
  }
}

// Résultat du téléchargement avec distinction fichier manquant vs autre erreur
export interface DownloadResult {
  blob: Blob | null;
  missing: boolean; // true si le fichier n'existe pas dans le storage
}

// Vérifier si un fichier existe dans le storage et le télécharger
export async function downloadFileAsBlobDetailed(doc: Document): Promise<DownloadResult> {
  try {
    if (doc.url.startsWith('data:')) {
      const base64Data = doc.url.split(',')[1];
      if (!base64Data) return { blob: null, missing: false };
      try {
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return { blob: new Blob([bytes], { type: doc.type }), missing: false };
      } catch {
        return { blob: null, missing: false };
      }
    }

    const storagePath = getStoragePath(doc.url);
    if (!storagePath) return { blob: null, missing: false };

    const { data: signedData, error: signedError } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(storagePath, 300);

    if (signedError) {
      // Détecter si c'est une erreur "objet introuvable"
      const errMsg = signedError.message?.toLowerCase() || '';
      const isMissing = errMsg.includes('not found') || errMsg.includes('object not found') || errMsg.includes('no such key');
      console.error(`Document "${doc.nom}" (${storagePath}): signed URL error:`, signedError.message);
      return { blob: null, missing: isMissing };
    }

    if (!signedData?.signedUrl) return { blob: null, missing: true };

    const response = await fetch(signedData.signedUrl);
    if (!response.ok) {
      const isMissing = response.status === 404;
      console.error(`Document "${doc.nom}": fetch ${response.status}`);
      return { blob: null, missing: isMissing };
    }

    return { blob: await response.blob(), missing: false };
  } catch (error) {
    console.error(`Error downloading file ${doc.nom}:`, error);
    return { blob: null, missing: false };
  }
}

export async function downloadFileAsBlob(doc: Document): Promise<Blob | null> {
  const result = await downloadFileAsBlobDetailed(doc);
  return result.blob;
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

// Créer une page de séparation entre les personnes
export async function createSeparatorPage(title: string, subtitle: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const a4Width = 595.28;
  const a4Height = 841.89;
  
  const page = pdfDoc.addPage([a4Width, a4Height]);
  
  // Fond avec bordure
  page.drawRectangle({
    x: 40,
    y: a4Height / 2 - 60,
    width: a4Width - 80,
    height: 120,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 2,
    color: rgb(0.95, 0.95, 0.95),
  });
  
  // Titre principal
  const titleSize = 24;
  const titleWidth = font.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (a4Width - titleWidth) / 2,
    y: a4Height / 2 + 20,
    size: titleSize,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  
  // Sous-titre
  const subtitleSize = 14;
  const subtitleWidth = regularFont.widthOfTextAtSize(subtitle, subtitleSize);
  page.drawText(subtitle, {
    x: (a4Width - subtitleWidth) / 2,
    y: a4Height / 2 - 20,
    size: subtitleSize,
    font: regularFont,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  return await pdfDoc.save();
}

// Créer une page de garde pour le dossier complet
export async function createCoverPage(
  mainTitle: string,
  persons: { name: string; type: string; docCount: number }[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const a4Width = 595.28;
  const a4Height = 841.89;
  
  const page = pdfDoc.addPage([a4Width, a4Height]);
  
  // Titre
  const titleSize = 28;
  const titleWidth = boldFont.widthOfTextAtSize(mainTitle, titleSize);
  page.drawText(mainTitle, {
    x: (a4Width - titleWidth) / 2,
    y: a4Height - 100,
    size: titleSize,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  
  // Ligne de séparation
  page.drawLine({
    start: { x: 100, y: a4Height - 130 },
    end: { x: a4Width - 100, y: a4Height - 130 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  
  // Liste des personnes
  let yPos = a4Height - 180;
  
  page.drawText('Contenu du dossier:', {
    x: 80,
    y: yPos,
    size: 16,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 40;
  
  persons.forEach((person, index) => {
    const typeLabels: Record<string, string> = {
      'client': '- Client principal',
      'garant': '- Garant',
      'colocataire': '- Colocataire',
      'co_debiteur': '- Co-debiteur',
      'signataire_solidaire': '- Signataire solidaire',
    };
    
    const typeLabel = typeLabels[person.type] || person.type;
    
    page.drawText(`${index + 1}. ${typeLabel}: ${person.name}`, {
      x: 100,
      y: yPos,
      size: 14,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
    });
    
    yPos -= 25;
    
    page.drawText(`     ${person.docCount} document${person.docCount > 1 ? 's' : ''}`, {
      x: 100,
      y: yPos,
      size: 12,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    yPos -= 35;
  });
  
  // Date de création
  const date = new Date().toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  
  page.drawText(`Créé le ${date}`, {
    x: 80,
    y: 60,
    size: 10,
    font: regularFont,
    color: rgb(0.6, 0.6, 0.6),
  });
  
  return await pdfDoc.save();
}

export interface MergeResult {
  blob: Blob;
  skippedDocuments: { name: string; reason: string }[];
  missingDocuments: { name: string; path: string }[];
  successCount: number;
}

export async function mergeDocuments(
  documents: Document[],
  onProgress?: (current: number, total: number, status: string) => void
): Promise<MergeResult> {
  const mergedPdf = await PDFDocument.create();
  const total = documents.length;
  const skippedDocuments: { name: string; reason: string }[] = [];
  const missingDocuments: { name: string; path: string }[] = [];
  let successCount = 0;
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    
    onProgress?.(i + 1, total, `Traitement de ${doc.nom}...`);
    
    if (!isSupported(doc)) {
      skippedDocuments.push({ name: doc.nom, reason: 'Format non supporté' });
      continue;
    }
    
    const result = await downloadFileAsBlobDetailed(doc);
    if (!result.blob) {
      if (result.missing) {
        const path = getStoragePath(doc.url);
        missingDocuments.push({ name: doc.nom, path });
        skippedDocuments.push({ name: doc.nom, reason: '⚠️ Fichier introuvable dans le stockage (re-upload requis)' });
      } else {
        skippedDocuments.push({ name: doc.nom, reason: 'Impossible de télécharger le fichier' });
      }
      continue;
    }
    
    try {
      let pdfBytes: ArrayBuffer | Uint8Array;
      if (doc.type.includes('pdf')) {
        pdfBytes = await result.blob.arrayBuffer();
      } else if (doc.type.includes('image')) {
        pdfBytes = await imageToPdfPage(result.blob);
      } else {
        skippedDocuments.push({ name: doc.nom, reason: 'Type de fichier non géré' });
        continue;
      }
      const pdfToMerge = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
      successCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      skippedDocuments.push({ name: doc.nom, reason: `PDF corrompu ou protégé: ${errorMessage.substring(0, 50)}` });
    }
  }
  
  if (successCount === 0) {
    const missingCount = missingDocuments.length;
    if (missingCount > 0) {
      throw new Error(
        `${missingCount} fichier${missingCount > 1 ? 's' : ''} introuvable${missingCount > 1 ? 's' : ''} dans le stockage :\n` +
        missingDocuments.map(d => `• ${d.name}`).join('\n') +
        '\n\nCes documents ont été supprimés du stockage et doivent être re-uploadés.'
      );
    }
    throw new DocumentProcessingError('Aucun document', new Error('Aucun document n\'a pu être traité. Vérifiez que les fichiers ne sont pas corrompus.'));
  }
  
  onProgress?.(total, total, 'Finalisation du document...');
  const mergedPdfBytes = await mergedPdf.save();
  return {
    blob: new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' }),
    skippedDocuments,
    missingDocuments,
    successCount,
  };
}

// Nouvelle fonction pour fusionner avec séparateurs par personne
export async function mergeDocumentsWithSeparators(
  personsDocuments: PersonDocuments[],
  options: {
    addSeparators?: boolean;
    addCoverPage?: boolean;
    mainTitle?: string;
  } = {},
  onProgress?: (current: number, total: number, status: string) => void
): Promise<MergeResult> {
  const { addSeparators = true, addCoverPage = true, mainTitle = 'Dossier complet' } = options;
  
  const mergedPdf = await PDFDocument.create();
  const skippedDocuments: { name: string; reason: string }[] = [];
  const missingDocuments: { name: string; path: string }[] = [];
  let successCount = 0;
  
  const totalDocs = personsDocuments.reduce((sum, p) => sum + p.documents.length, 0);
  let currentDoc = 0;
  
  if (addCoverPage) {
    onProgress?.(0, totalDocs, 'Création de la page de garde...');
    const coverPageBytes = await createCoverPage(
      mainTitle,
      personsDocuments.map(p => ({ name: p.personName, type: p.personType, docCount: p.documents.length }))
    );
    const coverPdf = await PDFDocument.load(coverPageBytes);
    const coverPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices());
    coverPages.forEach(page => mergedPdf.addPage(page));
  }
  
  for (const person of personsDocuments) {
    if (addSeparators && person.documents.length > 0) {
      onProgress?.(currentDoc, totalDocs, `Ajout séparateur: ${person.personName}...`);
      const typeLabels: Record<string, string> = {
        'client': 'CLIENT PRINCIPAL', 'garant': 'GARANT',
        'colocataire': 'COLOCATAIRE', 'co_debiteur': 'CO-DÉBITEUR',
        'signataire_solidaire': 'SIGNATAIRE SOLIDAIRE',
      };
      const separatorBytes = await createSeparatorPage(
        typeLabels[person.personType] || person.personType.toUpperCase(),
        person.personName
      );
      const separatorPdf = await PDFDocument.load(separatorBytes);
      const separatorPages = await mergedPdf.copyPages(separatorPdf, separatorPdf.getPageIndices());
      separatorPages.forEach(page => mergedPdf.addPage(page));
    }
    
    for (const doc of person.documents) {
      currentDoc++;
      onProgress?.(currentDoc, totalDocs, `Traitement de ${doc.nom}...`);
      
      if (!isSupported(doc)) {
        skippedDocuments.push({ name: doc.nom, reason: 'Format non supporté' });
        continue;
      }
      
      const dlResult = await downloadFileAsBlobDetailed(doc);
      if (!dlResult.blob) {
        if (dlResult.missing) {
          const path = getStoragePath(doc.url);
          missingDocuments.push({ name: doc.nom, path });
          skippedDocuments.push({ name: doc.nom, reason: '⚠️ Fichier introuvable dans le stockage (re-upload requis)' });
        } else {
          skippedDocuments.push({ name: doc.nom, reason: 'Impossible de télécharger le fichier' });
        }
        continue;
      }
      
      try {
        let pdfBytes: ArrayBuffer | Uint8Array;
        if (doc.type.includes('pdf')) {
          pdfBytes = await dlResult.blob.arrayBuffer();
        } else if (doc.type.includes('image')) {
          pdfBytes = await imageToPdfPage(dlResult.blob);
        } else {
          skippedDocuments.push({ name: doc.nom, reason: 'Type de fichier non géré' });
          continue;
        }
        const pdfToMerge = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        skippedDocuments.push({ name: doc.nom, reason: `PDF corrompu ou protégé: ${errorMessage.substring(0, 50)}` });
      }
    }
  }
  
  if (successCount === 0) {
    const missingCount = missingDocuments.length;
    if (missingCount > 0) {
      throw new Error(
        `${missingCount} fichier${missingCount > 1 ? 's' : ''} introuvable${missingCount > 1 ? 's' : ''} dans le stockage :\n` +
        missingDocuments.map(d => `• ${d.name}`).join('\n') +
        '\n\nCes documents ont été supprimés du stockage et doivent être re-uploadés par le client.'
      );
    }
    throw new DocumentProcessingError('Aucun document', new Error('Aucun document n\'a pu être traité. Vérifiez que les fichiers ne sont pas corrompus.'));
  }
  
  onProgress?.(totalDocs, totalDocs, 'Finalisation du document...');
  const mergedPdfBytes = await mergedPdf.save();
  return {
    blob: new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' }),
    skippedDocuments,
    missingDocuments,
    successCount,
  };
}

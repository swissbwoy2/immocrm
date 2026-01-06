import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';

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

export async function downloadFileAsBlob(doc: Document): Promise<Blob | null> {
  try {
    // Si l'URL est une data URL (base64)
    if (doc.url.startsWith('data:')) {
      // Vérifier la taille du base64 (éviter les fichiers trop volumineux qui peuvent crasher)
      const base64Data = doc.url.split(',')[1];
      if (!base64Data) {
        console.warn(`Document "${doc.nom}": URL base64 invalide`);
        return null;
      }
      
      // Limite de 50MB pour les base64 (environ 67MB encodé)
      const maxBase64Length = 67 * 1024 * 1024;
      if (base64Data.length > maxBase64Length) {
        console.warn(`Document "${doc.nom}": fichier base64 trop volumineux (${(base64Data.length / 1024 / 1024).toFixed(1)} MB encodé)`);
        return null;
      }
      
      try {
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        return new Blob([bytes], { type: doc.type });
      } catch (decodeError) {
        console.error(`Document "${doc.nom}": Erreur de décodage base64:`, decodeError);
        return null;
      }
    }

    // Si c'est une URL complète (http/https), télécharger via fetch
    if (doc.url.startsWith('http')) {
      try {
        const response = await fetch(doc.url);
        if (!response.ok) {
          console.error(`Document "${doc.nom}": Erreur HTTP ${response.status}`);
          return null;
        }
        return await response.blob();
      } catch (fetchError) {
        console.error(`Document "${doc.nom}": Erreur de téléchargement HTTP:`, fetchError);
        return null;
      }
    }

    // Sinon télécharger depuis le storage avec chemin relatif
    const { data, error } = await supabase.storage
      .from('client-documents')
      .download(doc.url);

    if (error) {
      console.error(`Document "${doc.nom}": Erreur de téléchargement depuis le storage:`, error);
      return null;
    }
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
  successCount: number;
}

export async function mergeDocuments(
  documents: Document[],
  onProgress?: (current: number, total: number, status: string) => void
): Promise<MergeResult> {
  const mergedPdf = await PDFDocument.create();
  const total = documents.length;
  const skippedDocuments: { name: string; reason: string }[] = [];
  let successCount = 0;
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    
    onProgress?.(i + 1, total, `Traitement de ${doc.nom}...`);
    
    if (!isSupported(doc)) {
      skippedDocuments.push({ name: doc.nom, reason: 'Format non supporté' });
      console.warn(`Skipping unsupported document: ${doc.nom}`);
      continue;
    }
    
    const blob = await downloadFileAsBlob(doc);
    if (!blob) {
      skippedDocuments.push({ name: doc.nom, reason: 'Impossible de télécharger le fichier' });
      console.warn(`Failed to download: ${doc.nom}`);
      continue;
    }
    
    try {
      const arrayBuffer = await blob.arrayBuffer();
      let pdfBytes: ArrayBuffer | Uint8Array;
      
      if (doc.type.includes('pdf')) {
        pdfBytes = arrayBuffer;
      } else if (doc.type.includes('image')) {
        pdfBytes = await imageToPdfPage(blob);
      } else {
        skippedDocuments.push({ name: doc.nom, reason: 'Type de fichier non géré' });
        continue;
      }
      
      const pdfToMerge = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
      
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
      successCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      skippedDocuments.push({ name: doc.nom, reason: `PDF corrompu ou protégé: ${errorMessage.substring(0, 50)}` });
      console.error(`Error processing ${doc.nom}:`, error);
    }
  }
  
  if (successCount === 0) {
    throw new DocumentProcessingError('Aucun document', new Error('Aucun document n\'a pu être traité. Vérifiez que les fichiers ne sont pas corrompus.'));
  }
  
  onProgress?.(total, total, 'Finalisation du document...');
  
  const mergedPdfBytes = await mergedPdf.save();
  return {
    blob: new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' }),
    skippedDocuments,
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
  let successCount = 0;
  
  // Calculer le total de documents
  const totalDocs = personsDocuments.reduce((sum, p) => sum + p.documents.length, 0);
  let currentDoc = 0;
  
  // Ajouter la page de garde
  if (addCoverPage) {
    onProgress?.(0, totalDocs, 'Création de la page de garde...');
    
    const coverPageBytes = await createCoverPage(
      mainTitle,
      personsDocuments.map(p => ({
        name: p.personName,
        type: p.personType,
        docCount: p.documents.length,
      }))
    );
    
    const coverPdf = await PDFDocument.load(coverPageBytes);
    const coverPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices());
    coverPages.forEach(page => mergedPdf.addPage(page));
  }
  
  // Traiter chaque personne
  for (let personIndex = 0; personIndex < personsDocuments.length; personIndex++) {
    const person = personsDocuments[personIndex];
    
    // Ajouter une page de séparation
    if (addSeparators && person.documents.length > 0) {
      onProgress?.(currentDoc, totalDocs, `Ajout séparateur: ${person.personName}...`);
      
      const typeLabels: Record<string, string> = {
        'client': 'CLIENT PRINCIPAL',
        'garant': 'GARANT',
        'colocataire': 'COLOCATAIRE',
        'co_debiteur': 'CO-DÉBITEUR',
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
    
    // Ajouter les documents de cette personne
    for (const doc of person.documents) {
      currentDoc++;
      onProgress?.(currentDoc, totalDocs, `Traitement de ${doc.nom}...`);
      
      if (!isSupported(doc)) {
        skippedDocuments.push({ name: doc.nom, reason: 'Format non supporté' });
        console.warn(`Skipping unsupported document: ${doc.nom}`);
        continue;
      }
      
      const blob = await downloadFileAsBlob(doc);
      if (!blob) {
        skippedDocuments.push({ name: doc.nom, reason: 'Impossible de télécharger le fichier' });
        console.warn(`Failed to download: ${doc.nom}`);
        continue;
      }
      
      try {
        const arrayBuffer = await blob.arrayBuffer();
        let pdfBytes: ArrayBuffer | Uint8Array;
        
        if (doc.type.includes('pdf')) {
          pdfBytes = arrayBuffer;
        } else if (doc.type.includes('image')) {
          pdfBytes = await imageToPdfPage(blob);
        } else {
          skippedDocuments.push({ name: doc.nom, reason: 'Type de fichier non géré' });
          continue;
        }
        
        const pdfToMerge = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
        
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        skippedDocuments.push({ name: doc.nom, reason: `PDF corrompu ou protégé: ${errorMessage.substring(0, 50)}` });
        console.error(`Error processing ${doc.nom}:`, error);
      }
    }
  }
  
  if (successCount === 0) {
    throw new DocumentProcessingError('Aucun document', new Error('Aucun document n\'a pu être traité. Vérifiez que les fichiers ne sont pas corrompus.'));
  }
  
  onProgress?.(totalDocs, totalDocs, 'Finalisation du document...');
  
  const mergedPdfBytes = await mergedPdf.save();
  return {
    blob: new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' }),
    skippedDocuments,
    successCount,
  };
}

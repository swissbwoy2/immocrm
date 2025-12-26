import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PDFDocument } from 'pdf-lib';

interface AssemblyProgress {
  step: string;
  current: number;
  total: number;
  percent: number;
}

interface DocumentInfo {
  id: string;
  nom: string;
  url: string;
  type: string;
  candidate_id?: string;
  candidate_name?: string;
}

export function useFullMandatAssembler() {
  const [isAssembling, setIsAssembling] = useState(false);
  const [progress, setProgress] = useState<AssemblyProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extractStoragePath = (url: string): string => {
    if (!url) return url;
    if (!url.startsWith('http')) return url;
    
    const patterns = [
      /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/,
      /\/storage\/v1\/object\/sign\/[^/]+\/(.+)\?/,
      /\/storage\/v1\/object\/authenticated\/[^/]+\/(.+)$/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    const parts = url.split('/client-documents/');
    if (parts.length > 1) return parts[1].split('?')[0];
    
    return url;
  };

  const assembleFullMandat = useCallback(async (clientId: string, clientName: string) => {
    setIsAssembling(true);
    setProgress({ step: 'Initialisation...', current: 0, total: 1, percent: 0 });
    setError(null);

    try {
      // Step 1: Generate core PDF (without identity documents)
      setProgress({ step: 'Génération du contrat de base...', current: 0, total: 1, percent: 5 });
      
      const { data: coreData, error: coreError } = await supabase.functions.invoke('generate-full-mandat-pdf', {
        body: { client_id: clientId, core_only: true }
      });
      
      if (coreError) throw new Error(`Erreur génération: ${coreError.message}`);
      if (!coreData?.pdf_base64) throw new Error('Aucun PDF retourné');
      
      // Load core PDF
      const coreBytes = Uint8Array.from(atob(coreData.pdf_base64), c => c.charCodeAt(0));
      const finalPdf = await PDFDocument.load(coreBytes);
      
      // Step 2: Fetch identity documents to embed
      setProgress({ step: 'Récupération des documents...', current: 0, total: 1, percent: 15 });
      
      // Get client documents
      const { data: clientDocs } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId)
        .in('type_document', ['piece_identite', 'identite', 'passeport', 'permis_sejour']);
      
      // Get candidates
      const { data: candidates } = await supabase
        .from('client_candidates')
        .select('id, nom, prenom')
        .eq('client_id', clientId);
      
      // Get candidate documents
      let candidateDocs: any[] = [];
      if (candidates && candidates.length > 0) {
        const candidateIds = candidates.map(c => c.id);
        const { data: candDocs } = await supabase
          .from('documents')
          .select('*')
          .in('candidate_id', candidateIds)
          .in('type_document', ['piece_identite', 'identite', 'passeport', 'permis_sejour']);
        
        if (candDocs) {
          candidateDocs = candDocs.map(doc => {
            const candidate = candidates.find(c => c.id === doc.candidate_id);
            return {
              ...doc,
              candidate_name: candidate ? `${candidate.prenom} ${candidate.nom}` : 'Candidat'
            };
          });
        }
      }
      
      const allDocs: DocumentInfo[] = [
        ...(clientDocs || []).map(d => ({ ...d, candidate_name: undefined })),
        ...candidateDocs
      ].filter(d => d.url);
      
      if (allDocs.length === 0) {
        // No documents to add, just download the core PDF
        setProgress({ step: 'Finalisation...', current: 1, total: 1, percent: 100 });
        downloadPdf(coreBytes, `Mandat_Complet_${clientName}.pdf`);
        setIsAssembling(false);
        setProgress(null);
        return { success: true, pagesAdded: 0 };
      }
      
      // Step 3: Embed each document
      let totalPagesAdded = 0;
      const MAX_PAGES_PER_DOC = 30;
      
      for (let i = 0; i < allDocs.length; i++) {
        const doc = allDocs[i];
        const progressPercent = 20 + ((i / allDocs.length) * 75);
        const docLabel = doc.candidate_name 
          ? `${doc.nom} (${doc.candidate_name})`
          : doc.nom;
        
        setProgress({ 
          step: `Intégration: ${docLabel}`, 
          current: i + 1, 
          total: allDocs.length, 
          percent: progressPercent 
        });
        
        try {
          const storagePath = extractStoragePath(doc.url);
          console.log(`Downloading document: ${doc.nom}, path: ${storagePath}`);
          
          const { data: fileData, error: fetchError } = await supabase.storage
            .from('client-documents')
            .download(storagePath);
          
          if (fetchError || !fileData) {
            console.warn(`Could not download ${doc.nom}:`, fetchError?.message);
            continue;
          }
          
          const fileBytes = new Uint8Array(await fileData.arrayBuffer());
          const mimeType = doc.type?.toLowerCase() || '';
          const isImage = mimeType.includes('image/png') || mimeType.includes('image/jpeg') || mimeType.includes('image/jpg');
          const isPdf = mimeType.includes('application/pdf') || doc.nom?.toLowerCase().endsWith('.pdf');
          
          if (isPdf) {
            // Embed all pages from PDF (up to MAX_PAGES_PER_DOC)
            try {
              const externalPdf = await PDFDocument.load(fileBytes);
              const totalPages = externalPdf.getPageCount();
              const pagesToCopy = Math.min(totalPages, MAX_PAGES_PER_DOC);
              const pageIndices = externalPdf.getPageIndices().slice(0, pagesToCopy);
              
              const copiedPages = await finalPdf.copyPages(externalPdf, pageIndices);
              for (const page of copiedPages) {
                finalPdf.addPage(page);
                totalPagesAdded++;
              }
              
              console.log(`Embedded PDF ${doc.nom}: ${pagesToCopy}/${totalPages} pages`);
            } catch (pdfError) {
              console.error(`Error embedding PDF ${doc.nom}:`, pdfError);
            }
          } else if (isImage) {
            // Embed image as a full page
            try {
              let embeddedImage;
              if (mimeType.includes('png')) {
                embeddedImage = await finalPdf.embedPng(fileBytes);
              } else {
                embeddedImage = await finalPdf.embedJpg(fileBytes);
              }
              
              // Create page with image dimensions (A4-ish proportions)
              const pageWidth = 595;
              const pageHeight = 842;
              const margin = 50;
              const maxWidth = pageWidth - 2 * margin;
              const maxHeight = pageHeight - 2 * margin;
              
              let imgWidth = embeddedImage.width;
              let imgHeight = embeddedImage.height;
              
              // Scale to fit
              const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
              imgWidth *= scale;
              imgHeight *= scale;
              
              const page = finalPdf.addPage([pageWidth, pageHeight]);
              page.drawImage(embeddedImage, {
                x: (pageWidth - imgWidth) / 2,
                y: (pageHeight - imgHeight) / 2,
                width: imgWidth,
                height: imgHeight,
              });
              
              totalPagesAdded++;
              console.log(`Embedded image ${doc.nom}`);
            } catch (imgError) {
              console.error(`Error embedding image ${doc.nom}:`, imgError);
            }
          }
        } catch (docError) {
          console.error(`Error processing document ${doc.nom}:`, docError);
        }
      }
      
      // Step 4: Save and download
      setProgress({ step: 'Finalisation du PDF...', current: allDocs.length, total: allDocs.length, percent: 98 });
      
      const finalBytes = await finalPdf.save();
      console.log(`Final PDF size: ${finalBytes.length} bytes, ${totalPagesAdded} pages added`);
      
      downloadPdf(finalBytes, `Mandat_Complet_${clientName}.pdf`);
      
      setProgress({ step: 'Terminé!', current: allDocs.length, total: allDocs.length, percent: 100 });
      
      // Reset after a short delay
      setTimeout(() => {
        setIsAssembling(false);
        setProgress(null);
      }, 1000);
      
      return { success: true, pagesAdded: totalPagesAdded };
      
    } catch (err: any) {
      console.error('Assembly error:', err);
      setError(err.message || 'Erreur lors de l\'assemblage');
      setIsAssembling(false);
      setProgress(null);
      return { success: false, error: err.message };
    }
  }, []);

  const downloadPdf = (bytes: Uint8Array, filename: string) => {
    // Convert Uint8Array to a regular ArrayBuffer for Blob compatibility
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    assembleFullMandat,
    isAssembling,
    progress,
    error
  };
}

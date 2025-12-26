import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface FormField {
  label: string;
  value: string;
  confidence: number;
  source?: string;
  field_name?: string; // Technical PDF field name for direct mapping
}

export interface AIFormResult {
  fields: FormField[];
  warnings: string[];
  suggestions: string[];
  pdfBytes?: Uint8Array; // Store original PDF bytes for filling
}

export interface ClientDataForAI {
  profile: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
  };
  client: {
    date_naissance?: string;
    nationalite?: string;
    type_permis?: string;
    etat_civil?: string;
    profession?: string;
    employeur?: string;
    revenus_mensuels?: number;
    adresse?: string;
    loyer_actuel?: number;
    depuis_le?: string;
    gerance_actuelle?: string;
    contact_gerance?: string;
    motif_changement?: string;
    nombre_occupants?: number;
    animaux?: boolean;
    vehicules?: boolean;
    numero_plaques?: string;
    poursuites?: boolean;
    curatelle?: boolean;
  };
  candidates: Array<{
    type: string;
    nom: string;
    prenom: string;
    date_naissance?: string;
    nationalite?: string;
    type_permis?: string;
    profession?: string;
    employeur?: string;
    revenus_mensuels?: number;
    email?: string;
    telephone?: string;
    lien_avec_client?: string;
  }>;
}

export interface OffreDataForAI {
  id: string;
  adresse?: string;
  prix?: number;
  pieces?: number;
  surface?: number;
  etage?: string;
  type_bien?: string;
  disponibilite?: string;
  code_immeuble?: string;
  concierge_nom?: string;
  concierge_tel?: string;
  locataire_actuel?: string;
}

export function useAIFormFiller() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{ step: string; percent: number }>({ step: '', percent: 0 });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIFormResult | null>(null);
  const [originalPdfBytes, setOriginalPdfBytes] = useState<Uint8Array | null>(null);
  const [storedClientData, setStoredClientData] = useState<ClientDataForAI | null>(null);
  const [storedOffreData, setStoredOffreData] = useState<OffreDataForAI | null>(null);
  
  // Use ref for synchronous access to PDF bytes (avoids stale state in callbacks)
  const pdfBytesRef = useRef<Uint8Array | null>(null);

  // Extract text from PDF
  const extractPdfText = useCallback(async (pdfBytes: Uint8Array): Promise<string> => {
    // Important: PDF.js may detach the underlying ArrayBuffer when using workers.
    // Always pass a copy so we don't mutate the original bytes used later for pdf-lib filling.
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    
    return fullText;
  }, []);

  // Fill PDF form with values from AI analysis (AcroForm fields)
  const fillPdfForm = useCallback(async (
    pdfBytes: Uint8Array,
    fields: FormField[]
  ): Promise<{ filledPdfBytes: Uint8Array; filledCount: number; totalFields: number }> => {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const pdfFields = form.getFields();
    
    let filledCount = 0;
    const totalFields = pdfFields.length;

    console.log(`PDF has ${totalFields} AcroForm fields`);

    // Embed a standard font for field appearances
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Create a map of PDF field names (lowercase) for matching
    const pdfFieldMap = new Map<string, any>();
    pdfFields.forEach(field => {
      const name = field.getName().toLowerCase().trim();
      pdfFieldMap.set(name, field);
      console.log(`PDF field: "${field.getName()}" (type: ${field.constructor.name})`);
    });

    // Try to fill each field from AI analysis
    for (const aiField of fields) {
      if (!aiField.value || aiField.value === 'N/A' || aiField.value === '—') continue;

      // Try different matching strategies
      let matched = false;
      const searchTerms = [
        aiField.field_name?.toLowerCase().trim(),
        aiField.label?.toLowerCase().trim(),
        // Generate variations
        aiField.label?.toLowerCase().replace(/[^a-z0-9]/g, ''),
        aiField.label?.toLowerCase().replace(/\s+/g, '_'),
      ].filter(Boolean);

      for (const [pdfFieldName, pdfField] of pdfFieldMap.entries()) {
        for (const searchTerm of searchTerms) {
          if (!searchTerm) continue;
          
          // Check for exact or partial match
          if (pdfFieldName === searchTerm || 
              pdfFieldName.includes(searchTerm) || 
              searchTerm.includes(pdfFieldName)) {
            try {
              const fieldType = pdfField.constructor.name;
              
              if (fieldType === 'PDFTextField') {
                pdfField.setText(aiField.value);
                filledCount++;
                matched = true;
                console.log(`Filled text field "${pdfField.getName()}" with "${aiField.value}"`);
              } else if (fieldType === 'PDFCheckBox') {
                const isChecked = aiField.value.toLowerCase() === 'oui' || 
                                  aiField.value === '☑' ||
                                  aiField.value.toLowerCase() === 'true';
                if (isChecked) {
                  pdfField.check();
                } else {
                  pdfField.uncheck();
                }
                filledCount++;
                matched = true;
                console.log(`Set checkbox "${pdfField.getName()}" to ${isChecked}`);
              } else if (fieldType === 'PDFDropdown') {
                try {
                  pdfField.select(aiField.value);
                  filledCount++;
                  matched = true;
                  console.log(`Selected dropdown "${pdfField.getName()}" value "${aiField.value}"`);
                } catch {
                  // Value might not be in options
                  console.log(`Could not select "${aiField.value}" in dropdown "${pdfField.getName()}"`);
                }
              }
              
              if (matched) break;
            } catch (err) {
              console.warn(`Error filling field ${pdfField.getName()}:`, err);
            }
          }
        }
        if (matched) break;
      }
    }

    // Update field appearances with the embedded font so values are visible
    try {
      form.updateFieldAppearances(font);
      console.log('Updated field appearances with embedded font');
    } catch (err) {
      console.warn('Could not update field appearances:', err);
    }

    // Flatten the form to ensure visibility in all PDF readers
    try {
      form.flatten();
      console.log('Form flattened for universal visibility');
    } catch (err) {
      console.warn('Could not flatten form:', err);
    }

    const filledPdfBytes = await pdfDoc.save();
    return { 
      filledPdfBytes: new Uint8Array(filledPdfBytes), 
      filledCount, 
      totalFields 
    };
  }, []);

  // Generate PDF using universal template (coordinate-based drawing)
  const generateUniversalTemplatePdf = useCallback(async (
    fields: FormField[],
    clientData: ClientDataForAI | null,
    offreData: OffreDataForAI | null
  ): Promise<Uint8Array> => {
    // Fetch the universal template
    const templateResponse = await fetch('/templates/demande-location-habitation.pdf');
    const templateBytes = await templateResponse.arrayBuffer();
    
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const page1 = pages[0];
    const page2 = pages.length > 1 ? pages[1] : page1;
    const { height } = page1.getSize();
    
    const fontSize = 9;
    const smallFontSize = 8;
    
    // Helper function to draw text
    const drawText = (page: any, text: string, x: number, y: number, size = fontSize) => {
      page.drawText(text || '', {
        x,
        y: height - y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
    };

    // Build a data map from AI fields + client/offre data
    const dataMap: Record<string, string> = {};
    
    // Map AI fields by label (lowercase)
    fields.forEach(f => {
      if (f.value && f.value !== 'N/A' && f.value !== '—') {
        const key = f.label.toLowerCase().trim();
        dataMap[key] = f.value;
        // Also map by field_name if present
        if (f.field_name) {
          dataMap[f.field_name.toLowerCase().trim()] = f.value;
        }
      }
    });

    // Helper to find value by multiple possible keys
    const findValue = (...keys: string[]): string => {
      for (const key of keys) {
        const val = dataMap[key.toLowerCase()];
        if (val) return val;
      }
      return '';
    };

    // Pre-fill from client data
    const profile = clientData?.profile;
    const client = clientData?.client;
    const conjoint = clientData?.candidates?.find(c => c.type === 'conjoint' || c.type === 'colocataire');
    const today = new Date().toISOString().split('T')[0];

    // Build form values with fallbacks
    const nom = findValue('nom', 'name', 'nom de famille') || profile?.nom || '';
    const prenom = findValue('prénom', 'prenom', 'first name') || profile?.prenom || '';
    const dateNaissance = findValue('date de naissance', 'date_naissance', 'né(e) le') || client?.date_naissance || '';
    const nationalite = findValue('nationalité', 'nationalite', 'nationality') || client?.nationalite || '';
    const permis = findValue('permis', 'type de permis', 'autorisation de séjour') || client?.type_permis || '';
    const etatCivil = findValue('état civil', 'etat_civil', 'situation familiale') || client?.etat_civil || '';
    const profession = findValue('profession', 'métier', 'activité') || client?.profession || '';
    const employeur = findValue('employeur', 'entreprise', 'société') || client?.employeur || '';
    const salaire = findValue('salaire', 'revenus', 'revenu mensuel', 'salaire brut') || client?.revenus_mensuels?.toString() || '';
    const adresse = findValue('adresse', 'adresse actuelle', 'domicile') || client?.adresse || '';
    const telephone = findValue('téléphone', 'telephone', 'mobile', 'tel') || profile?.telephone || '';
    const email = findValue('email', 'e-mail', 'courriel') || profile?.email || '';
    const geranceActuelle = findValue('gérance actuelle', 'régie actuelle', 'propriétaire actuel') || client?.gerance_actuelle || '';
    const telGerance = findValue('téléphone gérance', 'contact gérance') || client?.contact_gerance || '';
    const depuisLe = findValue('depuis le', 'date entrée', 'locataire depuis') || client?.depuis_le || '';
    const loyerActuel = findValue('loyer actuel', 'loyer mensuel actuel') || client?.loyer_actuel?.toString() || '';
    const motifChangement = findValue('motif', 'motif de changement', 'raison du déménagement') || client?.motif_changement || '';

    // Offre data
    const adresseBien = findValue('adresse du bien', 'adresse logement') || offreData?.adresse || '';
    const nombrePieces = findValue('pièces', 'nombre de pièces') || offreData?.pieces?.toString() || '';
    const surface = findValue('surface', 'm²', 'superficie') || offreData?.surface?.toString() || '';
    const etage = findValue('étage', 'etage') || offreData?.etage || '';
    const loyerNet = findValue('loyer net', 'loyer', 'prix') || offreData?.prix?.toString() || '';
    const disponibilite = findValue('disponible dès', 'disponibilité', 'date disponibilité') || offreData?.disponibilite || '';

    // Conjoint data
    const conjointNom = findValue('nom conjoint', 'nom du conjoint') || conjoint?.nom || '';
    const conjointPrenom = findValue('prénom conjoint', 'prénom du conjoint') || conjoint?.prenom || '';
    const conjointDateNaissance = conjoint?.date_naissance || '';
    const conjointNationalite = conjoint?.nationalite || '';
    const conjointPermis = conjoint?.type_permis || '';

    // Boolean values
    const animaux = client?.animaux;
    const vehicules = client?.vehicules;
    const numerosPlaques = findValue('plaques', 'numéro de plaques', 'immatriculation') || client?.numero_plaques || '';
    const poursuites = client?.poursuites;
    const curatelle = client?.curatelle;

    // Page 1 - Header info
    drawText(page1, today, 480, 102);
    
    // Property info
    drawText(page1, adresseBien, 85, 138);
    drawText(page1, nombrePieces, 280, 138);
    drawText(page1, surface, 420, 138);
    drawText(page1, etage, 280, 155);
    drawText(page1, disponibilite, 420, 155);
    
    // Rent info
    drawText(page1, loyerNet, 85, 185);
    drawText(page1, loyerNet, 500, 185); // total
    
    // Locataire principal
    drawText(page1, nom, 85, 225);
    drawText(page1, prenom, 300, 225);
    drawText(page1, dateNaissance, 85, 242);
    drawText(page1, `${nationalite} / ${permis}`, 300, 242);
    drawText(page1, etatCivil, 85, 259);
    
    // Conjoint
    if (conjointNom || conjointPrenom) {
      drawText(page1, conjointNom, 85, 300);
      drawText(page1, conjointPrenom, 300, 300);
      drawText(page1, conjointDateNaissance, 85, 317);
      drawText(page1, `${conjointNationalite} / ${conjointPermis}`, 300, 317);
    }
    
    // Address and employment
    drawText(page1, adresse, 85, 375);
    drawText(page1, profession, 85, 392);
    drawText(page1, employeur, 300, 392);
    drawText(page1, `CHF ${salaire}`, 300, 409);
    drawText(page1, telephone, 85, 443);
    drawText(page1, email, 300, 443);
    
    // Current management
    drawText(page1, geranceActuelle, 85, 485);
    drawText(page1, telGerance, 85, 502);
    drawText(page1, depuisLe, 300, 502);
    drawText(page1, `CHF ${loyerActuel}`, 85, 519);
    
    // Signature location and date
    drawText(page1, 'Lausanne', 75, 565);
    drawText(page1, today, 75, 582);

    // Page 2 - Questions (if exists)
    if (pages.length > 1) {
      // Poursuites
      if (poursuites === true) drawText(page2, 'X', 268, 108, smallFontSize);
      if (poursuites === false) drawText(page2, 'X', 298, 108, smallFontSize);
      
      // Curatelle
      if (curatelle === true) drawText(page2, 'X', 268, 138, smallFontSize);
      if (curatelle === false) drawText(page2, 'X', 298, 138, smallFontSize);
      
      // Motif changement
      drawText(page2, motifChangement.substring(0, 60), 85, 168, smallFontSize);
      
      // Animaux
      if (animaux === true) drawText(page2, 'X', 268, 275, smallFontSize);
      if (animaux === false) drawText(page2, 'X', 298, 275, smallFontSize);
      
      // Véhicules
      if (vehicules === true) drawText(page2, 'X', 268, 375, smallFontSize);
      if (vehicules === false) drawText(page2, 'X', 298, 375, smallFontSize);
      drawText(page2, numerosPlaques, 85, 395, smallFontSize);
    }

    const pdfBytes = await pdfDoc.save();
    return new Uint8Array(pdfBytes);
  }, []);

  // Fetch client data with candidates
  const fetchClientData = useCallback(async (clientId: string): Promise<ClientDataForAI | null> => {
    // Fetch profile
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*, profiles!clients_user_id_fkey(*)')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData) {
      console.error('Error fetching client:', clientError);
      return null;
    }

    // Fetch candidates
    const { data: candidates, error: candidatesError } = await supabase
      .from('client_candidates')
      .select('*')
      .eq('client_id', clientId);

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
    }

    const profile = clientData.profiles as any;

    return {
      profile: {
        nom: profile?.nom || '',
        prenom: profile?.prenom || '',
        email: profile?.email || '',
        telephone: profile?.telephone || '',
      },
      client: {
        date_naissance: clientData.date_naissance,
        nationalite: clientData.nationalite,
        type_permis: clientData.type_permis,
        etat_civil: clientData.etat_civil,
        profession: clientData.profession,
        employeur: clientData.employeur,
        revenus_mensuels: clientData.revenus_mensuels,
        adresse: clientData.adresse,
        loyer_actuel: clientData.loyer_actuel,
        depuis_le: clientData.depuis_le,
        gerance_actuelle: clientData.gerance_actuelle,
        contact_gerance: clientData.contact_gerance,
        motif_changement: clientData.motif_changement,
        nombre_occupants: clientData.nombre_occupants,
        animaux: clientData.animaux,
        vehicules: clientData.vehicules,
        numero_plaques: clientData.numero_plaques,
        poursuites: clientData.poursuites,
        curatelle: clientData.curatelle,
      },
      candidates: (candidates || []).map(c => ({
        type: c.type,
        nom: c.nom,
        prenom: c.prenom,
        date_naissance: c.date_naissance,
        nationalite: c.nationalite,
        type_permis: c.type_permis,
        profession: c.profession,
        employeur: c.employeur,
        revenus_mensuels: c.revenus_mensuels,
        email: c.email,
        telephone: c.telephone,
        lien_avec_client: c.lien_avec_client,
      })),
    };
  }, []);

  // Fetch offre data
  const fetchOffreData = useCallback(async (offreId: string): Promise<OffreDataForAI | null> => {
    const { data: offreData, error: offreError } = await supabase
      .from('offres')
      .select('*')
      .eq('id', offreId)
      .single();

    if (offreError || !offreData) {
      console.error('Error fetching offre:', offreError);
      return null;
    }

    return {
      id: offreData.id,
      adresse: offreData.adresse,
      prix: offreData.prix,
      pieces: offreData.pieces,
      surface: offreData.surface,
      etage: offreData.etage,
      type_bien: offreData.type_bien,
      disponibilite: offreData.disponibilite,
      code_immeuble: offreData.code_immeuble,
      concierge_nom: offreData.concierge_nom,
      concierge_tel: offreData.concierge_tel,
      locataire_actuel: offreData.locataire_nom,
    };
  }, []);

  // Main analyze function
  const analyzeAndFill = useCallback(async (
    pdfFile: File | Uint8Array,
    clientId: string,
    offreId?: string
  ): Promise<AIFormResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress({ step: 'Chargement du PDF...', percent: 10 });

    try {
      // Get PDF bytes
      let pdfBytes: Uint8Array;
      if (pdfFile instanceof File) {
        const arrayBuffer = await pdfFile.arrayBuffer();
        pdfBytes = new Uint8Array(arrayBuffer);
      } else {
        pdfBytes = pdfFile;
      }

      // Keep a dedicated copy for filling (PDF.js can detach/consume the buffer used for text extraction)
      const pdfBytesForFilling = pdfBytes.slice();

      // Store original PDF bytes for later filling (both ref and state)
      pdfBytesRef.current = pdfBytesForFilling;
      setOriginalPdfBytes(pdfBytesForFilling);
      console.log(
        'PDF bytes stored (for filling), length:',
        pdfBytesForFilling.length,
        'header:',
        String.fromCharCode(...pdfBytesForFilling.slice(0, 5))
      );

      setProgress({ step: 'Extraction du texte...', percent: 20 });

      // Extract text from PDF (extractPdfText() uses its own copy internally)
      const pdfText = await extractPdfText(pdfBytes);
      console.log('Extracted PDF text length:', pdfText.length);

      setProgress({ step: 'Récupération des données client...', percent: 35 });

      // Fetch client data
      const clientData = await fetchClientData(clientId);
      if (!clientData) {
        throw new Error('Impossible de récupérer les données du client');
      }
      setStoredClientData(clientData);

      // Fetch offre data if provided
      let offreData: OffreDataForAI | null = null;
      if (offreId) {
        setProgress({ step: 'Récupération des données de l\'offre...', percent: 50 });
        offreData = await fetchOffreData(offreId);
        setStoredOffreData(offreData);
      }

      setProgress({ step: 'Analyse IA en cours...', percent: 65 });

      // Call the AI edge function
      const { data, error: funcError } = await supabase.functions.invoke('fill-rental-form-ai', {
        body: { pdfText, clientData, offreData }
      });

      if (funcError) {
        throw new Error(funcError.message || 'Erreur lors de l\'analyse IA');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setProgress({ step: 'Analyse terminée!', percent: 100 });

      const formResult: AIFormResult = {
        fields: data.fields || [],
        warnings: data.warnings || [],
        suggestions: data.suggestions || [],
        pdfBytes: pdfBytesRef.current || undefined,
      };

      setResult(formResult);
      return formResult;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      console.error('AI form fill error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [extractPdfText, fetchClientData, fetchOffreData]);

  // Generate filled PDF and return bytes
  const generateFilledPdf = useCallback(async (): Promise<{ 
    filledPdfBytes: Uint8Array; 
    filledCount: number; 
    totalFields: number 
  } | null> => {
    // Prefer bytes stored on the result (dedicated copy), fallback to ref.
    const bytes = result?.pdfBytes ?? pdfBytesRef.current;

    if (!bytes || bytes.length === 0) {
      console.error('No PDF bytes available for filling, length:', bytes?.length);
      return null;
    }

    // Verify PDF header
    const header = String.fromCharCode(...bytes.slice(0, 5));
    console.log(
      'generateFilledPdf - PDF header check:',
      header,
      'bytes length:',
      bytes.length,
      'source:',
      result?.pdfBytes ? 'result.pdfBytes' : 'pdfBytesRef'
    );

    if (!header.startsWith('%PDF')) {
      console.error('Invalid PDF header:', header);
      return null;
    }

    if (!result) {
      console.error('No result available');
      return null;
    }

    try {
      const fillResult = await fillPdfForm(bytes, result.fields);
      return fillResult;
    } catch (err) {
      console.error('Error generating filled PDF:', err);
      return null;
    }
  }, [result, fillPdfForm]);

  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setProgress({ step: '', percent: 0 });
    setError(null);
    setResult(null);
    setOriginalPdfBytes(null);
    setStoredClientData(null);
    setStoredOffreData(null);
    pdfBytesRef.current = null;
  }, []);

  return {
    isAnalyzing,
    progress,
    error,
    result,
    originalPdfBytes,
    storedClientData,
    storedOffreData,
    analyzeAndFill,
    generateFilledPdf,
    generateUniversalTemplatePdf,
    fillPdfForm,
    reset,
    fetchClientData,
    fetchOffreData,
  };
}

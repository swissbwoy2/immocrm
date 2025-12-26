import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface FormField {
  label: string;
  value: string;
  confidence: number;
  source?: string;
}

export interface AIFormResult {
  fields: FormField[];
  warnings: string[];
  suggestions: string[];
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

  // Extract text from PDF
  const extractPdfText = useCallback(async (pdfBytes: Uint8Array): Promise<string> => {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
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

      setProgress({ step: 'Extraction du texte...', percent: 20 });

      // Extract text from PDF
      const pdfText = await extractPdfText(pdfBytes);
      console.log('Extracted PDF text length:', pdfText.length);

      setProgress({ step: 'Récupération des données client...', percent: 35 });

      // Fetch client data
      const clientData = await fetchClientData(clientId);
      if (!clientData) {
        throw new Error('Impossible de récupérer les données du client');
      }

      // Fetch offre data if provided
      let offreData: OffreDataForAI | null = null;
      if (offreId) {
        setProgress({ step: 'Récupération des données de l\'offre...', percent: 50 });
        offreData = await fetchOffreData(offreId);
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

  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setProgress({ step: '', percent: 0 });
    setError(null);
    setResult(null);
  }, []);

  return {
    isAnalyzing,
    progress,
    error,
    result,
    analyzeAndFill,
    reset,
    fetchClientData,
    fetchOffreData,
  };
}

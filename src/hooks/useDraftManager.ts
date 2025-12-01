import { useState, useEffect, useCallback } from 'react';
import { AttachmentData } from '@/components/OfferAttachmentUploader';

const DRAFTS_KEY = 'envoyer-offre-drafts';

export interface OfferFormData {
  clientId: string;
  localisation: string;
  prix: string;
  surface: string;
  nombrePieces: string;
  description: string;
  etage: string;
  disponibilite: string;
  etageVisite: string;
  codeImmeuble: string;
  locataireNom: string;
  locataireTel: string;
  conciergeNom: string;
  conciergeTel: string;
  commentaires: string;
  lienAnnonce: string;
  datesVisite: string[];
}

export interface Draft {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  formData: OfferFormData;
  attachments: AttachmentData[];
}

export const initialFormData: OfferFormData = {
  clientId: "",
  localisation: "",
  prix: "",
  surface: "",
  nombrePieces: "",
  description: "",
  etage: "",
  disponibilite: "",
  etageVisite: "",
  codeImmeuble: "",
  locataireNom: "",
  locataireTel: "",
  conciergeNom: "",
  conciergeTel: "",
  commentaires: "",
  lienAnnonce: "",
  datesVisite: ["", "", ""],
};

export function useDraftManager() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OfferFormData>(initialFormData);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);

  // Load drafts from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFTS_KEY);
      if (saved) {
        const parsedDrafts = JSON.parse(saved);
        setDrafts(parsedDrafts);
      }
    } catch (error) {
      console.warn('Error loading drafts:', error);
    }
  }, []);

  // Save drafts to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
      // Dispatch storage event for other components to detect
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.warn('Error saving drafts:', error);
    }
  }, [drafts]);

  const generateId = () => `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const saveDraft = useCallback((name: string) => {
    const now = new Date().toISOString();
    const newDraft: Draft = {
      id: generateId(),
      name,
      createdAt: now,
      updatedAt: now,
      formData: { ...formData },
      attachments: [...attachments],
    };
    setDrafts(prev => [...prev, newDraft]);
    setCurrentDraftId(newDraft.id);
    return newDraft;
  }, [formData, attachments]);

  const updateDraft = useCallback((id: string) => {
    setDrafts(prev => prev.map(draft => {
      if (draft.id === id) {
        return {
          ...draft,
          updatedAt: new Date().toISOString(),
          formData: { ...formData },
          attachments: [...attachments],
        };
      }
      return draft;
    }));
  }, [formData, attachments]);

  const loadDraft = useCallback((id: string) => {
    const draft = drafts.find(d => d.id === id);
    if (draft) {
      setFormData(draft.formData);
      setAttachments(draft.attachments);
      setCurrentDraftId(id);
      return draft;
    }
    return null;
  }, [drafts]);

  const deleteDraft = useCallback((id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (currentDraftId === id) {
      setCurrentDraftId(null);
    }
  }, [currentDraftId]);

  const renameDraft = useCallback((id: string, newName: string) => {
    setDrafts(prev => prev.map(draft => {
      if (draft.id === id) {
        return { ...draft, name: newName, updatedAt: new Date().toISOString() };
      }
      return draft;
    }));
  }, []);

  const clearCurrentDraft = useCallback(() => {
    setFormData(initialFormData);
    setAttachments([]);
    setCurrentDraftId(null);
  }, []);

  const hasDrafts = drafts.length > 0;

  return {
    drafts,
    currentDraftId,
    formData,
    setFormData,
    attachments,
    setAttachments,
    saveDraft,
    updateDraft,
    loadDraft,
    deleteDraft,
    renameDraft,
    clearCurrentDraft,
    hasDrafts,
  };
}

// Utility function to check if drafts exist (for sidebar badge)
export function checkDraftsExist(): boolean {
  try {
    const saved = localStorage.getItem(DRAFTS_KEY);
    if (saved) {
      const drafts = JSON.parse(saved);
      return Array.isArray(drafts) && drafts.length > 0;
    }
  } catch {
    // Ignore errors
  }
  return false;
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject_template: string | null;
  body_template: string;
  category: string;
  is_system: boolean;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  subject_template?: string;
  body_template: string;
  category?: string;
  variables?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  subject_template?: string;
  body_template?: string;
  category?: string;
  variables?: string[];
}

// Default templates that will be used when no templates exist
export const DEFAULT_TEMPLATES: Omit<EmailTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Suite à une visite',
    subject_template: 'Candidature - {address} - {client_name}',
    body_template: `Bonjour,

Suite à la visite effectuée avec {client_gender}, j'ai le plaisir de vous transmettre le dossier complet pour l'appartement de {pieces} pcs à l'adresse mentionnée en objet.

Bien évidemment, je reste volontiers à disposition pour tout complément d'information nécessaire.

Cordialement,`,
    category: 'dossier',
    is_system: false,
    variables: ['client_gender', 'client_name', 'address', 'pieces', 'price'],
  },
  {
    name: 'Candidature spontanée',
    subject_template: 'Candidature - {address} - {client_name}',
    body_template: `Madame, Monsieur,

Je me permets de vous adresser le dossier de candidature de {client_gender} pour le bien situé {address}.

Vous trouverez en pièces jointes l'ensemble des documents nécessaires à l'étude de cette candidature.

Je reste à votre entière disposition pour tout renseignement complémentaire.

Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.`,
    category: 'dossier',
    is_system: false,
    variables: ['client_gender', 'client_name', 'address', 'pieces', 'price'],
  },
  {
    name: 'Dossier complet simple',
    subject_template: 'Candidature - {address} - {client_name}',
    body_template: `Bonjour,

Veuillez trouver ci-joint le dossier complet de {client_gender} pour le logement de {pieces} pièces situé au {address}.

Je reste à disposition pour toute information complémentaire.

Cordialement,`,
    category: 'dossier',
    is_system: false,
    variables: ['client_gender', 'client_name', 'address', 'pieces', 'price'],
  },
];

export function useEmailTemplates(category?: string) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTemplates([]);
        return;
      }

      let query = supabase
        .from('email_templates')
        .select('*')
        .order('name', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        // If table doesn't exist or RLS blocks, use defaults
        console.error('Error fetching templates:', fetchError);
        setTemplates([]);
        return;
      }

      setTemplates((data as EmailTemplate[]) || []);
    } catch (err) {
      console.error('Error in fetchTemplates:', err);
      setError('Erreur lors du chargement des modèles');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (input: CreateTemplateInput): Promise<EmailTemplate | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          user_id: user.id,
          name: input.name,
          subject_template: input.subject_template || null,
          body_template: input.body_template,
          category: input.category || 'dossier',
          variables: input.variables || [],
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Modèle créé",
        description: `Le modèle "${input.name}" a été créé avec succès`,
      });

      await fetchTemplates();
      return data as EmailTemplate;
    } catch (err: any) {
      console.error('Error creating template:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de créer le modèle",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTemplate = async (id: string, input: UpdateTemplateInput): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Modèle mis à jour",
        description: "Les modifications ont été enregistrées",
      });

      await fetchTemplates();
      return true;
    } catch (err: any) {
      console.error('Error updating template:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de modifier le modèle",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Modèle supprimé",
        description: "Le modèle a été supprimé avec succès",
      });

      await fetchTemplates();
      return true;
    } catch (err: any) {
      console.error('Error deleting template:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de supprimer le modèle",
        variant: "destructive",
      });
      return false;
    }
  };

  const initializeDefaultTemplates = async (): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has any templates
      const { data: existingTemplates } = await supabase
        .from('email_templates')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (existingTemplates && existingTemplates.length > 0) return;

      // Insert default templates for this user
      const templatesToInsert = DEFAULT_TEMPLATES.map(t => ({
        ...t,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from('email_templates')
        .insert(templatesToInsert);

      if (error) throw error;

      await fetchTemplates();
      
      toast({
        title: "Modèles initialisés",
        description: "Les modèles par défaut ont été créés",
      });
    } catch (err) {
      console.error('Error initializing templates:', err);
    }
  };

  // Get templates with fallback to defaults
  const getTemplatesWithDefaults = useCallback((): EmailTemplate[] => {
    if (templates.length > 0) return templates;
    
    // Return defaults as EmailTemplate-like objects
    return DEFAULT_TEMPLATES.map((t, index) => ({
      ...t,
      id: `default-${index}`,
      user_id: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as EmailTemplate[];
  }, [templates]);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    initializeDefaultTemplates,
    getTemplatesWithDefaults,
  };
}

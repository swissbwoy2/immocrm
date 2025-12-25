import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateClientPDF } from '@/utils/clientPdfGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useFileDownload } from '@/hooks/useFileDownload';

interface DownloadClientPDFButtonProps {
  clientId: string;
  clientData: {
    id: string;
    prenom?: string;
    nom?: string;
    [key: string]: any;
  };
  profileData?: {
    prenom?: string;
    nom?: string;
    email?: string;
    telephone?: string;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function DownloadClientPDFButton({
  clientId,
  clientData,
  profileData,
  variant = 'outline',
  size = 'default',
  className,
}: DownloadClientPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { downloadBytes } = useFileDownload();

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Fetch candidates
      const { data: candidates } = await supabase
        .from('client_candidates')
        .select('*')
        .eq('client_id', clientId);

      // Fetch candidatures with offers
      const { data: candidatures } = await supabase
        .from('candidatures')
        .select(`
          id,
          statut,
          date_depot,
          offre_id,
          offres:offre_id (
            adresse,
            loyer,
            pieces
          )
        `)
        .eq('client_id', clientId);

      // Fetch documents
      const { data: documents } = await supabase
        .from('documents')
        .select('id, nom, type_document, date_upload')
        .eq('client_id', clientId);

      // Fetch assigned agents
      const { data: clientAgents } = await supabase
        .from('client_agents')
        .select(`
          agent_id,
          agents:agent_id (
            user_id,
            profiles:user_id (
              prenom,
              nom,
              email,
              telephone
            )
          )
        `)
        .eq('client_id', clientId);

      const agents = clientAgents?.map(ca => {
        const agentData = ca.agents as any;
        const profile = agentData?.profiles;
        return {
          prenom: profile?.prenom,
          nom: profile?.nom,
          email: profile?.email,
          telephone: profile?.telephone,
        };
      }).filter(a => a.prenom || a.nom) || [];

      // Transform candidatures
      const transformedCandidatures = candidatures?.map(c => ({
        id: c.id,
        statut: c.statut,
        date_depot: c.date_depot,
        offre: c.offres as any,
      })) || [];

      // Generate PDF
      const pdfBytes = await generateClientPDF({
        client: clientData,
        profile: profileData,
        candidates: candidates || [],
        candidatures: transformedCandidatures,
        documents: documents || [],
        agents,
      });

      // Generate filename
      const nom = (profileData?.nom || clientData.nom || 'Client').toUpperCase().replace(/\s+/g, '_');
      const prenom = (profileData?.prenom || clientData.prenom || '').replace(/\s+/g, '_');
      const date = new Date().toISOString().split('T')[0];
      const filename = `Fiche_Client_${nom}_${prenom}_${date}.pdf`;

      // Download using native-compatible hook
      const result = await downloadBytes(pdfBytes, {
        filename,
        mimeType: 'application/pdf',
      });
      
      if (result.success) {
        toast.success('Fiche client téléchargée avec succès');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isGenerating}
      className={className}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Télécharger PDF
        </>
      )}
    </Button>
  );
}

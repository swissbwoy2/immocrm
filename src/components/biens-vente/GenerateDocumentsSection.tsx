import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  FileText, Download, Loader2, FileCheck, BarChart3, 
  Building2, Briefcase, Mail
} from 'lucide-react';

interface GenerateDocumentsSectionProps {
  immeuble: {
    id: string;
    nom: string;
    estimation_valeur_basse?: number;
    estimation_valeur_haute?: number;
    estimation_valeur_recommandee?: number;
  };
}

export function GenerateDocumentsSection({ immeuble }: GenerateDocumentsSectionProps) {
  const [generatingBrochure, setGeneratingBrochure] = useState(false);
  const [generatingEstimation, setGeneratingEstimation] = useState(false);
  const [generatingDossier, setGeneratingDossier] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);

  const downloadFile = (base64: string, filename: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateBrochure = async () => {
    setGeneratingBrochure(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-brochure-pdf', {
        body: { immeuble_id: immeuble.id }
      });

      if (error) throw error;

      if (data?.docx_base64) {
        downloadFile(data.docx_base64, data.filename || `brochure-${immeuble.nom}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        toast.success('Brochure DOCX générée avec succès');
      }
    } catch (error) {
      console.error('Error generating brochure:', error);
      toast.error('Erreur lors de la génération de la brochure');
    } finally {
      setGeneratingBrochure(false);
    }
  };

  const handleGenerateEstimationReport = async () => {
    if (!immeuble.estimation_valeur_recommandee) {
      toast.error('Veuillez d\'abord saisir une estimation dans l\'onglet Estimation');
      return;
    }

    setGeneratingEstimation(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-estimation-report-pdf', {
        body: { immeuble_id: immeuble.id }
      });

      if (error) throw error;

      if (data?.pdf_base64) {
        downloadFile(data.pdf_base64, data.filename || `rapport-estimation-${immeuble.nom}.pdf`, 'application/pdf');
        toast.success('Rapport d\'estimation généré avec succès');
      }
    } catch (error) {
      console.error('Error generating estimation report:', error);
      toast.error('Erreur lors de la génération du rapport d\'estimation');
    } finally {
      setGeneratingEstimation(false);
    }
  };

  const handleGenerateDossierComplet = async () => {
    setGeneratingDossier(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-dossier-complet-pdf', {
        body: { immeuble_id: immeuble.id }
      });

      if (error) throw error;

      if (data?.pdf_base64) {
        downloadFile(data.pdf_base64, data.filename || `dossier-complet-${immeuble.nom}.pdf`, 'application/pdf');
        toast.success('Dossier complet généré avec succès');
      }
    } catch (error) {
      console.error('Error generating dossier complet:', error);
      toast.error('Erreur lors de la génération du dossier complet');
    } finally {
      setGeneratingDossier(false);
    }
  };

  const handleGenerateMarketAnalysis = async () => {
    setGeneratingAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-market-analysis-pdf', {
        body: { immeuble_id: immeuble.id }
      });

      if (error) throw error;

      if (data?.pdf_base64) {
        downloadPdf(data.pdf_base64, data.filename || `analyse-marche-${immeuble.nom}.pdf`);
        toast.success('Analyse de marché générée avec succès');
      }
    } catch (error) {
      console.error('Error generating market analysis:', error);
      toast.error('Erreur lors de la génération de l\'analyse de marché');
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const documents = [
    {
      title: 'Brochure de vente',
      description: 'Document commercial professionnel avec photos et description du bien pour les acheteurs potentiels.',
      icon: Building2,
      action: handleGenerateBrochure,
      loading: generatingBrochure,
      available: true,
      color: 'text-blue-600',
    },
    {
      title: 'Rapport d\'estimation',
      description: 'Rapport détaillé incluant la fourchette d\'estimation, les facteurs influençant le prix et les recommandations.',
      icon: FileCheck,
      action: handleGenerateEstimationReport,
      loading: generatingEstimation,
      available: !!immeuble.estimation_valeur_recommandee,
      color: 'text-green-600',
    },
    {
      title: 'Analyse de marché',
      description: 'Analyse comparative du secteur, tendances du marché et positionnement du bien.',
      icon: BarChart3,
      action: handleGenerateMarketAnalysis,
      loading: generatingAnalysis,
      available: true,
      color: 'text-purple-600',
    },
    {
      title: 'Dossier vendeur complet',
      description: 'Document exhaustif pour le propriétaire incluant estimation, stratégie de vente et engagement qualité.',
      icon: Briefcase,
      action: handleGenerateDossierComplet,
      loading: generatingDossier,
      available: true,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Génération de documents PDF
          </CardTitle>
          <CardDescription>
            Générez des documents professionnels à remettre aux propriétaires ou acheteurs potentiels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <Card key={doc.title} className={`border-2 transition-colors ${doc.available ? 'hover:border-primary/50' : 'opacity-60'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-muted ${doc.color}`}>
                      <doc.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold">{doc.title}</h3>
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                      <Button 
                        onClick={doc.action} 
                        disabled={doc.loading || !doc.available}
                        className="w-full mt-2"
                        variant={doc.available ? "default" : "secondary"}
                      >
                        {doc.loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Génération...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            {doc.available ? 'Générer PDF' : 'Estimation requise'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Option d'envoi par email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoi par email
          </CardTitle>
          <CardDescription>
            Envoyez les documents directement au propriétaire par email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            <Mail className="h-4 w-4 mr-2" />
            Envoyer au propriétaire (bientôt disponible)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

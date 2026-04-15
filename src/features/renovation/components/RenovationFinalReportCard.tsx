import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  projectId: string;
  finalReportPath: string | null;
  canManage: boolean;
}

export function RenovationFinalReportCard({ projectId, finalReportPath, canManage }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: async (force: boolean) => {
      const { data, error } = await supabase.functions.invoke('renovation-generate-final-report', {
        body: { projectId, force },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSignedUrl(data.signedUrl);
      toast.success(data.cached ? 'Dossier existant récupéré' : 'Dossier final généré avec succès');
    },
    onError: (e: Error) => toast.error(`Erreur de génération: ${e.message}`),
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${finalReportPath ? 'bg-primary/10' : 'bg-muted'}`}>
            {finalReportPath ? (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            ) : (
              <FileText className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium">Dossier final de rénovation</p>
            <p className="text-sm text-muted-foreground">
              {generate.isPending
                ? 'Génération en cours...'
                : finalReportPath
                ? '✅ Rapport disponible'
                : 'Pas encore généré'}
            </p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => generate.mutate(!!finalReportPath)}
                disabled={generate.isPending}
              >
                {generate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : finalReportPath ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" /> Régénérer
                  </>
                ) : (
                  'Générer'
                )}
              </Button>
            )}
            {signedUrl && (
              <Button size="sm" asChild>
                <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-1" /> Télécharger
                </a>
              </Button>
            )}
            {!signedUrl && finalReportPath && canManage && (
              <Button size="sm" variant="secondary" onClick={() => generate.mutate(false)} disabled={generate.isPending}>
                <Download className="h-4 w-4 mr-1" /> Obtenir lien
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

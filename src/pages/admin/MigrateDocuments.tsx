import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Database, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function MigrateDocuments() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleMigration = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Non authentifié");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-documents-to-storage`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: "Migration réussie",
          description: `${data.migrated} document(s) migré(s) vers Storage`,
        });
      } else {
        toast({
          title: "Migration échouée",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur migration:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Migration des Documents vers Storage
          </CardTitle>
          <CardDescription>
            Cette opération va déplacer tous les documents stockés en base64 dans la base de données vers Supabase Storage.
            Cela améliorera les performances et permettra l'aperçu des gros fichiers PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">⚠️ Avant de commencer :</h3>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Cette opération peut prendre plusieurs minutes selon le nombre de documents</li>
              <li>Les documents seront déplacés dans le bucket "client-documents"</li>
              <li>Les URLs dans la base de données seront automatiquement mises à jour</li>
              <li>Il est recommandé de faire une sauvegarde avant de lancer la migration</li>
            </ul>
          </div>

          <Button 
            onClick={handleMigration} 
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migration en cours...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Lancer la migration
              </>
            )}
          </Button>

          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-semibold">
                  {result.success ? "Migration terminée" : "Migration échouée"}
                </span>
              </div>

              {result.migrated > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Documents migrés</span>
                    <span className="font-semibold">{result.migrated}</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              )}

              {result.errors > 0 && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
                  <p className="font-semibold">{result.errors} erreur(s) détectée(s)</p>
                  {result.details && (
                    <ul className="mt-2 text-sm space-y-1 list-disc list-inside">
                      {result.details.map((err: any, idx: number) => (
                        <li key={idx}>
                          {err.documentName}: {err.error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {result.migrated === 0 && result.errors === 0 && (
                <p className="text-muted-foreground text-sm">
                  Aucun document à migrer. Tous les documents sont déjà dans Storage.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

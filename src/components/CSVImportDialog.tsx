import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseCSV, ParsedCSVData } from '@/utils/csvParser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  currentAgentId?: string; // ID de l'agent qui importe les clients
}

export function CSVImportDialog({ open, onOpenChange, onImportComplete, currentAgentId }: CSVImportDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedCSVData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Format invalide',
        description: 'Veuillez sélectionner un fichier CSV',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setParseResult(null);

    try {
      const text = await file.text();
      const result = parseCSV(text);
      setParseResult(result);

      if (result.errors.length > 0) {
        toast({
          title: 'Attention',
          description: `${result.clients.length} clients valides, ${result.errors.length} erreurs`,
          variant: 'default',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de lire le fichier CSV',
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;

    try {
      console.log('📊 Import - Starting Supabase import...');
      setParsing(true);

      // Transform parsed data to match edge function format
      const clientsToImport = parseResult.clients.map((client, index) => {
        const user = parseResult.users[index];
        return {
          user: {
            email: user.email,
            password: user.password,
            prenom: user.prenom,
            nom: user.nom,
            telephone: user.telephone,
          },
          client: {
            nationalite: client.nationalite || null,
            type_permis: client.typePermis || null,
            situation_familiale: client.etatCivil || null,
            profession: client.profession || null,
            revenus_mensuels: client.revenuMensuel || 0,
            budget_max: client.budgetMax || 0,
            charges_mensuelles: client.montantCharges || 0,
            pieces: parseInt(client.nombrePiecesSouhaite) || null,
            region_recherche: client.regions?.join(', ') || null,
            type_bien: client.typeBien || null,
            type_contrat: client.typeRecherche || null,
            date_ajout: client.dateInscription || new Date().toISOString(),
          },
          agentEmail: undefined, // Not supported yet in CSV
        };
      });

      // Call edge function
      const { data, error } = await supabase.functions.invoke('import-clients-csv', {
        body: { clients: clientsToImport }
      });

      if (error) {
        throw error;
      }

      const result = data as { success: number; failed: number; errors: Array<{ email: string; reason: string }> };

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
        toast({
          title: 'Import partiellement réussi',
          description: `${result.success} clients importés, ${result.failed} échecs`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Import réussi',
          description: `${result.success} clients importés avec succès`,
        });
      }

      onImportComplete();
      handleClose();
    } catch (error) {
      console.error('❌ Import error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'importer les clients',
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParseResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des clients (CSV)</DialogTitle>
          <DialogDescription>
            Importez un fichier CSV contenant les informations des clients. Un compte sera créé automatiquement pour chaque client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Zone de drop */}
          {!file && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Glissez-déposez votre fichier CSV ici
              </p>
              <p className="text-xs text-muted-foreground mb-4">ou</p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Sélectionner un fichier
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
            </div>
          )}

          {/* Fichier sélectionné */}
          {file && (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <FileText className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              {!parsing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setParseResult(null);
                  }}
                >
                  Changer
                </Button>
              )}
            </div>
          )}

          {/* Parsing en cours */}
          {parsing && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-4 text-sm text-muted-foreground">Analyse du fichier...</p>
            </div>
          )}

          {/* Résultats */}
          {parseResult && !parsing && (
            <div className="space-y-3">
              {parseResult.clients.length > 0 && (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>{parseResult.clients.length} clients</strong> prêts à être importés
                  </AlertDescription>
                </Alert>
              )}

              {parseResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{parseResult.errors.length} erreurs</strong> détectées
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs">Voir les détails</summary>
                      <ul className="mt-2 space-y-1 text-xs max-h-40 overflow-y-auto">
                        {parseResult.errors.map((error, index) => (
                          <li key={index} className="text-red-600 dark:text-red-400">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Informations importantes :</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Mot de passe temporaire : <code>immo</code> + 4 derniers chiffres du téléphone</li>
                  <li>• Les clients devront changer leur mot de passe à la première connexion</li>
                  <li>• Les clients sans agent devront être assignés manuellement</li>
                  <li>• Split par défaut : 45% agent / 55% agence</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parseResult || parseResult.clients.length === 0}
          >
            Importer {parseResult?.clients.length || 0} clients
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Inline CSV parser
interface CSVRow {
  [key: string]: string;
}

interface ParsedClient {
  dateInscription?: string;
  dateNaissance?: string;
  nationalite?: string;
  typePermis?: string;
  adresse?: string;
  etatCivil?: string;
  geranceActuelle?: string;
  contactGerance?: string;
  loyerActuel?: number;
  depuisLe?: string;
  nombrePiecesActuel?: number;
  motifChangement?: string;
  profession?: string;
  employeur?: string;
  dateEngagement?: string;
  revenuMensuel?: number;
  montantCharges?: number;
  chargesExtraordinaires?: boolean;
  poursuites?: boolean;
  curatelle?: boolean;
  budgetMax?: number;
  nombrePiecesSouhaite?: string;
  regions?: string[];
  typeBien?: string;
  typeRecherche?: string;
  souhaitsParticuliers?: string;
  nombreOccupants?: number;
  utilisationLogement?: string;
  animaux?: boolean;
  instrumentMusique?: boolean;
  vehicules?: boolean;
  numeroPlaques?: string;
  decouverteAgence?: string;
}

interface ParsedUser {
  email: string;
  password: string;
  prenom: string;
  nom: string;
  telephone?: string;
}

interface ParsedCSVData {
  clients: ParsedClient[];
  users: ParsedUser[];
  errors: string[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(csvText: string): ParsedCSVData {
  const lines = csvText.split('\n').filter(line => line.trim());
  const clients: ParsedClient[] = [];
  const users: ParsedUser[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push('Le fichier CSV est vide ou ne contient pas de données');
    return { clients, users, errors };
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      const email = row['email'] || row['e-mail'] || '';
      const prenom = row['prenom'] || row['prénom'] || '';
      const nom = row['nom'] || '';
      const telephone = row['telephone'] || row['téléphone'] || row['tel'] || '';

      if (!email || !prenom || !nom) {
        errors.push(`Ligne ${i + 1}: Email, prénom ou nom manquant`);
        continue;
      }

      const password = 'immo' + (telephone?.slice(-4) || '0000');

      users.push({ email, password, prenom, nom, telephone });
      
      clients.push({
        dateInscription: row['date_inscription'] || row['dateinscription'] || new Date().toISOString().split('T')[0],
        dateNaissance: row['date_naissance'] || row['datenaissance'] || undefined,
        nationalite: row['nationalite'] || row['nationalité'] || undefined,
        typePermis: row['type_permis'] || row['typepermis'] || row['permis'] || undefined,
        adresse: row['adresse'] || undefined,
        etatCivil: row['etat_civil'] || row['etatcivil'] || row['situation_familiale'] || undefined,
        geranceActuelle: row['gerance_actuelle'] || row['geranceactuelle'] || undefined,
        contactGerance: row['contact_gerance'] || row['contactgerance'] || undefined,
        loyerActuel: row['loyer_actuel'] ? parseFloat(row['loyer_actuel']) : undefined,
        depuisLe: row['depuis_le'] || row['depuisle'] || undefined,
        nombrePiecesActuel: row['pieces_actuel'] ? parseInt(row['pieces_actuel']) : undefined,
        motifChangement: row['motif_changement'] || row['motifchangement'] || undefined,
        profession: row['profession'] || undefined,
        employeur: row['employeur'] || undefined,
        dateEngagement: row['date_engagement'] || row['dateengagement'] || undefined,
        revenuMensuel: row['revenus_mensuels'] ? parseFloat(row['revenus_mensuels']) : undefined,
        montantCharges: row['charges_mensuelles'] ? parseFloat(row['charges_mensuelles']) : undefined,
        chargesExtraordinaires: row['charges_extraordinaires'] === 'true' || row['charges_extraordinaires'] === 'oui',
        poursuites: row['poursuites'] === 'true' || row['poursuites'] === 'oui',
        curatelle: row['curatelle'] === 'true' || row['curatelle'] === 'oui',
        budgetMax: row['budget_max'] ? parseFloat(row['budget_max']) : undefined,
        nombrePiecesSouhaite: row['pieces'] || row['nombre_pieces'] || undefined,
        regions: row['region_recherche'] ? [row['region_recherche']] : undefined,
        typeBien: row['type_bien'] || row['typebien'] || undefined,
        typeRecherche: row['type_recherche'] || row['typerecherche'] || undefined,
        souhaitsParticuliers: row['souhaits_particuliers'] || undefined,
        nombreOccupants: row['nombre_occupants'] ? parseInt(row['nombre_occupants']) : undefined,
        utilisationLogement: row['utilisation_logement'] || undefined,
        animaux: row['animaux'] === 'true' || row['animaux'] === 'oui',
        instrumentMusique: row['instrument_musique'] === 'true' || row['instrument_musique'] === 'oui',
        vehicules: row['vehicules'] === 'true' || row['vehicules'] === 'oui',
        numeroPlaques: row['numero_plaques'] || undefined,
        decouverteAgence: row['decouverte_agence'] || undefined,
      });
    } catch (e) {
      errors.push(`Ligne ${i + 1}: Erreur de parsing`);
    }
  }

  return { clients, users, errors };
}

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  currentAgentId?: string;
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
    parseFileContent(selectedFile);
  };

  const parseFileContent = async (file: File) => {
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
            date_naissance: client.dateNaissance || null,
            nationalite: client.nationalite || null,
            type_permis: client.typePermis || null,
            adresse: client.adresse || null,
            etat_civil: client.etatCivil || null,
            situation_familiale: client.etatCivil || null,
            gerance_actuelle: client.geranceActuelle || null,
            contact_gerance: client.contactGerance || null,
            loyer_actuel: client.loyerActuel || null,
            depuis_le: client.depuisLe || null,
            pieces_actuel: client.nombrePiecesActuel || null,
            motif_changement: client.motifChangement || null,
            profession: client.profession || null,
            employeur: client.employeur || null,
            date_engagement: client.dateEngagement || null,
            revenus_mensuels: client.revenuMensuel || 0,
            charges_mensuelles: client.montantCharges || 0,
            charges_extraordinaires: client.chargesExtraordinaires || null,
            montant_charges_extra: client.montantCharges || null,
            poursuites: client.poursuites || false,
            curatelle: client.curatelle || false,
            budget_max: client.budgetMax || 0,
            pieces: client.nombrePiecesSouhaite ? parseInt(client.nombrePiecesSouhaite) : null,
            region_recherche: client.regions?.join(', ') || null,
            type_bien: client.typeBien || null,
            type_contrat: client.typeRecherche || null,
            souhaits_particuliers: client.souhaitsParticuliers || null,
            nombre_occupants: client.nombreOccupants || null,
            utilisation_logement: client.utilisationLogement || null,
            animaux: client.animaux || false,
            instrument_musique: client.instrumentMusique || false,
            vehicules: client.vehicules || false,
            numero_plaques: client.numeroPlaques || null,
            decouverte_agence: client.decouverteAgence || null,
            date_ajout: client.dateInscription,
          },
          agentEmail: undefined,
        };
      });

      const { data, error } = await supabase.functions.invoke('import-clients-csv', {
        body: { clients: clientsToImport }
      });

      if (error) {
        throw error;
      }

      const result = data as { 
        created: number; 
        updated: number; 
        activated: number;
        failed: number; 
        emailsSent: number;
        errors: Array<{ email: string; reason: string }> 
      };

      const parts: string[] = [];
      if (result.created > 0) parts.push(`${result.created} créé(s)`);
      if (result.activated > 0) parts.push(`${result.activated} activé(s)`);
      if (result.updated > 0) parts.push(`${result.updated} mis à jour`);
      if (result.failed > 0) parts.push(`${result.failed} échec(s)`);
      
      const description = parts.join(', ');
      const emailInfo = result.emailsSent > 0 ? ` • ${result.emailsSent} email(s) envoyé(s)` : '';

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
        toast({
          title: 'Import partiellement réussi',
          description: description + emailInfo,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Import réussi',
          description: description + emailInfo,
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

          {parsing && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-4 text-sm text-muted-foreground">Analyse du fichier...</p>
            </div>
          )}

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

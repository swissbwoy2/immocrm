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

// Normalize column name: removes accents, special chars, lowercase
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D\u2011]/g, '-') // Normalize different hyphens including non-breaking hyphen U+2011
    .replace(/[''`]/g, "'") // Normalize quotes
    .replace(/\s+/g, '_') // Spaces to underscores
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/[^a-z0-9_-]/g, '') // Remove other special chars
    .trim();
}

// Parse various date formats, return null if invalid
function parseDate(value: string): string | null {
  if (!value || value.trim() === '' || value === '-') return null;
  
  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  
  // Format DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = value.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})$/);
  if (dmyMatch) {
    const [_, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // Try to extract any date with regex (day month year in French)
  const frenchMonths: Record<string, string> = {
    'janvier': '01', 'fevrier': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'aout': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'decembre': '12'
  };
  
  const normalizedValue = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const frMatch = normalizedValue.match(/(\d{1,2})\s*(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s*(\d{4})/);
  if (frMatch) {
    const [_, day, month, year] = frMatch;
    const monthNum = frenchMonths[month];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // Date contains text that can't be parsed → return null
  console.log(`Could not parse date: "${value}"`);
  return null;
}

// Parse Swiss currency format: "3'674,70" or "900.-" or "1650"
function parseSwissCurrency(value: string): number | undefined {
  if (!value || value === '-' || value === '') return undefined;
  const cleaned = value
    .replace(/['\s]/g, '') // Remove apostrophes and spaces (Swiss thousand separator)
    .replace(/\.-$/, '') // Remove ".-" suffix
    .replace(',', '.'); // Convert comma decimal to dot
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

// Parse boolean values in French
function parseFrenchBoolean(value: string): boolean {
  const v = value?.toLowerCase().trim();
  return v === 'oui' || v === 'true' || v === '1' || v === 'yes';
}

// Map French CSV headers to internal field names
function mapHeaderToField(header: string): string {
  const normalized = normalizeHeader(header);
  
  const mappings: Record<string, string> = {
    // Email variations
    'e-mail': 'email',
    'email': 'email',
    'e_mail': 'email',
    'mail': 'email',
    
    // Name variations
    'prenom': 'prenom',
    'nom': 'nom',
    'nom_de_famille': 'nom',
    
    // Phone
    'telephone': 'telephone',
    'tel': 'telephone',
    'mobile': 'telephone',
    
    // Date and address
    'date_et_heure_de_lenvoi': 'date_inscription',
    'adresse': 'adresse',
    'date_de_naissance': 'date_naissance',
    
    // Identity
    'nationalite': 'nationalite',
    'type_de_permis_de_sejour': 'type_permis',
    'type_de_permis': 'type_permis',
    'permis': 'type_permis',
    'etat_civile': 'etat_civil',
    'etat_civil': 'etat_civil',
    
    // Current housing - multiple variations for gérance with/without parentheses
    'gerance_ou_proprietaire_actuelle': 'gerance_actuelle',
    'gerance_ou_proprietaire_actuel': 'gerance_actuelle',
    'gerance_ou_proprietaire_actuellele': 'gerance_actuelle', // for actuel(le) without parentheses
    'contact_gerance': 'contact_gerance',
    'contact_de_la_gerance': 'contact_gerance',
    'loyer_brut_actuel': 'loyer_actuel',
    'loyer_actuel': 'loyer_actuel',
    'depuis_le': 'depuis_le',
    'nombre_de_pieces_actuel': 'pieces_actuel',
    'nombre_de_pieces': 'pieces_actuel',
    
    // Charges and debts
    'avez-vous_des_charges_extraordinaires_leasing_credit_pension_alimentaire_etc': 'charges_extraordinaires',
    'charges_extraordinaires': 'charges_extraordinaires',
    'si_oui_montant__echeance': 'montant_charges_extra',
    'montant_charges': 'montant_charges_extra',
    'avez-vous_des_poursuites_ou_actes_de_defaut_de_biens_': 'poursuites',
    'poursuites': 'poursuites',
    'etes-vous_sous_curatelle_': 'curatelle',
    'curatelle': 'curatelle',
    
    // Reason for moving
    'motif_du_changement_de_domicile_': 'motif_changement',
    'motif_du_changement': 'motif_changement',
    'motif_changement': 'motif_changement',
    
    // Employment
    'profession': 'profession',
    'employeur': 'employeur',
    'revenu_mensuel_net': 'revenus_mensuels',
    'revenus_mensuels': 'revenus_mensuels',
    'revenu_mensuel': 'revenus_mensuels',
    'date_dengagement_au_poste': 'date_engagement',
    'date_dengagement': 'date_engagement',
    
    // Housing usage
    'utilisation_du_logement_a_titre': 'utilisation_logement',
    'utilisation_logement': 'utilisation_logement',
    'avez-vous_des_animaux_': 'animaux',
    'animaux': 'animaux',
    'jouez-vous_dun_instrument_de_musique_': 'instrument_musique',
    'instrument_musique': 'instrument_musique',
    'avez-vous_un_ou_plusieurs_vehicules_': 'vehicules',
    'vehicules': 'vehicules',
    'si_oui_veuillez_indiquer_le_numero_de_plaques_': 'numero_plaques',
    'numero_plaques': 'numero_plaques',
    
    // Discovery
    'comment_avez-vous_decouvert_notre_agence_': 'decouverte_agence',
    'decouverte_agence': 'decouverte_agence',
    
    // Search criteria
    'selectionnez_ce_qui_correspond': 'type_recherche',
    'type_recherche': 'type_recherche',
    'combien_de_personnes_occuperaient_lappartement_': 'nombre_occupants',
    'nombre_occupants': 'nombre_occupants',
    'type_dobjet': 'type_bien',
    'type_bien': 'type_bien',
    'nb_de_pcs': 'pieces',
    'pieces': 'pieces',
    'nombre_de_pieces_souhaite': 'pieces',
    'region': 'region_recherche',
    'region_recherche': 'region_recherche',
    'budget_maximum_le_loyer_brut_ne_devant_pas_depasser_le_tiers_du_salaire': 'budget_max',
    'budget_max': 'budget_max',
    'budget_maximum': 'budget_max',
    'souhait_particulier_concernant_letage_le_quartier_la_vue_': 'souhaits_particuliers',
    'souhaits_particuliers': 'souhaits_particuliers',
    
    // Promo code
    'code_promo': 'code_promo',
    
    // Signature and approval (from Wix forms)
    'lu__approuve': 'lu_approuve',
    'lu_approuve': 'lu_approuve',
    'signature': 'signature',
  };
  
  // Direct match
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Partial match fallback - check if normalized contains a known key or vice versa
  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      console.log(`Partial match: "${normalized}" → "${value}"`);
      return value;
    }
  }
  
  return normalized;
}

function parseCSV(csvText: string): ParsedCSVData {
  // Remove BOM (Byte Order Mark) if present - common in Excel/Windows CSV files
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText.split('\n').filter(line => line.trim());
  const clients: ParsedClient[] = [];
  const users: ParsedUser[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push('Le fichier CSV est vide ou ne contient pas de données');
    return { clients, users, errors };
  }

  // Parse and map headers
  const rawHeaders = parseCSVLine(lines[0]);
  const mappedHeaders = rawHeaders.map(h => mapHeaderToField(h));
  
  console.log('CSV Headers detected:', rawHeaders);
  console.log('CSV Headers mapped:', mappedHeaders);

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const row: CSVRow = {};
      mappedHeaders.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      // Get email, name, phone with fallbacks
      const email = row['email'] || '';
      const prenom = row['prenom'] || '';
      const nom = row['nom'] || '';
      const telephone = row['telephone'] || '';

      if (!email || !prenom || !nom) {
        console.log(`Row ${i + 1} missing fields:`, { email, prenom, nom, row });
        errors.push(`Ligne ${i + 1}: Email, prénom ou nom manquant`);
        continue;
      }

      const password = 'immo' + (telephone?.replace(/\D/g, '').slice(-4) || '0000');

      users.push({ email, password, prenom, nom, telephone });
      
      clients.push({
        dateInscription: row['date_inscription'] || new Date().toISOString().split('T')[0],
        dateNaissance: parseDate(row['date_naissance']),
        nationalite: row['nationalite'] || undefined,
        typePermis: row['type_permis'] || undefined,
        adresse: row['adresse'] || undefined,
        etatCivil: row['etat_civil'] || undefined,
        geranceActuelle: row['gerance_actuelle'] || undefined,
        contactGerance: row['contact_gerance'] || undefined,
        loyerActuel: parseSwissCurrency(row['loyer_actuel']),
        depuisLe: parseDate(row['depuis_le']),
        nombrePiecesActuel: row['pieces_actuel'] ? parseInt(row['pieces_actuel']) : undefined,
        motifChangement: row['motif_changement'] || undefined,
        profession: row['profession'] || undefined,
        employeur: row['employeur'] || undefined,
        dateEngagement: parseDate(row['date_engagement']),
        revenuMensuel: parseSwissCurrency(row['revenus_mensuels']),
        montantCharges: parseSwissCurrency(row['montant_charges_extra']),
        chargesExtraordinaires: parseFrenchBoolean(row['charges_extraordinaires']),
        poursuites: parseFrenchBoolean(row['poursuites']),
        curatelle: parseFrenchBoolean(row['curatelle']),
        budgetMax: parseSwissCurrency(row['budget_max']),
        nombrePiecesSouhaite: row['pieces'] || undefined,
        regions: row['region_recherche'] ? [row['region_recherche'].replace('Autre: ', '')] : undefined,
        typeBien: row['type_bien'] || undefined,
        typeRecherche: row['type_recherche'] || undefined,
        souhaitsParticuliers: row['souhaits_particuliers'] || undefined,
        nombreOccupants: row['nombre_occupants'] ? parseInt(row['nombre_occupants']) : undefined,
        utilisationLogement: row['utilisation_logement'] || undefined,
        animaux: parseFrenchBoolean(row['animaux']),
        instrumentMusique: parseFrenchBoolean(row['instrument_musique']),
        vehicules: parseFrenchBoolean(row['vehicules']),
        numeroPlaques: row['numero_plaques'] || undefined,
        decouverteAgence: row['decouverte_agence'] || undefined,
      });
    } catch (e) {
      console.error(`Row ${i + 1} parsing error:`, e);
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
            loyer_actuel: client.loyerActuel ?? null,
            depuis_le: client.depuisLe ?? null,
            pieces_actuel: client.nombrePiecesActuel ?? null,
            motif_changement: client.motifChangement ?? null,
            profession: client.profession ?? null,
            employeur: client.employeur ?? null,
            date_engagement: client.dateEngagement ?? null,
            revenus_mensuels: client.revenuMensuel ?? null,
            charges_mensuelles: client.montantCharges ?? null,
            charges_extraordinaires: client.chargesExtraordinaires ?? null,
            montant_charges_extra: client.montantCharges ?? null,
            poursuites: client.poursuites ?? false,
            curatelle: client.curatelle ?? false,
            budget_max: client.budgetMax ?? null,
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

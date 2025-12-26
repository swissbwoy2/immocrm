import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Brain, 
  FileText, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  Lightbulb,
  Copy,
  Loader2,
  Search,
  Home,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAIFormFiller, FormField, AIFormResult, OffreDataForAI } from '@/hooks/useAIFormFiller';
import { useFileDownload } from '@/hooks/useFileDownload';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Client {
  id: string;
  profiles: {
    nom: string;
    prenom: string;
    email: string;
  };
  budget_max?: number;
  pieces?: number;
  region_recherche?: string;
}

interface Offre {
  id: string;
  adresse: string;
  prix: number;
  charges?: number;
  pieces?: number;
  surface?: number;
  type_bien?: string;
  created_at: string;
}

export default function SmartRentalFormFiller() {
  const { userRole } = useAuth();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOffreId, setSelectedOffreId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [offreSearchQuery, setOffreSearchQuery] = useState('');
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingOffres, setIsLoadingOffres] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAnalyzing, progress, error, result, analyzeAndFill, generateFilledPdf, reset } = useAIFormFiller();
  const { downloadBytes } = useFileDownload();

  // Load clients
  useEffect(() => {
    loadClients();
  }, [userRole]);

  // Load offres when client is selected
  useEffect(() => {
    if (selectedClientId) {
      loadOffresForClient(selectedClientId);
    } else {
      setOffres([]);
      setSelectedOffreId(null);
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    setIsLoadingClients(true);
    try {
      let query = supabase
        .from('clients')
        .select(`
          id,
          budget_max,
          pieces,
          region_recherche,
          profiles!clients_user_id_fkey (
            nom,
            prenom,
            email
          )
        `)
        .eq('statut', 'actif')
        .order('created_at', { ascending: false });

      // If agent, only show their clients
      if (userRole === 'agent') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: agentData } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', user.id)
            .single();
          
          if (agentData) {
            query = query.eq('agent_id', agentData.id);
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setClients((data || []) as any);
    } catch (err) {
      console.error('Error loading clients:', err);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setIsLoadingClients(false);
    }
  };

  const loadOffresForClient = async (clientId: string) => {
    setIsLoadingOffres(true);
    setSelectedOffreId(null);
    try {
      // Get offers sent to this client
      const { data, error } = await supabase
        .from('offres')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffres((data || []) as Offre[]);
    } catch (err) {
      console.error('Error loading offres:', err);
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setIsLoadingOffres(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      reset();
    } else {
      toast.error('Veuillez sélectionner un fichier PDF');
    }
  };

  const handleAnalyze = async () => {
    if (!pdfFile || !selectedClientId) {
      toast.error('Veuillez sélectionner un PDF et un client');
      return;
    }

    const result = await analyzeAndFill(pdfFile, selectedClientId, selectedOffreId || undefined);
    if (result) {
      toast.success(`${result.fields.length} champs identifiés et pré-remplis!`);
    }
  };

  const copyFieldValue = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copié dans le presse-papier');
  };

  const copyAllFields = () => {
    if (!result) return;
    const text = result.fields
      .map(f => `${f.label}: ${f.value}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Tous les champs copiés!');
  };

  const handleDownloadFilledPdf = async () => {
    if (!result || !pdfFile) return;
    
    setIsGeneratingPdf(true);
    try {
      const fillResult = await generateFilledPdf();
      
      if (!fillResult) {
        toast.error('Erreur lors de la génération du PDF');
        return;
      }

      const { filledPdfBytes, filledCount, totalFields } = fillResult;

      // Generate filename
      const clientName = selectedClientProfile 
        ? `${selectedClientProfile.prenom}_${selectedClientProfile.nom}`.replace(/\s+/g, '_')
        : 'client';
      const date = new Date().toISOString().split('T')[0];
      const filename = `demande_location_${clientName}_${date}.pdf`;

      // Download the PDF
      const downloadResult = await downloadBytes(filledPdfBytes, {
        filename,
        mimeType: 'application/pdf'
      });

      if (downloadResult.success) {
        if (totalFields > 0 && filledCount > 0) {
          toast.success(`PDF téléchargé! ${filledCount}/${totalFields} champs du formulaire remplis automatiquement.`);
        } else {
          toast.success('PDF téléchargé! Les données ont été préparées pour copier-coller.');
        }
      } else {
        toast.error(downloadResult.error || 'Erreur lors du téléchargement');
      }
    } catch (err) {
      console.error('Error downloading filled PDF:', err);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    const profile = client.profiles as any;
    const fullName = `${profile?.prenom || ''} ${profile?.nom || ''}`.toLowerCase();
    const email = (profile?.email || '').toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  const filteredOffres = offres.filter(offre => {
    if (!offreSearchQuery) return true;
    const adresse = (offre.adresse || '').toLowerCase();
    return adresse.includes(offreSearchQuery.toLowerCase());
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedClientProfile = selectedClient?.profiles as any;
  const selectedOffre = offres.find(o => o.id === selectedOffreId);

  const canAnalyze = pdfFile && selectedClientId;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          Remplissage IA de demande de location
        </h1>
        <p className="text-muted-foreground mt-1">
          Chargez un formulaire PDF, sélectionnez un client et une offre pour le remplir automatiquement
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column: Upload, Client & Offre Selection */}
        <div className="space-y-4">
          {/* PDF Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                1. Charger le formulaire PDF
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {!pdfFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Cliquez pour charger un PDF</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Formulaire de demande de location
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium truncate max-w-[200px]">{pdfFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(pdfFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPdfFile(null);
                      reset();
                    }}
                  >
                    Changer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                2. Sélectionner le client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[200px] border rounded-lg">
                {isLoadingClients ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <User className="h-8 w-8 mb-2" />
                    <p>Aucun client trouvé</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredClients.map(client => {
                      const profile = client.profiles as any;
                      const isSelected = client.id === selectedClientId;
                      
                      return (
                        <div
                          key={client.id}
                          onClick={() => setSelectedClientId(client.id)}
                          className={cn(
                            'p-3 rounded-lg cursor-pointer transition-colors',
                            isSelected 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-muted'
                          )}
                        >
                          <div className="font-medium">
                            {profile?.prenom} {profile?.nom}
                          </div>
                          <div className={cn(
                            'text-sm',
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          )}>
                            {profile?.email}
                          </div>
                          {client.budget_max && (
                            <Badge 
                              variant={isSelected ? 'secondary' : 'outline'} 
                              className="mt-1"
                            >
                              Budget: CHF {client.budget_max}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {selectedClient && (
                <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium">Client sélectionné:</p>
                  <p className="font-semibold">
                    {selectedClientProfile?.prenom} {selectedClientProfile?.nom}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offre Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Home className="h-5 w-5" />
                3. Sélectionner l'offre / logement
                <Badge variant="outline" className="ml-2">Optionnel</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedClientId ? (
                <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground border rounded-lg">
                  <User className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-center text-sm">Sélectionnez d'abord un client pour voir ses offres</p>
                </div>
              ) : (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher une offre..."
                      value={offreSearchQuery}
                      onChange={(e) => setOffreSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <ScrollArea className="h-[180px] border rounded-lg">
                    {isLoadingOffres ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredOffres.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Home className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Aucune offre envoyée à ce client</p>
                        <p className="text-xs mt-1">Le remplissage se fera sans infos logement</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filteredOffres.map(offre => {
                          const isSelected = offre.id === selectedOffreId;
                          
                          return (
                            <div
                              key={offre.id}
                              onClick={() => setSelectedOffreId(isSelected ? null : offre.id)}
                              className={cn(
                                'p-3 rounded-lg cursor-pointer transition-colors',
                                isSelected 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'hover:bg-muted'
                              )}
                            >
                              <div className="font-medium truncate">
                                {offre.adresse}
                              </div>
                              <div className={cn(
                                'text-sm flex items-center gap-2 flex-wrap mt-1',
                                isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                              )}>
                                <span>CHF {offre.prix}</span>
                                {offre.pieces && <span>• {offre.pieces} pièces</span>}
                                {offre.surface && <span>• {offre.surface}m²</span>}
                              </div>
                              {offre.type_bien && (
                                <Badge 
                                  variant={isSelected ? 'secondary' : 'outline'} 
                                  className="mt-1"
                                >
                                  {offre.type_bien}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>

                  {selectedOffre && (
                    <div className="mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">Offre sélectionnée:</p>
                      <p className="font-semibold truncate">{selectedOffre.adresse}</p>
                      <p className="text-sm text-muted-foreground">
                        CHF {selectedOffre.prix}{selectedOffre.charges ? ` + ${selectedOffre.charges} charges` : ''}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {progress.step}
              </>
            ) : (
              <>
                <Brain className="h-5 w-5 mr-2" />
                Remplir avec l'IA
              </>
            )}
          </Button>

          {isAnalyzing && (
            <Progress value={progress.percent} className="h-2" />
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Right column: Results */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  4. Résultats du remplissage
                </CardTitle>
                {result && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyAllFields}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copier tout
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Download Button - shown when results are available */}
              {result && (
                <div className="mb-4">
                  <Button
                    onClick={handleDownloadFilledPdf}
                    disabled={isGeneratingPdf}
                    className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Génération du PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5 mr-2" />
                        Télécharger le PDF rempli
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {result.fields.length} champs identifiés seront insérés dans le PDF
                  </p>
                </div>
              )}
              
              {!result ? (
                <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                  <Brain className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-center">
                    Les champs pré-remplis apparaîtront ici après l'analyse
                  </p>
                  <p className="text-center text-sm mt-2">
                    Sélectionnez un PDF, un client{selectedClientId && offres.length > 0 ? ' et optionnellement une offre' : ''}, puis cliquez sur "Remplir avec l'IA"
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {/* Warnings */}
                    {result.warnings.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-1">
                            {result.warnings.map((warning, i) => (
                              <li key={i} className="text-sm">{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Fields */}
                    <div className="space-y-2">
                      {result.fields.map((field, index) => (
                        <div 
                          key={index}
                          className="p-3 bg-muted rounded-lg group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-muted-foreground">
                                {field.label}
                              </p>
                              <p className="font-medium break-words">{field.value || '—'}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={() => copyFieldValue(field.value)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          {field.confidence < 0.7 && (
                            <Badge variant="outline" className="mt-2 text-orange-600">
                              Confiance faible
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Suggestions */}
                    {result.suggestions.length > 0 && (
                      <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-5 w-5 text-primary" />
                          <span className="font-medium">Suggestions</span>
                        </div>
                        <ul className="space-y-1">
                          {result.suggestions.map((suggestion, i) => (
                            <li key={i} className="text-sm text-muted-foreground">
                              • {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

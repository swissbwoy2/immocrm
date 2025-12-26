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
  Download,
  Loader2,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAIFormFiller, FormField, AIFormResult } from '@/hooks/useAIFormFiller';
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

export default function SmartRentalFormFiller() {
  const { userRole } = useAuth();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAnalyzing, progress, error, result, analyzeAndFill, reset } = useAIFormFiller();

  // Load clients
  useEffect(() => {
    loadClients();
  }, [userRole]);

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

    const result = await analyzeAndFill(pdfFile, selectedClientId);
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

  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    const profile = client.profiles as any;
    const fullName = `${profile?.prenom || ''} ${profile?.nom || ''}`.toLowerCase();
    const email = (profile?.email || '').toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedClientProfile = selectedClient?.profiles as any;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          Remplissage IA de demande de location
        </h1>
        <p className="text-muted-foreground mt-1">
          Chargez un formulaire PDF et sélectionnez un client pour le remplir automatiquement
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left column: Upload & Client Selection */}
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

              <ScrollArea className="h-[250px] border rounded-lg">
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

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={!pdfFile || !selectedClientId || isAnalyzing}
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
                  3. Résultats du remplissage
                </CardTitle>
                {result && (
                  <Button variant="outline" size="sm" onClick={copyAllFields}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copier tout
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <Brain className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-center">
                    Les champs pré-remplis apparaîtront ici après l'analyse
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
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

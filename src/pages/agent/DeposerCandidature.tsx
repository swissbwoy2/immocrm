import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Users, Home, Mail, CheckCircle, FileEdit, Paperclip, FileText, Image, File, Upload, X, Eye, AlertCircle, Settings, FileSignature } from "lucide-react";
import { ClientMultiSelect } from "@/components/ClientMultiSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { EmailTemplatesManager } from "@/components/EmailTemplatesManager";
import { AttachmentPreviewDialog } from "@/components/AttachmentPreviewDialog";

type ClientGender = 'masculin' | 'feminin';

interface Client {
  id: string;
  user_id: string;
  profiles?: {
    prenom: string;
    nom: string;
    email: string;
  } | null;
}

interface Offre {
  id: string;
  adresse: string;
  prix: number;
  pieces?: number | null;
  type_bien?: string | null;
}

interface Document {
  id: string;
  nom: string;
  type: string;
  url: string | null;
  type_document: string | null;
  taille: number | null;
  client_id: string | null;
}

interface LocalFile {
  file: File;
  preview?: string;
}

export default function DeposerCandidature() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedOffreId, setSelectedOffreId] = useState<string>("");
  const [deposerCandidature, setDeposerCandidature] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [signatureHtml, setSignatureHtml] = useState<string>('');
  
  // URL params for pre-filling
  const preClientId = searchParams.get('clientId');
  const preOffreId = searchParams.get('offreId');

  // Email templates
  const { getTemplatesWithDefaults, initializeDefaultTemplates } = useEmailTemplates('dossier');
  const emailTemplates = getTemplatesWithDefaults();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [clientGender, setClientGender] = useState<ClientGender>('masculin');
  const [showTemplatesManager, setShowTemplatesManager] = useState(false);

  // Documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Local files
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    initializeDefaultTemplates();
  }, []);

  // Pre-fill from URL params when data is loaded
  useEffect(() => {
    if (!loading && clients.length > 0 && offres.length > 0) {
      if (preClientId && !selectedClientIds.length) {
        const clientExists = clients.find(c => c.id === preClientId);
        if (clientExists) {
          setSelectedClientIds([preClientId]);
        }
      }
      if (preOffreId && !selectedOffreId) {
        const offreExists = offres.find(o => o.id === preOffreId);
        if (offreExists) {
          setSelectedOffreId(preOffreId);
        }
      }
    }
  }, [loading, clients, offres, preClientId, preOffreId]);

  // Load documents when clients are selected
  useEffect(() => {
    if (selectedClientIds.length > 0) {
      loadClientDocuments();
    } else {
      setDocuments([]);
      setSelectedDocuments([]);
    }
  }, [selectedClientIds]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      localFiles.forEach(lf => {
        if (lf.preview) URL.revokeObjectURL(lf.preview);
      });
    };
  }, [localFiles]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load agent data
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Load email signature
      const { data: emailConfig } = await supabase
        .from('email_configurations')
        .select('signature_html')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (emailConfig?.signature_html) {
        setSignatureHtml(emailConfig.signature_html);
      }

      if (agentData) {
        setAgentId(agentData.id);

        const { data: clientsData } = await supabase
          .from('clients')
          .select(`
            id,
            user_id,
            profiles:user_id (
              prenom,
              nom,
              email
            )
          `)
          .eq('agent_id', agentData.id)
          .eq('statut', 'actif');

        if (clientsData) {
          setClients(clientsData as Client[]);
        }

        const { data: offresData } = await supabase
          .from('offres')
          .select('id, adresse, prix, pieces, type_bien')
          .eq('agent_id', agentData.id)
          .order('created_at', { ascending: false });

        if (offresData) {
          setOffres(offresData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientDocuments = async () => {
    if (selectedClientIds.length === 0) return;
    
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, nom, type, url, type_document, taille, client_id')
        .in('client_id', selectedClientIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Get client names for template
  const getClientNames = () => {
    return selectedClientIds
      .map(id => {
        const client = clients.find(c => c.id === id);
        return client?.profiles ? `${client.profiles.prenom} ${client.profiles.nom}` : '';
      })
      .filter(Boolean)
      .join(', ');
  };

  // Helper function to get gender text
  const getGenderText = (gender: ClientGender): string => {
    const count = selectedClientIds.length;
    if (count > 1) {
      return gender === 'masculin' ? 'mes clients' : 'mes clientes';
    }
    return gender === 'masculin' ? 'mon client' : 'ma cliente';
  };

  // Apply template with variable replacement
  const applyTemplate = (templateId: string, gender: ClientGender) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (!template) return;

    const selectedOffre = offres.find(o => o.id === selectedOffreId);
    const clientNames = getClientNames();
    
    let body = template.body_template;
    let subjectText = template.subject_template || '';
    
    // Replace variables
    body = body.replace(/{client_gender}/g, getGenderText(gender));
    body = body.replace(/{client_name}/g, clientNames);
    subjectText = subjectText.replace(/{client_name}/g, clientNames);
    
    if (selectedOffre) {
      body = body.replace(/{address}/g, selectedOffre.adresse);
      body = body.replace(/{pieces}/g, selectedOffre.pieces?.toString() || 'N/A');
      body = body.replace(/{price}/g, selectedOffre.prix?.toLocaleString() || 'N/A');
      subjectText = subjectText.replace(/{address}/g, selectedOffre.adresse);
      subjectText = subjectText.replace(/{pieces}/g, selectedOffre.pieces?.toString() || 'N/A');
      subjectText = subjectText.replace(/{price}/g, selectedOffre.prix?.toLocaleString() || 'N/A');
    } else {
      body = body.replace(/{address}/g, '[adresse]');
      body = body.replace(/{pieces}/g, '[pièces]');
      body = body.replace(/{price}/g, '[prix]');
      subjectText = subjectText.replace(/{address}/g, '[adresse]');
      subjectText = subjectText.replace(/{pieces}/g, '[pièces]');
      subjectText = subjectText.replace(/{price}/g, '[prix]');
    }
    
    setBodyHtml(body);
    if (subjectText) setSubject(subjectText);
  };

  // Update subject when offer or clients change
  useEffect(() => {
    if (selectedOffreId && selectedClientIds.length > 0) {
      const offre = offres.find(o => o.id === selectedOffreId);
      const clientNames = getClientNames();
      
      if (offre && !selectedTemplateId) {
        setSubject(`Candidature${selectedClientIds.length > 1 ? 's' : ''} - ${offre.adresse} - ${clientNames}`);
      } else if (selectedTemplateId) {
        applyTemplate(selectedTemplateId, clientGender);
      }
    }
  }, [selectedOffreId, selectedClientIds, offres, clients]);

  // Apply template when template or gender changes
  useEffect(() => {
    if (selectedTemplateId) {
      applyTemplate(selectedTemplateId, clientGender);
    }
  }, [selectedTemplateId, clientGender, emailTemplates]);

  // Document handling
  const toggleDocument = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const selectAllDocuments = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(d => d.id));
    }
  };

  const getDocumentIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get client name for a document
  const getDocumentClientName = (clientId: string | null) => {
    if (!clientId) return '';
    const client = clients.find(c => c.id === clientId);
    return client?.profiles ? `${client.profiles.prenom} ${client.profiles.nom}` : '';
  };

  // Local file handling
  const addLocalFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const maxSizePerFile = 10 * 1024 * 1024; // 10 MB per file
    
    const validFiles: LocalFile[] = [];
    
    for (const file of fileArray) {
      if (file.size > maxSizePerFile) {
        toast({
          title: "Fichier trop volumineux",
          description: `${file.name} dépasse 10 MB`,
          variant: "destructive",
        });
        continue;
      }
      
      const isDuplicate = localFiles.some(lf => lf.file.name === file.name && lf.file.size === file.size);
      if (isDuplicate) continue;
      
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }
      
      validFiles.push({ file, preview });
    }
    
    setLocalFiles(prev => [...prev, ...validFiles]);
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addLocalFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeLocalFile = (index: number) => {
    setLocalFiles(prev => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return newFiles;
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addLocalFiles(e.dataTransfer.files);
    }
  };

  const openPreview = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewFile({ file, url });
  };

  const closePreview = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url);
      setPreviewFile(null);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Calculate total size
  const calculateTotalSize = () => {
    const clientDocsSize = documents
      .filter(d => selectedDocuments.includes(d.id))
      .reduce((acc, d) => acc + (d.taille || 0), 0);
    const localFilesSize = localFiles.reduce((acc, lf) => acc + lf.file.size, 0);
    return clientDocsSize + localFilesSize;
  };

  const totalSize = calculateTotalSize();
  const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25 MB
  const totalAttachments = selectedDocuments.length + localFiles.length;

  const handleSubmit = async () => {
    if (!deposerCandidature) {
      toast({
        title: "Erreur",
        description: "Veuillez cocher 'Déposer une candidature'",
        variant: "destructive",
      });
      return;
    }

    if (selectedClientIds.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un client",
        variant: "destructive",
      });
      return;
    }

    if (!selectedOffreId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une offre",
        variant: "destructive",
      });
      return;
    }

    if (!recipientEmail || !subject || !bodyHtml) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs de l'email",
        variant: "destructive",
      });
      return;
    }

    if (totalSize > MAX_ATTACHMENT_SIZE) {
      toast({
        title: "Pièces jointes trop volumineuses",
        description: `La taille totale (${formatFileSize(totalSize)}) dépasse la limite de 25 MB`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Prepare attachments from client documents
      const clientDocAttachments = documents
        .filter(d => selectedDocuments.includes(d.id) && d.url)
        .map(d => ({
          filename: d.nom,
          url: d.url!,
          content_type: d.type,
        }));

      // Prepare attachments from local files (convert to base64)
      const localFileAttachments = await Promise.all(
        localFiles.map(async (lf) => ({
          filename: lf.file.name,
          content: await fileToBase64(lf.file),
          content_type: lf.file.type,
        }))
      );

      // Combine all attachments
      const attachments = [...clientDocAttachments, ...localFileAttachments];

      // Build final email body with signature
      const finalBodyHtml = signatureHtml 
        ? `${bodyHtml}<br/><br/>${signatureHtml}` 
        : bodyHtml;

      // Send email
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject: subject,
          body_html: finalBodyHtml,
          attachments: attachments.length > 0 ? attachments : undefined,
        },
      });

      if (emailError) throw emailError;
      if (!emailResult?.success) throw new Error(emailResult?.error || "Erreur d'envoi");

      // Create or update candidature for each selected client
      let successCount = 0;
      for (const clientId of selectedClientIds) {
        // Check if a candidature already exists (e.g., created by client request)
        const { data: existingCandidature } = await supabase
          .from('candidatures')
          .select('id')
          .eq('offre_id', selectedOffreId)
          .eq('client_id', clientId)
          .maybeSingle();

        let candidatureError;
        if (existingCandidature) {
          // Update existing candidature
          const { error } = await supabase
            .from('candidatures')
            .update({
              statut: 'en_attente',
              dossier_complet: true,
              date_depot: new Date().toISOString(),
              message_client: bodyHtml,
            })
            .eq('id', existingCandidature.id);
          candidatureError = error;
        } else {
          // Create new candidature
          const { error } = await supabase
            .from('candidatures')
            .insert({
              offre_id: selectedOffreId,
              client_id: clientId,
              statut: 'en_attente',
              dossier_complet: true,
              date_depot: new Date().toISOString(),
              message_client: bodyHtml,
            });
          candidatureError = error;
        }

        if (!candidatureError) {
          successCount++;
          
          const client = clients.find(c => c.id === clientId);
          if (client) {
            await supabase.from('notifications').insert({
              user_id: client.user_id,
              type: 'candidature_deposee',
              title: 'Dossier déposé',
              message: `Votre agent a déposé votre dossier à la régie pour l'offre.`,
              link: '/client/mes-candidatures',
            });
          }
        } else {
          console.error('Error creating candidature for client:', clientId, candidatureError);
        }
      }

      toast({
        title: "Candidatures déposées",
        description: `${successCount} dossier(s) déposé(s) avec succès. Email envoyé à ${recipientEmail}${totalAttachments > 0 ? ` avec ${totalAttachments} pièce(s) jointe(s)` : ''}.`,
      });

      // Reset form
      setSelectedClientIds([]);
      setSelectedOffreId("");
      setRecipientEmail("");
      setRecipientName("");
      setSubject("");
      setBodyHtml("");
      setSelectedTemplateId("");
      setSelectedDocuments([]);
      setLocalFiles([]);
    } catch (error: any) {
      console.error('Error submitting candidatures:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de déposer les candidatures",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedOffre = offres.find(o => o.id === selectedOffreId);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Déposer une candidature</h1>
        <p className="text-muted-foreground">
          Envoyez les dossiers de vos clients à la régie
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Confirm deposit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deposer"
                checked={deposerCandidature}
                onCheckedChange={(checked) => setDeposerCandidature(checked === true)}
              />
              <Label htmlFor="deposer" className="font-medium">
                Je souhaite déposer une candidature à la régie
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Select clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sélectionner les clients
            </CardTitle>
            <CardDescription>
              Sélectionnez un ou plusieurs clients pour cette candidature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientMultiSelect
              clients={clients}
              selectedClientIds={selectedClientIds}
              onSelectionChange={setSelectedClientIds}
            />
            {selectedClientIds.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedClientIds.length} client(s) sélectionné(s)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Select offer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Sélectionner l'offre
            </CardTitle>
            <CardDescription>
              Choisissez l'offre pour laquelle déposer la candidature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedOffreId} onValueChange={setSelectedOffreId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une offre" />
              </SelectTrigger>
              <SelectContent>
                {offres.map((offre) => (
                  <SelectItem key={offre.id} value={offre.id}>
                    {offre.adresse} - {offre.pieces} pièces - CHF {offre.prix.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOffre && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedOffre.adresse}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedOffre.type_bien} • {selectedOffre.pieces} pièces • CHF {selectedOffre.prix.toLocaleString()}/mois
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Email template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              Modèle d'email
            </CardTitle>
            <CardDescription>
              Utilisez un modèle pour rédiger votre email plus rapidement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Genre du/des client(s)</Label>
              <RadioGroup
                value={clientGender}
                onValueChange={(value: ClientGender) => setClientGender(value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="masculin" id="masculin" />
                  <Label htmlFor="masculin" className="cursor-pointer">
                    {selectedClientIds.length > 1 ? 'Mes clients' : 'Mon client'}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="feminin" id="feminin" />
                  <Label htmlFor="feminin" className="cursor-pointer">
                    {selectedClientIds.length > 1 ? 'Mes clientes' : 'Ma cliente'}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-2">
                <Label>Modèle d'email</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="mt-6"
                onClick={() => setShowTemplatesManager(true)}
                title="Gérer les modèles"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 5: Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Documents du dossier
            </CardTitle>
            <CardDescription>
              Sélectionnez les documents à joindre à l'email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedClientIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sélectionnez d'abord un ou plusieurs clients pour voir leurs documents
              </p>
            ) : loadingDocuments ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des documents...
              </div>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun document trouvé pour les clients sélectionnés
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllDocuments}
                  >
                    {selectedDocuments.length === documents.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedDocuments.length}/{documents.length} sélectionné(s)
                  </span>
                </div>
                <ScrollArea className="h-48 border rounded-lg p-2">
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => toggleDocument(doc.id)}
                      >
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onCheckedChange={() => toggleDocument(doc.id)}
                        />
                        {getDocumentIcon(doc.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {getDocumentClientName(doc.client_id)}
                            {doc.taille && ` • ${formatFileSize(doc.taille)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* Local file upload */}
            <div className="space-y-2">
              <Label>Ajouter des fichiers supplémentaires</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Glissez-déposez des fichiers ici ou
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Parcourir
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleLocalFileSelect}
                />
              </div>
            </div>

            {/* Local files list */}
            {localFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Fichiers ajoutés ({localFiles.length})</Label>
                <div className="space-y-2">
                  {localFiles.map((lf, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 border rounded-lg"
                    >
                      {getDocumentIcon(lf.file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lf.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(lf.file.size)}
                        </p>
                      </div>
                      {lf.file.type.startsWith('image/') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPreview(lf.file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLocalFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Size indicator */}
            {totalAttachments > 0 && (
              <div className={`flex items-center gap-2 text-sm ${totalSize > MAX_ATTACHMENT_SIZE ? 'text-destructive' : 'text-muted-foreground'}`}>
                {totalSize > MAX_ATTACHMENT_SIZE && <AlertCircle className="h-4 w-4" />}
                <span>
                  Taille totale : {formatFileSize(totalSize)} / 25 MB ({totalAttachments} fichier(s))
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 6: Email to régie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email à la régie
            </CardTitle>
            <CardDescription>
              Composez l'email qui sera envoyé à la régie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipient_email">Email de la régie *</Label>
                <Input
                  id="recipient_email"
                  type="email"
                  placeholder="regie@example.ch"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient_name">Nom de la régie</Label>
                <Input
                  id="recipient_name"
                  placeholder="Régie XYZ"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Objet *</Label>
              <Input
                id="subject"
                placeholder="Candidature - [Adresse] - [Client]"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message *</Label>
              <Textarea
                id="body"
                placeholder="Madame, Monsieur,&#10;&#10;Je me permets de vous transmettre le dossier de candidature de mon/ma client(e)..."
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={8}
              />
            </div>

            {/* Signature preview */}
            {signatureHtml && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileSignature className="h-4 w-4" />
                  Signature (sera ajoutée automatiquement)
                </Label>
                <div 
                  className="p-3 bg-muted/50 rounded-lg border border-border text-sm"
                  dangerouslySetInnerHTML={{ __html: signatureHtml }}
                />
              </div>
            )}
            
            {!signatureHtml && (
              <p className="text-sm text-muted-foreground italic">
                Aucune signature configurée. Vous pouvez en ajouter une dans vos paramètres email.
              </p>
            )}

            {/* Full email preview */}
            {(bodyHtml || subject) && (
              <div className="space-y-2 pt-4 border-t">
                <Label className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Aperçu de l'email final
                </Label>
                <div className="border rounded-lg overflow-hidden">
                  {/* Email header */}
                  <div className="bg-muted/50 p-3 border-b space-y-1 text-sm">
                    <p><span className="font-medium">À :</span> {recipientEmail || '(non renseigné)'} {recipientName && `<${recipientName}>`}</p>
                    <p><span className="font-medium">Objet :</span> {subject || '(non renseigné)'}</p>
                    {totalAttachments > 0 && (
                      <p className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        <span className="font-medium">Pièces jointes :</span> {totalAttachments} fichier(s)
                      </p>
                    )}
                  </div>
                  {/* Email body */}
                  <div className="p-4 bg-background max-h-[400px] overflow-y-auto">
                    <div 
                      className="prose prose-sm max-w-none whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: signatureHtml 
                          ? `${bodyHtml.replace(/\n/g, '<br/>')}<br/><br/>${signatureHtml}` 
                          : bodyHtml.replace(/\n/g, '<br/>') 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !deposerCandidature || selectedClientIds.length === 0 || !selectedOffreId}
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer et créer {selectedClientIds.length} candidature(s)
                {totalAttachments > 0 && ` (${totalAttachments} PJ)`}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Templates Manager Dialog */}
      <EmailTemplatesManager
        open={showTemplatesManager}
        onOpenChange={setShowTemplatesManager}
        category="dossier"
      />

      {/* Preview Dialog */}
      {previewFile && (
        <AttachmentPreviewDialog
          open={!!previewFile}
          onOpenChange={(open) => !open && closePreview()}
          file={previewFile.file}
          previewUrl={previewFile.url}
        />
      )}
    </div>
  );
}

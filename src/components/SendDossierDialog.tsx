import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Paperclip, FileText, Image, File, Settings, MapPin, Upload, X, Eye, AlertCircle, FileEdit, SettingsIcon } from "lucide-react";
import { EmailConfigurationDialog } from "./EmailConfigurationDialog";
import { AttachmentPreviewDialog } from "./AttachmentPreviewDialog";
import { EmailTemplatesManager } from "./EmailTemplatesManager";
import { useEmailTemplates, EmailTemplate as DBEmailTemplate } from "@/hooks/useEmailTemplates";

type ClientGender = 'masculin' | 'feminin';

interface Document {
  id: string;
  nom: string;
  type: string;
  url: string | null;
  type_document: string | null;
  taille: number | null;
}

interface LocalFile {
  file: File;
  preview?: string;
}

interface Offre {
  id: string;
  adresse: string;
  prix: number;
  pieces?: number | null;
  date_envoi?: string | null;
}

interface SendDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  offres: Offre[];
  onCandidatureCreated?: () => void;
}

export function SendDossierDialog({ 
  open, 
  onOpenChange, 
  clientId,
  clientName,
  clientEmail,
  offres,
  onCandidatureCreated
}: SendDossierDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showTemplatesManager, setShowTemplatesManager] = useState(false);
  const [signature, setSignature] = useState("");
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedOffreId, setSelectedOffreId] = useState<string>("");
  
  // Email templates from database
  const { getTemplatesWithDefaults, initializeDefaultTemplates } = useEmailTemplates('dossier');
  const emailTemplates = getTemplatesWithDefaults();
  
  // Email template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [clientGender, setClientGender] = useState<ClientGender>('masculin');
  
  // Local files state
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Preview state
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);
  
  const [email, setEmail] = useState({
    recipient_email: "",
    recipient_name: "",
    subject: "",
    body_html: "",
    cc: "",
    bcc: "",
  });

  useEffect(() => {
    if (open) {
      checkEmailConfiguration();
      loadClientDocuments();
      initializeDefaultTemplates();
      // Reset form with client email in BCC by default
      setSelectedOffreId("");
      setSelectedTemplateId('');
      setClientGender('masculin');
      setEmail({
        recipient_email: "",
        recipient_name: "",
        subject: "",
        body_html: "",
        cc: "",
        bcc: clientEmail || "",
      });
      setSelectedDocuments([]);
      setLocalFiles([]);
    }
  }, [open, clientId, clientEmail]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      localFiles.forEach(lf => {
        if (lf.preview) URL.revokeObjectURL(lf.preview);
      });
    };
  }, [localFiles]);

  // Helper function to get gender text
  const getGenderText = (gender: ClientGender): string => {
    return gender === 'masculin' ? 'mon client' : 'ma cliente';
  };

  // Apply template with variable replacement
  const applyTemplate = (templateId: string, gender: ClientGender) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (!template) return;

    const selectedOffre = offres.find(o => o.id === selectedOffreId);
    
    let body = template.body_template;
    let subject = template.subject_template || '';
    
    // Replace variables
    body = body.replace(/{client_gender}/g, getGenderText(gender));
    body = body.replace(/{client_name}/g, clientName);
    subject = subject.replace(/{client_name}/g, clientName);
    
    if (selectedOffre) {
      body = body.replace(/{address}/g, selectedOffre.adresse);
      body = body.replace(/{pieces}/g, selectedOffre.pieces?.toString() || 'N/A');
      body = body.replace(/{price}/g, selectedOffre.prix?.toLocaleString() || 'N/A');
      subject = subject.replace(/{address}/g, selectedOffre.adresse);
      subject = subject.replace(/{pieces}/g, selectedOffre.pieces?.toString() || 'N/A');
      subject = subject.replace(/{price}/g, selectedOffre.prix?.toLocaleString() || 'N/A');
    } else {
      body = body.replace(/{address}/g, '[adresse]');
      body = body.replace(/{pieces}/g, '[pièces]');
      body = body.replace(/{price}/g, '[prix]');
      subject = subject.replace(/{address}/g, '[adresse]');
      subject = subject.replace(/{pieces}/g, '[pièces]');
      subject = subject.replace(/{price}/g, '[prix]');
    }
    
    setEmail(prev => ({
      ...prev,
      body_html: body,
      subject: subject || prev.subject,
    }));
  };

  // Auto-fill when offre is selected
  useEffect(() => {
    if (selectedOffreId) {
      const selectedOffre = offres.find(o => o.id === selectedOffreId);
      if (selectedOffre) {
        // Re-apply template with new offer data
        if (selectedTemplateId) {
          applyTemplate(selectedTemplateId, clientGender);
        } else {
          setEmail(prev => ({
            ...prev,
            subject: `Candidature - ${selectedOffre.adresse} - ${clientName}`,
          }));
        }
      }
    }
  }, [selectedOffreId, offres, clientName]);

  // Apply template when template or gender changes
  useEffect(() => {
    if (selectedTemplateId) {
      applyTemplate(selectedTemplateId, clientGender);
    }
  }, [selectedTemplateId, clientGender, emailTemplates]);

  const checkEmailConfiguration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('email_configurations')
        .select('signature_html, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      setHasEmailConfig(!!data);
      if (data?.signature_html) {
        setSignature(data.signature_html);
      }
    } catch (error) {
      console.error('Error checking email config:', error);
    }
  };

  const loadClientDocuments = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, nom, type, url, type_document, taille')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

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
      
      // Check for duplicates
      const isDuplicate = localFiles.some(lf => lf.file.name === file.name && lf.file.size === file.size);
      if (isDuplicate) continue;
      
      // Create preview for images
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
      e.target.value = ''; // Reset input
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

  const handleSend = async () => {
    if (!selectedOffreId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une offre",
        variant: "destructive",
      });
      return;
    }

    if (!email.recipient_email || !email.subject || !email.body_html) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (!hasEmailConfig) {
      toast({
        title: "Configuration manquante",
        description: "Veuillez d'abord configurer vos paramètres email",
        variant: "destructive",
      });
      setShowConfigDialog(true);
      return;
    }

    // Check attachment size limit
    if (totalSize > MAX_ATTACHMENT_SIZE) {
      toast({
        title: "Pièces jointes trop volumineuses",
        description: `La taille totale des pièces jointes (${formatFileSize(totalSize)}) dépasse la limite de 25 MB`,
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

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

      // Prepare CC/BCC arrays
      const ccList = email.cc ? email.cc.split(',').map(e => e.trim()).filter(e => e) : [];
      const bccList = email.bcc ? email.bcc.split(',').map(e => e.trim()).filter(e => e) : [];

      // Call edge function to send email
      const { data, error } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          recipient_email: email.recipient_email,
          recipient_name: email.recipient_name,
          subject: email.subject,
          body_html: email.body_html,
          attachments,
          client_id: clientId,
          cc: ccList.length > 0 ? ccList : undefined,
          bcc: bccList.length > 0 ? bccList : undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Create candidature record
      const { error: candidatureError } = await supabase
        .from('candidatures')
        .insert({
          offre_id: selectedOffreId,
          client_id: clientId,
          statut: 'en_attente',
          dossier_complet: totalAttachments > 0,
          message_client: email.body_html,
          date_depot: new Date().toISOString(),
        });

      if (candidatureError) {
        console.error('Error creating candidature:', candidatureError);
        // Don't throw - email was sent successfully
      }

      toast({
        title: "Dossier envoyé",
        description: `Dossier envoyé avec succès à ${email.recipient_email}. Candidature enregistrée.`,
      });
      
      onCandidatureCreated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Erreur d'envoi",
        description: error.message || "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const selectedOffre = offres.find(o => o.id === selectedOffreId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Envoyer le dossier de candidature
            </DialogTitle>
            <DialogDescription>
              Envoyez le dossier de {clientName} à une gérance ou un propriétaire
            </DialogDescription>
          </DialogHeader>

          {!hasEmailConfig ? (
            <div className="py-8 text-center">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Vous devez d'abord configurer vos paramètres email SMTP
              </p>
              <Button onClick={() => setShowConfigDialog(true)}>
                Configurer mes emails
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Offer selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Sélectionner l'offre concernée *
                </Label>
                <Select value={selectedOffreId} onValueChange={setSelectedOffreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une offre..." />
                  </SelectTrigger>
                  <SelectContent>
                    {offres.length > 0 ? (
                      offres.map(offre => (
                        <SelectItem key={offre.id} value={offre.id}>
                          <div className="flex flex-col">
                            <span>{offre.adresse}</span>
                            <span className="text-xs text-muted-foreground">
                              {offre.prix?.toLocaleString()} CHF • {offre.pieces || 'N/A'} pièces
                              {offre.date_envoi && ` • Envoyée le ${new Date(offre.date_envoi).toLocaleDateString('fr-CH')}`}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Aucune offre disponible
                      </SelectItem>
                    )}
                  </SelectContent>
              </Select>
              </div>

              {/* Email Template Selection */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileEdit className="h-4 w-4" />
                      Modèle d'email
                    </Label>
                    <div className="flex gap-2">
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Choisir un modèle..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Email personnalisé</SelectItem>
                          {emailTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={() => setShowTemplatesManager(true)}
                        title="Gérer les modèles"
                      >
                        <SettingsIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Genre du client</Label>
                    <RadioGroup 
                      value={clientGender} 
                      onValueChange={(value: ClientGender) => setClientGender(value)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="masculin" id="masculin" />
                        <Label htmlFor="masculin" className="cursor-pointer font-normal">
                          Masculin (mon client)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="feminin" id="feminin" />
                        <Label htmlFor="feminin" className="cursor-pointer font-normal">
                          Féminin (ma cliente)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {/* Recipient */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email destinataire *</Label>
                  <Input
                    type="email"
                    value={email.recipient_email}
                    onChange={(e) => setEmail(prev => ({ ...prev, recipient_email: e.target.value }))}
                    placeholder="gerance@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom destinataire</Label>
                  <Input
                    value={email.recipient_name}
                    onChange={(e) => setEmail(prev => ({ ...prev, recipient_name: e.target.value }))}
                    placeholder="Nom de la gérance"
                  />
                </div>
              </div>

              {/* CC / BCC */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Copie (CC)</Label>
                  <Input
                    type="email"
                    value={email.cc}
                    onChange={(e) => setEmail(prev => ({ ...prev, cc: e.target.value }))}
                    placeholder="email@example.com"
                  />
                  <p className="text-xs text-muted-foreground">Le destinataire verra cette adresse</p>
                </div>
                <div className="space-y-2">
                  <Label>Copie cachée (BCC)</Label>
                  <Input
                    type="email"
                    value={email.bcc}
                    onChange={(e) => setEmail(prev => ({ ...prev, bcc: e.target.value }))}
                    placeholder={clientEmail || "email@example.com"}
                  />
                  <p className="text-xs text-muted-foreground">Le destinataire ne verra pas cette adresse</p>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label>Objet *</Label>
                <Input
                  value={email.subject}
                  onChange={(e) => setEmail(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Candidature - [Adresse] - [Nom client]"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  value={email.body_html}
                  onChange={(e) => setEmail(prev => ({ ...prev, body_html: e.target.value }))}
                  placeholder="Madame, Monsieur,&#10;&#10;Veuillez trouver ci-joint le dossier de candidature de mon client pour le bien situé..."
                  rows={6}
                />
              </div>

              {/* Signature preview */}
              {signature && (
                <div className="p-3 border rounded-md bg-muted/50">
                  <Label className="text-xs text-muted-foreground">Signature (ajoutée automatiquement) :</Label>
                  <div 
                    className="mt-1 text-sm"
                    dangerouslySetInnerHTML={{ __html: signature }}
                  />
                </div>
              )}

              {/* Attachments section - ALWAYS SHOWN */}
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-base font-medium">
                    <Paperclip className="h-4 w-4" />
                    Pièces jointes ({totalAttachments})
                  </Label>
                  {totalAttachments > 0 && (
                    <span className={`text-sm ${totalSize > MAX_ATTACHMENT_SIZE ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {formatFileSize(totalSize)} / 25 MB
                    </span>
                  )}
                </div>

                {/* Client documents */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">
                      Documents du client ({documents.length > 0 ? `${selectedDocuments.length}/${documents.length} sélectionnés` : 'aucun disponible'})
                    </Label>
                    {documents.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={selectAllDocuments}
                        className="h-7 text-xs"
                      >
                        {selectedDocuments.length === documents.length ? "Désélectionner" : "Tout sélectionner"}
                      </Button>
                    )}
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : documents.length > 0 ? (
                    <ScrollArea className="h-32 border rounded-md p-2 bg-background">
                      <div className="space-y-1">
                        {documents.map(doc => (
                          <div 
                            key={doc.id}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
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
                                {doc.type_document || 'Document'} 
                                {doc.taille && ` • ${formatFileSize(doc.taille)}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-md border border-dashed bg-muted/30">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Aucun document dans le dossier de ce client. Vous pouvez ajouter des fichiers ci-dessous.
                      </p>
                    </div>
                  )}
                </div>

                {/* Local files upload */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Fichiers supplémentaires
                  </Label>
                  
                  {/* Drop zone */}
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      isDragging 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleLocalFileSelect}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                    <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-sm text-muted-foreground mb-2">
                      Glissez vos fichiers ici
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Parcourir
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      PDF, images, documents • Max 10 MB par fichier
                    </p>
                  </div>

                  {/* List of local files */}
                  {localFiles.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {localFiles.map((lf, index) => (
                        <div 
                          key={`${lf.file.name}-${index}`}
                          className="flex items-center gap-3 p-2 rounded-md bg-background border"
                        >
                          {getDocumentIcon(lf.file.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{lf.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(lf.file.size)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {(lf.file.type.startsWith('image/') || lf.file.type === 'application/pdf') && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openPreview(lf.file)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeLocalFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowConfigDialog(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres email
                </Button>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSend} disabled={sending || !selectedOffreId}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Envoyer le dossier
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EmailConfigurationDialog 
        open={showConfigDialog} 
        onOpenChange={(open) => {
          setShowConfigDialog(open);
          if (!open) checkEmailConfiguration();
        }} 
      />

      {/* Preview dialog */}
      {previewFile && (
        <AttachmentPreviewDialog
          open={!!previewFile}
          onOpenChange={closePreview}
          file={previewFile.file}
          previewUrl={previewFile.url}
        />
      )}

      {/* Templates Manager */}
      <EmailTemplatesManager
        open={showTemplatesManager}
        onOpenChange={setShowTemplatesManager}
        category="dossier"
      />
    </>
  );
}

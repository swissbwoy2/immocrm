import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Send, Paperclip, FileText, Image, File, Settings, CheckCircle, AlertCircle, Mail, Link2, Info, User, Upload, X, Eye, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { EmailConfigurationDialog } from "@/components/EmailConfigurationDialog";
import { AttachmentPreviewDialog } from "@/components/AttachmentPreviewDialog";

interface Document {
  id: string;
  nom: string;
  type: string;
  url: string | null;
  type_document: string | null;
  taille: number | null;
}

interface Client {
  id: string;
  user_id: string;
  profile: {
    prenom: string;
    nom: string;
    email: string;
  };
}

interface LocalFile {
  file: File;
  id: string;
  previewUrl?: string;
}

const MAX_DIRECT_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25 MB

export default function EnvoyerEmail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [signature, setSignature] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [documentSourceClientId, setDocumentSourceClientId] = useState<string>("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [attachmentMode, setAttachmentMode] = useState<'direct' | 'link'>('direct');
  const [linkExpirationDays, setLinkExpirationDays] = useState<number>(7);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<LocalFile | null>(null);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  
  const [email, setEmail] = useState({
    recipient_email: "",
    recipient_name: "",
    subject: "",
    body_html: "",
  });

  useEffect(() => {
    if (user) {
      checkEmailConfiguration();
      loadClients();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        setEmail(prev => ({
          ...prev,
          recipient_email: client.profile.email,
          recipient_name: `${client.profile.prenom} ${client.profile.nom}`,
        }));
      }
    }
  }, [selectedClientId, clients]);

  useEffect(() => {
    if (documentSourceClientId) {
      loadClientDocuments(documentSourceClientId);
      const sourceClient = clients.find(c => c.id === documentSourceClientId);
      if (sourceClient) {
        setEmail(prev => ({
          ...prev,
          subject: `Dossier de candidature - ${sourceClient.profile.prenom} ${sourceClient.profile.nom}`,
        }));
      }
    } else {
      setDocuments([]);
      setSelectedDocuments([]);
    }
  }, [documentSourceClientId, clients]);

  useEffect(() => {
    const clientDocsSize = documents
      .filter(d => selectedDocuments.includes(d.id))
      .reduce((acc, d) => acc + (d.taille || 0), 0);
    const localFilesSize = localFiles.reduce((acc, f) => acc + f.file.size, 0);
    const totalSize = clientDocsSize + localFilesSize;
    
    if (totalSize > MAX_DIRECT_ATTACHMENT_SIZE && attachmentMode === 'direct') {
      setAttachmentMode('link');
      toast({
        title: "Mode lien activé automatiquement",
        description: "La taille des fichiers dépasse 25 MB, le mode lien a été activé.",
      });
    }
  }, [selectedDocuments, documents, localFiles]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      localFiles.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  const checkEmailConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('email_configurations')
        .select('signature_html, is_active')
        .eq('user_id', user?.id)
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

  const loadClients = async () => {
    if (!user) return;
    
    try {
      // Admin can see all clients
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('id, user_id');

      if (error) throw error;

      const userIds = clientsData?.map(c => c.user_id) || [];
      if (userIds.length === 0) {
        setClients([]);
        return;
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
      
      const formattedClients = clientsData?.map(client => ({
        id: client.id,
        user_id: client.user_id,
        profile: profilesMap.get(client.user_id) || { prenom: '', nom: '', email: '' },
      })).filter(c => c.profile.email) || [];

      setClients(formattedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadClientDocuments = async (clientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, nom, type, url, type_document, taille')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      setSelectedDocuments([]);
      setGeneratedLink(null);
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
    setGeneratedLink(null);
  };

  const selectAllDocuments = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(d => d.id));
    }
    setGeneratedLink(null);
  };

  const getDocumentIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const resetForm = () => {
    // Cleanup preview URLs
    localFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    
    setEmail({
      recipient_email: "",
      recipient_name: "",
      subject: "",
      body_html: "",
    });
    setSelectedClientId("");
    setDocumentSourceClientId("");
    setSelectedDocuments([]);
    setDocuments([]);
    setLocalFiles([]);
    setSendSuccess(false);
    setGeneratedLink(null);
    setAttachmentMode('direct');
    setCcEmails([]);
    setBccEmails([]);
    setCcInput("");
    setBccInput("");
    setShowCcBcc(false);
  };

  const addFilesWithPreview = (files: FileList | File[]) => {
    const newFiles: LocalFile[] = Array.from(files).map(file => ({
      file,
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      previewUrl: file.type.startsWith('image/') || file.type === 'application/pdf' 
        ? URL.createObjectURL(file) 
        : undefined,
    }));
    setLocalFiles(prev => [...prev, ...newFiles]);
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    addFilesWithPreview(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeLocalFile = (id: string) => {
    const file = localFiles.find(f => f.id === id);
    if (file?.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
    setLocalFiles(prev => prev.filter(f => f.id !== id));
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFilesWithPreview(files);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // CC/BCC handlers
  const addCcEmail = (emailToAdd: string) => {
    const trimmed = emailToAdd.trim().toLowerCase();
    if (trimmed && !ccEmails.includes(trimmed) && trimmed.includes('@')) {
      setCcEmails(prev => [...prev, trimmed]);
      setCcInput("");
    }
  };

  const addBccEmail = (emailToAdd: string) => {
    const trimmed = emailToAdd.trim().toLowerCase();
    if (trimmed && !bccEmails.includes(trimmed) && trimmed.includes('@')) {
      setBccEmails(prev => [...prev, trimmed]);
      setBccInput("");
    }
  };

  const removeCcEmail = (emailToRemove: string) => {
    setCcEmails(prev => prev.filter(e => e !== emailToRemove));
  };

  const removeBccEmail = (emailToRemove: string) => {
    setBccEmails(prev => prev.filter(e => e !== emailToRemove));
  };

  const addClientToCc = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client && !ccEmails.includes(client.profile.email.toLowerCase())) {
      setCcEmails(prev => [...prev, client.profile.email.toLowerCase()]);
    }
  };

  const addClientToBcc = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client && !bccEmails.includes(client.profile.email.toLowerCase())) {
      setBccEmails(prev => [...prev, client.profile.email.toLowerCase()]);
    }
  };

  const generateShareLink = async () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "Aucun document sélectionné",
        description: "Veuillez sélectionner au moins un document",
        variant: "destructive",
      });
      return null;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-share-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            documentIds: selectedDocuments,
            clientId: documentSourceClientId || null,
            expiresInDays: linkExpirationDays,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      const downloadUrl = `${window.location.origin}/download/${result.token}`;
      setGeneratedLink(downloadUrl);
      return downloadUrl;
    } catch (error: any) {
      console.error('Error generating share link:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le lien de partage",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSend = async () => {
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

    const selectedDocs = documents.filter(d => selectedDocuments.includes(d.id));
    const clientDocsSize = selectedDocs.reduce((acc, d) => acc + (d.taille || 0), 0);
    const localFilesSize = localFiles.reduce((acc, f) => acc + f.file.size, 0);
    const totalSize = clientDocsSize + localFilesSize;

    setSending(true);
    try {
      let finalBodyHtml = email.body_html;
      let attachments: any[] = [];

      const hasClientDocs = selectedDocuments.length > 0;
      const hasLocalFiles = localFiles.length > 0;

      if (hasClientDocs || hasLocalFiles) {
        if (attachmentMode === 'link' && hasClientDocs) {
          let linkToUse = generatedLink;
          if (!linkToUse) {
            linkToUse = await generateShareLink();
          }
          
          if (!linkToUse) {
            setSending(false);
            return;
          }

          const expirationText = linkExpirationDays > 0 
            ? `Ce lien expire dans ${linkExpirationDays} jour${linkExpirationDays > 1 ? 's' : ''}.`
            : 'Ce lien n\'a pas de date d\'expiration.';

          finalBodyHtml += `\n\n<hr style="margin: 20px 0;"/>\n<p><strong>📎 Documents joints (${selectedDocs.length} fichier${selectedDocs.length > 1 ? 's' : ''}):</strong></p>\n<p><a href="${linkToUse}" style="color: #3b82f6; text-decoration: underline;">${linkToUse}</a></p>\n<p style="font-size: 12px; color: #666;">${expirationText}</p>`;
        } else if (attachmentMode === 'direct' || hasLocalFiles) {
          if (totalSize > MAX_DIRECT_ATTACHMENT_SIZE) {
            toast({
              title: "Pièces jointes trop volumineuses",
              description: `La taille totale (${formatFileSize(totalSize)}) dépasse 25 MB. Utilisez le mode "Envoyer par lien".`,
              variant: "destructive",
            });
            setSending(false);
            return;
          }

          if (attachmentMode === 'direct') {
            attachments = selectedDocs
              .filter(d => d.url)
              .map(d => ({
                filename: d.nom,
                url: d.url!,
                content_type: d.type,
              }));
          }

          for (const localFile of localFiles) {
            const base64Content = await fileToBase64(localFile.file);
            attachments.push({
              filename: localFile.file.name,
              content: base64Content,
              content_type: localFile.file.type || 'application/octet-stream',
            });
          }
        }
      }

      const { data, error } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          recipient_email: email.recipient_email,
          recipient_name: email.recipient_name,
          subject: email.subject,
          body_html: finalBodyHtml,
          attachments,
          client_id: documentSourceClientId || null,
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          bcc: bccEmails.length > 0 ? bccEmails : undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setSendSuccess(true);
      toast({
        title: "Email envoyé avec succès",
        description: `Votre email a été envoyé à ${email.recipient_email}`,
      });
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

  const clientDocsSelectedSize = documents
    .filter(d => selectedDocuments.includes(d.id))
    .reduce((acc, d) => acc + (d.taille || 0), 0);
  const localFilesSize = localFiles.reduce((acc, f) => acc + f.file.size, 0);
  const totalSelectedSize = clientDocsSelectedSize + localFilesSize;

  const exceedsDirectLimit = totalSelectedSize > MAX_DIRECT_ATTACHMENT_SIZE;
  const hasAnyAttachments = selectedDocuments.length > 0 || localFiles.length > 0;

  if (sendSuccess) {
    return (
      <div className="flex-1 p-4 md:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Email envoyé avec succès !</h2>
            <p className="text-muted-foreground mb-6">
              Votre email a été envoyé à {email.recipient_email}
              {ccEmails.length > 0 && ` (CC: ${ccEmails.length})`}
              {bccEmails.length > 0 && ` (BCC: ${bccEmails.length})`}
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={resetForm}>
                <Mail className="h-4 w-4 mr-2" />
                Envoyer un autre email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Envoyer un email</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Envoyez des emails avec pièces jointes ou liens de téléchargement</p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowConfigDialog(true)}>
            <Settings className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Configuration SMTP</span>
            <span className="sm:hidden">Config SMTP</span>
          </Button>
        </div>

        {!hasEmailConfig ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Configuration email requise</h2>
              <p className="text-muted-foreground mb-4">
                Vous devez d'abord configurer vos paramètres SMTP pour pouvoir envoyer des emails.
              </p>
              <Button onClick={() => setShowConfigDialog(true)}>
                Configurer mes emails
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Main form */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Composer l'email</CardTitle>
                  <CardDescription>Entrez l'adresse email manuellement ou sélectionnez un client</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recipient */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email destinataire *</Label>
                      <Input
                        type="email"
                        value={email.recipient_email}
                        onChange={(e) => setEmail(prev => ({ ...prev, recipient_email: e.target.value }))}
                        placeholder="exemple@domaine.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom destinataire</Label>
                      <Input
                        value={email.recipient_name}
                        onChange={(e) => setEmail(prev => ({ ...prev, recipient_name: e.target.value }))}
                        placeholder="Nom du destinataire"
                      />
                    </div>
                  </div>

                  {/* Client selection for pre-filling recipient */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Ou pré-remplir depuis un client</Label>
                    <Select 
                      value={selectedClientId || "__none__"} 
                      onValueChange={(val) => setSelectedClientId(val === "__none__" ? "" : val)}
                    >
                      <SelectTrigger className="bg-muted/30">
                        <SelectValue placeholder="Choisir un client..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Aucun client</SelectItem>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.profile.prenom} {client.profile.nom} ({client.profile.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CC/BCC Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowCcBcc(!showCcBcc)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCcBcc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showCcBcc ? "Masquer CC/BCC" : "Ajouter CC/BCC"}
                    {(ccEmails.length > 0 || bccEmails.length > 0) && (
                      <Badge variant="secondary" className="ml-1">
                        {ccEmails.length + bccEmails.length}
                      </Badge>
                    )}
                  </button>

                  {/* CC/BCC Fields */}
                  {showCcBcc && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                      {/* CC */}
                      <div className="space-y-2">
                        <Label className="text-sm">CC (Copie)</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            type="email"
                            value={ccInput}
                            onChange={(e) => setCcInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCcEmail(ccInput);
                              }
                            }}
                            placeholder="Ajouter un email..."
                            className="flex-1"
                          />
                          <div className="flex gap-2">
                            <Select onValueChange={addClientToCc}>
                              <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="Client..." />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map(client => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.profile.prenom} {client.profile.nom}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addCcEmail(ccInput)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {ccEmails.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {ccEmails.map(ccEmail => (
                              <Badge key={ccEmail} variant="secondary" className="gap-1">
                                {ccEmail}
                                <button
                                  type="button"
                                  onClick={() => removeCcEmail(ccEmail)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* BCC */}
                      <div className="space-y-2">
                        <Label className="text-sm">BCC (Copie cachée)</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            type="email"
                            value={bccInput}
                            onChange={(e) => setBccInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addBccEmail(bccInput);
                              }
                            }}
                            placeholder="Ajouter un email..."
                            className="flex-1"
                          />
                          <div className="flex gap-2">
                            <Select onValueChange={addClientToBcc}>
                              <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="Client..." />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map(client => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.profile.prenom} {client.profile.nom}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addBccEmail(bccInput)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {bccEmails.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {bccEmails.map(bccEmail => (
                              <Badge key={bccEmail} variant="secondary" className="gap-1">
                                {bccEmail}
                                <button
                                  type="button"
                                  onClick={() => removeBccEmail(bccEmail)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subject */}
                  <div className="space-y-2">
                    <Label>Objet *</Label>
                    <Input
                      value={email.subject}
                      onChange={(e) => setEmail(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Objet de l'email"
                    />
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <Label>Message *</Label>
                    <Textarea
                      value={email.body_html}
                      onChange={(e) => setEmail(prev => ({ ...prev, body_html: e.target.value }))}
                      placeholder="Bonjour,&#10;&#10;Veuillez trouver ci-joint..."
                      rows={10}
                    />
                  </div>

                  {/* Signature preview */}
                  {signature ? (
                    <div className="p-3 border rounded-md bg-muted/50">
                      <Label className="text-xs text-muted-foreground">Signature (ajoutée automatiquement) :</Label>
                      <div 
                        className="mt-1 text-sm overflow-auto max-h-48"
                        dangerouslySetInnerHTML={{ __html: signature }}
                      />
                    </div>
                  ) : (
                    <div className="p-3 border border-dashed rounded-md bg-muted/20">
                      <p className="text-sm text-muted-foreground">
                        Aucune signature configurée. <button 
                          type="button"
                          onClick={() => setShowConfigDialog(true)}
                          className="underline hover:text-primary"
                        >
                          Ajouter une signature
                        </button>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Send button */}
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={resetForm}>
                  Réinitialiser
                </Button>
                <Button onClick={handleSend} disabled={sending} size="lg">
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer l'email
                </Button>
              </div>
            </div>

            {/* Documents sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Pièces jointes
                  </CardTitle>
                  <CardDescription>
                    Glissez-déposez vos fichiers ou sélectionnez des documents client
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Drag & Drop zone */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Upload className="h-4 w-4" />
                      Fichiers depuis votre appareil
                    </Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleLocalFileSelect}
                      className="hidden"
                    />
                    <div
                      ref={dropZoneRef}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                        ${isDragging 
                          ? 'border-primary bg-primary/10 scale-[1.02]' 
                          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                        }
                      `}
                    >
                      <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="text-sm font-medium">
                        {isDragging ? 'Déposez les fichiers ici' : 'Glissez vos fichiers ici'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ou cliquez pour sélectionner
                      </p>
                    </div>
                    
                    {localFiles.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {localFiles.map(localFile => (
                          <div 
                            key={localFile.id}
                            className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-md"
                          >
                            {getDocumentIcon(localFile.file.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{localFile.file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(localFile.file.size)}
                              </p>
                            </div>
                            {localFile.previewUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewFile(localFile);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeLocalFile(localFile.id);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    {/* Document source client selector */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4" />
                        Documents d'un client (optionnel)
                      </Label>
                      <Select 
                        value={documentSourceClientId || "__none__"} 
                        onValueChange={(val) => setDocumentSourceClientId(val === "__none__" ? "" : val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un client source..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- Aucun --</SelectItem>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.profile.prenom} {client.profile.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : documentSourceClientId && documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun document disponible pour ce client
                    </p>
                  ) : documentSourceClientId && documents.length > 0 ? (
                    <>
                      <div className="text-sm text-muted-foreground">
                        {selectedDocuments.length}/{documents.length} document(s) client sélectionné(s)
                      </div>

                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={selectAllDocuments}
                        className="w-full"
                      >
                        {selectedDocuments.length === documents.length ? "Tout désélectionner" : "Tout sélectionner"}
                      </Button>
                      
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {documents.map(doc => (
                            <div 
                              key={doc.id}
                              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                selectedDocuments.includes(doc.id) 
                                  ? 'bg-primary/10 border border-primary/20' 
                                  : 'hover:bg-muted/50'
                              }`}
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
                    </>
                  ) : null}

                  {/* Size indicator */}
                  {hasAnyAttachments && (
                    <div className={`p-3 rounded-md text-sm ${
                      exceedsDirectLimit 
                        ? 'bg-amber-500/10 border border-amber-500/20' 
                        : 'bg-muted'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        <span className="font-medium">
                          Taille totale: {formatFileSize(totalSelectedSize)}
                        </span>
                      </div>
                      {exceedsDirectLimit && (
                        <p className="text-xs mt-1 text-amber-600">
                          Dépasse 25 MB - utilisez le mode lien
                        </p>
                      )}
                    </div>
                  )}

                  {/* Attachment mode selector */}
                  {selectedDocuments.length > 0 && (
                    <div className="space-y-3 border-t pt-4">
                      <Label className="text-sm font-medium">Mode d'envoi (docs client)</Label>
                      <RadioGroup 
                        value={attachmentMode} 
                        onValueChange={(v) => setAttachmentMode(v as 'direct' | 'link')}
                      >
                        <div className={`flex items-start space-x-3 p-3 rounded-md border ${
                          exceedsDirectLimit ? 'opacity-50' : ''
                        }`}>
                          <RadioGroupItem 
                            value="direct" 
                            id="direct" 
                            disabled={exceedsDirectLimit}
                          />
                          <div className="space-y-1">
                            <Label htmlFor="direct" className="cursor-pointer flex items-center gap-2">
                              <Paperclip className="h-4 w-4" />
                              Pièces jointes directes
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Max 25 MB • Fichiers attachés à l'email
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 rounded-md border">
                          <RadioGroupItem value="link" id="link" />
                          <div className="space-y-1">
                            <Label htmlFor="link" className="cursor-pointer flex items-center gap-2">
                              <Link2 className="h-4 w-4" />
                              Envoyer par lien
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Taille illimitée • Lien de téléchargement
                            </p>
                          </div>
                        </div>
                      </RadioGroup>

                      {attachmentMode === 'link' && (
                        <div className="space-y-2 pt-2">
                          <Label className="text-xs">Expiration du lien</Label>
                          <Select 
                            value={String(linkExpirationDays)} 
                            onValueChange={(v) => {
                              setLinkExpirationDays(Number(v));
                              setGeneratedLink(null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">3 jours</SelectItem>
                              <SelectItem value="7">7 jours</SelectItem>
                              <SelectItem value="14">14 jours</SelectItem>
                              <SelectItem value="30">30 jours</SelectItem>
                              <SelectItem value="0">Jamais</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <EmailConfigurationDialog 
        open={showConfigDialog} 
        onOpenChange={(open) => {
          setShowConfigDialog(open);
          if (!open) checkEmailConfiguration();
        }} 
      />

      <AttachmentPreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        file={previewFile?.file || null}
        previewUrl={previewFile?.previewUrl || null}
      />
    </div>
  );
}

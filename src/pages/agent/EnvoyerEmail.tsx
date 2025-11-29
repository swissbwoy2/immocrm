import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Send, Paperclip, FileText, Image, File, Settings, CheckCircle, AlertCircle, Mail, Link2, Info, User } from "lucide-react";
import { EmailConfigurationDialog } from "@/components/EmailConfigurationDialog";

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

const MAX_DIRECT_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25 MB

export default function EnvoyerEmail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [signature, setSignature] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(""); // For pre-filling recipient
  const [documentSourceClientId, setDocumentSourceClientId] = useState<string>(""); // For document selection
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [attachmentMode, setAttachmentMode] = useState<'direct' | 'link'>('direct');
  const [linkExpirationDays, setLinkExpirationDays] = useState<number>(7);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  
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

  // Pre-fill recipient info when selecting a client (optional helper)
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

  // Load documents when document source changes
  useEffect(() => {
    if (documentSourceClientId) {
      loadClientDocuments(documentSourceClientId);
      // Update subject to reflect the document source client
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

  // Auto-switch to link mode if size exceeds limit
  useEffect(() => {
    const totalSize = documents
      .filter(d => selectedDocuments.includes(d.id))
      .reduce((acc, d) => acc + (d.taille || 0), 0);
    
    if (totalSize > MAX_DIRECT_ATTACHMENT_SIZE && attachmentMode === 'direct') {
      setAttachmentMode('link');
      toast({
        title: "Mode lien activé automatiquement",
        description: "La taille des fichiers dépasse 25 MB, le mode lien a été activé.",
      });
    }
  }, [selectedDocuments, documents]);

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
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;

      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('id, user_id')
        .eq('agent_id', agentData.id);

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
    setSendSuccess(false);
    setGeneratedLink(null);
    setAttachmentMode('direct');
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

      // Build proper download URL using window.location.origin
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
    const totalSize = selectedDocs.reduce((acc, d) => acc + (d.taille || 0), 0);

    setSending(true);
    try {
      let finalBodyHtml = email.body_html;
      let attachments: any[] = [];

      if (selectedDocuments.length > 0) {
        if (attachmentMode === 'link') {
          // Generate share link and add to email body
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
        } else {
          // Direct attachments - check size limit
          if (totalSize > MAX_DIRECT_ATTACHMENT_SIZE) {
            toast({
              title: "Pièces jointes trop volumineuses",
              description: `La taille totale (${formatFileSize(totalSize)}) dépasse 25 MB. Utilisez le mode "Envoyer par lien".`,
              variant: "destructive",
            });
            setSending(false);
            return;
          }

          attachments = selectedDocs
            .filter(d => d.url)
            .map(d => ({
              filename: d.nom,
              url: d.url!,
              content_type: d.type,
            }));
        }
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          recipient_email: email.recipient_email,
          recipient_name: email.recipient_name,
          subject: email.subject,
          body_html: finalBodyHtml,
          attachments,
          client_id: documentSourceClientId || null,
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

  const totalSelectedSize = documents
    .filter(d => selectedDocuments.includes(d.id))
    .reduce((acc, d) => acc + (d.taille || 0), 0);

  const exceedsDirectLimit = totalSelectedSize > MAX_DIRECT_ATTACHMENT_SIZE;

  if (sendSuccess) {
    return (
      <div className="flex-1 p-4 md:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Email envoyé avec succès !</h2>
            <p className="text-muted-foreground mb-6">
              Votre email a été envoyé à {email.recipient_email}
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Envoyer un email</h1>
            <p className="text-muted-foreground">Envoyez des emails avec pièces jointes ou liens de téléchargement</p>
          </div>
          <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configuration SMTP
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
                  <div className="grid grid-cols-2 gap-4">
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
                    Sélectionnez les documents d'un client à joindre
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Document source client selector */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4" />
                      Documents de quel client ?
                    </Label>
                    <Select 
                      value={documentSourceClientId || "__none__"} 
                      onValueChange={(val) => setDocumentSourceClientId(val === "__none__" ? "" : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un client source..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Sélectionner --</SelectItem>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.profile.prenom} {client.profile.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !documentSourceClientId ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sélectionnez un client pour voir ses documents
                    </p>
                  ) : documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun document disponible pour ce client
                    </p>
                  ) : (
                    <>
                      {/* Document count */}
                      <div className="text-sm text-muted-foreground">
                        {selectedDocuments.length}/{documents.length} document(s) sélectionné(s)
                      </div>

                      {/* Size indicator */}
                      {selectedDocuments.length > 0 && (
                        <div className={`p-3 rounded-md text-sm ${
                          exceedsDirectLimit 
                            ? 'bg-amber-500/10 border border-amber-500/20' 
                            : 'bg-muted'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            <span className="font-medium">
                              Taille: {formatFileSize(totalSelectedSize)}
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
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Mode d'envoi</Label>
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

                          {/* Link expiration setting */}
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

                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={selectAllDocuments}
                        className="w-full"
                      >
                        {selectedDocuments.length === documents.length ? "Tout désélectionner" : "Tout sélectionner"}
                      </Button>
                      
                      <ScrollArea className="h-64">
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
    </div>
  );
}

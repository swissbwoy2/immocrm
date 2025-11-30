import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Reply, Forward, Settings, Paperclip, X, ChevronDown, ChevronUp, Users, FolderOpen, FileText, ReplyAll } from "lucide-react";
import { EmailConfigurationDialog } from "./EmailConfigurationDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface ReceivedEmail {
  id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string | null;
  cc?: string | null;
}

interface Attachment {
  filename: string;
  content: string; // base64
  content_type: string;
  size: number;
}

interface ClientDocument {
  id: string;
  nom: string;
  type: string;
  url: string | null;
  taille: number | null;
}

interface Client {
  id: string;
  profile: {
    prenom: string;
    nom: string;
    email: string;
  };
}

interface ReplyEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: ReceivedEmail | null;
  mode: 'reply' | 'replyall' | 'forward';
  onSent?: () => void;
}

export function ReplyEmailDialog({ 
  open, 
  onOpenChange, 
  email,
  mode,
  onSent
}: ReplyEmailDialogProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [signature, setSignature] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showClientDocs, setShowClientDocs] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [loadingDocs, setLoadingDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    recipient_email: "",
    recipient_name: "",
    subject: "",
    body_html: "",
    cc: "",
    bcc: "",
  });

  useEffect(() => {
    if (open && email) {
      checkEmailConfiguration();
      initializeForm();
      loadClients();
      setAttachments([]);
      setShowCcBcc(mode === 'replyall');
      setShowClientDocs(false);
      setSelectedClientId("");
      setClientDocuments([]);
      setSelectedDocIds(new Set());
    }
  }, [open, email, mode]);

  useEffect(() => {
    if (selectedClientId) {
      loadClientDocuments(selectedClientId);
    } else {
      setClientDocuments([]);
      setSelectedDocIds(new Set());
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get agent ID
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agent) return;

      // Get clients with profiles
      const { data: clientsData } = await supabase
        .from('clients')
        .select(`
          id,
          profile:profiles!clients_user_id_fkey(prenom, nom, email)
        `)
        .eq('agent_id', agent.id);

      if (clientsData) {
        const formattedClients = clientsData
          .filter(c => c.profile)
          .map(c => ({
            id: c.id,
            profile: c.profile as { prenom: string; nom: string; email: string }
          }));
        setClients(formattedClients);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadClientDocuments = async (clientId: string) => {
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, nom, type, url, taille')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientDocuments(data || []);
    } catch (error) {
      console.error('Error loading client documents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents du client",
        variant: "destructive",
      });
    } finally {
      setLoadingDocs(false);
    }
  };

  const initializeForm = () => {
    if (!email) return;

    const prefix = mode === 'forward' ? 'Fwd: ' : 'Re: ';
    const subject = email.subject || '(Sans objet)';
    const newSubject = subject.startsWith(prefix) || subject.startsWith('Re: ') || subject.startsWith('Fwd: ') 
      ? subject 
      : prefix + subject;

    // Format quoted message
    const quotedHeader = `\n\n---------- Message original ----------\nDe: ${email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}\nDate: ${email.received_at ? format(new Date(email.received_at), "d MMMM yyyy 'à' HH:mm", { locale: fr }) : 'Non disponible'}\nObjet: ${email.subject || '(Sans objet)'}\nÀ: ${email.to_email}\n\n`;
    
    const quotedBody = email.body_text || '(Pas de contenu)';

    // For reply all, include original CC recipients
    let ccValue = "";
    if (mode === 'replyall' && email.cc) {
      ccValue = email.cc;
    }

    setFormData({
      recipient_email: mode === 'forward' ? "" : email.from_email,
      recipient_name: mode === 'forward' ? "" : (email.from_name || ""),
      subject: newSubject,
      body_html: mode !== 'forward' 
        ? `\n\n${quotedHeader}${quotedBody}`
        : `${quotedHeader}${quotedBody}`,
      cc: ccValue,
      bcc: "",
    });
  };

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB per file
    const maxTotal = 25 * 1024 * 1024; // 25MB total

    const currentTotal = attachments.reduce((sum, att) => sum + att.size, 0);

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast({
          title: "Fichier trop volumineux",
          description: `${file.name} dépasse la limite de 10 Mo`,
          variant: "destructive",
        });
        continue;
      }

      if (currentTotal + file.size > maxTotal) {
        toast({
          title: "Limite atteinte",
          description: "La taille totale des pièces jointes ne peut pas dépasser 25 Mo",
          variant: "destructive",
        });
        break;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          filename: file.name,
          content: base64,
          content_type: file.type || 'application/octet-stream',
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const addSelectedDocs = async () => {
    const docsToAdd = clientDocuments.filter(d => selectedDocIds.has(d.id));
    
    for (const doc of docsToAdd) {
      // Check if it's a base64 data URL or a storage path
      if (doc.url?.startsWith('data:')) {
        // Already base64
        const base64Part = doc.url.split(',')[1];
        const mimeMatch = doc.url.match(/data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        
        setAttachments(prev => {
          // Avoid duplicates
          if (prev.some(a => a.filename === doc.nom)) return prev;
          return [...prev, {
            filename: doc.nom,
            content: base64Part,
            content_type: mimeType,
            size: doc.taille || base64Part.length,
          }];
        });
      } else if (doc.url) {
        // It's a storage path - we'll pass the URL and let the edge function handle it
        try {
          // For storage files, download and convert to base64
          const { data: signedUrlData } = await supabase.storage
            .from('client-documents')
            .createSignedUrl(doc.url, 300);
          
          if (signedUrlData?.signedUrl) {
            const response = await fetch(signedUrlData.signedUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              setAttachments(prev => {
                if (prev.some(a => a.filename === doc.nom)) return prev;
                return [...prev, {
                  filename: doc.nom,
                  content: base64,
                  content_type: doc.type || 'application/octet-stream',
                  size: doc.taille || blob.size,
                }];
              });
            };
            reader.readAsDataURL(blob);
          }
        } catch (error) {
          console.error('Error downloading document:', error);
          toast({
            title: "Erreur",
            description: `Impossible de charger ${doc.nom}`,
            variant: "destructive",
          });
        }
      }
    }

    setSelectedDocIds(new Set());
    toast({
      title: "Documents ajoutés",
      description: `${docsToAdd.length} document(s) ajouté(s) aux pièces jointes`,
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const parseEmails = (emailString: string): string[] => {
    if (!emailString.trim()) return [];
    return emailString
      .split(/[,;]/)
      .map(e => e.trim())
      .filter(e => e.includes('@'));
  };

  const handleSend = async () => {
    if (!formData.recipient_email || !formData.subject) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir l'adresse email et l'objet",
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

    setSending(true);
    try {
      const ccRecipients = parseEmails(formData.cc);
      const bccRecipients = parseEmails(formData.bcc);

      const { data, error } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          recipient_email: formData.recipient_email,
          recipient_name: formData.recipient_name,
          subject: formData.subject,
          body_html: formData.body_html,
          attachments: attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            content_type: att.content_type,
          })),
          cc: ccRecipients.length > 0 ? ccRecipients : undefined,
          bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Email envoyé",
        description: `Email ${mode === 'reply' ? 'répondu' : mode === 'replyall' ? 'répondu à tous' : 'transféré'} avec succès`,
      });
      onOpenChange(false);
      onSent?.();
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

  const getIcon = () => {
    switch (mode) {
      case 'replyall': return ReplyAll;
      case 'forward': return Forward;
      default: return Reply;
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'replyall': return 'Répondre à tous';
      case 'forward': return 'Transférer';
      default: return 'Répondre';
    }
  };

  const Icon = getIcon();
  const title = getTitle();
  const totalAttachmentSize = attachments.reduce((sum, att) => sum + att.size, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription>
              {mode === 'forward' 
                ? 'Transférer cet email'
                : mode === 'replyall'
                ? `Répondre à tous les destinataires`
                : `Répondre à ${email?.from_name || email?.from_email}`}
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
              {/* To recipient */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>À *</Label>
                  <Input
                    type="email"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipient_email: e.target.value }))}
                    placeholder="destinataire@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={formData.recipient_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
                    placeholder="Nom du destinataire"
                  />
                </div>
              </div>

              {/* CC/BCC toggle */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showCcBcc ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                Cc / Cci
              </Button>

              {/* CC and BCC fields */}
              {showCcBcc && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label>Cc (copie)</Label>
                    <Input
                      type="text"
                      value={formData.cc}
                      onChange={(e) => setFormData(prev => ({ ...prev, cc: e.target.value }))}
                      placeholder="email1@ex.com, email2@ex.com"
                    />
                    <p className="text-xs text-muted-foreground">Séparez les adresses par des virgules</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Cci (copie cachée)</Label>
                    <Input
                      type="text"
                      value={formData.bcc}
                      onChange={(e) => setFormData(prev => ({ ...prev, bcc: e.target.value }))}
                      placeholder="email1@ex.com, email2@ex.com"
                    />
                    <p className="text-xs text-muted-foreground">Les destinataires ne verront pas ces adresses</p>
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-2">
                <Label>Objet *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Objet de l'email"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pièces jointes</Label>
                  <span className="text-xs text-muted-foreground">
                    {totalAttachmentSize > 0 && `${formatFileSize(totalAttachmentSize)} / 25 Mo`}
                  </span>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="*/*"
                />
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Joindre un fichier
                  </Button>
                  
                  {clients.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClientDocs(!showClientDocs)}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Documents client
                    </Button>
                  )}
                </div>

                {/* Client documents selector */}
                {showClientDocs && clients.length > 0 && (
                  <div className="border rounded-lg p-3 space-y-3 animate-in slide-in-from-top-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Sélectionner un client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.profile.prenom} {client.profile.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedClientId && (
                      <>
                        {loadingDocs ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : clientDocuments.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Aucun document pour ce client
                          </p>
                        ) : (
                          <>
                            <ScrollArea className="max-h-40">
                              <div className="space-y-1">
                                {clientDocuments.map(doc => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 cursor-pointer"
                                    onClick={() => toggleDocSelection(doc.id)}
                                  >
                                    <Checkbox 
                                      checked={selectedDocIds.has(doc.id)}
                                      onCheckedChange={() => toggleDocSelection(doc.id)}
                                    />
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="text-sm truncate flex-1">{doc.nom}</span>
                                    {doc.taille && (
                                      <span className="text-xs text-muted-foreground">
                                        {formatFileSize(doc.taille)}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                            {selectedDocIds.size > 0 && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={addSelectedDocs}
                                className="w-full"
                              >
                                Ajouter {selectedDocIds.size} document(s)
                              </Button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Attached files display */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachments.map((att, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="flex items-center gap-1 py-1 px-2"
                      >
                        <Paperclip className="h-3 w-3" />
                        <span className="max-w-[150px] truncate">{att.filename}</span>
                        <span className="text-xs text-muted-foreground">({formatFileSize(att.size)})</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={formData.body_html}
                  onChange={(e) => setFormData(prev => ({ ...prev, body_html: e.target.value }))}
                  placeholder="Votre réponse..."
                  rows={10}
                  className="font-mono text-sm"
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
                  <Button onClick={handleSend} disabled={sending}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Envoyer
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
    </>
  );
}

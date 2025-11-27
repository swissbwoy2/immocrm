import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Paperclip, FileText, Image, File, Settings } from "lucide-react";
import { EmailConfigurationDialog } from "./EmailConfigurationDialog";

interface Document {
  id: string;
  nom: string;
  type: string;
  url: string | null;
  type_document: string | null;
  taille: number | null;
}

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  recipientEmail?: string;
  defaultSubject?: string;
}

export function SendEmailDialog({ 
  open, 
  onOpenChange, 
  clientId,
  clientName,
  clientEmail,
  recipientEmail,
  defaultSubject 
}: SendEmailDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [signature, setSignature] = useState("");
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  
  const [email, setEmail] = useState({
    recipient_email: recipientEmail || clientEmail || "",
    recipient_name: clientName || "",
    subject: defaultSubject || "",
    body_html: "",
  });

  useEffect(() => {
    if (open) {
      checkEmailConfiguration();
      if (clientId) {
        loadClientDocuments();
      }
      // Reset form
      setEmail({
        recipient_email: recipientEmail || clientEmail || "",
        recipient_name: clientName || "",
        subject: defaultSubject || `Dossier de candidature${clientName ? ` - ${clientName}` : ""}`,
        body_html: "",
      });
      setSelectedDocuments([]);
    }
  }, [open, clientId, clientEmail, clientName, recipientEmail, defaultSubject]);

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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

    // Check attachment size limit (25 MB)
    const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25 MB
    const selectedDocs = documents.filter(d => selectedDocuments.includes(d.id));
    const totalSize = selectedDocs.reduce((acc, d) => acc + (d.taille || 0), 0);
    
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

      // Prepare attachments
      const attachments = documents
        .filter(d => selectedDocuments.includes(d.id) && d.url)
        .map(d => ({
          filename: d.nom,
          url: d.url!,
          content_type: d.type,
        }));

      // Call edge function
      const { data, error } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          ...email,
          attachments,
          client_id: clientId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Email envoyé",
        description: `Email envoyé avec succès à ${email.recipient_email}`,
      });
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Envoyer un email
            </DialogTitle>
            <DialogDescription>
              {clientName ? `Envoyer le dossier de ${clientName}` : "Composer et envoyer un email"}
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
              {/* Recipient */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email destinataire *</Label>
                  <Input
                    type="email"
                    value={email.recipient_email}
                    onChange={(e) => setEmail(prev => ({ ...prev, recipient_email: e.target.value }))}
                    placeholder="destinataire@example.com"
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
                  placeholder="Bonjour,&#10;&#10;Veuillez trouver ci-joint le dossier de candidature..."
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

              {/* Documents selection */}
              {clientId && documents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Pièces jointes ({selectedDocuments.length}/{documents.length})
                    </Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={selectAllDocuments}
                    >
                      {selectedDocuments.length === documents.length ? "Tout désélectionner" : "Tout sélectionner"}
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-40 border rounded-md p-2">
                    <div className="space-y-2">
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
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

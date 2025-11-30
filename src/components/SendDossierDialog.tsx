import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Paperclip, FileText, Image, File, Settings, MapPin } from "lucide-react";
import { EmailConfigurationDialog } from "./EmailConfigurationDialog";

interface Document {
  id: string;
  nom: string;
  type: string;
  url: string | null;
  type_document: string | null;
  taille: number | null;
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
  offres: Offre[];
  onCandidatureCreated?: () => void;
}

export function SendDossierDialog({ 
  open, 
  onOpenChange, 
  clientId,
  clientName,
  offres,
  onCandidatureCreated
}: SendDossierDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [signature, setSignature] = useState("");
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedOffreId, setSelectedOffreId] = useState<string>("");
  
  const [email, setEmail] = useState({
    recipient_email: "",
    recipient_name: "",
    subject: "",
    body_html: "",
  });

  useEffect(() => {
    if (open) {
      checkEmailConfiguration();
      loadClientDocuments();
      // Reset form
      setSelectedOffreId("");
      setEmail({
        recipient_email: "",
        recipient_name: "",
        subject: "",
        body_html: "",
      });
      setSelectedDocuments([]);
    }
  }, [open, clientId]);

  // Auto-fill when offre is selected
  useEffect(() => {
    if (selectedOffreId) {
      const selectedOffre = offres.find(o => o.id === selectedOffreId);
      if (selectedOffre) {
        setEmail(prev => ({
          ...prev,
          subject: `Candidature - ${selectedOffre.adresse} - ${clientName}`,
        }));
      }
    }
  }, [selectedOffreId, offres, clientName]);

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

      // Call edge function to send email
      const { data, error } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          ...email,
          attachments,
          client_id: clientId,
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
          dossier_complet: selectedDocuments.length > 0,
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

              {/* Documents selection */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Documents du client ({selectedDocuments.length}/{documents.length})
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
    </>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Send, Paperclip, FileText, Image, File, Settings, CheckCircle, AlertCircle, Mail } from "lucide-react";
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

export default function EnvoyerEmail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [signature, setSignature] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [sendSuccess, setSendSuccess] = useState(false);
  
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
      loadClientDocuments(selectedClientId);
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        setEmail(prev => ({
          ...prev,
          recipient_email: client.profile.email,
          recipient_name: `${client.profile.prenom} ${client.profile.nom}`,
          subject: `Dossier de candidature - ${client.profile.prenom} ${client.profile.nom}`,
        }));
      }
    } else {
      setDocuments([]);
      setSelectedDocuments([]);
    }
  }, [selectedClientId, clients]);

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
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;

      // Get clients assigned to this agent
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('id, user_id')
        .eq('agent_id', agentData.id);

      if (error) throw error;

      // Get profiles for clients
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

  const resetForm = () => {
    setEmail({
      recipient_email: "",
      recipient_name: "",
      subject: "",
      body_html: "",
    });
    setSelectedClientId("");
    setSelectedDocuments([]);
    setDocuments([]);
    setSendSuccess(false);
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

    setSending(true);
    try {
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
          client_id: selectedClientId || null,
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
            <p className="text-muted-foreground">Envoyez des emails à n'importe quel destinataire (clients, propriétaires, régies, etc.)</p>
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
              <p className="text-sm text-muted-foreground mb-6">
                N'oubliez pas d'ajouter votre signature HTML dans la configuration pour qu'elle apparaisse automatiquement dans vos emails.
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
                  <CardDescription>Entrez l'adresse email du destinataire ou sélectionnez un client existant</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recipient - FIRST */}
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

                  {/* Client selection - OPTIONAL helper */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Ou sélectionner un client pour pré-remplir</Label>
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
                    {selectedClientId 
                      ? `${selectedDocuments.length}/${documents.length} document(s) sélectionné(s)`
                      : "Sélectionnez un client pour voir ses documents"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !selectedClientId ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sélectionnez un client pour attacher ses documents
                    </p>
                  ) : documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun document disponible pour ce client
                    </p>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={selectAllDocuments}
                        className="w-full mb-2"
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

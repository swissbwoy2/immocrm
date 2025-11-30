import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Reply, Forward, Settings, Paperclip, X, ChevronDown, ChevronUp, Users, FolderOpen, FileText, ReplyAll, Eye, BookUser, Plus, Image, File } from "lucide-react";
import { EmailConfigurationDialog } from "./EmailConfigurationDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface AddressBookContact {
  email: string;
  name: string;
  count: number;
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
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [addressBook, setAddressBook] = useState<AddressBookContact[]>([]);
  const [addressBookSearch, setAddressBookSearch] = useState("");
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
      loadAddressBook();
      setAttachments([]);
      setShowCcBcc(mode === 'replyall');
      setShowClientDocs(false);
      setShowAddressBook(false);
      setShowPreview(false);
      setPreviewAttachment(null);
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

  const loadAddressBook = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get contacts from sent emails
      const { data: sentEmails } = await supabase
        .from('sent_emails')
        .select('recipient_email, recipient_name')
        .eq('sender_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(100);

      // Get contacts from received emails
      const { data: receivedEmails } = await supabase
        .from('received_emails')
        .select('from_email, from_name')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(100);

      // Get client emails
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let clientEmails: { email: string; name: string }[] = [];
      if (agent) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('profile:profiles!clients_user_id_fkey(prenom, nom, email)')
          .eq('agent_id', agent.id);

        if (clientsData) {
          clientEmails = clientsData
            .filter(c => c.profile && (c.profile as any).email)
            .map(c => ({
              email: (c.profile as any).email,
              name: `${(c.profile as any).prenom} ${(c.profile as any).nom}`.trim()
            }));
        }
      }

      // Combine and deduplicate
      const contactMap = new Map<string, { name: string; count: number }>();

      // Add clients first (priority)
      clientEmails.forEach(c => {
        const existing = contactMap.get(c.email.toLowerCase());
        contactMap.set(c.email.toLowerCase(), {
          name: c.name || existing?.name || '',
          count: (existing?.count || 0) + 5 // Boost clients
        });
      });

      // Add sent email recipients
      sentEmails?.forEach(e => {
        if (e.recipient_email) {
          const key = e.recipient_email.toLowerCase();
          const existing = contactMap.get(key);
          contactMap.set(key, {
            name: e.recipient_name || existing?.name || '',
            count: (existing?.count || 0) + 1
          });
        }
      });

      // Add received email senders
      receivedEmails?.forEach(e => {
        if (e.from_email) {
          const key = e.from_email.toLowerCase();
          const existing = contactMap.get(key);
          contactMap.set(key, {
            name: e.from_name || existing?.name || '',
            count: (existing?.count || 0) + 1
          });
        }
      });

      // Convert to array and sort by frequency
      const contacts: AddressBookContact[] = Array.from(contactMap.entries())
        .map(([email, data]) => ({ email, ...data }))
        .sort((a, b) => b.count - a.count);

      setAddressBook(contacts);
    } catch (error) {
      console.error('Error loading address book:', error);
    }
  };

  const loadClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get agent ID
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

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
      // Get the client's user_id first
      const { data: clientData } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();

      if (!clientData) {
        setClientDocuments([]);
        return;
      }

      // Query documents by user_id (which is how RLS checks)
      const { data, error } = await supabase
        .from('documents')
        .select('id, nom, type, url, taille')
        .eq('user_id', clientData.user_id)
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

  const selectFromAddressBook = (contact: AddressBookContact, field: 'to' | 'cc' | 'bcc') => {
    if (field === 'to') {
      setFormData(prev => ({ 
        ...prev, 
        recipient_email: contact.email,
        recipient_name: contact.name 
      }));
    } else if (field === 'cc') {
      setFormData(prev => ({
        ...prev,
        cc: prev.cc ? `${prev.cc}, ${contact.email}` : contact.email
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        bcc: prev.bcc ? `${prev.bcc}, ${contact.email}` : contact.email
      }));
    }
    setShowAddressBook(false);
    setAddressBookSearch("");
  };

  const canPreview = (attachment: Attachment) => {
    const type = attachment.content_type.toLowerCase();
    return type.startsWith('image/') || type === 'application/pdf';
  };

  const openPreview = (attachment: Attachment) => {
    setPreviewAttachment(attachment);
    setShowPreview(true);
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

  const filteredAddressBook = addressBook.filter(c => 
    !addressBookSearch || 
    c.email.toLowerCase().includes(addressBookSearch.toLowerCase()) ||
    c.name.toLowerCase().includes(addressBookSearch.toLowerCase())
  );

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
              {/* To recipient with address book button */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>À *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowAddressBook(!showAddressBook)}
                    >
                      <BookUser className="h-3 w-3 mr-1" />
                      Carnet
                    </Button>
                  </div>
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

              {/* Address Book Panel */}
              {showAddressBook && (
                <div className="border rounded-lg p-3 space-y-3 animate-in slide-in-from-top-2 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <BookUser className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Carnet d'adresses</span>
                    <span className="text-xs text-muted-foreground">({addressBook.length} contacts)</span>
                  </div>
                  <Input
                    placeholder="Rechercher un contact..."
                    value={addressBookSearch}
                    onChange={(e) => setAddressBookSearch(e.target.value)}
                    className="h-8"
                  />
                  <ScrollArea className="max-h-40">
                    <div className="space-y-1">
                      {filteredAddressBook.slice(0, 20).map((contact, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded hover:bg-accent/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{contact.name || contact.email}</p>
                            {contact.name && <p className="text-xs text-muted-foreground truncate">{contact.email}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => selectFromAddressBook(contact, 'to')}>
                              À
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => selectFromAddressBook(contact, 'cc')}>
                              Cc
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => selectFromAddressBook(contact, 'bcc')}>
                              Cci
                            </Button>
                          </div>
                        </div>
                      ))}
                      {filteredAddressBook.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Aucun contact trouvé</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

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
                            <p className="text-xs text-muted-foreground">{clientDocuments.length} document(s) disponible(s)</p>
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

                {/* Attached files display with preview */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachments.map((att, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="flex items-center gap-1 py-1 px-2"
                      >
                        {att.content_type.startsWith('image/') ? (
                          <Image className="h-3 w-3" />
                        ) : (
                          <File className="h-3 w-3" />
                        )}
                        <span className="max-w-[120px] truncate">{att.filename}</span>
                        <span className="text-xs text-muted-foreground">({formatFileSize(att.size)})</span>
                        {canPreview(att) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openPreview(att); }}
                            className="ml-1 hover:text-primary"
                            title="Prévisualiser"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        )}
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

      {/* Attachment Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Prévisualisation : {previewAttachment?.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewAttachment && (
              previewAttachment.content_type.startsWith('image/') ? (
                <img 
                  src={`data:${previewAttachment.content_type};base64,${previewAttachment.content}`}
                  alt={previewAttachment.filename}
                  className="max-w-full h-auto mx-auto rounded-lg"
                />
              ) : previewAttachment.content_type === 'application/pdf' ? (
                <iframe
                  src={`data:${previewAttachment.content_type};base64,${previewAttachment.content}`}
                  className="w-full h-[70vh] rounded-lg"
                  title={previewAttachment.filename}
                />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Prévisualisation non disponible pour ce type de fichier
                </p>
              )
            )}
          </div>
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

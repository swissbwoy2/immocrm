import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Mail, 
  Search, 
  Calendar, 
  User, 
  Paperclip, 
  CheckCircle, 
  XCircle,
  Eye,
  Loader2,
  FileText
} from "lucide-react";

interface SentEmail {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body_html: string | null;
  status: string | null;
  sent_at: string | null;
  attachments: unknown;
  error_message: string | null;
  client_id: string | null;
}

export default function HistoriqueEmails() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<SentEmail[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadEmails();
    }
  }, [user]);

  useEffect(() => {
    filterEmails();
  }, [searchTerm, emails]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      // Admin can see all emails
      const { data, error } = await supabase
        .from('sent_emails')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEmails = () => {
    if (!searchTerm) {
      setFilteredEmails(emails);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = emails.filter(email => 
      email.recipient_email.toLowerCase().includes(term) ||
      email.recipient_name?.toLowerCase().includes(term) ||
      email.subject.toLowerCase().includes(term)
    );
    setFilteredEmails(filtered);
  };

  const viewEmailDetail = (email: SentEmail) => {
    setSelectedEmail(email);
    setShowDetailDialog(true);
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'sent') {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Envoyé
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Erreur
      </Badge>
    );
  };

  const getAttachmentCount = (attachments: unknown) => {
    if (!attachments || !Array.isArray(attachments)) return 0;
    return attachments.length;
  };

  const getAttachmentsArray = (attachments: unknown): any[] => {
    if (!attachments || !Array.isArray(attachments)) return [];
    return attachments;
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Historique des emails
          </h1>
          <p className="text-muted-foreground">
            Consultez tous les emails envoyés
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{emails.length}</p>
                  <p className="text-sm text-muted-foreground">Emails envoyés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {emails.filter(e => e.status === 'sent').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Envoyés avec succès</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-lg">
                  <Paperclip className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {emails.reduce((acc, e) => acc + getAttachmentCount(e.attachments), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Pièces jointes envoyées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par destinataire, objet..."
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Email list */}
        <Card>
          <CardHeader>
            <CardTitle>Emails envoyés</CardTitle>
            <CardDescription>
              {filteredEmails.length} email(s) trouvé(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEmails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {emails.length === 0 
                    ? "Aucun email envoyé pour le moment"
                    : "Aucun email ne correspond à votre recherche"
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => viewEmailDetail(email)}
                    >
                      <div className="flex-shrink-0">
                        {getStatusBadge(email.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">
                            {email.recipient_name || email.recipient_email}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {email.subject}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {getAttachmentCount(email.attachments) > 0 && (
                          <div className="flex items-center gap-1">
                            <Paperclip className="h-4 w-4" />
                            <span>{getAttachmentCount(email.attachments)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {email.sent_at 
                              ? format(new Date(email.sent_at), "dd MMM yyyy HH:mm", { locale: fr })
                              : "-"
                            }
                          </span>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Détail de l'email
            </DialogTitle>
          </DialogHeader>

          {selectedEmail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedEmail.status)}
                <span className="text-sm text-muted-foreground">
                  {selectedEmail.sent_at 
                    ? format(new Date(selectedEmail.sent_at), "dd MMMM yyyy à HH:mm", { locale: fr })
                    : "-"
                  }
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-24">À :</span>
                  <span className="text-sm">
                    {selectedEmail.recipient_name && `${selectedEmail.recipient_name} `}
                    &lt;{selectedEmail.recipient_email}&gt;
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-24">Objet :</span>
                  <span className="text-sm">{selectedEmail.subject}</span>
                </div>
              </div>

              {/* Attachments */}
              {getAttachmentCount(selectedEmail.attachments) > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Pièces jointes :</span>
                  <div className="flex flex-wrap gap-2">
                    {getAttachmentsArray(selectedEmail.attachments).map((att, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        {att.filename || `Fichier ${index + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Message :</span>
                <div 
                  className="p-4 border rounded-md bg-muted/30 text-sm max-h-[300px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || "" }}
                />
              </div>

              {/* Error message */}
              {selectedEmail.error_message && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">
                    <strong>Erreur :</strong> {selectedEmail.error_message}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

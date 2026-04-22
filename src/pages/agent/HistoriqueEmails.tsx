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
import { useViewMode } from "@/hooks/useViewMode";
import { ViewModeToggle } from "@/components/ViewModeToggle";

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
  const { viewMode, setViewMode } = useViewMode();

  useEffect(() => {
    if (user) {
      loadEmails();
    }
  }, [user?.id]);

  useEffect(() => {
    filterEmails();
  }, [searchTerm, emails]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sent_emails')
        .select('*')
        .eq('sender_id', user?.id)
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

  // Card view for mobile/tablet
  const renderCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {filteredEmails.map((email) => (
        <Card
          key={email.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => viewEmailDetail(email)}
        >
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate text-sm">
                    {email.recipient_name || email.recipient_email}
                  </span>
                </div>
                {getStatusBadge(email.status)}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2">
                {email.subject}
              </p>
              
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  {getAttachmentCount(email.attachments) > 0 && (
                    <div className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      <span>{getAttachmentCount(email.attachments)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {email.sent_at 
                        ? format(new Date(email.sent_at), "dd MMM yyyy", { locale: fr })
                        : "-"
                      }
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // List view for desktop
  const renderListView = () => (
    <ScrollArea className="h-[500px]">
      <div className="space-y-3">
        {filteredEmails.map((email) => (
          <div
            key={email.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => viewEmailDetail(email)}
          >
            <div className="flex-shrink-0">
              {getStatusBadge(email.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                <span className="hidden sm:inline">
                  {email.sent_at 
                    ? format(new Date(email.sent_at), "dd MMM yyyy HH:mm", { locale: fr })
                    : "-"
                  }
                </span>
                <span className="sm:hidden">
                  {email.sent_at 
                    ? format(new Date(email.sent_at), "dd/MM/yy", { locale: fr })
                    : "-"
                  }
                </span>
              </div>
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 md:h-8 md:w-8" />
              Historique des emails
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Consultez tous les emails que vous avez envoyés
            </p>
          </div>
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">{emails.length}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Envoyés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">
                    {emails.filter(e => e.status === 'sent').length}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">Succès</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-amber-500/10 rounded-lg">
                  <Paperclip className="h-5 w-5 md:h-6 md:w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">
                    {emails.reduce((acc, e) => acc + getAttachmentCount(e.attachments), 0)}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">Pièces</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-4 md:pt-6">
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
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Emails envoyés</CardTitle>
            <CardDescription className="text-xs md:text-sm">
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
            ) : viewMode === 'cards' ? renderCardView() : renderListView()}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Détail de l'email
            </DialogTitle>
          </DialogHeader>

          {selectedEmail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                {getStatusBadge(selectedEmail.status)}
                <span className="text-sm text-muted-foreground">
                  {selectedEmail.sent_at 
                    ? format(new Date(selectedEmail.sent_at), "dd MMMM yyyy à HH:mm", { locale: fr })
                    : "-"
                  }
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium w-16 flex-shrink-0">À :</span>
                  <span className="text-sm break-all">
                    {selectedEmail.recipient_name && `${selectedEmail.recipient_name} `}
                    &lt;{selectedEmail.recipient_email}&gt;
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium w-16 flex-shrink-0">Objet :</span>
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
                        <span className="truncate max-w-[150px]">{att.filename || `Fichier ${index + 1}`}</span>
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

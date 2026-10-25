import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DETAIL_DIALOG, DetailHeader, DetailBody, DetailSection, DetailRow, DetailNotice, DetailActions, dateTimeCH } from "@/components/details/DetailPrimitives";
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
  }, [user?.id]);

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
    <div className="flex-1 p-4 md:p-8 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
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
        <DialogContent className={DETAIL_DIALOG}>
          <DetailHeader
            titleAs={DialogTitle}
            descriptionAs={DialogDescription}
            eyebrow={<span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Détail de l'email</span>}
            title={selectedEmail?.subject || "Détail de l'email"}
            subtitle={selectedEmail?.sent_at ? `Envoyé le ${dateTimeCH(selectedEmail.sent_at, { day: "numeric", month: "long", year: "numeric" })}` : undefined}
            badge={selectedEmail ? getStatusBadge(selectedEmail.status) : undefined}
          />

          {selectedEmail && (
            <DetailBody>
              <DetailSection>
                <DetailRow
                  label="À"
                  value={
                    <span className="break-all">
                      {selectedEmail.recipient_name && `${selectedEmail.recipient_name} `}
                      &lt;{selectedEmail.recipient_email}&gt;
                    </span>
                  }
                />
                <DetailRow label="Objet" value={selectedEmail.subject} />
                {getAttachmentCount(selectedEmail.attachments) > 0 && (
                  <DetailRow
                    label="Pièces jointes"
                    value={
                      <span className="mt-1 flex flex-wrap gap-2">
                        {getAttachmentsArray(selectedEmail.attachments).map((att, index) => (
                          <span
                            key={index}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-normal"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate">{att.filename || `Fichier ${index + 1}`}</span>
                          </span>
                        ))}
                      </span>
                    }
                  />
                )}
              </DetailSection>

              {selectedEmail.error_message && (
                <DetailNotice tone="danger">
                  <strong>Erreur :</strong> {selectedEmail.error_message}
                </DetailNotice>
              )}

              <DetailSection title="Message">
                <div
                  className="max-h-[50vh] overflow-y-auto break-words text-sm [&_img]:h-auto [&_img]:max-w-full [&_table]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedEmail.body_html) }}
                />
              </DetailSection>
            </DetailBody>
          )}

          <DetailActions>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Fermer</Button>
          </DetailActions>
        </DialogContent>
      </Dialog>
    </div>
  );
}

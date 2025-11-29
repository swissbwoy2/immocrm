import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ImapConfigurationDialog } from '@/components/ImapConfigurationDialog';
import { ReplyEmailDialog } from '@/components/ReplyEmailDialog';
import { 
  Inbox, 
  Mail, 
  Star, 
  Trash2, 
  RefreshCw, 
  Settings, 
  Search,
  Paperclip,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Reply,
  Forward,
  MailOpen,
  Clock,
  User
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

import type { Json } from '@/integrations/supabase/types';

interface ReceivedEmail {
  id: string;
  message_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string | null;
  is_read: boolean;
  is_starred: boolean;
  folder: string;
  attachments: Json;
}

export default function BoiteReception() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<ReceivedEmail[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<ReceivedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<ReceivedEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'forward'>('reply');
  
  const emailContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      checkConfig();
      loadEmails();
    }
  }, [user]);

  useEffect(() => {
    filterEmails();
  }, [emails, searchTerm]);

  const checkConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('imap_configurations')
        .select('id, last_sync_at')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!error && data) {
        setHasConfig(true);
        setLastSync(data.last_sync_at);
      }
    } catch (error) {
      console.error('Error checking config:', error);
    }
  };

  const loadEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('received_emails')
        .select('*')
        .eq('user_id', user?.id)
        .order('received_at', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error loading emails:', error);
      toast.error('Erreur lors du chargement des emails');
    } finally {
      setLoading(false);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-imap-emails', {
        body: { action: 'fetch_emails' }
      });

      if (error) throw error;

      if (data.error === 'no_config') {
        setShowConfigDialog(true);
        toast.info(data.message);
      } else if (data.success) {
        setEmails(data.emails || []);
        setLastSync(new Date().toISOString());
        toast.success(`${data.fetched_count} email(s) synchronisé(s)`);
      } else if (data.error) {
        toast.error(data.message || data.error);
        if (data.emails?.length) {
          setEmails(data.emails);
        }
      }
    } catch (error: any) {
      console.error('Error syncing emails:', error);
      toast.error(error.message || 'Erreur de synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const filterEmails = () => {
    if (!searchTerm) {
      setFilteredEmails(emails);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = emails.filter(email => 
      email.subject?.toLowerCase().includes(term) ||
      email.from_email.toLowerCase().includes(term) ||
      email.from_name?.toLowerCase().includes(term) ||
      email.body_text?.toLowerCase().includes(term)
    );
    setFilteredEmails(filtered);
  };

  const markAsRead = async (email: ReceivedEmail) => {
    if (email.is_read) return;

    try {
      const { error } = await supabase
        .from('received_emails')
        .update({ is_read: true })
        .eq('id', email.id);

      if (error) throw error;

      setEmails(prev => prev.map(e => 
        e.id === email.id ? { ...e, is_read: true } : e
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const toggleStar = async (email: ReceivedEmail, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('received_emails')
        .update({ is_starred: !email.is_starred })
        .eq('id', email.id);

      if (error) throw error;

      setEmails(prev => prev.map(e => 
        e.id === email.id ? { ...e, is_starred: !e.is_starred } : e
      ));
      
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(prev => prev ? { ...prev, is_starred: !prev.is_starred } : null);
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const deleteEmail = async (email: ReceivedEmail, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!confirm('Supprimer cet email ?')) return;

    try {
      const { error } = await supabase
        .from('received_emails')
        .delete()
        .eq('id', email.id);

      if (error) throw error;

      setEmails(prev => prev.filter(e => e.id !== email.id));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }
      toast.success('Email supprimé');
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const selectEmail = (email: ReceivedEmail) => {
    setSelectedEmail(email);
    markAsRead(email);
    setTimeout(() => {
      emailContentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
  };

  const handleReply = () => {
    if (!selectedEmail) return;
    setReplyMode('reply');
    setReplyDialogOpen(true);
  };

  const handleForward = () => {
    if (!selectedEmail) return;
    setReplyMode('forward');
    setReplyDialogOpen(true);
  };

  const unreadCount = emails.filter(e => !e.is_read).length;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Hier';
    return format(date, 'dd/MM/yy');
  };

  const formatFullDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  };

  const getPreviewText = (email: ReceivedEmail) => {
    const text = email.body_text || '';
    return text.replace(/\s+/g, ' ').trim().substring(0, 80);
  };

  const getSenderInitials = (email: ReceivedEmail) => {
    const name = email.from_name || email.from_email;
    const parts = name.split(/[@\s]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const sanitizeHtml = (html: string) => {
    // Remove scripts and dangerous content
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  };

  // Mobile view: show list or detail
  const showEmailList = !selectedEmail;
  const showEmailDetail = !!selectedEmail;

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-background">
        {/* Header - Always visible */}
        <div className="shrink-0 border-b bg-card">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Inbox className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-semibold truncate">Boîte de réception</h1>
                  {lastSync && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="truncate">
                        {format(new Date(lastSync), 'dd MMM HH:mm', { locale: fr })}
                      </span>
                    </p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Badge variant="default" className="bg-primary shrink-0">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1 sm:gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncEmails}
                  disabled={syncing}
                  className="h-8 sm:h-9"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Sync</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfigDialog(true)}
                  className="h-8 sm:h-9"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-background"
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Email List - Hidden on mobile when email selected */}
          <div className={`${showEmailList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r bg-card`}>
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              </div>
            ) : !hasConfig ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">Configuration requise</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configurez votre serveur IMAP pour recevoir vos emails
                </p>
                <Button onClick={() => setShowConfigDialog(true)} size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer
                </Button>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">
                  {searchTerm ? 'Aucun résultat' : 'Aucun email'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Aucun email ne correspond' 
                    : 'Synchronisez pour récupérer vos emails'}
                </p>
                {!searchTerm && (
                  <Button onClick={syncEmails} disabled={syncing} size="sm">
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Synchroniser
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="divide-y">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => selectEmail(email)}
                      className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                        !email.is_read ? 'bg-primary/5' : ''
                      } ${selectedEmail?.id === email.id ? 'bg-accent' : ''}`}
                    >
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                          !email.is_read ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {getSenderInitials(email)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className={`text-sm truncate ${!email.is_read ? 'font-semibold' : ''}`}>
                              {email.from_name || email.from_email.split('@')[0]}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDate(email.received_at)}
                            </span>
                          </div>
                          <div className={`text-sm truncate mb-0.5 ${!email.is_read ? 'font-medium' : 'text-muted-foreground'}`}>
                            {email.subject || '(Sans objet)'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {getPreviewText(email) || 'Pas de contenu'}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {email.is_starred && (
                              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            )}
                            {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Paperclip className="h-3 w-3" />
                                <span>{email.attachments.length}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Email Detail */}
          <div className={`${showEmailDetail ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-background`}>
            {selectedEmail ? (
              <>
                {/* Detail Header */}
                <div className="shrink-0 border-b bg-card p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    {/* Back button (mobile only) */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden shrink-0 h-8 w-8 p-0"
                      onClick={() => setSelectedEmail(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>

                    {/* Sender Avatar */}
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                      {getSenderInitials(selectedEmail)}
                    </div>

                    {/* Email Info */}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-base sm:text-lg leading-tight mb-1 line-clamp-2">
                        {selectedEmail.subject || '(Sans objet)'}
                      </h2>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {selectedEmail.from_name || selectedEmail.from_email}
                        </span>
                      </div>
                      {selectedEmail.from_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          &lt;{selectedEmail.from_email}&gt;
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFullDate(selectedEmail.received_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => toggleStar(selectedEmail, e)}
                      >
                        <Star className={`h-4 w-4 ${selectedEmail.is_starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => deleteEmail(selectedEmail, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={handleReply} className="h-8">
                      <Reply className="h-3.5 w-3.5 mr-1.5" />
                      Répondre
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleForward} className="h-8">
                      <Forward className="h-3.5 w-3.5 mr-1.5" />
                      Transférer
                    </Button>
                  </div>
                </div>

                {/* Email Body */}
                <ScrollArea className="flex-1" ref={emailContentRef}>
                  <div className="p-4 sm:p-6">
                    {selectedEmail.body_html ? (
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert prose-img:max-w-full prose-img:h-auto"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedEmail.body_html) }}
                      />
                    ) : selectedEmail.body_text ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {selectedEmail.body_text}
                      </pre>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MailOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Aucun contenu disponible</p>
                      </div>
                    )}

                    {/* Attachments */}
                    {selectedEmail.attachments && Array.isArray(selectedEmail.attachments) && selectedEmail.attachments.length > 0 && (
                      <div className="mt-6 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          Pièces jointes ({selectedEmail.attachments.length})
                        </h4>
                        <div className="grid gap-2">
                          {selectedEmail.attachments.map((attachment: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                                <Paperclip className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {attachment.filename || `Pièce jointe ${index + 1}`}
                                </p>
                                {attachment.size && (
                                  <p className="text-xs text-muted-foreground">
                                    {Math.round(attachment.size / 1024)} Ko
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center">
                <div className="text-center">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">Sélectionnez un email</h3>
                  <p className="text-sm text-muted-foreground">
                    Choisissez un email dans la liste pour le lire
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <ImapConfigurationDialog
          open={showConfigDialog}
          onOpenChange={setShowConfigDialog}
          onConfigSaved={() => {
            setHasConfig(true);
            syncEmails();
          }}
        />

        {selectedEmail && (
          <ReplyEmailDialog
            open={replyDialogOpen}
            onOpenChange={setReplyDialogOpen}
            mode={replyMode}
            email={{
              id: selectedEmail.id,
              from_email: selectedEmail.from_email,
              from_name: selectedEmail.from_name,
              to_email: selectedEmail.to_email,
              subject: selectedEmail.subject,
              body_text: selectedEmail.body_text,
              body_html: selectedEmail.body_html,
              received_at: selectedEmail.received_at
            }}
            onSent={() => {
              setReplyDialogOpen(false);
              toast.success('Email envoyé');
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

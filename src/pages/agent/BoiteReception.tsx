import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ImapConfigurationDialog } from '@/components/ImapConfigurationDialog';
import { ReplyEmailDialog } from '@/components/ReplyEmailDialog';
import { 
  Inbox, 
  Mail, 
  Star, 
  StarOff, 
  Trash2, 
  RefreshCw, 
  Settings, 
  Search,
  Paperclip,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Reply,
  Forward
} from 'lucide-react';
import { format } from 'date-fns';
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
  
  // Reply/Forward state
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'forward'>('reply');
  
  // Ref for auto-scroll to top of email content
  const emailTopRef = useRef<HTMLDivElement>(null);

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
        toast.success(`${data.fetched_count} emails synchronisés`);
      } else if (data.error) {
        toast.error(data.message || data.error);
        // Still update emails if we got some
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

  const toggleStar = async (email: ReceivedEmail, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('received_emails')
        .update({ is_starred: !email.is_starred })
        .eq('id', email.id);

      if (error) throw error;

      setEmails(prev => prev.map(e => 
        e.id === email.id ? { ...e, is_starred: !e.is_starred } : e
      ));
      
      // Update selected email if it's the same
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(prev => prev ? { ...prev, is_starred: !prev.is_starred } : null);
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const deleteEmail = async (email: ReceivedEmail, e: React.MouseEvent) => {
    e.stopPropagation();
    
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
    // Scroll to top of email content
    setTimeout(() => {
      emailTopRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
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

  // Get preview text (clean from HTML)
  const getPreviewText = (email: ReceivedEmail) => {
    const text = email.body_text || '';
    // Remove excessive whitespace and limit length
    return text.replace(/\s+/g, ' ').trim().substring(0, 100);
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Inbox className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Boîte de réception</h1>
                {lastSync && (
                  <p className="text-sm text-muted-foreground">
                    Dernière sync: {format(new Date(lastSync), 'dd MMM HH:mm', { locale: fr })}
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={syncEmails}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Synchroniser</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfigDialog(true)}
              >
                <Settings className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Configuration</span>
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Email List */}
          <div className={`${selectedEmail ? 'hidden md:block md:w-1/3 lg:w-2/5' : 'w-full'} border-r`}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !hasConfig ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Configuration requise</h3>
                <p className="text-muted-foreground mb-4">
                  Configurez votre serveur IMAP pour recevoir vos emails
                </p>
                <Button onClick={() => setShowConfigDialog(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer IMAP
                </Button>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Mail className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? 'Aucun résultat' : 'Boîte de réception vide'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Aucun email ne correspond à votre recherche' 
                    : 'Cliquez sur Synchroniser pour récupérer vos emails'}
                </p>
                {!searchTerm && (
                  <Button onClick={syncEmails} disabled={syncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Synchroniser
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-full">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => selectEmail(email)}
                    className={`p-4 border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                      !email.is_read ? 'bg-primary/5' : ''
                    } ${selectedEmail?.id === email.id ? 'bg-accent' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Star */}
                      <button
                        onClick={(e) => toggleStar(email, e)}
                        className="mt-1 text-muted-foreground hover:text-yellow-500 transition-colors"
                      >
                        {email.is_starred ? (
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`truncate ${!email.is_read ? 'font-semibold' : ''}`}>
                            {email.from_name || email.from_email}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {email.received_at && format(new Date(email.received_at), 'dd/MM HH:mm')}
                          </span>
                        </div>
                        <div className={`truncate ${!email.is_read ? 'font-medium' : 'text-muted-foreground'}`}>
                          {email.subject || '(Sans objet)'}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {getPreviewText(email) || 'Pas de contenu texte'}
                        </div>
                        {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            {email.attachments.length} pièce(s) jointe(s)
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <button
                        onClick={(e) => deleteEmail(email, e)}
                        className="mt-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            )}
          </div>

          {/* Email Detail */}
          {selectedEmail && (
            <div className="flex-1 flex flex-col">
              {/* Detail Header */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-4 mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setSelectedEmail(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold truncate">
                      {selectedEmail.subject || '(Sans objet)'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      De: {selectedEmail.from_name ? `${selectedEmail.from_name} <${selectedEmail.from_email}>` : selectedEmail.from_email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      À: {selectedEmail.to_email}
                    </p>
                    {selectedEmail.received_at && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(selectedEmail.received_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => toggleStar(selectedEmail, e)}
                    >
                      {selectedEmail.is_starred ? (
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => deleteEmail(selectedEmail, e)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReply}>
                    <Reply className="h-4 w-4 mr-2" />
                    Répondre
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleForward}>
                    <Forward className="h-4 w-4 mr-2" />
                    Transférer
                  </Button>
                </div>
              </div>

              {/* Email Body */}
              <ScrollArea className="flex-1 p-4">
                <div ref={emailTopRef} />
                {selectedEmail.body_html ? (
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {selectedEmail.body_text || 'Pas de contenu'}
                  </pre>
                )}

                {/* Attachments */}
                {selectedEmail.attachments && Array.isArray(selectedEmail.attachments) && selectedEmail.attachments.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Pièces jointes ({selectedEmail.attachments.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(selectedEmail.attachments as any[]).map((attachment: any, index: number) => (
                        <Card key={index} className="p-3">
                          <p className="text-sm font-medium">{attachment.filename || `Fichier ${index + 1}`}</p>
                          {attachment.size && (
                            <p className="text-xs text-muted-foreground">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      <ImapConfigurationDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        onConfigSaved={() => {
          setHasConfig(true);
          syncEmails();
        }}
      />

      <ReplyEmailDialog
        open={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        email={selectedEmail}
        mode={replyMode}
        onSent={() => {
          toast.success(`Email ${replyMode === 'reply' ? 'envoyé' : 'transféré'} avec succès`);
        }}
      />
    </AppLayout>
  );
}

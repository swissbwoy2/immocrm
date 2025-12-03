import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ReplyAll,
  Forward,
  MailOpen,
  Clock,
  User,
  CheckCheck,
  Archive,
  MoreHorizontal,
  ExternalLink,
  Download
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

type FilterType = 'all' | 'unread' | 'starred';

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
  const [filter, setFilter] = useState<FilterType>('all');
  
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'replyall' | 'forward'>('reply');
  
  const emailContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      checkConfig();
      loadEmails();
    }
  }, [user?.id]);

  useEffect(() => {
    filterEmails();
  }, [emails, searchTerm, filter]);

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

  const syncEmails = async (fullSync = false) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-imap-emails', {
        body: { action: 'fetch_emails', full_sync: fullSync, count: fullSync ? 500 : 100 }
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
    let filtered = [...emails];
    
    // Apply filter type
    if (filter === 'unread') {
      filtered = filtered.filter(e => !e.is_read);
    } else if (filter === 'starred') {
      filtered = filtered.filter(e => e.is_starred);
    }
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(email => 
        email.subject?.toLowerCase().includes(term) ||
        email.from_email.toLowerCase().includes(term) ||
        email.from_name?.toLowerCase().includes(term) ||
        email.body_text?.toLowerCase().includes(term)
      );
    }
    
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

  const markAllAsRead = async () => {
    const unreadIds = emails.filter(e => !e.is_read).map(e => e.id);
    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('received_emails')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setEmails(prev => prev.map(e => ({ ...e, is_read: true })));
      toast.success('Tous les emails marqués comme lus');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur lors du marquage');
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

  const handleReplyAll = () => {
    if (!selectedEmail) return;
    setReplyMode('replyall');
    setReplyDialogOpen(true);
  };

  const handleForward = () => {
    if (!selectedEmail) return;
    setReplyMode('forward');
    setReplyDialogOpen(true);
  };

  const unreadCount = emails.filter(e => !e.is_read).length;
  const starredCount = emails.filter(e => e.is_starred).length;

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

  const formatRelativeDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: fr });
  };

  const getPreviewText = (email: ReceivedEmail) => {
    const text = email.body_text || '';
    return text.replace(/\s+/g, ' ').trim().substring(0, 100);
  };

  const getSenderInitials = (email: ReceivedEmail) => {
    const name = email.from_name || email.from_email;
    const parts = name.split(/[@\s]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getSenderColor = (email: ReceivedEmail) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'
    ];
    const hash = email.from_email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const sanitizeHtml = (html: string) => {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  };

  const showEmailList = !selectedEmail;
  const showEmailDetail = !!selectedEmail;

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="shrink-0 border-b bg-card">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                  <Inbox className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold">Boîte de réception</h1>
                  {lastSync && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Dernière sync {formatRelativeDate(lastSync)}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={markAllAsRead} disabled={unreadCount === 0}>
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Tout marquer comme lu
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => syncEmails(true)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Sync complète (500)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => syncEmails(false)}
                  disabled={syncing}
                  className="h-9"
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
                  className="h-9"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-background"
                />
              </div>
              
              <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="shrink-0">
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs px-3">
                    Tous
                    <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                      {emails.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs px-3">
                    Non lus
                    {unreadCount > 0 && (
                      <Badge variant="default" className="ml-1.5 h-5 px-1.5 text-[10px] bg-primary">
                        {unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="starred" className="text-xs px-3">
                    <Star className="h-3 w-3 mr-1" />
                    {starredCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                        {starredCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Email List */}
          <div className={`${showEmailList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-96 lg:w-[420px] border-r bg-card/50`}>
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Chargement des emails...</p>
                </div>
              </div>
            ) : !hasConfig ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Configuration requise</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  Configurez votre serveur IMAP pour recevoir et gérer vos emails
                </p>
                <Button onClick={() => setShowConfigDialog(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer IMAP
                </Button>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                  <Mail className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {searchTerm ? 'Aucun résultat' : filter !== 'all' ? 'Aucun email' : 'Boîte vide'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  {searchTerm 
                    ? 'Aucun email ne correspond à votre recherche' 
                    : filter === 'unread'
                    ? 'Vous avez lu tous vos emails !'
                    : filter === 'starred'
                    ? 'Aucun email favori'
                    : 'Synchronisez pour récupérer vos emails'}
                </p>
                {!searchTerm && filter === 'all' && (
                  <Button onClick={() => syncEmails(false)} disabled={syncing}>
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
                      className={`group p-4 cursor-pointer transition-all hover:bg-accent/50 ${
                        !email.is_read ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
                      } ${selectedEmail?.id === email.id ? 'bg-accent' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`h-11 w-11 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${getSenderColor(email)}`}>
                          {getSenderInitials(email)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-sm truncate ${!email.is_read ? 'font-bold text-foreground' : 'font-medium'}`}>
                              {email.from_name || email.from_email.split('@')[0]}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDate(email.received_at)}
                            </span>
                          </div>
                          
                          <div className={`text-sm truncate mb-1 ${!email.is_read ? 'font-semibold' : 'text-muted-foreground'}`}>
                            {email.subject || '(Sans objet)'}
                          </div>
                          
                          <div className="text-xs text-muted-foreground truncate leading-relaxed">
                            {getPreviewText(email) || 'Aucun aperçu disponible'}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            {email.is_starred && (
                              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                            )}
                            {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                <Paperclip className="h-3 w-3" />
                                <span>{email.attachments.length}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => toggleStar(email, e)}
                          >
                            <Star className={`h-3.5 w-3.5 ${email.is_starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => deleteEmail(email, e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
                <div className="shrink-0 border-b bg-card p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden shrink-0 h-9 w-9 p-0"
                      onClick={() => setSelectedEmail(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${getSenderColor(selectedEmail)}`}>
                      {getSenderInitials(selectedEmail)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-lg leading-tight mb-2 line-clamp-2">
                        {selectedEmail.subject || '(Sans objet)'}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {selectedEmail.from_name || selectedEmail.from_email}
                        </div>
                        {selectedEmail.from_name && (
                          <span className="text-muted-foreground text-xs">
                            &lt;{selectedEmail.from_email}&gt;
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatFullDate(selectedEmail.received_at)}
                        <span className="text-muted-foreground/60">
                          ({formatRelativeDate(selectedEmail.received_at)})
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={(e) => toggleStar(selectedEmail, e)}
                      >
                        <Star className={`h-4 w-4 ${selectedEmail.is_starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => deleteEmail(selectedEmail, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button variant="default" size="sm" onClick={handleReply} className="h-9">
                      <Reply className="h-4 w-4 mr-2" />
                      Répondre
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleReplyAll} className="h-9">
                      <ReplyAll className="h-4 w-4 mr-2" />
                      Répondre à tous
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleForward} className="h-9">
                      <Forward className="h-4 w-4 mr-2" />
                      Transférer
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1" ref={emailContentRef}>
                  <div className="p-5 sm:p-8 max-w-4xl mx-auto">
                    {/* Attachments at top if present */}
                    {selectedEmail.attachments && Array.isArray(selectedEmail.attachments) && selectedEmail.attachments.length > 0 && (
                      <div className="mb-6 p-4 rounded-xl bg-muted/30 border">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-primary" />
                          {selectedEmail.attachments.length} pièce{selectedEmail.attachments.length > 1 ? 's' : ''} jointe{selectedEmail.attachments.length > 1 ? 's' : ''}
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {selectedEmail.attachments.map((attachment: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 rounded-lg bg-background hover:bg-accent/50 transition-colors cursor-pointer group"
                            >
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Paperclip className="h-5 w-5 text-primary" />
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
                              <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Email Content */}
                    <div className="bg-card rounded-xl border p-6 sm:p-8 shadow-sm">
                      {selectedEmail.body_html ? (
                        <div 
                          className="prose prose-sm max-w-none dark:prose-invert 
                            prose-headings:font-semibold prose-headings:text-foreground
                            prose-p:text-foreground prose-p:leading-relaxed
                            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                            prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto
                            prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r
                            prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                            prose-pre:bg-muted prose-pre:rounded-lg"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedEmail.body_html) }}
                        />
                      ) : selectedEmail.body_text ? (
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                          {selectedEmail.body_text}
                        </pre>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <MailOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                          <p className="text-lg font-medium">Aucun contenu disponible</p>
                          <p className="text-sm mt-1">Cet email ne contient pas de texte</p>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center bg-muted/20">
                <div className="text-center">
                  <div className="h-24 w-24 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                    <Mail className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Sélectionnez un email</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Choisissez un email dans la liste pour afficher son contenu
                  </p>
                </div>
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

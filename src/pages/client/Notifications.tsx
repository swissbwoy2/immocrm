import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Trash2, Sparkles } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getCorrectNotificationLink } from '@/lib/notificationLinks';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_client_activated': return '👤';
    case 'client_assigned': return '🤝';
    case 'new_message': return '💬';
    case 'new_offer': return '🏠';
    case 'new_visit': return '📅';
    case 'visit_reminder': return '⏰';
    case 'visit_confirmed': return '✅';
    case 'visit_refused': return '❌';
    case 'visit_delegated': return '🔄';
    case 'document_request': return '📄';
    case 'dossier_complete': return '✅';
    case 'candidature_acceptee': return '🎉';
    case 'candidature_refusee': return '❌';
    case 'candidature_bail_conclu': return '✍️';
    case 'candidature_attente_bail': return '⏳';
    case 'candidature_bail_recu': return '📨';
    case 'candidature_signature_planifiee': return '📅';
    case 'candidature_signature_effectuee': return '✅';
    case 'candidature_etat_lieux_fixe': return '🏠';
    case 'candidature_cles_remises': return '🔑';
    case 'signature_reminder': return '🔔';
    default: return '🔔';
  }
};

const getNotificationTypeName = (type: string) => {
  switch (type) {
    case 'new_client_activated': return 'Compte activé';
    case 'client_assigned': return 'Agent assigné';
    case 'new_message': return 'Message';
    case 'new_offer': return 'Offre';
    case 'new_visit': return 'Visite';
    case 'visit_reminder': return 'Rappel visite';
    case 'visit_confirmed': return 'Visite confirmée';
    case 'visit_refused': return 'Visite refusée';
    case 'visit_delegated': return 'Visite déléguée';
    case 'document_request': return 'Demande document';
    case 'dossier_complete': return 'Dossier complet';
    case 'candidature_acceptee': return 'Candidature acceptée';
    case 'candidature_refusee': return 'Candidature refusée';
    case 'candidature_bail_conclu': return 'Bail conclu';
    case 'candidature_attente_bail': return 'Attente bail';
    case 'candidature_bail_recu': return 'Bail reçu';
    case 'candidature_signature_planifiee': return 'Signature planifiée';
    case 'candidature_signature_effectuee': return 'Bail signé';
    case 'candidature_etat_lieux_fixe': return 'État des lieux';
    case 'candidature_cles_remises': return 'Clés remises';
    case 'signature_reminder': return 'Rappel signature';
    default: return 'Autre';
  }
};

export default function ClientNotifications() {
  const { notifications, counts, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Get the correct link using centralized logic
    const url = getCorrectNotificationLink(
      notification.type,
      notification.link,
      'client',
      notification.metadata as Record<string, string> | null
    );
    
    navigate(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-r-primary/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto h-full">
      {/* Header modernisé avec gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="relative">
                <Bell className="h-7 w-7 text-primary" />
                {counts.total > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              Notifications
            </h1>
            <p className="text-muted-foreground mt-1">
              {counts.total > 0 ? (
                <span className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold glow-breathe">
                    {counts.total}
                  </span>
                  notification{counts.total > 1 ? 's' : ''} non lue{counts.total > 1 ? 's' : ''}
                </span>
              ) : (
                'Toutes vos notifications sont lues'
              )}
            </p>
          </div>
          {counts.total > 0 && (
            <Button 
              variant="outline" 
              onClick={() => markAllAsRead()}
              className="glass-morphism border-primary/20 hover:border-primary/40 transition-all duration-300"
            >
              <Check className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      <Card className="card-interactive border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Toutes les notifications
            </CardTitle>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
              <TabsList className="glass-morphism">
                <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Toutes ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Non lues ({counts.total})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative inline-block">
                <Bell className="w-16 h-16 text-muted-foreground/30 animate-float" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              </div>
              <p className="text-muted-foreground mt-4 glass-morphism px-4 py-2 rounded-full inline-block">
                Aucune notification
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-md animate-fade-in",
                    !notification.read 
                      ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/30 shadow-sm" 
                      : "hover:bg-muted/50 border-border/50"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Effet shine au survol */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  </div>
                  
                  {/* Icône avec fond gradient */}
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110",
                      !notification.read 
                        ? "bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner" 
                        : "bg-muted"
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    {!notification.read && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 relative">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className={cn(
                        "font-medium transition-colors",
                        !notification.read && "font-semibold text-foreground"
                      )}>
                        {notification.title}
                      </p>
                      <Badge variant="secondary" className="text-xs glass-morphism">
                        {getNotificationTypeName(notification.type)}
                      </Badge>
                      {!notification.read && (
                        <Badge className="text-xs bg-gradient-to-r from-primary to-primary/80 animate-pulse">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <span className="opacity-70">
                        {format(new Date(notification.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </span>
                      <span className="opacity-50">•</span>
                      <span className="opacity-70">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1 relative">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

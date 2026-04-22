import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Trash2 } from 'lucide-react';
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
    case 'client_removed': return '👋';
    case 'new_message': return '💬';
    case 'new_offer': case 'new_offer_admin': return '🏠';
    case 'new_visit': case 'new_visit_admin': return '📅';
    case 'visit_reminder': return '⏰';
    case 'visit_confirmed': case 'visit_confirmed_admin': return '✅';
    case 'visit_refused': case 'visit_refused_admin': return '❌';
    case 'visit_delegated': return '🔄';
    case 'activation_request': return '🆕';
    case 'nouvelle_demande_mandat': return '📋';
    case 'document_request': return '📄';
    case 'dossier_complete': return '✅';
    case 'badge_earned': return '🏆';
    case 'coagent_added': case 'coagent_assignment': return '👥';
    case 'new_candidature': case 'candidature_deposee': return '📝';
    case 'candidature_acceptee': return '🎉';
    case 'candidature_refusee': return '❌';
    case 'candidature_bail_conclu': case 'bail_conclu': return '✍️';
    case 'candidature_attente_bail': return '⏳';
    case 'candidature_bail_recu': return '📨';
    case 'candidature_signature_planifiee': case 'date_signature_choisie': return '📅';
    case 'candidature_signature_effectuee': return '✅';
    case 'candidature_etat_lieux_fixe': return '🏠';
    case 'candidature_cles_remises': return '🔑';
    case 'signature_reminder': return '🔔';
    default: return '🔔';
  }
};

const getNotificationTypeName = (type: string) => {
  switch (type) {
    case 'new_client_activated': return 'Nouveau client';
    case 'client_assigned': return 'Client assigné';
    case 'client_removed': return 'Client retiré';
    case 'new_message': return 'Message';
    case 'new_offer': return 'Offre';
    case 'new_visit': return 'Visite';
    case 'visit_reminder': return 'Rappel visite';
    case 'visit_confirmed': return 'Visite confirmée';
    case 'visit_refused': return 'Visite refusée';
    case 'visit_delegated': return 'Visite déléguée';
    case 'badge_earned': return 'Badge';
    case 'coagent_added': case 'coagent_assignment': return 'Co-agent';
    case 'new_candidature': case 'candidature_deposee': return 'Candidature';
    case 'candidature_acceptee': return 'Candidature acceptée';
    case 'candidature_refusee': return 'Candidature refusée';
    case 'candidature_bail_conclu': case 'bail_conclu': return 'Bail conclu';
    case 'candidature_attente_bail': return 'Attente bail';
    case 'candidature_bail_recu': return 'Bail reçu';
    case 'candidature_signature_planifiee': case 'date_signature_choisie': return 'Date signature';
    case 'candidature_signature_effectuee': return 'Bail signé';
    case 'candidature_etat_lieux_fixe': return 'État des lieux';
    case 'candidature_cles_remises': return 'Clés remises';
    case 'signature_reminder': return 'Rappel signature';
    default: return 'Autre';
  }
};

export default function AgentNotifications() {
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
      'agent',
      notification.metadata as Record<string, string> | null
    );
    
    navigate(url);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            {counts.total} notification{counts.total > 1 ? 's' : ''} non lue{counts.total > 1 ? 's' : ''}
          </p>
        </div>
        {counts.total > 0 && (
          <Button 
            variant="outline" 
            onClick={() => markAllAsRead()}
            className="hover:scale-105 transition-transform"
          >
            <Check className="h-4 w-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Toutes les notifications</CardTitle>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
              <TabsList>
                <TabsTrigger value="all">Toutes ({notifications.length})</TabsTrigger>
                <TabsTrigger value="unread">Non lues ({counts.total})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground empty-state">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50 empty-state-icon" />
              <p className="text-lg font-medium mb-1">Aucune notification</p>
              <p className="text-sm">Vous êtes à jour !</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200",
                    "hover:bg-muted/50 hover:translate-x-1 hover:shadow-sm",
                    !notification.read && "bg-primary/5 border-primary/20 border-l-4 border-l-primary",
                    "animate-fade-in"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="text-2xl animate-bounce-in" style={{ animationDelay: `${index * 50 + 100}ms` }}>
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="relative flex-1 min-w-0">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className={cn(
                        "font-medium",
                        !notification.read && "font-semibold"
                      )}>
                        {notification.title}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {getNotificationTypeName(notification.type)}
                      </Badge>
                      {!notification.read && (
                        <Badge variant="default" className="text-xs animate-pulse-soft">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(notification.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                      {' '}({formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 action-button-group">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-green-100 hover:text-green-600 transition-colors"
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
                      className="hover:bg-destructive/10 hover:text-destructive transition-colors"
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

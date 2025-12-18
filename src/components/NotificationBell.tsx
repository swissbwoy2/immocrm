import React from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { NotificationBadge } from './NotificationBadge';

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
    case 'candidature_acceptee': case 'candidature_acceptee_admin': return '🎉';
    case 'candidature_refusee': case 'candidature_refusee_admin': return '❌';
    case 'candidature_bail_conclu': case 'candidature_bail_conclu_admin': case 'bail_conclu': return '✍️';
    case 'candidature_attente_bail': case 'candidature_attente_bail_admin': return '⏳';
    case 'candidature_bail_recu': case 'candidature_bail_recu_admin': return '📨';
    case 'candidature_signature_planifiee': case 'candidature_signature_planifiee_admin': case 'date_signature_choisie': return '📅';
    case 'candidature_signature_effectuee': case 'candidature_signature_effectuee_admin': return '✅';
    case 'candidature_etat_lieux_fixe': case 'candidature_etat_lieux_fixe_admin': return '🏠';
    case 'candidature_cles_remises': case 'candidature_cles_remises_admin': return '🔑';
    case 'signature_reminder': return '🔔';
    default: return '🔔';
  }
};

export function NotificationBell() {
  const { notifications, counts, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = React.useState(false);
  const prevCount = React.useRef(counts.total);

  // Animate bell when new notifications arrive
  React.useEffect(() => {
    if (counts.total > prevCount.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    prevCount.current = counts.total;
  }, [counts.total]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      let url = notification.link;
      
      // Fallback: add query params from metadata if not already in URL
      if (notification.metadata) {
        const urlHasParams = url.includes('?');
        const params = new URLSearchParams();
        
        // Add conversationId if available and not in URL
        if (notification.metadata.conversation_id && !url.includes('conversationId=')) {
          params.set('conversationId', notification.metadata.conversation_id as string);
        }
        // Add offreId if available and not in URL
        if (notification.metadata.offre_id && !url.includes('offreId=')) {
          params.set('offreId', notification.metadata.offre_id as string);
        }
        // Add visiteId if available and not in URL
        if (notification.metadata.visite_id && !url.includes('visiteId=')) {
          params.set('visiteId', notification.metadata.visite_id as string);
        }
        // Add candidatureId if available and not in URL
        if (notification.metadata.candidature_id && !url.includes('candidatureId=')) {
          params.set('candidatureId', notification.metadata.candidature_id as string);
        }
        
        const paramsStr = params.toString();
        if (paramsStr) {
          url += (urlHasParams ? '&' : '?') + paramsStr;
        }
      }
      
      navigate(url);
    }
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative transition-transform duration-200 hover:scale-110",
            isAnimating && "notification-bell-ring"
          )}
        >
          <Bell className={cn(
            "h-5 w-5 transition-colors",
            counts.total > 0 && "text-primary"
          )} />
          {counts.total > 0 && (
            <NotificationBadge 
              count={counts.total} 
              className="absolute -top-1 -right-1 animate-bounce-in"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 animate-scale-in" align="end">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h4 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </h4>
          {counts.total > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="text-xs hover:bg-primary/10 transition-colors"
            >
              <Check className="h-3 w-3 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground empty-state">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20 empty-state-icon" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 cursor-pointer transition-all duration-200",
                    "hover:bg-muted/50 hover:translate-x-1",
                    !notification.read && "bg-primary/5 border-l-2 border-l-primary",
                    "animate-fade-in"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg animate-bounce-in" style={{ animationDelay: `${index * 50 + 100}ms` }}>
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1 animate-pulse-soft" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 10 && (
          <div className="p-2 border-t text-center bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs w-full hover:bg-primary/10 transition-colors"
              onClick={() => {
                const path = window.location.pathname.split('/')[1];
                navigate(`/${path}/notifications`);
              }}
            >
              Voir toutes les notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

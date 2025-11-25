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

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_client_activated':
      return '👤';
    case 'client_assigned':
      return '🤝';
    case 'new_message':
      return '💬';
    case 'new_offer':
      return '🏠';
    case 'new_visit':
      return '📅';
    default:
      return '🔔';
  }
};

const getNotificationTypeName = (type: string) => {
  switch (type) {
    case 'new_client_activated':
      return 'Nouveau client';
    case 'client_assigned':
      return 'Client assigné';
    case 'new_message':
      return 'Message';
    case 'new_offer':
      return 'Offre';
    case 'new_visit':
      return 'Visite';
    default:
      return 'Autre';
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
    if (notification.link) {
      navigate(notification.link);
    }
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
      <div className="flex items-center justify-between">
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
          <Button variant="outline" onClick={() => markAllAsRead()}>
            <Check className="h-4 w-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <Card>
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
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                    !notification.read && "bg-primary/5 border-primary/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="text-2xl">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
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
                        <Badge variant="default" className="text-xs">
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
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
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

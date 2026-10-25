import { useState } from 'react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import {
  Bell, Check, Trash2, UserCheck, Handshake, MessageCircle, Home, CalendarDays, AlarmClock, CalendarCheck,
  CalendarX, RefreshCw, FileText, FileCheck, PartyPopper, XCircle, PenLine, Hourglass, Mail, KeyRound, BellRing,
} from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getCorrectNotificationLink } from '@/lib/notificationLinks';
import { DASH_CARD, DashBadge, DashEmptyState, DashFilterPills, DashPage, DashPageHeader, DashSection } from '@/components/client/dashboard/DashPrimitives';

const getNotificationIcon = (type: string): React.ElementType => {
  switch (type) {
    case 'new_client_activated': return UserCheck;
    case 'client_assigned': return Handshake;
    case 'new_message': return MessageCircle;
    case 'new_offer': return Home;
    case 'new_visit': return CalendarDays;
    case 'visit_reminder': return AlarmClock;
    case 'visit_confirmed': return CalendarCheck;
    case 'visit_refused': return CalendarX;
    case 'visit_delegated': return RefreshCw;
    case 'document_request': return FileText;
    case 'dossier_complete': return FileCheck;
    case 'candidature_acceptee': return PartyPopper;
    case 'candidature_refusee': return XCircle;
    case 'candidature_bail_conclu': return PenLine;
    case 'candidature_attente_bail': return Hourglass;
    case 'candidature_bail_recu': return Mail;
    case 'candidature_signature_planifiee': return CalendarDays;
    case 'candidature_signature_effectuee': return Check;
    case 'candidature_etat_lieux_fixe': return Home;
    case 'candidature_cles_remises': return KeyRound;
    case 'signature_reminder': return BellRing;
    default: return Bell;
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
  const { notifications, counts, loading, recordClick, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleNotificationClick = (notification: Notification) => {
    void recordClick(notification.id);
    
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
      <DashPage>
        <div role="status" aria-label="Chargement des notifications">
          <div className="h-8 w-44 rounded-full bg-muted/60" />
          <div className="mt-6 h-16 rounded-2xl bg-muted/40" />
        </div>
      </DashPage>
    );
  }

  return (
    <DashPage>
      <DashPageHeader
        title="Notifications"
        subtitle={
          counts.total > 0
            ? `${counts.total} notification${counts.total > 1 ? 's' : ''} non lue${counts.total > 1 ? 's' : ''}`
            : 'Toutes vos notifications sont lues'
        }
        action={
          counts.total > 0 ? (
            <Button variant="outline" className="rounded-full" onClick={() => markAllAsRead()}>
              <Check className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          ) : undefined
        }
      />

      <DashSection title="Toutes les notifications">
        <DashFilterPills
          label="Filtrer les notifications"
          value={filter}
          onChange={(v) => setFilter(v)}
          options={[
            { key: 'all', label: 'Toutes', count: notifications.length },
            { key: 'unread', label: 'Non lues', count: counts.total },
          ]}
        />

        {filteredNotifications.length === 0 ? (
          <DashEmptyState icon={Bell} title="Aucune notification" />
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  className={cn(
                    DASH_CARD,
                    'group flex items-start gap-3 p-4 md:p-5 cursor-pointer transition-colors hover:border-foreground/30',
                    !notification.read && 'bg-primary/5'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="relative shrink-0">
                    <span
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full',
                        !notification.read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    {!notification.read && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className={cn('text-base text-foreground', !notification.read ? 'font-semibold' : 'font-medium')}>
                        {notification.title}
                      </p>
                      <DashBadge tone="muted">{getNotificationTypeName(notification.type)}</DashBadge>
                      {!notification.read && <DashBadge tone="primary">Nouveau</DashBadge>}
                    </div>
                    {notification.message && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-1">
                      <span>
                        {format(new Date(notification.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full transition-opacity md:opacity-0 md:group-hover:opacity-100"
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
                      className="h-8 w-8 rounded-full transition-opacity md:opacity-0 md:group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashSection>
    </DashPage>
  );
}

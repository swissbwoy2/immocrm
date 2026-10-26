import React from 'react';
import {
  AlarmClock, Bell, BellRing, CalendarCheck, CalendarDays, CalendarX, Check, ChevronRight, ClipboardList,
  FileCheck, FilePen, FileText, Handshake, Home, Hourglass, KeyRound, Mail, MessageCircle, PartyPopper,
  PenLine, RefreshCw, Trash2, Trophy, UserCheck, UserMinus, UserPlus, Users, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification, notifBannersEnabled } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { NotificationBadge } from './NotificationBadge';
import { getCorrectNotificationLink, detectRoleFromPath } from '@/lib/notificationLinks';
import { useAuth } from '@/contexts/AuthContext';

/** Icône (lucide) par type de notification — même langage visuel que la page Notifications. */
const getNotificationIcon = (type: string): React.ElementType => {
  switch (type) {
    case 'new_client_activated': return UserCheck;
    case 'client_assigned': return Handshake;
    case 'client_removed': return UserMinus;
    case 'new_message': return MessageCircle;
    case 'new_offer': case 'new_offer_admin': return Home;
    case 'new_visit': case 'new_visit_admin': return CalendarDays;
    case 'visit_reminder': return AlarmClock;
    case 'visit_confirmed': case 'visit_confirmed_admin': return CalendarCheck;
    case 'visit_refused': case 'visit_refused_admin': return CalendarX;
    case 'visit_delegated': return RefreshCw;
    case 'activation_request': return UserPlus;
    case 'nouvelle_demande_mandat': return ClipboardList;
    case 'document_request': return FileText;
    case 'dossier_complete': return FileCheck;
    case 'badge_earned': return Trophy;
    case 'coagent_added': case 'coagent_assignment': return Users;
    case 'new_candidature': case 'candidature_deposee': return FilePen;
    case 'candidature_acceptee': case 'candidature_acceptee_admin': return PartyPopper;
    case 'candidature_refusee': case 'candidature_refusee_admin': return XCircle;
    case 'candidature_bail_conclu': case 'candidature_bail_conclu_admin': case 'bail_conclu': return PenLine;
    case 'candidature_attente_bail': case 'candidature_attente_bail_admin': return Hourglass;
    case 'candidature_bail_recu': case 'candidature_bail_recu_admin': return Mail;
    case 'candidature_signature_planifiee': case 'candidature_signature_planifiee_admin': case 'date_signature_choisie': return CalendarDays;
    case 'candidature_signature_effectuee': case 'candidature_signature_effectuee_admin': return Check;
    case 'candidature_etat_lieux_fixe': case 'candidature_etat_lieux_fixe_admin': return Home;
    case 'candidature_cles_remises': case 'candidature_cles_remises_admin': return KeyRound;
    case 'achat_update': return Home;
    case 'signature_reminder': return BellRing;
    default: return Bell;
  }
};

export function NotificationBell() {
  // Bannière à l'arrivée d'une notification (les appels ont leur propre écran de sonnerie).
  const openRef = React.useRef<(n: Notification) => void>(() => {});
  const showBanner = React.useCallback((n: Notification) => {
    if (n.type === 'call_incoming' || n.type === 'call_invite') return;
    if (!notifBannersEnabled()) return;
    toast(n.title || 'Nouvelle notification', {
      id: `notif-${n.id}`,
      description: n.message || undefined,
      duration: 8000,
      action: { label: 'Voir', onClick: () => openRef.current(n) },
    });
  }, []);
  const { notifications, counts, recordClick, markAsRead, markAllAsRead, deleteNotification } = useNotifications({ live: true, onNew: showBanner });
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();
  const [open, setOpen] = React.useState(false);
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
    void recordClick(notification.id);

    // Prefer the authenticated role, fall back to the current URL
    const pathRole = detectRoleFromPath(location.pathname);
    const role = (['admin', 'agent', 'client', 'apporteur'].includes(userRole || '')
      ? (userRole as 'admin' | 'agent' | 'client' | 'apporteur')
      : pathRole);

    // Get the correct link using centralized logic
    const url = getCorrectNotificationLink(
      notification.type,
      notification.link,
      role,
      notification.metadata as Record<string, string> | null
    );

    // Close the popover so the navigation is actually visible
    setOpen(false);
    navigate(url);
  };

  openRef.current = handleNotificationClick;

  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={counts.total > 0 ? `Notifications : ${counts.total} non lue${counts.total > 1 ? 's' : ''}` : 'Notifications'}
          className={cn(
            "relative rounded-full transition-colors hover:bg-muted",
            isAnimating && "notification-bell-ring"
          )}
        >
          <Bell className="h-5 w-5 text-foreground" />
          {counts.total > 0 && (
            <NotificationBadge
              count={counts.total}
              className="absolute -top-0.5 -right-0.5 ring-2 ring-background"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-border/70 p-0 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.10)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <h4 className="text-base font-semibold text-foreground">Notifications</h4>
            <p className="text-xs text-muted-foreground">
              {counts.total > 0 ? `${counts.total} non lue${counts.total > 1 ? 's' : ''}` : 'Vous êtes à jour'}
            </p>
          </div>
          {counts.total > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="h-8 shrink-0 rounded-full px-3 text-xs font-medium"
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Tout marquer lu
            </Button>
          )}
        </div>

        <ScrollArea className="h-[min(360px,60vh)]">
          {recentNotifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">Aucune notification</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Les nouveautés de votre dossier apparaîtront ici.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {recentNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <li key={notification.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotificationClick(notification)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(notification); } }}
                      className={cn(
                        "group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                        !notification.read && "bg-primary/[0.04]"
                      )}
                    >
                      <span className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        notification.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                      )}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "line-clamp-2 text-sm leading-snug text-foreground",
                          !notification.read ? "font-semibold" : "font-medium"
                        )}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {notification.message}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {!notification.read && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-primary" aria-label="Non lue" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Supprimer la notification"
                          className="h-7 w-7 rounded-full text-muted-foreground opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {notifications.length > 10 && (
          <div className="border-t border-border/70 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-full rounded-full text-sm font-medium"
              onClick={() => {
                const path = window.location.pathname.split('/')[1];
                setOpen(false);
                navigate(`/${path}/notifications`);
              }}
            >
              Voir toutes les notifications
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

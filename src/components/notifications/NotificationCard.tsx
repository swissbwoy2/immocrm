import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import type { Notification } from '@/hooks/useNotifications';
import {
  estATraiter, getNotificationIcon, getNotificationTypeName, libelleAction, type NotificationRole,
} from './notificationsModel';

export interface NotificationCardProps {
  notification: Notification;
  role?: NotificationRole;
  onOpen: (n: Notification) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Une notification = une carte : pastille d'icône, titre, type, message, date ;
 * bouton « ouvrir » vers l'action, et boutons lu / supprimer toujours visibles (44 px sur mobile).
 */
export function NotificationCard({ notification: n, role = 'admin', onOpen, onMarkRead, onDelete }: NotificationCardProps) {
  const Icon = getNotificationIcon(n.type);
  const urgent = estATraiter(n, role) && !n.read;
  const pastille = urgent
    ? 'bg-amber-500/10 text-amber-600'
    : !n.read
      ? 'bg-primary/10 text-primary'
      : 'bg-muted text-muted-foreground';
  const date = new Date(n.created_at);

  return (
    <article
      className={cn(
        DASH_CARD,
        'cursor-pointer p-4 transition-colors hover:bg-muted/30 md:p-5',
        !n.read && 'border-primary/30',
      )}
      onClick={() => onOpen(n)}
    >
      <div className="flex items-start gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', pastille)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={cn('min-w-0 text-base text-foreground', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <DashBadge tone="muted">{getNotificationTypeName(n.type, role)}</DashBadge>
            {!n.read && <DashBadge tone="primary">Nouveau</DashBadge>}
            {urgent && <DashBadge tone="warning">À traiter</DashBadge>}
          </div>
          {n.message && <p className="mt-2 break-words text-sm text-muted-foreground">{n.message}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true, locale: fr })}
            {' · '}
            {format(date, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant={urgent ? 'default' : 'outline'}
              className="h-11 flex-1 rounded-full sm:h-9 sm:flex-none"
              onClick={(e) => { e.stopPropagation(); onOpen(n); }}
            >
              {libelleAction(n, role)} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            {!n.read && (
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full sm:h-9 sm:w-9"
                aria-label="Marquer comme lu"
                title="Marquer comme lu"
                onClick={(e) => { e.stopPropagation(); onMarkRead(n.id); }}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full text-muted-foreground hover:text-destructive sm:h-9 sm:w-9"
              aria-label="Supprimer"
              title="Supprimer"
              onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

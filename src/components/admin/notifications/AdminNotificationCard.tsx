import { NotificationCard, type NotificationCardProps } from '@/components/notifications/NotificationCard';

/** Ancien chemin : carte commune, avec les règles de l'admin. */
export function AdminNotificationCard(props: Omit<NotificationCardProps, 'role'>) {
  return <NotificationCard {...props} role="admin" />;
}

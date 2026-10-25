import { NotificationsPage } from '@/components/notifications/NotificationsPage';

/** Notifications de l'espace client : page commune, identique à celle de l'admin. */
export default function ClientNotifications() {
  return <NotificationsPage role="client" />;
}

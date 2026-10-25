import { NotificationsPage } from '@/components/notifications/NotificationsPage';

/** Notifications de l'espace agent : page commune, identique à celle de l'admin. */
export default function AgentNotifications() {
  return <NotificationsPage role="agent" />;
}

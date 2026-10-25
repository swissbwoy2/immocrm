import { NotificationsPage } from '@/components/notifications/NotificationsPage';

/** Notifications de l'espace proprietaire : page commune, identique à celle de l'admin. */
export default function ProprietaireNotifications() {
  return <NotificationsPage role="proprietaire" />;
}

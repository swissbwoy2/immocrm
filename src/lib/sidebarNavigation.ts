import type { LucideIcon } from 'lucide-react';
import { AlarmClock, Banknote, Bell, Bike, Bookmark, Bot, Building2, Calendar, CalendarCheck, CheckCircle2, Clipboard, Contact, DollarSign, FileCheck, FileText, Globe, GraduationCap, HandHeart, Handshake, HardHat, Heart, History, Home, Inbox, LayoutDashboard, LifeBuoy, Link, Mail, MailPlus, Mailbox, MapPin, Megaphone, MessageSquare, Plus, Receipt, Send, Settings, ShieldCheck, Tag, Target, TrendingUp, User, UserCog, UserPlus, Users, Wallet } from 'lucide-react';

export interface MenuItem {
  name: string;
  icon: LucideIcon;
  path: string;
  notifKey: string | null;
}

export interface MenuSection {
  label: string;
  items: MenuItem[];
}

// Navigation only: authorization remains in ProtectedRoute and server policies.
const menus: Record<string, MenuSection[]> = {
  admin: [
    { label: "Au quotidien", items: [
      { name: "Tableau de bord", icon: LayoutDashboard, path: "/admin", notifKey: null },
      { name: "Messagerie", icon: MessageSquare, path: "/admin/messagerie", notifKey: "new_message" },
      { name: "Calendrier", icon: Calendar, path: "/admin/calendrier", notifKey: null },
      { name: "Notifications", icon: Bell, path: "/admin/notifications", notifKey: "total" },
      { name: "Rappels", icon: AlarmClock, path: "/admin/rappels", notifKey: null },
    ] },
    { label: "Clients et mandats", items: [
      { name: "Clients", icon: Users, path: "/admin/clients", notifKey: "new_client_activated" },
      { name: "Demandes d’activation", icon: UserPlus, path: "/admin/demandes-activation", notifKey: "activation_request" },
      { name: "Mandats", icon: Clipboard, path: "/admin/mandats", notifKey: null },
      { name: "Extraits de poursuites", icon: ShieldCheck, path: "/admin/suivi-extraits", notifKey: null },
    ] },
    { label: "Offres et visites", items: [
      { name: "Envoyer une offre", icon: Send, path: "/admin/envoyer-offre", notifKey: null },
      { name: "Offres envoyées", icon: Mail, path: "/admin/offres-envoyees", notifKey: "client_interesse" },
      { name: "Offres à suivre", icon: Bookmark, path: "/admin/wishlist", notifKey: null },
      { name: "Visites", icon: CalendarCheck, path: "/admin/visites", notifKey: null },
      { name: "Matching automatique", icon: Bot, path: "/admin/auto-offres", notifKey: null },
      { name: "Suivi des offres automatiques", icon: Mail, path: "/admin/offres-auto", notifKey: null },
    ] },
    { label: "Candidatures", items: [
      { name: "Candidatures", icon: FileCheck, path: "/admin/candidatures", notifKey: "candidature_admin" },
      { name: "Déposer une candidature", icon: Clipboard, path: "/admin/deposer-candidature", notifKey: null },
      { name: "Postulations", icon: Mailbox, path: "/admin/postulations", notifKey: "postulations" },
      { name: "Candidats location", icon: Inbox, path: "/admin/candidatures-relocation", notifKey: null },
    ] },
    { label: "Biens et projets", items: [
      { name: "Propriétaires", icon: Home, path: "/admin/proprietaires", notifKey: "new_proprietaire_invited" },
      { name: "Biens en vente", icon: Building2, path: "/admin/biens-vente", notifKey: null },
      { name: "Intérêts acheteurs", icon: Heart, path: "/admin/interets-acheteurs", notifKey: "new_interet_acheteur" },
      { name: "Projets de développement", icon: HardHat, path: "/admin/projets-developpement", notifKey: "new_projet_developpement" },
      { name: "Rénovation", icon: HardHat, path: "/admin/renovation", notifKey: null },
    ] },
    { label: "Communication et marketing", items: [
      { name: "Boîte de réception", icon: Inbox, path: "/admin/boite-reception", notifKey: null },
      { name: "Écrire un e-mail", icon: MailPlus, path: "/admin/envoyer-email", notifKey: null },
      { name: "Historique des e-mails", icon: History, path: "/admin/historique-emails", notifKey: null },
      { name: "WhatsApp", icon: MessageSquare, path: "/admin/whatsapp", notifKey: "whatsapp_unread" },
      { name: "Historique WhatsApp", icon: History, path: "/admin/whatsapp-notifications", notifKey: null },
      { name: "Prospects Shortlist", icon: Target, path: "/admin/leads", notifKey: null },
      { name: "Prospects Meta Ads", icon: Tag, path: "/admin/meta-leads", notifKey: null },
      { name: "Newsletter", icon: Mail, path: "/admin/newsletter", notifKey: null },
      { name: "Campagnes de suivi", icon: Send, path: "/admin/campagnes-suivi", notifKey: null },
      { name: "Statistiques marketing", icon: TrendingUp, path: "/admin/analytics", notifKey: null },
    ] },
    { label: "Équipe et partenaires", items: [
      { name: "Agents", icon: UserCog, path: "/admin/agents", notifKey: null },
      { name: "Assignations", icon: UserCog, path: "/admin/assignations", notifKey: null },
      { name: "Apporteurs", icon: Handshake, path: "/admin/apporteurs", notifKey: null },
      { name: "Recommandations", icon: Link, path: "/admin/referrals", notifKey: null },
      { name: "Coursiers", icon: Bike, path: "/admin/coursiers", notifKey: null },
      { name: "Statistiques des agents", icon: TrendingUp, path: "/admin/statistiques-agents", notifKey: null },
    ] },
    { label: "Finances", items: [
      { name: "Transactions", icon: DollarSign, path: "/admin/transactions", notifKey: null },
      { name: "Factures AbaNinja", icon: Receipt, path: "/admin/factures-abaninja", notifKey: null },
      { name: "Registre commissions", icon: Receipt, path: "/admin/registre-commissions", notifKey: null },
      { name: "Salaires", icon: Wallet, path: "/admin/salaires", notifKey: null },
      { name: "Salaires par agent", icon: Wallet, path: "/admin/salaires-agents", notifKey: null },
    ] },
    { label: "Documents et contacts", items: [
      { name: "Documents", icon: FileText, path: "/admin/documents", notifKey: null },
      { name: "Modèles de demande", icon: FileText, path: "/admin/modeles-demande-location", notifKey: null },
      { name: "Contacts", icon: Contact, path: "/admin/contacts", notifKey: null },
    ] },
    { label: "Portail immobilier", items: [
      { name: "Annonces publiques", icon: Globe, path: "/admin/annonces-publiques", notifKey: null },
      { name: "Annonceurs", icon: Megaphone, path: "/admin/annonceurs", notifKey: null },
      { name: "Portail d’annonces", icon: Globe, path: "/annonces", notifKey: null },
      { name: "Espace annonceur", icon: Megaphone, path: "/espace-annonceur", notifKey: null },
      { name: "Bannières du portail", icon: Globe, path: "/admin/portail-bannieres", notifKey: null },
    ] },
    { label: "Aide et paramètres", items: [
      { name: "Support", icon: LifeBuoy, path: "/admin/support", notifKey: null },
      { name: "Paramètres", icon: Settings, path: "/admin/parametres", notifKey: null },
    ] },
  ],
  agent: [
    { label: "Au quotidien", items: [
      { name: "Tableau de bord", icon: LayoutDashboard, path: "/agent", notifKey: null },
      { name: "Messagerie", icon: MessageSquare, path: "/agent/messagerie", notifKey: "new_message" },
      { name: "Calendrier", icon: Calendar, path: "/agent/calendrier", notifKey: "visit_combined" },
      { name: "Notifications", icon: Bell, path: "/agent/notifications", notifKey: "total" },
    ] },
    { label: "Clients et biens", items: [
      { name: "Mes clients", icon: Users, path: "/agent/mes-clients", notifKey: "client_assigned" },
      { name: "Extraits de poursuites", icon: ShieldCheck, path: "/agent/suivi-extraits", notifKey: null },
      { name: "Propriétaires", icon: Home, path: "/agent/proprietaires", notifKey: null },
      { name: "Biens en vente", icon: Building2, path: "/agent/biens-vente", notifKey: null },
      { name: "Rénovation", icon: HardHat, path: "/agent/renovation", notifKey: null },
    ] },
    { label: "Offres et visites", items: [
      { name: "Envoyer une offre", icon: Send, path: "/agent/envoyer-offre", notifKey: null },
      { name: "Offres envoyées", icon: Mail, path: "/agent/offres-envoyees", notifKey: "client_interesse" },
      { name: "Offres à suivre", icon: Bookmark, path: "/agent/wishlist", notifKey: null },
      { name: "Offres automatiques", icon: Bot, path: "/agent/offres-auto", notifKey: null },
      { name: "Visites", icon: CalendarCheck, path: "/agent/visites", notifKey: "new_visit" },
      { name: "Carte", icon: MapPin, path: "/agent/carte", notifKey: null },
    ] },
    { label: "Candidatures", items: [
      { name: "Candidatures", icon: FileCheck, path: "/agent/candidatures", notifKey: null },
      { name: "Déposer une candidature", icon: Clipboard, path: "/agent/deposer-candidature", notifKey: null },
      { name: "Postulations", icon: Mailbox, path: "/agent/postulations", notifKey: "postulations" },
      { name: "Candidats location", icon: Inbox, path: "/admin/candidatures-relocation", notifKey: null },
    ] },
    { label: "Communications", items: [
      { name: "Boîte de réception", icon: Inbox, path: "/agent/boite-reception", notifKey: null },
      { name: "Écrire un e-mail", icon: MailPlus, path: "/agent/envoyer-email", notifKey: null },
      { name: "Historique des e-mails", icon: History, path: "/agent/historique-emails", notifKey: null },
      { name: "WhatsApp", icon: MessageSquare, path: "/agent/whatsapp", notifKey: "whatsapp_unread" },
    ] },
    { label: "Documents et contacts", items: [
      { name: "Documents", icon: FileText, path: "/agent/documents", notifKey: null },
      { name: "Modèles de demande", icon: FileText, path: "/agent/modeles-demande-location", notifKey: null },
      { name: "Contacts", icon: Contact, path: "/agent/contacts", notifKey: null },
    ] },
    { label: "Finances", items: [
      { name: "Transactions", icon: DollarSign, path: "/agent/transactions", notifKey: null },
    ] },
    { label: "Portail immobilier", items: [
      { name: "Portail d’annonces", icon: Globe, path: "/annonces", notifKey: null },
      { name: "Espace annonceur", icon: Megaphone, path: "/espace-annonceur", notifKey: null },
      { name: "Bannières du portail", icon: Globe, path: "/admin/portail-bannieres", notifKey: null },
    ] },
    { label: "Aide et paramètres", items: [
      { name: "Formation", icon: GraduationCap, path: "/agent/formation", notifKey: null },
      { name: "Support", icon: LifeBuoy, path: "/agent/support", notifKey: null },
      { name: "Paramètres", icon: Settings, path: "/agent/parametres", notifKey: null },
    ] },
  ],
  client_location: [
    { label: "Au quotidien", items: [
      { name: "Tableau de bord", icon: LayoutDashboard, path: "/client", notifKey: null },
      { name: "Messagerie", icon: MessageSquare, path: "/client/messagerie", notifKey: "new_message" },
      { name: "Notifications", icon: Bell, path: "/client/notifications", notifKey: "total" },
    ] },
    { label: "Ma recherche", items: [
      { name: "Offres reçues", icon: Home, path: "/client/offres-recues", notifKey: "new_offer" },
      { name: "Annonces", icon: Building2, path: "/client/annonces", notifKey: null },
      { name: "Carte", icon: MapPin, path: "/client/carte", notifKey: null },
    ] },
    { label: "Mes visites", items: [
      { name: "Calendrier", icon: Calendar, path: "/client/calendrier", notifKey: "visit_combined" },
      { name: "Mes visites", icon: CalendarCheck, path: "/client/visites", notifKey: "new_visit" },
      { name: "Comptes rendus de visite", icon: CheckCircle2, path: "/client/videos-recues", notifKey: null },
      { name: "Visites déléguées", icon: HandHeart, path: "/client/visites-deleguees", notifKey: null },
    ] },
    { label: "Mon dossier", items: [
      { name: "Mon dossier", icon: User, path: "/client/dossier", notifKey: null },
      { name: "Mon contrat", icon: FileText, path: "/client/mon-contrat", notifKey: null },
      { name: "Mes candidatures", icon: Clipboard, path: "/client/mes-candidatures", notifKey: null },
      { name: "Mes documents", icon: FileText, path: "/client/documents", notifKey: null },
    ] },
    { label: "Portail immobilier", items: [
      { name: "Portail d’annonces", icon: Globe, path: "/annonces", notifKey: null },
      { name: "Espace annonceur", icon: Megaphone, path: "/espace-annonceur", notifKey: null },
    ] },
    { label: "Mon compte", items: [
      { name: "Paramètres", icon: Settings, path: "/client/parametres", notifKey: null },
    ] },
  ],
  client_achat: [
    { label: "Au quotidien", items: [
      { name: "Tableau de bord", icon: LayoutDashboard, path: "/client", notifKey: null },
      { name: "Messagerie", icon: MessageSquare, path: "/client/messagerie", notifKey: "new_message" },
      { name: "Notifications", icon: Bell, path: "/client/notifications", notifKey: "total" },
    ] },
    { label: "Mon achat", items: [
      { name: "Biens proposés", icon: Home, path: "/client/biens-proposes", notifKey: "new_offer" },
      { name: "Biens sélectionnés", icon: Building2, path: "/client/biens-selectionnes", notifKey: null },
      { name: "Carte", icon: MapPin, path: "/client/carte", notifKey: null },
      { name: "Calendrier", icon: Calendar, path: "/client/calendrier", notifKey: "visit_combined" },
    ] },
    { label: "Mon dossier", items: [
      { name: "Mon dossier", icon: User, path: "/client/dossier", notifKey: null },
      { name: "Financement", icon: Banknote, path: "/client/financement", notifKey: null },
      { name: "Mes documents", icon: FileText, path: "/client/documents", notifKey: null },
    ] },
    { label: "Portail immobilier", items: [
      { name: "Portail d’annonces", icon: Globe, path: "/annonces", notifKey: null },
      { name: "Espace annonceur", icon: Megaphone, path: "/espace-annonceur", notifKey: null },
    ] },
    { label: "Aide et paramètres", items: [
      { name: "Aide & support", icon: LifeBuoy, path: "/support", notifKey: null },
      { name: "Paramètres", icon: Settings, path: "/client/parametres", notifKey: null },
    ] },
  ],
  client_renovation: [
    { label: "Au quotidien", items: [
      { name: "Tableau de bord", icon: LayoutDashboard, path: "/client", notifKey: null },
      { name: "Messagerie", icon: MessageSquare, path: "/client/messagerie", notifKey: "new_message" },
      { name: "Notifications", icon: Bell, path: "/client/notifications", notifKey: "total" },
    ] },
    { label: "Mon projet", items: [
      { name: "Mes projets rénovation", icon: HardHat, path: "/client/renovation", notifKey: null },
    ] },
    { label: "Mon dossier", items: [
      { name: "Mon dossier", icon: User, path: "/client/dossier", notifKey: null },
      { name: "Mes documents", icon: FileText, path: "/client/documents", notifKey: null },
    ] },
    { label: "Portail immobilier", items: [
      { name: "Portail d’annonces", icon: Globe, path: "/annonces", notifKey: null },
      { name: "Espace annonceur", icon: Megaphone, path: "/espace-annonceur", notifKey: null },
    ] },
    { label: "Mon compte", items: [
      { name: "Paramètres", icon: Settings, path: "/client/parametres", notifKey: null },
    ] },
  ],
  client_vente: [
    { label: "Au quotidien", items: [
      { name: "Tableau de bord", icon: LayoutDashboard, path: "/client", notifKey: null },
      { name: "Messagerie", icon: MessageSquare, path: "/client/messagerie", notifKey: "new_message" },
      { name: "Notifications", icon: Bell, path: "/client/notifications", notifKey: "total" },
    ] },
    { label: "Mon dossier", items: [
      { name: "Mon dossier", icon: User, path: "/client/dossier", notifKey: null },
      { name: "Mes documents", icon: FileText, path: "/client/documents", notifKey: null },
    ] },
    { label: "Portail immobilier", items: [
      { name: "Portail d’annonces", icon: Globe, path: "/annonces", notifKey: null },
      { name: "Espace annonceur", icon: Megaphone, path: "/espace-annonceur", notifKey: null },
    ] },
    { label: "Mon compte", items: [
      { name: "Paramètres", icon: Settings, path: "/client/parametres", notifKey: null },
    ] },
  ],
  apporteur: [
    { label: "Au quotidien", items: [
      { name: "Tableau de bord", icon: LayoutDashboard, path: "/apporteur", notifKey: null },
      { name: "Notifications", icon: Bell, path: "/apporteur/notifications", notifKey: "total" },
    ] },
    { label: "Mes recommandations", items: [
      { name: "Soumettre un client", icon: UserPlus, path: "/apporteur/soumettre-client", notifKey: null },
      { name: "Mes recommandations", icon: Handshake, path: "/apporteur/mes-referrals", notifKey: null },
    ] },
    { label: "Contrat et commissions", items: [
      { name: "Commissions", icon: Wallet, path: "/apporteur/commissions", notifKey: null },
      { name: "Mon contrat", icon: FileText, path: "/apporteur/mon-contrat", notifKey: null },
    ] },
    { label: "Portail immobilier", items: [
      { name: "Portail d’annonces", icon: Globe, path: "/annonces", notifKey: null },
      { name: "Espace annonceur", icon: Megaphone, path: "/espace-annonceur", notifKey: null },
    ] },
    { label: "Mon compte", items: [
      { name: "Mon profil", icon: User, path: "/apporteur/profil", notifKey: null },
      { name: "Paramètres", icon: Settings, path: "/apporteur/parametres", notifKey: null },
    ] },
  ],
  proprietaire: [
    { label: "Au quotidien", items: [
      { name: "Tableau de bord", icon: LayoutDashboard, path: "/proprietaire", notifKey: null },
      { name: "Messagerie", icon: MessageSquare, path: "/proprietaire/messagerie", notifKey: "new_message" },
      { name: "Calendrier", icon: Calendar, path: "/proprietaire/calendrier", notifKey: null },
      { name: "Notifications", icon: Bell, path: "/proprietaire/notifications", notifKey: "total" },
    ] },
    { label: "Mes biens et projets", items: [
      { name: "Mes biens", icon: Home, path: "/proprietaire/immeubles", notifKey: null },
      { name: "Vendre mon bien", icon: Tag, path: "/proprietaire/vente", notifKey: null },
      { name: "Projets de développement", icon: HardHat, path: "/proprietaire/projets-developpement", notifKey: "projet_statut_change" },
      { name: "Rénovation", icon: HardHat, path: "/proprietaire/renovation", notifKey: null },
    ] },
    { label: "Gestion locative", items: [
      { name: "Locataires", icon: Users, path: "/proprietaire/locataires", notifKey: null },
      { name: "Baux", icon: FileText, path: "/proprietaire/baux", notifKey: null },
      { name: "Demandes d’intervention", icon: AlarmClock, path: "/proprietaire/tickets", notifKey: null },
      { name: "Documents", icon: FileText, path: "/proprietaire/documents", notifKey: null },
    ] },
    { label: "Finances et assurances", items: [
      { name: "Comptabilité", icon: DollarSign, path: "/proprietaire/comptabilite", notifKey: null },
      { name: "Hypothèques", icon: Clipboard, path: "/proprietaire/hypotheques", notifKey: null },
      { name: "Assurances", icon: FileCheck, path: "/proprietaire/assurances", notifKey: null },
    ] },
    { label: "Portail immobilier", items: [
      { name: "Portail d’annonces", icon: Globe, path: "/annonces", notifKey: null },
      { name: "Espace annonceur", icon: Megaphone, path: "/espace-annonceur", notifKey: null },
    ] },
    { label: "Mon compte", items: [
      { name: "Paramètres", icon: Settings, path: "/proprietaire/parametres", notifKey: null },
    ] },
  ],
  coursier: [
    { label: "Au quotidien", items: [
      { name: "Tableau de bord", icon: LayoutDashboard, path: "/coursier", notifKey: null },
      { name: "Calendrier", icon: Calendar, path: "/coursier/calendrier", notifKey: null },
    ] },
    { label: "Mes missions", items: [
      { name: "Missions disponibles", icon: CalendarCheck, path: "/coursier/missions", notifKey: null },
      { name: "Carte", icon: Home, path: "/coursier/carte", notifKey: null },
      { name: "Historique et gains", icon: Wallet, path: "/coursier/historique", notifKey: null },
    ] },
    { label: "Portail immobilier", items: [
      { name: "Portail d’annonces", icon: Globe, path: "/annonces", notifKey: null },
      { name: "Espace annonceur", icon: Megaphone, path: "/espace-annonceur", notifKey: null },
    ] },
    { label: "Mon compte", items: [
      { name: "Paramètres", icon: Settings, path: "/coursier/parametres", notifKey: null },
    ] },
  ],
  closeur: [
    { label: "Mon activité", items: [
      { name: "Tableau de bord et prospects", icon: Target, path: "/closeur", notifKey: null },
    ] },
    { label: "Portail immobilier", items: [
      { name: "Portail d’annonces", icon: Globe, path: "/annonces", notifKey: null },
      { name: "Espace annonceur", icon: Megaphone, path: "/espace-annonceur", notifKey: null },
    ] },
  ],
  candidat: [
    { label: "Au quotidien", items: [
      { name: "Tableau de bord", icon: LayoutDashboard, path: "/candidat", notifKey: null },
      { name: "Messagerie", icon: MessageSquare, path: "/candidat/messages", notifKey: null },
      { name: "Calendrier", icon: Calendar, path: "/candidat/agenda", notifKey: null },
    ] },
    { label: "Mon dossier", items: [
      { name: "Mes candidatures", icon: FileText, path: "/candidat/candidatures", notifKey: null },
      { name: "Ma demande de location", icon: Clipboard, path: "/candidat/demande", notifKey: null },
    ] },
    { label: "Portail immobilier", items: [
      { name: "Portail d’annonces", icon: Globe, path: "/annonces", notifKey: null },
      { name: "Espace annonceur", icon: Megaphone, path: "/espace-annonceur", notifKey: null },
    ] },
    { label: "Aide", items: [
      { name: "Aide et support", icon: LifeBuoy, path: "/candidat/support", notifKey: null },
    ] },
  ],
  annonceur: [
    { label: "Au quotidien", items: [
      { name: "Tableau de bord", icon: LayoutDashboard, path: "/espace-annonceur", notifKey: null },
      { name: "Messagerie", icon: MessageSquare, path: "/espace-annonceur/messages", notifKey: "annonceur_unread" },
    ] },
    { label: "Mes annonces", items: [
      { name: "Mes annonces", icon: Building2, path: "/espace-annonceur/mes-annonces", notifKey: null },
      { name: "Publier une annonce", icon: Plus, path: "/espace-annonceur/nouvelle-annonce", notifKey: null },
    ] },
    { label: "Mon compte", items: [
      { name: "Mon profil", icon: User, path: "/espace-annonceur/profil", notifKey: null },
      { name: "Paramètres", icon: Settings, path: "/espace-annonceur/parametres", notifKey: null },
    ] },
  ],
};

export function getMenuForRole(role: string, parcoursType?: string | null): MenuSection[] {
  // ProtectedRoute already permits this role on admin screens; no role is granted here.
  if (role === 'automation_operator') return menus.admin;
  // This technical role has no dedicated dashboard route in the application.
  if (role === 'agent_ia') return [{ label: 'Portail immobilier', items: [
    { name: 'Portail d’annonces', icon: Globe, path: '/annonces', notifKey: null },
    { name: 'Espace annonceur', icon: Megaphone, path: '/espace-annonceur', notifKey: null },
  ] }];
  if (role === 'client') {
    const journey = ['achat', 'vente', 'renovation'].includes(parcoursType || '') ? parcoursType : 'location';
    return menus[`client_${journey}`];
  }
  return menus[role] || [];
}

export function isNavigationItemActive(pathname: string, path: string): boolean {
  // Every role home is exact, including apporteur, candidat and annonceur.
  return pathname === path || (path.split('/').length > 2 && pathname.startsWith(`${path}/`));
}

export function filterMenu(sections: MenuSection[], query: string): MenuSection[] {
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const needle = normalize(query);
  if (!needle) return sections;
  return sections.map(section => ({
    ...section,
    items: section.items.filter(item => normalize(`${section.label} ${item.name}`).includes(needle)),
  })).filter(section => section.items.length > 0);
}

import { LogOut, LayoutDashboard, Users, FileText, DollarSign, MessageSquare, Send, Home, Clipboard, UserCog, User, Calendar, Settings, Mail, HandHeart, Bell, MailPlus, History, Inbox, CalendarCheck, FileCheck, AlarmClock, UserPlus, Receipt, FileEdit, TrendingUp, Wallet, Link, Handshake, FilePen, Target, Contact, Brain, Building2, Heart, HardHat, Globe, Megaphone, Tag, Bike, MapPin, Bot } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useMemo } from 'react';
import { NotificationBadge } from './NotificationBadge';
import { NotificationBell } from './NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { checkDraftsExist } from '@/hooks/useDraftManager';

const getMenuForRole = (role: string) => {
  switch (role) {
    case 'admin':
      return [
        { name: 'Tableau de bord', icon: LayoutDashboard, path: '/admin', notifKey: null },
        { name: 'Messagerie', icon: MessageSquare, path: '/admin/messagerie', notifKey: 'new_message' },
        { name: 'Calendrier', icon: Calendar, path: '/admin/calendrier', notifKey: null },
        { name: 'Agents', icon: UserCog, path: '/admin/agents', notifKey: null },
        { name: 'Apporteurs', icon: Handshake, path: '/admin/apporteurs', notifKey: null },
        { name: 'Referrals', icon: Link, path: '/admin/referrals', notifKey: null },
        { name: 'Leads Shortlist', icon: Target, path: '/admin/leads', notifKey: null },
        { name: 'Leads Meta Ads', icon: Tag, path: '/admin/meta-leads', notifKey: null },
        { name: 'Clients', icon: Users, path: '/admin/clients', notifKey: 'new_client_activated' },
        { name: 'Propriétaires', icon: Home, path: '/admin/proprietaires', notifKey: 'new_proprietaire_invited' },
        { name: 'Demandes activation', icon: UserPlus, path: '/admin/demandes-activation', notifKey: 'activation_request' },
        { name: 'Factures AbaNinja', icon: Receipt, path: '/admin/factures-abaninja', notifKey: null },
        { name: 'Salaires', icon: Wallet, path: '/admin/salaires', notifKey: null },
        { name: 'Statistiques Agents', icon: TrendingUp, path: '/admin/statistiques-agents', notifKey: null },
        { name: 'Analytics Marketing', icon: TrendingUp, path: '/admin/analytics', notifKey: null },
        { name: 'Candidatures', icon: FileCheck, path: '/admin/candidatures', notifKey: 'candidature_admin' },
        { name: 'Mandats', icon: Clipboard, path: '/admin/mandats', notifKey: null },
        { name: 'Transactions', icon: DollarSign, path: '/admin/transactions', notifKey: null },
        { name: 'Envoyer une offre', icon: Send, path: '/admin/envoyer-offre', notifKey: null },
        { name: 'Offres envoyées', icon: Mail, path: '/admin/offres-envoyees', notifKey: null },
        { name: 'Assignations', icon: UserCog, path: '/admin/assignations', notifKey: null },
        { name: 'Envoyer Email', icon: MailPlus, path: '/admin/envoyer-email', notifKey: null },
        { name: 'Historique Emails', icon: History, path: '/admin/historique-emails', notifKey: null },
        { name: 'Boîte de réception', icon: Inbox, path: '/admin/boite-reception', notifKey: null },
        { name: 'Documents', icon: FileText, path: '/admin/documents', notifKey: null },
{ name: 'Remplir PDF', icon: FilePen, path: '/admin/remplir-pdf', notifKey: null },
        { name: 'Remplir demande IA', icon: Brain, path: '/admin/remplir-demande-ia', notifKey: null },
        { name: 'Contacts', icon: Contact, path: '/admin/contacts', notifKey: null },
        { name: 'Biens en vente', icon: Building2, path: '/admin/biens-vente', notifKey: null },
        { name: 'Intérêts acheteurs', icon: Heart, path: '/admin/interets-acheteurs', notifKey: 'new_interet_acheteur' },
        { name: 'Projets développement', icon: HardHat, path: '/admin/projets-developpement', notifKey: 'new_projet_developpement' },
        { name: 'Annonces Publiques', icon: Globe, path: '/admin/annonces-publiques', notifKey: null },
        { name: 'Annonceurs', icon: Megaphone, path: '/admin/annonceurs', notifKey: null },
        { name: 'Rappels', icon: AlarmClock, path: '/admin/rappels', notifKey: null },
        { name: 'Coursiers', icon: Bike, path: '/admin/coursiers', notifKey: null },
        { name: 'Agent IA Relocation', icon: Bot, path: '/admin/agent-ia', notifKey: null },
        { name: 'Notifications', icon: Bell, path: '/admin/notifications', notifKey: 'total' },
        { name: 'Paramètres', icon: Settings, path: '/admin/parametres', notifKey: null },
      ];
    case 'agent':
      return [
        { name: 'Tableau de bord', icon: LayoutDashboard, path: '/agent', notifKey: null },
        { name: 'Messagerie', icon: MessageSquare, path: '/agent/messagerie', notifKey: 'new_message' },
        { name: 'Calendrier', icon: Calendar, path: '/agent/calendrier', notifKey: 'visit_combined' },
        { name: 'Mes clients', icon: Users, path: '/agent/mes-clients', notifKey: 'client_assigned' },
        { name: 'Propriétaires', icon: Home, path: '/agent/proprietaires', notifKey: null },
        { name: 'Biens en vente', icon: Building2, path: '/agent/biens-vente', notifKey: null },
        { name: 'Matching AI', icon: Brain, path: '/agent/matching-ai', notifKey: null },
        { name: 'Visites', icon: CalendarCheck, path: '/agent/visites', notifKey: 'new_visit' },
        { name: 'Carte', icon: MapPin, path: '/agent/carte', notifKey: null },
        { name: 'Candidatures', icon: FileCheck, path: '/agent/candidatures', notifKey: null },
        { name: 'Déposer candidature', icon: Clipboard, path: '/agent/deposer-candidature', notifKey: null },
        { name: 'Transactions', icon: DollarSign, path: '/agent/transactions', notifKey: null },
        { name: 'Envoyer une offre', icon: Send, path: '/agent/envoyer-offre', notifKey: null },
        { name: 'Offres envoyées', icon: Mail, path: '/agent/offres-envoyees', notifKey: null },
        { name: 'Envoyer Email', icon: MailPlus, path: '/agent/envoyer-email', notifKey: null },
        { name: 'Historique Emails', icon: History, path: '/agent/historique-emails', notifKey: null },
        { name: 'Boîte de réception', icon: Inbox, path: '/agent/boite-reception', notifKey: null },
        { name: 'Documents', icon: FileText, path: '/agent/documents', notifKey: null },
        { name: 'Remplir PDF', icon: FilePen, path: '/agent/remplir-pdf', notifKey: null },
        { name: 'Remplir demande IA', icon: Brain, path: '/agent/remplir-demande', notifKey: null },
        { name: 'Contacts', icon: Contact, path: '/agent/contacts', notifKey: null },
        { name: 'Notifications', icon: Bell, path: '/agent/notifications', notifKey: 'total' },
        { name: 'Paramètres', icon: Settings, path: '/agent/parametres', notifKey: null },
      ];
    case 'client':
      return [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/client', notifKey: null },
        { name: 'Messagerie', icon: MessageSquare, path: '/client/messagerie', notifKey: 'new_message' },
        { name: 'Mon dossier', icon: User, path: '/client/dossier', notifKey: null },
        { name: 'Mon contrat', icon: FileText, path: '/client/mon-contrat', notifKey: null },
        { name: 'Offres reçues', icon: Home, path: '/client/offres-recues', notifKey: 'new_offer' },
        { name: 'Annonces', icon: Building2, path: '/client/annonces', notifKey: null },
        { name: 'Mes visites', icon: CalendarCheck, path: '/client/visites', notifKey: 'new_visit' },
        { name: 'Carte', icon: MapPin, path: '/client/carte', notifKey: null },
        { name: 'Calendrier', icon: Calendar, path: '/client/calendrier', notifKey: 'visit_combined' },
        { name: 'Visites déléguées', icon: HandHeart, path: '/client/visites-deleguees', notifKey: null },
        { name: 'Mes candidatures', icon: Clipboard, path: '/client/mes-candidatures', notifKey: null },
        { name: 'Mes documents', icon: FileText, path: '/client/documents', notifKey: null },
        { name: 'Notifications', icon: Bell, path: '/client/notifications', notifKey: 'total' },
        { name: 'Paramètres', icon: Settings, path: '/client/parametres', notifKey: null },
      ];
    case 'apporteur':
      return [
        { name: 'Tableau de bord', icon: LayoutDashboard, path: '/apporteur', notifKey: null },
        { name: 'Soumettre un client', icon: UserPlus, path: '/apporteur/soumettre-client', notifKey: null },
        { name: 'Mes referrals', icon: Handshake, path: '/apporteur/mes-referrals', notifKey: null },
        { name: 'Commissions', icon: Wallet, path: '/apporteur/commissions', notifKey: null },
        { name: 'Mon contrat', icon: FileText, path: '/apporteur/mon-contrat', notifKey: null },
        { name: 'Mon profil', icon: User, path: '/apporteur/profil', notifKey: null },
        { name: 'Notifications', icon: Bell, path: '/apporteur/notifications', notifKey: 'total' },
        { name: 'Paramètres', icon: Settings, path: '/apporteur/parametres', notifKey: null },
      ];
    case 'proprietaire':
      return [
        { name: 'Tableau de bord', icon: LayoutDashboard, path: '/proprietaire', notifKey: null },
        { name: 'Messagerie', icon: MessageSquare, path: '/proprietaire/messagerie', notifKey: 'new_message' },
        { name: 'Calendrier', icon: Calendar, path: '/proprietaire/calendrier', notifKey: null },
        { name: 'Mes biens', icon: Home, path: '/proprietaire/immeubles', notifKey: null },
        { name: 'Vendre mon bien', icon: Tag, path: '/proprietaire/vente', notifKey: null },
        { name: 'Projets de développement', icon: HardHat, path: '/proprietaire/projets-developpement', notifKey: 'projet_statut_change' },
        { name: 'Locataires', icon: Users, path: '/proprietaire/locataires', notifKey: null },
        { name: 'Comptabilité', icon: DollarSign, path: '/proprietaire/comptabilite', notifKey: null },
        { name: 'Baux', icon: FileText, path: '/proprietaire/baux', notifKey: null },
        { name: 'Hypothèques', icon: Clipboard, path: '/proprietaire/hypotheques', notifKey: null },
        { name: 'Assurances', icon: FileCheck, path: '/proprietaire/assurances', notifKey: null },
        { name: 'Tickets', icon: AlarmClock, path: '/proprietaire/tickets', notifKey: null },
        { name: 'Documents', icon: FileText, path: '/proprietaire/documents', notifKey: null },
        { name: 'Notifications', icon: Bell, path: '/proprietaire/notifications', notifKey: 'total' },
        { name: 'Paramètres', icon: Settings, path: '/proprietaire/parametres', notifKey: null },
      ];
    case 'coursier':
      return [
        { name: 'Tableau de bord', icon: LayoutDashboard, path: '/coursier', notifKey: null },
        { name: 'Missions disponibles', icon: CalendarCheck, path: '/coursier/missions', notifKey: null },
        { name: 'Carte', icon: Home, path: '/coursier/carte', notifKey: null },
        { name: 'Calendrier', icon: Calendar, path: '/coursier/calendrier', notifKey: null },
        { name: 'Historique & gains', icon: Wallet, path: '/coursier/historique', notifKey: null },
        { name: 'Paramètres', icon: Settings, path: '/coursier/parametres', notifKey: null },
      ];
    default:
      return [];
  }
};

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const { counts } = useNotifications();
  const [hasDrafts, setHasDrafts] = useState(false);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Check for drafts on mount and when storage changes
  useEffect(() => {
    const checkDrafts = () => {
      setHasDrafts(checkDraftsExist());
    };

    checkDrafts();
    window.addEventListener('focus', checkDrafts);
    window.addEventListener('storage', checkDrafts);
    
    return () => {
      window.removeEventListener('focus', checkDrafts);
      window.removeEventListener('storage', checkDrafts);
    };
  }, []);
  
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  if (!user || !userRole) {
    return null;
  }

  const menu = getMenuForRole(userRole);
  const userName = profile ? `${profile.prenom} ${profile.nom}` : 'Chargement...';
  const userEmail = profile?.email || user.email || '';

  const handleLogout = async () => {
    await signOut();
  };

  const getNotificationCount = (notifKey: string | null): number => {
    if (!notifKey) return 0;
    // Combine new_visit and visit_reminder for the visites menu
    if (notifKey === 'visit_combined') {
      return (counts.new_visit || 0) + (counts.visit_reminder || 0);
    }
    return counts[notifKey as keyof typeof counts] || 0;
  };

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 p-4">
          <img 
            src={logoImmoRama} 
            alt="Immo-Rama Logo" 
            className="h-10 w-auto object-contain flex-shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-sidebar-foreground truncate">Logisorama</h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">by Immo-rama.ch</p>
            </div>
          )}
          {!collapsed && <NotificationBell />}
        </div>
      </SidebarHeader>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-b border-sidebar-border">
          <div className="text-sm text-sidebar-foreground/80">
            <div className="font-medium text-sidebar-foreground truncate">{userName}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</div>
            <div className="text-xs capitalize mt-1 text-sidebar-accent-foreground bg-sidebar-accent px-2 py-0.5 rounded inline-block">{userRole}</div>
          </div>
        </div>
      )}

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {menu.map((item) => {
                const notifCount = getNotificationCount(item.notifKey);
                
                return (
                  <SidebarMenuItem key={item.path}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={item.path}
                            end={item.path === '/admin' || item.path === '/agent' || item.path === '/client'}
                            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors relative"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                            onClick={handleNavClick}
                          >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            {notifCount > 0 && (
                              <NotificationBadge 
                                count={notifCount} 
                                className="absolute -top-1 -right-1"
                              />
                            )}
                            {hasDrafts && item.path === '/agent/envoyer-offre' && (
                              <FileEdit className="w-3 h-3 absolute -top-1 -right-1 text-orange-500" />
                            )}
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.name} {notifCount > 0 && `(${notifCount})`} {hasDrafts && item.path === '/agent/envoyer-offre' && '📝'}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <NavLink
                        to={item.path}
                        end={item.path === '/admin' || item.path === '/agent' || item.path === '/client'}
                        className="flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 hover:bg-sidebar-accent/50 hover:translate-x-1 group/item"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground sidebar-item-active"
                        onClick={handleNavClick}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover/item:scale-110" />
                        <span className="truncate flex-1">{item.name}</span>
                        {hasDrafts && item.path === '/agent/envoyer-offre' && (
                          <span className="text-orange-500 text-sm animate-pulse-soft" title="Brouillons sauvegardés">📝</span>
                        )}
                        {notifCount > 0 && (
                          <NotificationBadge count={notifCount} />
                        )}
                      </NavLink>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        
        <Button
          variant="ghost"
          className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'} text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50`}
          onClick={handleLogout}
        >
          <LogOut className={collapsed ? "w-5 h-5" : "w-5 h-5 mr-3"} />
          {!collapsed && <span>Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

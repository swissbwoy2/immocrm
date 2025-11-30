import { LogOut, LayoutDashboard, Users, FileText, DollarSign, MessageSquare, Send, Home, Clipboard, UserCog, User, Calendar, Settings, Mail, HandHeart, Bell, MailPlus, History, Inbox, CalendarCheck, FileCheck } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
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
import { useState, useEffect } from 'react';
import { NotificationBadge } from './NotificationBadge';
import { NotificationBell } from './NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';

const getMenuForRole = (role: string) => {
  switch (role) {
    case 'admin':
      return [
        { name: 'Tableau de bord', icon: LayoutDashboard, path: '/admin', notifKey: null },
        { name: 'Calendrier', icon: Calendar, path: '/admin/calendrier', notifKey: null },
        { name: 'Agents', icon: UserCog, path: '/admin/agents', notifKey: null },
        { name: 'Clients', icon: Users, path: '/admin/clients', notifKey: 'new_client_activated' },
        { name: 'Mandats', icon: Clipboard, path: '/admin/mandats', notifKey: null },
        { name: 'Transactions', icon: DollarSign, path: '/admin/transactions', notifKey: null },
        { name: 'Offres envoyées', icon: Send, path: '/admin/offres-envoyees', notifKey: null },
        { name: 'Assignations', icon: UserCog, path: '/admin/assignations', notifKey: null },
        { name: 'Messagerie', icon: MessageSquare, path: '/admin/messagerie', notifKey: 'new_message' },
        { name: 'Envoyer Email', icon: MailPlus, path: '/admin/envoyer-email', notifKey: null },
        { name: 'Historique Emails', icon: History, path: '/admin/historique-emails', notifKey: null },
        { name: 'Boîte de réception', icon: Inbox, path: '/admin/boite-reception', notifKey: null },
        { name: 'Documents', icon: FileText, path: '/admin/documents', notifKey: null },
        { name: 'Notifications', icon: Bell, path: '/admin/notifications', notifKey: 'total' },
        { name: 'Paramètres', icon: Settings, path: '/admin/parametres', notifKey: null },
      ];
    case 'agent':
      return [
        { name: 'Tableau de bord', icon: LayoutDashboard, path: '/agent', notifKey: null },
        { name: 'Calendrier', icon: Calendar, path: '/agent/calendrier', notifKey: 'visit_combined' },
        { name: 'Mes clients', icon: Users, path: '/agent/mes-clients', notifKey: 'client_assigned' },
        { name: 'Visites', icon: CalendarCheck, path: '/agent/visites', notifKey: 'new_visit' },
        { name: 'Candidatures', icon: FileCheck, path: '/agent/candidatures', notifKey: null },
        { name: 'Envoyer une offre', icon: Send, path: '/agent/envoyer-offre', notifKey: null },
        { name: 'Offres envoyées', icon: Mail, path: '/agent/offres-envoyees', notifKey: null },
        { name: 'Messagerie', icon: MessageSquare, path: '/agent/messagerie', notifKey: 'new_message' },
        { name: 'Envoyer Email', icon: MailPlus, path: '/agent/envoyer-email', notifKey: null },
        { name: 'Historique Emails', icon: History, path: '/agent/historique-emails', notifKey: null },
        { name: 'Boîte de réception', icon: Inbox, path: '/agent/boite-reception', notifKey: null },
        { name: 'Documents', icon: FileText, path: '/agent/documents', notifKey: null },
        { name: 'Notifications', icon: Bell, path: '/agent/notifications', notifKey: 'total' },
        { name: 'Paramètres', icon: Settings, path: '/agent/parametres', notifKey: null },
      ];
    case 'client':
      return [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/client', notifKey: null },
        { name: 'Mon dossier', icon: User, path: '/client/dossier', notifKey: null },
        { name: 'Offres reçues', icon: Home, path: '/client/offres-recues', notifKey: 'new_offer' },
        { name: 'Mes visites', icon: CalendarCheck, path: '/client/visites', notifKey: 'new_visit' },
        { name: 'Calendrier', icon: Calendar, path: '/client/calendrier', notifKey: 'visit_combined' },
        { name: 'Visites déléguées', icon: HandHeart, path: '/client/visites-deleguees', notifKey: null },
        { name: 'Mes candidatures', icon: Clipboard, path: '/client/mes-candidatures', notifKey: null },
        { name: 'Messagerie', icon: MessageSquare, path: '/client/messagerie', notifKey: 'new_message' },
        { name: 'Mes documents', icon: FileText, path: '/client/documents', notifKey: null },
        { name: 'Notifications', icon: Bell, path: '/client/notifications', notifKey: 'total' },
      ];
    default:
      return [];
  }
};

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, userRole } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const { counts } = useNotifications();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

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
    await supabase.auth.signOut();
    window.location.href = '/login';
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
              <h1 className="text-lg font-bold text-sidebar-foreground truncate">ImmoCRM</h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">Immo-Rama.ch</p>
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
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.name} {notifCount > 0 && `(${notifCount})`}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <NavLink
                        to={item.path}
                        end={item.path === '/admin' || item.path === '/agent' || item.path === '/client'}
                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        onClick={handleNavClick}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="truncate flex-1">{item.name}</span>
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

      {/* Logout */}
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

import { RoleNavigation } from '@/components/navigation/RoleNavigation';
import { getMenuForRole } from '@/lib/sidebarNavigation';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { LogOut } from 'lucide-react';
import { usePostulationsCount } from '@/hooks/usePostulationsCount';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import logoLogisorama from '@/assets/logisorama-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useMemo } from 'react';
import { NotificationBell } from './NotificationBell';
import { SilentErrorBoundary } from './SilentErrorBoundary';
import { useNotifications } from '@/hooks/useNotifications';
import { useWhatsAppUnreadCount } from '@/hooks/useWhatsAppUnreadCount';
import { checkDraftsExist } from '@/hooks/useDraftManager';
import { isPurchaseBuyer } from '@/lib/journey';
import { setClientParcoursType } from '@/lib/notificationLinks';


const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  agent: 'Agent',
  client: 'Client',
  apporteur: 'Apporteur',
  proprietaire: 'Propriétaire',
  coursier: 'Coursier',
  closeur: 'Closeur',
  candidat: 'Candidat',
  automation_operator: 'Opérateur d’automatisation',
  agent_ia: 'Agent IA',
};

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = !isMobile && state === 'collapsed';
  const { user, userRole, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const { counts } = useNotifications();
  const whatsappUnread = useWhatsAppUnreadCount(
    userRole === 'admin' ? 'admin' : userRole === 'agent' ? 'agent' : 'both'
  );
  const postulationsCount = usePostulationsCount(userRole);
  const [hasDrafts, setHasDrafts] = useState(false);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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
    if (user) loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!data) return;

    const { data: client } = await supabase
      .from('clients')
      .select('id, user_id, type_recherche, journey_type')
      .eq('user_id', user.id)
      .maybeSingle();
    let purchaseProject: any = null;
    const { data: byUser } = await supabase
      .from('purchase_projects')
      .select('id, client_id, user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    purchaseProject = byUser;
    if (!purchaseProject && client?.id) {
      const { data: byClient } = await supabase
        .from('purchase_projects')
        .select('id, client_id, user_id')
        .eq('client_id', client.id)
        .maybeSingle();
      purchaseProject = byClient;
    }

    const resolvedParcours = isPurchaseBuyer(client, purchaseProject) ? 'achat' : data.parcours_type;
    setClientParcoursType(resolvedParcours || null);
    setProfile({ ...data, parcours_type: resolvedParcours });

  };

  const sections = useMemo(() => getMenuForRole(userRole || '', profile?.parcours_type), [userRole, profile?.parcours_type]);

  if (!user || !userRole) return null;

  const userName = profile ? `${profile.prenom} ${profile.nom}` : 'Chargement...';
  const userEmail = profile?.email || user.email || '';

  const handleLogout = async () => {
    await signOut();
  };

  const getNotificationCount = (notifKey: string | null): number => {
    if (!notifKey) return 0;
    if (notifKey === 'whatsapp_unread') return whatsappUnread;
    if (notifKey === 'postulations') return postulationsCount;
    if (notifKey === 'visit_combined') {
      return (counts.new_visit || 0) + (counts.visit_reminder || 0);
    }
    return counts[notifKey as keyof typeof counts] || 0;
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header — Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 p-4">
          <img
            src={logoLogisorama}
            alt="Logo Logisorama"
            className="h-10 w-auto object-contain flex-shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-sidebar-foreground truncate">Logisorama</h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">by Immo-rama.ch</p>
            </div>
          )}
          {!collapsed && (
            <SilentErrorBoundary label="NotificationBell">
              <NotificationBell />
            </SilentErrorBoundary>
          )}
        </div>
      </SidebarHeader>

      {!collapsed && <RoleSwitcher />}

      {/* User card */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border bg-sidebar-accent/30">
          <div className="text-sm">
            <div className="font-semibold text-sidebar-foreground truncate">{userName}</div>
            <div className="text-xs text-sidebar-foreground/55 truncate mt-0.5">{userEmail}</div>
            <span className="inline-block text-[10px] uppercase tracking-widest font-bold mt-1.5 text-sidebar-primary bg-sidebar-primary/10 border border-sidebar-primary/20 px-2 py-0.5 rounded-full">
              {roleLabels[userRole] ?? userRole}
            </span>
          </div>
        </div>
      )}

      <SidebarContent>
        <RoleNavigation
          key={`${userRole}:${profile?.parcours_type || ''}`}
          sections={sections}
          collapsed={collapsed}
          getCount={getNotificationCount}
          draftPath={hasDrafts ? '/agent/envoyer-offre' : undefined}
          onNavigate={handleNavClick}
          label={`Navigation ${roleLabels[userRole] || userRole}`}
        />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <Button
          variant="ghost"
          className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'} text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-150`}
          aria-label="Déconnexion"
          onClick={handleLogout}
        >
          <LogOut aria-hidden="true" className={collapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'} />
          {!collapsed && <span>Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

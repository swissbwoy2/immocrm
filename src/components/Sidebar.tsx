import { Link, useLocation } from 'react-router-dom';
import { LucideIcon, LogOut, Building2, LayoutDashboard, Users, FileText, DollarSign, MessageSquare, Send, Home, Clipboard, UserCog, User, Calendar, Settings, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MenuItem {
  name: string;
  icon: LucideIcon;
  path: string;
}

const getMenuForRole = (role: string): MenuItem[] => {
  switch (role) {
    case 'admin':
      return [
        { name: 'Tableau de bord', icon: LayoutDashboard, path: '/admin' },
        { name: 'Agents', icon: UserCog, path: '/admin/agents' },
        { name: 'Clients', icon: Users, path: '/admin/clients' },
        { name: 'Transactions', icon: DollarSign, path: '/admin/transactions' },
        { name: 'Assignations', icon: UserCog, path: '/admin/assignations' },
        { name: 'Messagerie', icon: MessageSquare, path: '/admin/messagerie' },
        { name: 'Documents', icon: FileText, path: '/admin/documents' },
        { name: 'Paramètres', icon: Settings, path: '/admin/parametres' },
      ];
    case 'agent':
      return [
        { name: 'Tableau de bord', icon: LayoutDashboard, path: '/agent' },
        { name: 'Mes clients', icon: Users, path: '/agent/mes-clients' },
        { name: 'Envoyer une offre', icon: Send, path: '/agent/envoyer-offre' },
        { name: 'Offres envoyées', icon: Mail, path: '/agent/offres-envoyees' },
        { name: 'Messagerie', icon: MessageSquare, path: '/agent/messagerie' },
        { name: 'Documents', icon: FileText, path: '/agent/documents' },
        { name: 'Paramètres', icon: Settings, path: '/agent/parametres' },
      ];
    case 'client':
      return [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/client' },
        { name: 'Mon dossier', icon: User, path: '/client/dossier' },
        { name: 'Offres reçues', icon: Home, path: '/client/offres-recues' },
        { name: 'Prochaines visites', icon: Calendar, path: '/client/visites' },
        { name: 'Mes candidatures', icon: Clipboard, path: '/client/mes-candidatures' },
        { name: 'Messagerie', icon: MessageSquare, path: '/client/messagerie' },
        { name: 'Mes documents', icon: FileText, path: '/client/documents' },
      ];
    default:
      return [];
  }
};

export function Sidebar() {
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<{ prenom: string; nom: string; email: string } | null>(null);
  
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('prenom, nom, email')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setUserProfile(data);
        });
    }
  }, [user?.id]);

  if (!user || !userRole) {
    return null;
  }

  const menu = getMenuForRole(userRole);
  const userName = userProfile ? `${userProfile.prenom} ${userProfile.nom}` : 'Chargement...';
  const userEmail = userProfile?.email || user.email || '';

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="w-64 bg-sidebar h-screen flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sidebar-primary rounded-lg">
            <Building2 className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">ImmoCRM</h1>
            <p className="text-xs text-sidebar-foreground/60">Immo-Rama.ch</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="text-sm text-sidebar-foreground/80">
          <div className="font-medium text-sidebar-foreground">{userName}</div>
          <div className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</div>
          <div className="text-xs capitalize mt-1 text-sidebar-accent-foreground bg-sidebar-accent px-2 py-0.5 rounded inline-block">{userRole}</div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menu.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Building2, Plus, MessageCircle, User,
  Settings, LogOut, Menu, X, ChevronRight, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

interface AnnonceurLayoutProps {
  children: React.ReactNode;
}

export function AnnonceurLayout({ children }: AnnonceurLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Verify user is an annonceur
  const { data: annonceur, isLoading, error } = useQuery({
    queryKey: ['annonceur-check', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('annonceurs')
        .select('id, nom, prenom, nom_entreprise, type_annonceur, logo_url')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch unread messages count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['annonceur-unread', annonceur?.id],
    queryFn: async () => {
      if (!annonceur) return 0;
      const { data } = await supabase
        .from('conversations_annonces')
        .select(`
          messages_annonces(id, lu)
        `)
        .eq('annonceur_id', annonceur.id);
      
      return data?.reduce((sum, c) => 
        sum + (c.messages_annonces?.filter((m: any) => !m.lu).length || 0), 0
      ) || 0;
    },
    enabled: !!annonceur
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/connexion-annonceur');
    }
    if (!isLoading && error) {
      toast.error('Accès non autorisé');
      navigate('/connexion-annonceur');
    }
  }, [user, isLoading, error, navigate]);

  const navItems = [
    { href: '/espace-annonceur', icon: LayoutDashboard, label: 'Tableau de bord' },
    { href: '/espace-annonceur/mes-annonces', icon: Building2, label: 'Mes annonces' },
    { href: '/espace-annonceur/nouvelle-annonce', icon: Plus, label: 'Nouvelle annonce' },
    { href: '/espace-annonceur/messages', icon: MessageCircle, label: 'Messages', badge: unreadCount },
    { href: '/espace-annonceur/profil', icon: User, label: 'Mon profil' },
    { href: '/espace-annonceur/parametres', icon: Settings, label: 'Paramètres' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/annonces');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-center">
          <img src={logoImmoRama} alt="Loading..." className="h-12 mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/espace-annonceur" className="flex items-center gap-2">
            <img src={logoImmoRama} alt="Immo-Rama" className="h-8 invert" />
            <span className="font-semibold">Espace Annonceur</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                    : 'hover:bg-sidebar-accent text-sidebar-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            {annonceur?.logo_url ? (
              <img src={annonceur.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {annonceur?.nom_entreprise || `${annonceur?.prenom || ''} ${annonceur?.nom || ''}`}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {annonceur?.type_annonceur}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b z-40 lg:hidden">
        <div className="flex items-center justify-between h-full px-4">
          <Link to="/espace-annonceur" className="flex items-center gap-2">
            <img src={logoImmoRama} alt="Immo-Rama" className="h-8" />
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/espace-annonceur/messages">
              <Button variant="ghost" size="icon" className="relative">
                <MessageCircle className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </Link>

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0">
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    {annonceur?.logo_url ? (
                      <img src={annonceur.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {annonceur?.nom_entreprise || `${annonceur?.prenom || ''} ${annonceur?.nom || ''}`}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {annonceur?.type_annonceur}
                      </p>
                    </div>
                  </div>
                </div>

                <nav className="p-4 space-y-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Déconnexion
                  </Button>
                  <Link 
                    to="/annonces" 
                    className="block text-sm text-muted-foreground hover:text-foreground mt-3 text-center"
                  >
                    ← Retour au portail
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
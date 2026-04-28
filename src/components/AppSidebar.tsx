import { LogOut, LayoutDashboard, Users, FileText, DollarSign, MessageSquare, Send, Home, Clipboard, UserCog, User, Calendar, Settings, Mail, HandHeart, Bell, MailPlus, History, Inbox, CalendarCheck, FileCheck, AlarmClock, UserPlus, Receipt, FileEdit, TrendingUp, Wallet, Link, Handshake, FilePen, Target, Contact, Brain, Building2, Heart, HardHat, Globe, Megaphone, Tag, Bike, MapPin, Bot, Bookmark, ShieldCheck } from 'lucide-react';
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
import { SilentErrorBoundary } from './SilentErrorBoundary';
import { useNotifications } from '@/hooks/useNotifications';
import { checkDraftsExist } from '@/hooks/useDraftManager';

interface MenuItem {
  name: string;
  icon: React.ElementType;
  path: string;
  notifKey: string | null;
}

interface MenuSection {
  label: string | null;
  items: MenuItem[];
}

const getMenuForRole = (role: string, parcoursType?: string | null): MenuSection[] => {
  switch (role) {
    case 'admin':
      return [
        {
          label: null,
          items: [
            { name: 'Tableau de bord', icon: LayoutDashboard, path: '/admin', notifKey: null },
            { name: 'Messagerie', icon: MessageSquare, path: '/admin/messagerie', notifKey: 'new_message' },
            { name: 'Calendrier', icon: Calendar, path: '/admin/calendrier', notifKey: null },
            { name: 'Notifications', icon: Bell, path: '/admin/notifications', notifKey: 'total' },
          ],
        },
        {
          label: 'Équipe',
          items: [
            { name: 'Agents', icon: UserCog, path: '/admin/agents', notifKey: null },
            { name: 'Apporteurs', icon: Handshake, path: '/admin/apporteurs', notifKey: null },
            { name: 'Referrals', icon: Link, path: '/admin/referrals', notifKey: null },
            { name: 'Assignations', icon: UserCog, path: '/admin/assignations', notifKey: null },
          ],
        },
        {
          label: 'Clients & Mandats',
          items: [
            { name: 'Clients', icon: Users, path: '/admin/clients', notifKey: 'new_client_activated' },
            { name: 'Leads Shortlist', icon: Target, path: '/admin/leads', notifKey: null },
            { name: 'Leads Meta Ads', icon: Tag, path: '/admin/meta-leads', notifKey: null },
            { name: 'Demandes activation', icon: UserPlus, path: '/admin/demandes-activation', notifKey: 'activation_request' },
            { name: 'Mandats', icon: Clipboard, path: '/admin/mandats', notifKey: null },
            { name: 'Suivi extraits', icon: ShieldCheck, path: '/admin/suivi-extraits', notifKey: null },
            { name: 'Candidatures', icon: FileCheck, path: '/admin/candidatures', notifKey: 'candidature_admin' },
            { name: 'Transactions', icon: DollarSign, path: '/admin/transactions', notifKey: null },
          ],
        },
        {
          label: 'Immobilier',
          items: [
            { name: 'Propriétaires', icon: Home, path: '/admin/proprietaires', notifKey: 'new_proprietaire_invited' },
            { name: 'Biens en vente', icon: Building2, path: '/admin/biens-vente', notifKey: null },
            { name: 'Intérêts acheteurs', icon: Heart, path: '/admin/interets-acheteurs', notifKey: 'new_interet_acheteur' },
            { name: 'Projets développement', icon: HardHat, path: '/admin/projets-developpement', notifKey: 'new_projet_developpement' },
            { name: 'Rénovation', icon: HardHat, path: '/admin/renovation', notifKey: null },
            { name: 'Annonces Publiques', icon: Globe, path: '/admin/annonces-publiques', notifKey: null },
            { name: 'Annonceurs', icon: Megaphone, path: '/admin/annonceurs', notifKey: null },
          ],
        },
        {
          label: 'Communications',
          items: [
            { name: 'Envoyer une offre', icon: Send, path: '/admin/envoyer-offre', notifKey: null },
            { name: 'Offres envoyées', icon: Mail, path: '/admin/offres-envoyees', notifKey: 'client_interesse' },
            { name: 'À suivre (Wishlist)', icon: Bookmark, path: '/admin/wishlist', notifKey: null },
            { name: 'Envoyer Email', icon: MailPlus, path: '/admin/envoyer-email', notifKey: null },
            { name: 'Historique Emails', icon: History, path: '/admin/historique-emails', notifKey: null },
            { name: 'Boîte de réception', icon: Inbox, path: '/admin/boite-reception', notifKey: null },
          ],
        },
        {
          label: 'Finances',
          items: [
            { name: 'Factures AbaNinja', icon: Receipt, path: '/admin/factures-abaninja', notifKey: null },
            { name: 'Salaires', icon: Wallet, path: '/admin/salaires', notifKey: null },
            { name: 'Statistiques Agents', icon: TrendingUp, path: '/admin/statistiques-agents', notifKey: null },
            { name: 'Analytics Marketing', icon: TrendingUp, path: '/admin/analytics', notifKey: null },
          ],
        },
        {
          label: 'Outils',
          items: [
            { name: 'Documents', icon: FileText, path: '/admin/documents', notifKey: null },
            { name: 'Remplir PDF', icon: FilePen, path: '/admin/remplir-pdf', notifKey: null },
            { name: 'Remplir demande IA', icon: Brain, path: '/admin/remplir-demande-ia', notifKey: null },
            { name: 'Contacts', icon: Contact, path: '/admin/contacts', notifKey: null },
            { name: 'Rappels', icon: AlarmClock, path: '/admin/rappels', notifKey: null },
            { name: 'Coursiers', icon: Bike, path: '/admin/coursiers', notifKey: null },
            { name: 'Agent IA Relocation', icon: Bot, path: '/admin/agent-ia', notifKey: null },
          ],
        },
        {
          label: 'Système',
          items: [
            { name: 'Paramètres', icon: Settings, path: '/admin/parametres', notifKey: null },
          ],
        },
      ];

    case 'agent':
      return [
        {
          label: null,
          items: [
            { name: 'Tableau de bord', icon: LayoutDashboard, path: '/agent', notifKey: null },
            { name: 'Messagerie', icon: MessageSquare, path: '/agent/messagerie', notifKey: 'new_message' },
            { name: 'Calendrier', icon: Calendar, path: '/agent/calendrier', notifKey: 'visit_combined' },
            { name: 'Notifications', icon: Bell, path: '/agent/notifications', notifKey: 'total' },
          ],
        },
        {
          label: 'Mes clients',
          items: [
            { name: 'Mes clients', icon: Users, path: '/agent/mes-clients', notifKey: 'client_assigned' },
            { name: 'Suivi extraits', icon: ShieldCheck, path: '/agent/suivi-extraits', notifKey: null },
            { name: 'Propriétaires', icon: Home, path: '/agent/proprietaires', notifKey: null },
            { name: 'Biens en vente', icon: Building2, path: '/agent/biens-vente', notifKey: null },
            { name: 'Rénovation', icon: HardHat, path: '/agent/renovation', notifKey: null },
          ],
        },
        {
          label: 'Matching & Visites',
          items: [
            { name: 'Visites', icon: CalendarCheck, path: '/agent/visites', notifKey: 'new_visit' },
            { name: 'Carte', icon: MapPin, path: '/agent/carte', notifKey: null },
            { name: 'Candidatures', icon: FileCheck, path: '/agent/candidatures', notifKey: null },
            { name: 'Déposer candidature', icon: Clipboard, path: '/agent/deposer-candidature', notifKey: null },
          ],
        },
        {
          label: 'Transactions',
          items: [
            { name: 'Transactions', icon: DollarSign, path: '/agent/transactions', notifKey: null },
            { name: 'Envoyer une offre', icon: Send, path: '/agent/envoyer-offre', notifKey: null },
            { name: 'Offres envoyées', icon: Mail, path: '/agent/offres-envoyees', notifKey: 'client_interesse' },
            { name: 'À suivre (Wishlist)', icon: Bookmark, path: '/agent/wishlist', notifKey: null },
          ],
        },
        {
          label: 'Communications',
          items: [
            { name: 'Envoyer Email', icon: MailPlus, path: '/agent/envoyer-email', notifKey: null },
            { name: 'Historique Emails', icon: History, path: '/agent/historique-emails', notifKey: null },
            { name: 'Boîte de réception', icon: Inbox, path: '/agent/boite-reception', notifKey: null },
          ],
        },
        {
          label: 'Outils',
          items: [
            { name: 'Documents', icon: FileText, path: '/agent/documents', notifKey: null },
            { name: 'Remplir PDF', icon: FilePen, path: '/agent/remplir-pdf', notifKey: null },
            { name: 'Remplir demande IA', icon: Brain, path: '/agent/remplir-demande', notifKey: null },
            { name: 'Contacts', icon: Contact, path: '/agent/contacts', notifKey: null },
          ],
        },
        {
          label: 'Système',
          items: [
            { name: 'Paramètres', icon: Settings, path: '/agent/parametres', notifKey: null },
          ],
        },
      ];

    case 'client': {
      if (parcoursType === 'renovation') {
        return [
          {
            label: null,
            items: [
              { name: 'Dashboard', icon: LayoutDashboard, path: '/client', notifKey: null },
              { name: 'Messagerie', icon: MessageSquare, path: '/client/messagerie', notifKey: 'new_message' },
              { name: 'Notifications', icon: Bell, path: '/client/notifications', notifKey: 'total' },
            ],
          },
          {
            label: 'Mon projet',
            items: [
              { name: 'Mes projets rénovation', icon: HardHat, path: '/client/renovation', notifKey: null },
              { name: 'Mon dossier', icon: User, path: '/client/dossier', notifKey: null },
              { name: 'Mes documents', icon: FileText, path: '/client/documents', notifKey: null },
            ],
          },
          {
            label: 'Système',
            items: [
              { name: 'Paramètres', icon: Settings, path: '/client/parametres', notifKey: null },
            ],
          },
        ];
      }
      if (parcoursType === 'vente') {
        return [
          {
            label: null,
            items: [
              { name: 'Dashboard', icon: LayoutDashboard, path: '/client', notifKey: null },
              { name: 'Messagerie', icon: MessageSquare, path: '/client/messagerie', notifKey: 'new_message' },
              { name: 'Notifications', icon: Bell, path: '/client/notifications', notifKey: 'total' },
            ],
          },
          {
            label: 'Mon dossier',
            items: [
              { name: 'Mon dossier', icon: User, path: '/client/dossier', notifKey: null },
              { name: 'Mes documents', icon: FileText, path: '/client/documents', notifKey: null },
            ],
          },
          {
            label: 'Système',
            items: [
              { name: 'Paramètres', icon: Settings, path: '/client/parametres', notifKey: null },
            ],
          },
        ];
      }
      // Default: location / relocation
      return [
        {
          label: null,
          items: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/client', notifKey: null },
            { name: 'Messagerie', icon: MessageSquare, path: '/client/messagerie', notifKey: 'new_message' },
            { name: 'Calendrier', icon: Calendar, path: '/client/calendrier', notifKey: 'visit_combined' },
            { name: 'Notifications', icon: Bell, path: '/client/notifications', notifKey: 'total' },
          ],
        },
        {
          label: 'Mon logement',
          items: [
            { name: 'Offres reçues', icon: Home, path: '/client/offres-recues', notifKey: 'new_offer' },
            { name: 'Annonces', icon: Building2, path: '/client/annonces', notifKey: null },
            { name: 'Mes visites', icon: CalendarCheck, path: '/client/visites', notifKey: 'new_visit' },
            { name: 'Carte', icon: MapPin, path: '/client/carte', notifKey: null },
            { name: 'Visites déléguées', icon: HandHeart, path: '/client/visites-deleguees', notifKey: null },
          ],
        },
        {
          label: 'Mon dossier',
          items: [
            { name: 'Mon dossier', icon: User, path: '/client/dossier', notifKey: null },
            { name: 'Mon contrat', icon: FileText, path: '/client/mon-contrat', notifKey: null },
            { name: 'Mes candidatures', icon: Clipboard, path: '/client/mes-candidatures', notifKey: null },
            { name: 'Mes documents', icon: FileText, path: '/client/documents', notifKey: null },
          ],
        },
        {
          label: 'Système',
          items: [
            { name: 'Paramètres', icon: Settings, path: '/client/parametres', notifKey: null },
          ],
        },
      ];
    }

    case 'apporteur':
      return [
        {
          label: null,
          items: [
            { name: 'Tableau de bord', icon: LayoutDashboard, path: '/apporteur', notifKey: null },
            { name: 'Notifications', icon: Bell, path: '/apporteur/notifications', notifKey: 'total' },
          ],
        },
        {
          label: 'Mon activité',
          items: [
            { name: 'Soumettre un client', icon: UserPlus, path: '/apporteur/soumettre-client', notifKey: null },
            { name: 'Mes referrals', icon: Handshake, path: '/apporteur/mes-referrals', notifKey: null },
            { name: 'Commissions', icon: Wallet, path: '/apporteur/commissions', notifKey: null },
          ],
        },
        {
          label: 'Mon compte',
          items: [
            { name: 'Mon contrat', icon: FileText, path: '/apporteur/mon-contrat', notifKey: null },
            { name: 'Mon profil', icon: User, path: '/apporteur/profil', notifKey: null },
            { name: 'Paramètres', icon: Settings, path: '/apporteur/parametres', notifKey: null },
          ],
        },
      ];

    case 'proprietaire':
      return [
        {
          label: null,
          items: [
            { name: 'Tableau de bord', icon: LayoutDashboard, path: '/proprietaire', notifKey: null },
            { name: 'Messagerie', icon: MessageSquare, path: '/proprietaire/messagerie', notifKey: 'new_message' },
            { name: 'Calendrier', icon: Calendar, path: '/proprietaire/calendrier', notifKey: null },
            { name: 'Notifications', icon: Bell, path: '/proprietaire/notifications', notifKey: 'total' },
          ],
        },
        {
          label: 'Mes biens',
          items: [
            { name: 'Mes biens', icon: Home, path: '/proprietaire/immeubles', notifKey: null },
            { name: 'Vendre mon bien', icon: Tag, path: '/proprietaire/vente', notifKey: null },
            { name: 'Projets de développement', icon: HardHat, path: '/proprietaire/projets-developpement', notifKey: 'projet_statut_change' },
            { name: 'Rénovation', icon: HardHat, path: '/proprietaire/renovation', notifKey: null },
            { name: 'Locataires', icon: Users, path: '/proprietaire/locataires', notifKey: null },
          ],
        },
        {
          label: 'Gestion',
          items: [
            { name: 'Comptabilité', icon: DollarSign, path: '/proprietaire/comptabilite', notifKey: null },
            { name: 'Baux', icon: FileText, path: '/proprietaire/baux', notifKey: null },
            { name: 'Hypothèques', icon: Clipboard, path: '/proprietaire/hypotheques', notifKey: null },
            { name: 'Assurances', icon: FileCheck, path: '/proprietaire/assurances', notifKey: null },
            { name: 'Tickets', icon: AlarmClock, path: '/proprietaire/tickets', notifKey: null },
            { name: 'Documents', icon: FileText, path: '/proprietaire/documents', notifKey: null },
          ],
        },
        {
          label: 'Système',
          items: [
            { name: 'Paramètres', icon: Settings, path: '/proprietaire/parametres', notifKey: null },
          ],
        },
      ];

    case 'coursier':
      return [
        {
          label: null,
          items: [
            { name: 'Tableau de bord', icon: LayoutDashboard, path: '/coursier', notifKey: null },
          ],
        },
        {
          label: 'Missions',
          items: [
            { name: 'Missions disponibles', icon: CalendarCheck, path: '/coursier/missions', notifKey: null },
            { name: 'Carte', icon: Home, path: '/coursier/carte', notifKey: null },
            { name: 'Calendrier', icon: Calendar, path: '/coursier/calendrier', notifKey: null },
            { name: 'Historique & gains', icon: Wallet, path: '/coursier/historique', notifKey: null },
          ],
        },
        {
          label: 'Système',
          items: [
            { name: 'Paramètres', icon: Settings, path: '/coursier/parametres', notifKey: null },
          ],
        },
      ];

    case 'closeur':
      return [
        {
          label: null,
          items: [
            { name: 'Tableau de bord', icon: LayoutDashboard, path: '/closeur', notifKey: null },
            { name: 'Leads', icon: Target, path: '/closeur', notifKey: null },
          ],
        },
      ];

    default:
      return [];
  }
};

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  agent: 'Agent',
  client: 'Client',
  apporteur: 'Apporteur',
  proprietaire: 'Propriétaire',
  coursier: 'Coursier',
  closeur: 'Closeur',
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
    if (data) setProfile(data);
  };

  const sections = useMemo(
    () => getMenuForRole(userRole || '', profile?.parcours_type),
    [userRole, profile?.parcours_type]
  );

  if (!user || !userRole) return null;

  const userName = profile ? `${profile.prenom} ${profile.nom}` : 'Chargement...';
  const userEmail = profile?.email || user.email || '';

  const handleLogout = async () => {
    await signOut();
  };

  const getNotificationCount = (notifKey: string | null): number => {
    if (!notifKey) return 0;
    if (notifKey === 'visit_combined') {
      return (counts.new_visit || 0) + (counts.visit_reminder || 0);
    }
    return counts[notifKey as keyof typeof counts] || 0;
  };

  const isRootPath = (path: string) =>
    path === '/admin' || path === '/agent' || path === '/client' || path === '/closeur';

  return (
    <Sidebar collapsible="icon">
      {/* Header — Logo */}
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
          {!collapsed && (
            <SilentErrorBoundary label="NotificationBell">
              <NotificationBell />
            </SilentErrorBoundary>
          )}
        </div>
      </SidebarHeader>

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
        {sections.map((section, si) => (
          <SidebarGroup key={si}>
            {!collapsed && section.label && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold px-3 pt-3 pb-1 select-none">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const notifCount = getNotificationCount(item.notifKey);
                  const showDraftIndicator = hasDrafts && item.path === '/agent/envoyer-offre';

                  return (
                    <SidebarMenuItem key={item.path}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <NavLink
                              to={item.path}
                              end={isRootPath(item.path)}
                              className="flex items-center justify-center w-full px-2 py-2 rounded-lg hover:bg-sidebar-accent/60 transition-colors duration-150 relative"
                              activeClassName="bg-sidebar-primary/15 text-sidebar-primary"
                              onClick={handleNavClick}
                            >
                              <item.icon className="w-5 h-5 flex-shrink-0" />
                              {notifCount > 0 && (
                                <NotificationBadge count={notifCount} className="absolute -top-1 -right-1" />
                              )}
                              {showDraftIndicator && (
                                <FileEdit className="w-3 h-3 absolute -top-1 -right-1 text-orange-500" />
                              )}
                            </NavLink>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>
                              {item.name}
                              {notifCount > 0 && ` (${notifCount})`}
                              {showDraftIndicator && ' 📝'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <NavLink
                          to={item.path}
                          end={isRootPath(item.path)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 hover:bg-sidebar-accent/60 hover:translate-x-0.5 group/item relative overflow-hidden"
                          activeClassName="bg-sidebar-primary/12 text-sidebar-primary font-medium sidebar-item-active"
                          onClick={handleNavClick}
                        >
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-sidebar-primary opacity-0 transition-opacity duration-150 sidebar-active-bar" />
                          <item.icon className="w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover/item:scale-105" />
                          <span className="truncate flex-1 text-sm">{item.name}</span>
                          {showDraftIndicator && (
                            <span className="text-orange-500 text-xs animate-pulse" title="Brouillons sauvegardés">
                              <FileEdit className="w-3 h-3" />
                            </span>
                          )}
                          {notifCount > 0 && <NotificationBadge count={notifCount} />}
                        </NavLink>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <Button
          variant="ghost"
          className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'} text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-150`}
          onClick={handleLogout}
        >
          <LogOut className={collapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'} />
          {!collapsed && <span>Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

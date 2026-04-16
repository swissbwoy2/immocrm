import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Home, HelpCircle, Briefcase, DollarSign, FileSearch, Calculator, Star, MessageCircle, Users, Rocket, LogIn, Handshake, Mail, FileText, Shield, Lock } from 'lucide-react';
import logo from '@/assets/logo-immo-rama-new.png';

interface PublicSiteMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuGroups = [
  {
    title: 'Navigation',
    items: [
      { to: '/', label: 'Accueil', icon: Home },
      { to: '#comment-ca-marche', label: 'Comment ça marche', icon: HelpCircle, anchor: true },
      { to: '#services', label: 'Services', icon: Briefcase, anchor: true },
      { to: '#tarifs', label: 'Tarifs', icon: DollarSign, anchor: true },
    ],
  },
  {
    title: 'Outils',
    items: [
      { to: '#analyse-dossier', label: 'Test solvabilité', icon: FileSearch, anchor: true },
      { to: '#calculateur', label: 'Calculateur budget', icon: Calculator, anchor: true },
    ],
  },
  {
    title: 'Confiance',
    items: [
      { to: '#avis', label: 'Avis clients', icon: Star, anchor: true },
      { to: '#faq', label: 'FAQ', icon: MessageCircle, anchor: true },
      { to: '#partenaires', label: 'Partenaires', icon: Users, anchor: true },
      { to: '#equipe', label: 'À propos', icon: Users, anchor: true },
    ],
  },
  {
    title: 'Actions',
    items: [
      { to: '/nouveau-mandat', label: 'Activer ma recherche', icon: Rocket, highlight: true },
      { to: '/login', label: 'Mon espace', icon: LogIn },
      { to: '#programme-partenaire', label: 'Devenir partenaire', icon: Handshake, anchor: true },
      { to: 'mailto:info@immo-rama.ch', label: 'Contact', icon: Mail, external: true },
    ],
  },
  {
    title: 'Légal',
    items: [
      { to: '#', label: 'Mentions légales', icon: FileText },
      { to: '#', label: 'Confidentialité', icon: Shield },
      { to: '#', label: 'CGV', icon: Lock },
    ],
  },
];

export function PublicSiteMenu({ open, onClose }: PublicSiteMenuProps) {
  const location = useLocation();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const handleClick = (item: typeof menuGroups[0]['items'][0]) => {
    if (item.anchor) {
      onClose();
      setTimeout(() => {
        const el = document.querySelector(item.to);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" onClick={onClose} />

      {/* Content */}
      <div className="relative h-full overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="container mx-auto px-6 py-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <img src={logo} alt="Immo-Rama" className="h-10 w-auto" />
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50 transition-colors" aria-label="Fermer">
              <X className="h-6 w-6 text-foreground" />
            </button>
          </div>

          {/* Menu groups */}
          <div className="space-y-8">
            {menuGroups.map((group) => (
              <div key={group.title}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.title}</p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = !item.anchor && location.pathname === item.to;
                    const ItemIcon = item.icon;

                    if (item.external) {
                      return (
                        <a
                          key={item.label}
                          href={item.to}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/50 transition-colors"
                          onClick={onClose}
                        >
                          <ItemIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{item.label}</span>
                        </a>
                      );
                    }

                    if (item.anchor) {
                      return (
                        <button
                          key={item.label}
                          onClick={() => handleClick(item)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/50 transition-colors text-left"
                        >
                          <ItemIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : (item as any).highlight
                              ? 'bg-primary text-primary-foreground font-semibold shadow-md'
                              : 'text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <ItemIcon className={`h-5 w-5 ${isActive ? 'text-primary' : (item as any).highlight ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

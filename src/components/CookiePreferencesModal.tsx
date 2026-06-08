import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShieldCheck, BarChart3, Megaphone, Sparkles } from 'lucide-react';
import { CookieCategories, DEFAULT_COOKIE_CATEGORIES, loadStoredConsent } from '@/lib/legal-version';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (categories: CookieCategories) => void;
}

export function CookiePreferencesModal({ open, onOpenChange, onSave }: Props) {
  const [categories, setCategories] = useState<CookieCategories>(DEFAULT_COOKIE_CATEGORIES);

  useEffect(() => {
    if (open) {
      const stored = loadStoredConsent();
      if (stored) setCategories(stored.categories);
    }
  }, [open]);

  const rows = [
    {
      key: 'necessary' as const,
      icon: ShieldCheck,
      label: 'Cookies nécessaires',
      desc: "Essentiels au fonctionnement du site (session, sécurité, préférences). Ne peuvent pas être désactivés.",
      locked: true,
    },
    {
      key: 'analytics' as const,
      icon: BarChart3,
      label: 'Cookies analytiques',
      desc: 'Mesure d\'audience anonymisée pour comprendre l\'usage du site (Google Analytics).',
    },
    {
      key: 'marketing' as const,
      icon: Megaphone,
      label: 'Cookies marketing',
      desc: 'Suivi des conversions et publicités personnalisées (Google Ads, Meta Pixel, TikTok Pixel).',
    },
    {
      key: 'personalization' as const,
      icon: Sparkles,
      label: 'Cookies de personnalisation',
      desc: 'Adaptation du contenu et des recommandations à votre profil de recherche.',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Préférences cookies</DialogTitle>
          <DialogDescription>
            Choisissez les catégories que vous souhaitez activer. Vous pouvez modifier vos préférences à tout moment via le lien « Gérer mes cookies » du footer. Détails complets dans notre{' '}
            <Link to="/politique-confidentialite" className="text-primary underline">politique de confidentialité</Link>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {rows.map(({ key, icon: Icon, label, desc, locked }) => (
            <div key={key} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm">{label}</p>
                  <Switch
                    checked={categories[key]}
                    disabled={locked}
                    onCheckedChange={(v) =>
                      setCategories((c) => ({ ...c, [key]: locked ? true : v }))
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={() =>
              onSave({ necessary: true, analytics: false, marketing: false, personalization: false })
            }
            className="w-full sm:w-auto"
          >
            Tout refuser
          </Button>
          <Button
            variant="outline"
            onClick={() => onSave(categories)}
            className="w-full sm:w-auto"
          >
            Enregistrer mes choix
          </Button>
          <Button
            onClick={() =>
              onSave({ necessary: true, analytics: true, marketing: true, personalization: true })
            }
            className="w-full sm:w-auto"
          >
            Tout accepter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

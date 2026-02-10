import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, FileText, Home } from 'lucide-react';

const POPUP_SESSION_KEY = 'engagement_popup_shown';

export function EngagementPopup() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only on mobile
    if (window.innerWidth >= 768) return;
    // Only once per session
    if (sessionStorage.getItem(POPUP_SESSION_KEY)) return;

    const timer = setTimeout(() => {
      // Don't show if user already scrolled past QuickLeadForm (engaged)
      const quickForm = document.getElementById('quickform');
      if (quickForm) {
        const rect = quickForm.getBoundingClientRect();
        if (rect.bottom < 0) return; // Already scrolled past
      }

      sessionStorage.setItem(POPUP_SESSION_KEY, 'true');
      setOpen(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleQuickSearch = () => {
    setOpen(false);
    const el = document.getElementById('quickform');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleFullMandat = () => {
    setOpen(false);
    navigate('/nouveau-mandat');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm mx-4" mobileFullHeight={false}>
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Home className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">
            Tu cherches un logement ? 🏠
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Laisse-nous ta recherche, on s'occupe de tout.{' '}
            <span className="font-semibold text-foreground">C'est gratuit.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            size="lg"
            className="w-full text-base font-semibold h-12"
            onClick={handleQuickSearch}
          >
            <Search className="h-5 w-5 mr-2" />
            Commencer ma recherche
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full text-base h-12"
            onClick={handleFullMandat}
          >
            <FileText className="h-5 w-5 mr-2" />
            Remplir mon dossier complet
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          ✅ Sans engagement · 100% gratuit
        </p>
      </DialogContent>
    </Dialog>
  );
}

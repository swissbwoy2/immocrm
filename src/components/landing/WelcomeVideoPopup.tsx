import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const SESSION_KEY = 'welcome_popup_shown';

export function WelcomeVideoPopup() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    if (!alreadyShown) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem(SESSION_KEY, 'true');
  };

  const handleCTA = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setOpen(false);
    navigate('/nouveau-mandat');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-5 pb-2">
          <DialogTitle className="text-lg font-bold text-center">
            🎬 Découvrez notre service en vidéo
          </DialogTitle>
        </DialogHeader>

        {/* Instagram Reel Embed */}
        <div className="w-full px-4">
          <div className="relative w-full rounded-lg overflow-hidden bg-muted" style={{ minHeight: '480px' }}>
            <iframe
              src="https://www.instagram.com/reel/DUf-zVlDDDv/embed/"
              className="w-full border-0"
              style={{ height: '480px' }}
              allowFullScreen
              loading="lazy"
              title="Vidéo de présentation Immo-rama"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="p-5 pt-4">
          <Button
            onClick={handleCTA}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-primary/90 shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all text-base font-semibold"
          >
            🚀 Activer ma recherche
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

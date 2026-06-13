import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[55] md:hidden bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3 flex flex-col gap-1" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
      <Button asChild size="lg" className="w-full shadow-md shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
        <Link to="/rendez-vous"><Calendar className="h-5 w-5 mr-2" />Réserver mon RDV au bureau gratuitement</Link>
      </Button>
      <Link to="/nouveau-mandat" className="text-xs text-center text-muted-foreground hover:text-primary">
        Activer ma recherche en ligne
      </Link>
    </div>
  );
}

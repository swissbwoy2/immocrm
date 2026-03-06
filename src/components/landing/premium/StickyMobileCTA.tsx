import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[55] md:hidden bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <Button asChild size="lg" className="w-full shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 font-semibold">
        <Link to="/nouveau-mandat">
          <Rocket className="h-5 w-5 mr-2" />
          Activer ma recherche maintenant
        </Link>
      </Button>
    </div>
  );
}

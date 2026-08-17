import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import { useStoryDialogOpen } from '../showcase/storyDialogState';

export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);
  const dialogOpen = useStoryDialogOpen();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[55] bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3 transition-opacity duration-300 ${
        dialogOpen ? 'opacity-20 pointer-events-none' : 'opacity-100'
      }`}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <Button
        asChild
        size="lg"
        className="w-full max-w-md mx-auto flex shadow-md shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
      >
        <Link to="/nouveau-mandat">
          <Rocket className="h-5 w-5 mr-2" />
          Activer ma recherche
        </Link>
      </Button>
    </div>
  );
}

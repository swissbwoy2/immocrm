import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DeposerAnnonceButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  asLink?: boolean;
  onNavigate?: () => void;
  label?: string;
}

/**
 * Bouton public « Déposer une annonce ».
 * - Non connecté → inscription annonceur
 * - Connecté avec profil annonceur → formulaire de dépôt
 * - Connecté sans profil annonceur → inscription annonceur (complétion du profil)
 */
export function DeposerAnnonceButton({
  variant = 'outline',
  size = 'sm',
  className,
  asLink = false,
  onNavigate,
  label = 'Déposer une annonce',
}: DeposerAnnonceButtonProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/inscription-annonceur');
        return;
      }

      const { data: annonceur } = await supabase
        .from('annonceurs')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      navigate(annonceur?.id ? '/espace-annonceur/nouvelle-annonce' : '/inscription-annonceur');
    } finally {
      setLoading(false);
      onNavigate?.();
    }
  };

  if (asLink) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn('text-left hover:text-foreground transition-colors', className)}
      >
        {label}
      </button>
    );
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
}

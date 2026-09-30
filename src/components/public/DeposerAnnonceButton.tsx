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
 * - Non connecté → connexion
 * - Connecté (tout rôle) → profil annonceur auto-provisionné puis formulaire de dépôt
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
        navigate('/connexion-annonceur');
        return;
      }

      // Même compte : le profil annonceur est provisionné automatiquement.
      await supabase.rpc('ensure_annonceur_profile' as any);
      navigate('/espace-annonceur/nouvelle-annonce');
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

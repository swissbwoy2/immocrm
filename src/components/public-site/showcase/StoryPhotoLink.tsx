import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  href?: string | null;
  className?: string;
  /** Taille de l'icône indicateur */
  iconSize?: 'sm' | 'md';
  children: React.ReactNode;
}

/**
 * Rend une zone photo cliquable qui ouvre le lien de l'annonce dans un nouvel onglet.
 * Si aucun lien n'est fourni, le contenu est rendu tel quel (pas de zone morte).
 */
export function StoryPhotoLink({ href, className, iconSize = 'md', children }: Props) {
  if (!href) return <>{children}</>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Voir l'annonce"
      aria-label="Voir l'annonce dans un nouvel onglet"
      className={cn('group/photo relative block cursor-pointer', className)}
    >
      {children}
      <span
        className={cn(
          'pointer-events-none absolute right-1.5 top-1.5 z-10 flex items-center justify-center rounded-full bg-background/85 text-primary opacity-0 shadow-sm backdrop-blur transition-opacity group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100',
          iconSize === 'sm' ? 'h-5 w-5' : 'h-7 w-7',
        )}
      >
        <ExternalLink className={iconSize === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </span>
    </a>
  );
}

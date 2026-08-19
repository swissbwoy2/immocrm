import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Props {
  href?: string | null;
  className?: string;
  iconSize?: 'sm' | 'md';
  children: React.ReactNode;
}

export function StoryPhotoLink({ href, className, iconSize = 'md', children }: Props) {
  if (!href) return <>{children}</>;

  const cls = cn('group/photo relative block cursor-pointer', className);
  const icon = (
    <span
      className={cn(
        'pointer-events-none absolute right-1.5 top-1.5 z-10 flex items-center justify-center rounded-full bg-background/85 text-primary opacity-0 shadow-sm backdrop-blur transition-opacity group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100',
        iconSize === 'sm' ? 'h-5 w-5' : 'h-7 w-7',
      )}
    >
      <ExternalLink className={iconSize === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
    </span>
  );

  if (href.startsWith('/')) {
    return (
      <Link to={href} onClick={(e) => e.stopPropagation()} title="Voir l'annonce" aria-label="Voir la fiche de l'annonce" className={cls}>
        {children}
        {icon}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Voir l'annonce" aria-label="Voir l'annonce dans un nouvel onglet" className={cls}>
      {children}
      {icon}
    </a>
  );
}

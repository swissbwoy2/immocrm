import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteAnnonce } from '../types';

const TYPE_LABELS: Record<SiteAnnonce['type'], string> = {
  portail: 'Portail',
  agregateur: 'Agrégateur',
  'petites-annonces': 'Petites annonces',
  reseau: 'Réseau',
};

export function SitesGrid({ items }: { items: SiteAnnonce[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((site) => (
        <a
          key={site.name}
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <Card
            className={cn(
              'p-5 h-full hover:shadow-lg hover:-translate-y-0.5 cursor-pointer relative',
              site.highlight && 'ring-2 ring-primary/40'
            )}
          >
            {site.highlight && (
              <Badge className="absolute -top-2 -right-2 gap-1">
                <Star className="w-3 h-3" /> Nouveau
              </Badge>
            )}
            <div className="flex items-start justify-between mb-3">
              {site.logo ? (
                <img src={site.logo} alt={site.name} className="h-8 object-contain" />
              ) : (
                <div className="font-bold text-lg">{site.name}</div>
              )}
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="font-semibold mb-1">{site.name}</div>
            <Badge variant="secondary" className="text-xs mb-2">
              {TYPE_LABELS[site.type]}
            </Badge>
            <p className="text-xs text-muted-foreground leading-relaxed">{site.description}</p>
          </Card>
        </a>
      ))}
    </div>
  );
}

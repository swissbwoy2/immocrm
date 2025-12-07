import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface InfoItem {
  icon: LucideIcon;
  label: string;
  value: string | ReactNode;
  iconColor?: string;
}

interface PremiumInfoGridProps {
  items: InfoItem[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function PremiumInfoGrid({
  items,
  columns = 2,
  className
}: PremiumInfoGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };
  
  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {items.map((item, index) => (
        <PremiumInfoItem 
          key={index} 
          item={item} 
          delay={index * 50}
        />
      ))}
    </div>
  );
}

interface PremiumInfoItemProps {
  item: InfoItem;
  delay: number;
}

function PremiumInfoItem({ item, delay }: PremiumInfoItemProps) {
  const Icon = item.icon;
  
  return (
    <div 
      className={cn(
        'relative overflow-hidden group/item',
        'p-4 rounded-xl',
        'bg-gradient-to-br from-muted/50 via-muted/30 to-transparent',
        'backdrop-blur-sm border border-border/30',
        'hover:border-primary/30 hover:bg-muted/40',
        'transition-all duration-300',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover/item:translate-x-[100%] transition-transform duration-700" />
      
      <div className="relative z-10 flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg transition-all duration-300 group-hover/item:scale-110',
          'bg-primary/10'
        )}>
          <Icon className={cn(
            'w-4 h-4 transition-colors',
            item.iconColor || 'text-primary'
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-0.5">{item.label}</p>
          <div className="font-medium text-foreground truncate">
            {item.value || <span className="text-muted-foreground">Non renseigné</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export individual item for custom usage
export { PremiumInfoItem };

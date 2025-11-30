import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  subtitle?: string;
  onClick?: () => void;
}

export function KPICard({ title, value, icon: Icon, variant = 'default', subtitle, onClick }: KPICardProps) {
  const variantClasses = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card 
      className={onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
      onClick={onClick}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <h3 className="text-lg md:text-2xl font-bold mt-1 md:mt-2 truncate">{value}</h3>
            {subtitle && (
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
            )}
          </div>
          <div className={cn('p-2 md:p-3 rounded-lg flex-shrink-0', variantClasses[variant])}>
            <Icon className="w-4 h-4 md:w-6 md:h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { ArrowRight } from 'lucide-react';

interface Item {
  icon: string;
  title: string;
  description: string;
  path?: string;
}

export function FeatureTour({ items }: { items: Item[] }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map((item) => {
        const Icon = (Icons as any)[item.icon] || Icons.Sparkles;
        const Wrapper: any = item.path ? 'button' : 'div';
        return (
          <Wrapper
            key={item.title}
            onClick={item.path ? () => navigate(item.path!) : undefined}
            className="text-left w-full"
          >
            <Card className="p-4 h-full flex items-start gap-3 hover:bg-muted/30 hover:border-primary/30 cursor-pointer group">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm flex items-center gap-1">
                  {item.title}
                  {item.path && (
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
              </div>
            </Card>
          </Wrapper>
        );
      })}
    </div>
  );
}

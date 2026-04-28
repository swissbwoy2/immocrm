import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  title?: string;
  items: { id: string; label: string }[];
  state: Record<string, boolean>;
  onToggle: (itemId: string, checked: boolean) => void;
}

export function InteractiveChecklist({ id, title, items, state, onToggle }: Props) {
  const checkedCount = items.filter((i) => state[`${id}.${i.id}`]).length;
  const allDone = checkedCount === items.length;

  return (
    <Card className={cn('p-5 border-l-4 transition-colors', allDone ? 'border-l-green-500 bg-green-500/5' : 'border-l-primary')}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold flex items-center gap-2">
            {allDone && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {title}
          </h4>
          <span className="text-sm text-muted-foreground tabular-nums">
            {checkedCount}/{items.length}
          </span>
        </div>
      )}
      <ul className="space-y-3">
        {items.map((item) => {
          const key = `${id}.${item.id}`;
          const checked = !!state[key];
          return (
            <li key={item.id} className="flex items-start gap-3 min-h-[44px]">
              <Checkbox
                id={key}
                checked={checked}
                onCheckedChange={(v) => onToggle(item.id, !!v)}
                className="mt-1"
              />
              <label
                htmlFor={key}
                className={cn(
                  'text-sm leading-relaxed cursor-pointer flex-1',
                  checked && 'line-through text-muted-foreground'
                )}
              >
                {item.label}
              </label>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

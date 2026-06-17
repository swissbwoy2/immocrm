import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface LandingRadioOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface LandingRadioGroupProps {
  label?: string;
  options: LandingRadioOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: 1 | 2 | 3;
  required?: boolean;
}

export function LandingRadioGroup({ label, options, value, onChange, columns = 2, required }: LandingRadioGroupProps) {
  const gridClass = columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className="space-y-2.5">
      {label && (
        <p className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </p>
      )}
      <div className={`grid ${gridClass} gap-3`}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className={`relative text-left rounded-xl p-4 border-2 transition-all duration-300 cursor-pointer ${
                selected
                  ? 'border-primary bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.12)]'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <div className="flex items-start gap-3">
                {opt.icon && (
                  <span className={`text-lg flex-shrink-0 transition-colors ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {opt.icon}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold transition-colors ${selected ? 'text-primary' : 'text-foreground'}`}>
                    {opt.label}
                  </p>
                  {opt.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
                  )}
                </div>
                {selected && (
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

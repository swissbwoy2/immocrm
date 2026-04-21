import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface PremiumRadioOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface PremiumRadioGroupProps {
  label?: string;
  options: PremiumRadioOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: 1 | 2 | 3;
  required?: boolean;
}

export function PremiumRadioGroup({ label, options, value, onChange, columns = 2, required }: PremiumRadioGroupProps) {
  const gridClass = columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className="space-y-2.5">
      {label && (
        <p className="text-sm font-medium text-[hsl(40_20%_60%)]">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
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
                  ? 'border-[hsl(38_55%_65%/0.8)] bg-[hsl(38_45%_48%/0.1)] shadow-[0_0_20px_hsl(38_45%_48%/0.15)]'
                  : 'border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_15%_10%/0.5)] hover:border-[hsl(38_45%_48%/0.4)] hover:bg-[hsl(38_45%_48%/0.05)]'
              }`}
            >
              <div className="flex items-start gap-3">
                {opt.icon && (
                  <span className={`text-lg flex-shrink-0 transition-colors ${selected ? 'text-[hsl(38_55%_65%)]' : 'text-[hsl(40_20%_45%)]'}`}>
                    {opt.icon}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold transition-colors ${selected ? 'text-[hsl(38_55%_65%)]' : 'text-[hsl(40_20%_75%)]'}`}>
                    {opt.label}
                  </p>
                  {opt.description && (
                    <p className="text-[11px] text-[hsl(40_20%_45%)] mt-0.5 leading-relaxed">{opt.description}</p>
                  )}
                </div>
                {selected && (
                  <CheckCircle2 className="h-4 w-4 text-[hsl(38_55%_65%)] flex-shrink-0 mt-0.5" />
                )}
              </div>
              {selected && (
                <motion.div
                  layoutId="radio-indicator"
                  className="absolute inset-0 rounded-xl border-2 border-[hsl(38_55%_65%/0.6)] pointer-events-none"
                  transition={{ duration: 0.2 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

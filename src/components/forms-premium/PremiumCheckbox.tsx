import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface PremiumCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: string;
  required?: boolean;
  id?: string;
}

export function PremiumCheckbox({ checked, onCheckedChange, label, description, required, id }: PremiumCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 cursor-pointer rounded-xl p-4 border transition-all duration-300 ${
        checked
          ? 'border-[hsl(38_45%_48%/0.5)] bg-[hsl(38_45%_48%/0.08)]'
          : 'border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_15%_10%/0.4)] hover:border-[hsl(38_45%_48%/0.3)]'
      }`}
    >
      <motion.button
        id={id}
        type="button"
        onClick={() => onCheckedChange(!checked)}
        whileTap={{ scale: 0.9 }}
        className={`relative flex-shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
          checked
            ? 'bg-[hsl(38_45%_48%)] border-[hsl(38_45%_48%)]'
            : 'border-[hsl(38_45%_48%/0.4)] bg-transparent hover:border-[hsl(38_55%_65%/0.7)]'
        }`}
      >
        <AnimatePresence>
          {checked && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15, type: 'spring' as const, stiffness: 400, damping: 20 }}
            >
              <Check className="h-3 w-3 text-[hsl(30_15%_8%)]" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      <div className="flex-1">
        <span className={`text-sm font-medium transition-colors ${checked ? 'text-[hsl(40_20%_82%)]' : 'text-[hsl(40_20%_60%)]'}`}>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </span>
        {description && <p className="text-[11px] text-[hsl(40_20%_42%)] mt-0.5 leading-relaxed">{description}</p>}
      </div>
    </label>
  );
}

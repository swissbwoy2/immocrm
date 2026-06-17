import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface LandingCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: string;
  required?: boolean;
  id?: string;
}

export function LandingCheckbox({ checked, onCheckedChange, label, description, required, id }: LandingCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 cursor-pointer rounded-xl p-4 border transition-all duration-300 ${
        checked
          ? 'border-primary/60 bg-primary/5'
          : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      <motion.button
        id={id}
        type="button"
        onClick={() => onCheckedChange(!checked)}
        whileTap={{ scale: 0.9 }}
        className={`relative flex-shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
          checked
            ? 'bg-primary border-primary'
            : 'border-border bg-background hover:border-primary/70'
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
              <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      <div className="flex-1">
        <span className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </span>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
      </div>
    </label>
  );
}

import { InputHTMLAttributes, ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface PremiumInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
}

export function PremiumInput({ label, icon, error, hint, required, optional, className = '', ...props }: PremiumInputProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = Boolean(props.value || props.defaultValue);
  const floated = focused || hasValue;

  return (
    <div className="relative group">
      <div className={`relative rounded-xl border transition-all duration-300 ${
        error
          ? 'border-red-500/60 bg-red-500/5'
          : focused
          ? 'border-[hsl(38_55%_65%/0.7)] bg-[hsl(38_45%_48%/0.04)] shadow-[0_0_0_3px_hsl(38_45%_48%/0.1)]'
          : 'border-[hsl(38_45%_48%/0.2)] bg-[hsl(30_15%_9%/0.6)] hover:border-[hsl(38_45%_48%/0.4)]'
      }`}>
        {/* Floating label */}
        <motion.label
          animate={{ y: floated ? -10 : 6, scale: floated ? 0.78 : 1, x: icon ? (floated ? 0 : 28) : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ transformOrigin: 'left center', pointerEvents: 'none' }}
          className={`absolute left-4 top-3.5 font-medium transition-colors z-10 ${
            floated
              ? error ? 'text-red-400' : 'text-[hsl(38_55%_65%)]'
              : 'text-[hsl(40_20%_45%)]'
          }`}
        >
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
          {optional && <span className="text-[hsl(40_20%_38%)] text-[10px] ml-1">(optionnel)</span>}
        </motion.label>

        <div className="flex items-center">
          {icon && (
            <span className={`pl-4 pt-6 pb-2 transition-colors duration-300 ${focused ? 'text-[hsl(38_55%_65%)]' : 'text-[hsl(40_20%_40%)]'}`}>
              {icon}
            </span>
          )}
          <input
            {...props}
            onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
            className={`w-full bg-transparent text-[hsl(40_20%_88%)] placeholder-transparent pt-6 pb-2 px-4 outline-none text-sm rounded-xl ${className}`}
          />
          {/* Validation icon */}
          {!error && hasValue && !focused && (
            <CheckCircle2 className="h-4 w-4 text-[hsl(38_45%_48%)] mr-3 flex-shrink-0" />
          )}
          {error && (
            <AlertCircle className="h-4 w-4 text-red-400 mr-3 flex-shrink-0" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-red-400 mt-1 pl-1"
          >
            {error}
          </motion.p>
        )}
        {hint && !error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-[hsl(40_20%_40%)] mt-1 pl-1"
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

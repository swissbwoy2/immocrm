import { TextareaHTMLAttributes, ReactNode, useState } from 'react';
import { motion } from 'framer-motion';

interface PremiumTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
  optional?: boolean;
}

export function PremiumTextarea({ label, icon, error, optional, className = '', ...props }: PremiumTextareaProps) {
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
        <motion.label
          animate={{ y: floated ? -10 : 6, scale: floated ? 0.78 : 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ transformOrigin: 'left center', pointerEvents: 'none' }}
          className={`absolute left-4 top-3.5 font-medium transition-colors z-10 ${
            floated
              ? error ? 'text-red-400' : 'text-[hsl(38_55%_65%)]'
              : 'text-[hsl(40_20%_45%)]'
          }`}
        >
          {label}
          {optional && <span className="text-[hsl(40_20%_38%)] text-[10px] ml-1">(optionnel)</span>}
        </motion.label>

        <textarea
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          className={`w-full bg-transparent text-[hsl(40_20%_88%)] placeholder-transparent pt-7 pb-3 px-4 outline-none text-sm rounded-xl resize-none min-h-[100px] ${className}`}
        />
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1 pl-1">{error}</p>}
    </div>
  );
}

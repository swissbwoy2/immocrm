import { TextareaHTMLAttributes, ReactNode, useState } from 'react';
import { motion } from 'framer-motion';

interface LandingTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
  optional?: boolean;
}

export function LandingTextarea({ label, icon, error, optional, className = '', ...props }: LandingTextareaProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = Boolean(props.value || props.defaultValue);
  const floated = focused || hasValue;

  return (
    <div className="relative group">
      <div className={`relative rounded-xl border transition-all duration-300 ${
        error
          ? 'border-destructive/60 bg-destructive/5'
          : focused
          ? 'border-primary bg-background shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]'
          : 'border-border bg-background hover:border-primary/50'
      }`}>
        <motion.label
          animate={{ y: floated ? -10 : 6, scale: floated ? 0.78 : 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ transformOrigin: 'left center', pointerEvents: 'none' }}
          className={`absolute left-4 top-3.5 font-medium transition-colors z-10 ${
            floated
              ? error ? 'text-destructive' : 'text-primary'
              : 'text-muted-foreground'
          }`}
        >
          {label}
          {optional && <span className="text-muted-foreground text-[10px] ml-1">(optionnel)</span>}
        </motion.label>

        <textarea
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          className={`w-full bg-transparent text-foreground placeholder-transparent pt-7 pb-3 px-4 outline-none text-sm rounded-xl resize-none min-h-[100px] ${className}`}
        />
      </div>
      {error && <p className="text-[11px] text-destructive mt-1 pl-1">{error}</p>}
    </div>
  );
}

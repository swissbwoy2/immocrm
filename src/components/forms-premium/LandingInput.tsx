import { InputHTMLAttributes, ReactNode, useState, forwardRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface LandingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  rightAction?: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
}

export const LandingInput = forwardRef<HTMLInputElement, LandingInputProps>(function LandingInput(
  { label, icon, rightAction, error, hint, required, optional, className = '', ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  // Track value internally so uncontrolled inputs (react-hook-form register pattern)
  // still trigger the floating label / check icon state.
  const [internalHasValue, setInternalHasValue] = useState(
    Boolean(props.value || props.defaultValue),
  );
  const hasValue = Boolean(props.value) || Boolean(props.defaultValue) || internalHasValue;
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
          animate={{ y: floated ? -10 : 6, scale: floated ? 0.78 : 1, x: icon ? (floated ? 0 : 28) : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ transformOrigin: 'left center', pointerEvents: 'none' }}
          className={`absolute left-4 top-3.5 font-medium transition-colors z-10 ${
            floated
              ? error ? 'text-destructive' : 'text-primary'
              : 'text-muted-foreground'
          }`}
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
          {optional && <span className="text-muted-foreground text-[10px] ml-1">(optionnel)</span>}
        </motion.label>

        <div className="flex items-center">
          {icon && (
            <span className={`pl-4 pt-6 pb-2 transition-colors duration-300 ${focused ? 'text-primary' : 'text-muted-foreground'}`}>
              {icon}
            </span>
          )}
          <input
            {...props}
            ref={ref}
            onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setInternalHasValue(Boolean(e.target.value));
              props.onChange?.(e);
            }}
            className={`w-full bg-transparent text-foreground placeholder-transparent pt-6 pb-2 px-4 outline-none text-sm rounded-xl ${className}`}
          />
          {rightAction && <span className="mr-2 flex-shrink-0">{rightAction}</span>}
          {!rightAction && !error && hasValue && !focused && (
            <CheckCircle2 className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
          )}
          {!rightAction && error && (
            <AlertCircle className="h-4 w-4 text-destructive mr-3 flex-shrink-0" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-destructive mt-1 pl-1"
          >
            {error}
          </motion.p>
        )}
        {hint && !error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-muted-foreground mt-1 pl-1"
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

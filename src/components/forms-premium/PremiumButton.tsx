import { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2, Send } from 'lucide-react';

type PremiumButtonVariant = 'next' | 'back' | 'submit';

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: PremiumButtonVariant;
  loading?: boolean;
  children?: ReactNode;
}

export function PremiumButton({ variant, loading, children, className = '', disabled, ...props }: PremiumButtonProps) {
  if (variant === 'back') {
    return (
      <motion.button
        type="button"
        whileHover={{ x: -3 }}
        whileTap={{ scale: 0.97 }}
        disabled={disabled || loading}
        {...(props as any)}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[hsl(38_45%_48%/0.2)] text-[hsl(40_20%_55%)] text-sm font-medium hover:border-[hsl(38_45%_48%/0.4)] hover:text-[hsl(40_20%_70%)] transition-all duration-200 bg-transparent ${className}`}
      >
        <ArrowLeft className="h-4 w-4" />
        {children ?? 'Retour'}
      </motion.button>
    );
  }

  if (variant === 'submit') {
    return (
      <motion.button
        type="button"
        whileHover={disabled || loading ? {} : { scale: 1.02, boxShadow: '0 0 30px hsl(38 45% 48% / 0.4)' }}
        whileTap={disabled || loading ? {} : { scale: 0.98 }}
        disabled={disabled || loading}
        {...(props as any)}
        className={`relative flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-base text-[hsl(30_15%_8%)] overflow-hidden transition-all duration-300 ${
          disabled
            ? 'bg-[hsl(38_45%_48%/0.3)] cursor-not-allowed'
            : 'bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(28_35%_45%)] shadow-[0_0_20px_hsl(38_45%_48%/0.25)] hover:shadow-[0_0_35px_hsl(38_45%_48%/0.4)]'
        } ${className}`}
      >
        {/* Shimmer effect */}
        {!disabled && !loading && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
          />
        )}
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
        <span className="relative z-10">{children ?? 'Envoyer ma demande'}</span>
      </motion.button>
    );
  }

  // next variant
  return (
    <motion.button
      type="button"
      whileHover={disabled || loading ? {} : { scale: 1.02 }}
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
      disabled={disabled || loading}
      {...(props as any)}
      className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm text-[hsl(30_15%_8%)] overflow-hidden transition-all duration-300 ${
        disabled
          ? 'bg-[hsl(38_45%_48%/0.25)] cursor-not-allowed text-[hsl(40_20%_40%)]'
          : 'bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(38_45%_48%)] shadow-[0_4px_16px_hsl(38_45%_48%/0.25)] hover:shadow-[0_6px_24px_hsl(38_45%_48%/0.35)]'
      } ${className}`}
    >
      {!disabled && !loading && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
        />
      )}
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      <span className="relative z-10">{children ?? 'Continuer'}</span>
      {!loading && <ArrowRight className="h-4 w-4 relative z-10" />}
    </motion.button>
  );
}

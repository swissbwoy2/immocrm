import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Crown, AlertCircle } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import heroBg from '@/assets/hero-bg.jpg';

// ─────────────────────────────────────────────
// AuthInput
// ─────────────────────────────────────────────
interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  rightAction?: React.ReactNode;
  error?: string;
  hint?: string;
  animDelay?: number;
}

export function AuthInput({
  label,
  icon,
  rightAction,
  error,
  hint,
  animDelay = 0,
  className,
  ...props
}: AuthInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: animDelay, ease: 'easeOut' }}
      className="space-y-1.5"
    >
      <label className="block text-sm font-medium text-foreground">
        {label}
        {props.required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className="relative group input-focus-glow rounded-xl">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-200 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={[
            'w-full h-12 rounded-xl border bg-background text-foreground text-sm',
            'placeholder:text-muted-foreground/50 px-4 transition-all duration-200',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-destructive/60 focus:ring-destructive/20 focus:border-destructive'
              : 'border-border/60 focus:ring-primary/20 focus:border-primary/60',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            icon ? 'pl-10' : '',
            rightAction ? 'pr-12' : '',
            className || '',
          ].join(' ')}
        />
        {rightAction && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightAction}
          </div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="text-xs text-destructive flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// AuthSubmitButton
// ─────────────────────────────────────────────
interface AuthSubmitButtonProps {
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  type?: 'submit' | 'button';
  onClick?: () => void;
  animDelay?: number;
}

export function AuthSubmitButton({
  loading,
  disabled,
  children,
  type = 'submit',
  onClick,
  animDelay = 0,
}: AuthSubmitButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: animDelay, ease: 'easeOut' }}
    >
      <motion.button
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        whileHover={isDisabled ? {} : { scale: 1.02, y: -1 }}
        whileTap={isDisabled ? {} : { scale: 0.98 }}
        className={[
          'group relative w-full flex items-center justify-center gap-2 h-12 px-6',
          'rounded-xl font-semibold text-sm overflow-hidden transition-all duration-300',
          isDisabled
            ? 'bg-primary/30 text-primary-foreground/50 cursor-not-allowed'
            : 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 cursor-pointer',
        ].join(' ')}
      >
        {!isDisabled && (
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 pointer-events-none"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Chargement...
            </>
          ) : (
            <>
              {children}
              <motion.svg
                className="h-4 w-4"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </motion.svg>
            </>
          )}
        </span>
      </motion.button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// PremiumAuthLayout
// ─────────────────────────────────────────────
interface PremiumAuthLayoutProps {
  title: string;
  description?: string;
  backTo?: string;
  badge?: string;
  children: React.ReactNode;
}

export function PremiumAuthLayout({
  title,
  description,
  backTo,
  badge,
  children,
}: PremiumAuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 py-8">
      {/* Hero background */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80" />
      </div>

      {/* Back button */}
      {backTo && (
        <motion.div
          className="absolute top-4 left-4 z-20 sm:top-6 sm:left-6"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Link
            to={backTo}
            className="flex items-center gap-2 backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-4 py-2 text-white transition-all duration-200 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour</span>
          </Link>
        </motion.div>
      )}

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="bg-background/96 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 login-card-float">

          {/* Card header */}
          <div className="flex flex-col items-center gap-3 mb-6">
            {/* Logo */}
            <motion.img
              src={logoImmoRama}
              alt="Immo-Rama"
              className="h-20 md:h-24 w-auto drop-shadow-xl dark:brightness-0 dark:invert"
              whileHover={{ scale: 1.05, rotate: [0, -1.5, 1.5, 0] }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            />

            {/* Badge */}
            {badge && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.35, ease: 'easeOut' }}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/50 rounded-full px-3 py-1.5"
              >
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-500">
                  {badge} 🇨🇭
                </span>
              </motion.div>
            )}

            {/* Title + description */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-xs mx-auto">
                  {description}
                </p>
              )}
            </motion.div>

            {/* Gold hairline divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>

          {/* Slot content */}
          {children}

          {/* Trust footer */}
          <div className="mt-6 pt-4 border-t border-border/40">
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-green-500 flex-shrink-0" />
                SSL sécurisé
              </span>
              <span className="text-border hidden sm:inline">·</span>
              <span>🇨🇭 Suisse romande</span>
              <span className="text-border hidden sm:inline">·</span>
              <span>RGPD</span>
            </div>
            <p className="text-center text-[11px] text-muted-foreground/50 mt-1.5">
              © Immo-Rama.ch — Tous droits réservés
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default PremiumAuthLayout;

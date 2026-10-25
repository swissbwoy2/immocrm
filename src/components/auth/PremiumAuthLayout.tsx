import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ChevronLeft, Loader2, ShieldCheck } from 'lucide-react';
import logoLogisorama from '@/assets/logisorama-logo.png';
import { FUNNEL_FONT } from '@/components/funnel-ui/FunnelKit';

/*
 * Pages de connexion / inscription : même langage que les formulaires publics (tunnel /courtier).
 * L'API des composants (AuthInput, AuthSubmitButton, PremiumAuthLayout) est inchangée.
 */

// ─────────────────────────────────────────────
// AuthInput : libellé dans le champ, 56 px
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
  id,
  ...props
}: AuthInputProps) {
  const inputId = id ?? `auth-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: animDelay, ease: 'easeOut' }}
    >
      <div
        className={[
          'relative rounded-lg border bg-white transition-[border-color,box-shadow] duration-150',
          error
            ? 'border-[#c13515] shadow-[inset_0_0_0_1px_#c13515]'
            : 'border-[#b0b0b0] focus-within:border-[#222222] focus-within:shadow-[inset_0_0_0_1px_#222222]', // taste-skill-ignore : champ de saisie
        ].join(' ')}
      >
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6a6a]">{icon}</div>
        )}
        <label htmlFor={inputId} className={`pointer-events-none absolute top-2 text-[12px] font-medium text-[#6a6a6a] ${icon ? 'left-10' : 'left-3'}`}>
          {label}
        </label>
        <input
          {...props}
          id={inputId}
          aria-invalid={!!error}
          className={[
            'h-14 w-full rounded-lg bg-transparent pb-2 pt-6 text-[16px] text-[#222222] outline-none placeholder:text-[#b0b0b0]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            icon ? 'pl-10' : 'pl-3',
            rightAction ? 'pr-12' : 'pr-3',
            className || '',
          ].join(' ')}
        />
        {rightAction && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightAction}</div>}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1.5 flex items-center gap-1 text-[13px] text-[#c13515]"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      {hint && !error && <p className="mt-1.5 text-[13px] text-[#6a6a6a]">{hint}</p>}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// AuthSubmitButton : bouton vert pleine largeur
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: animDelay, ease: 'easeOut' }}
    >
      <button
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        className={[
          'flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-6 text-[16px] font-medium transition-colors duration-200',
          isDisabled && !loading
            ? 'cursor-not-allowed bg-[#ebebeb] text-[#6a6a6a]'
            : 'bg-[#1F7A5C] text-white hover:bg-[#1A6B50] active:bg-[#155A43]',
        ].join(' ')}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
      </button>
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
    <div className="funnel-skin min-h-[100dvh] bg-white text-[#222222]" style={{ fontFamily: FUNNEL_FONT }}>
      <header className="sticky top-0 z-30 bg-white">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <Link to="/" aria-label="Logisorama, accueil" className="cursor-pointer">
            <img src={logoLogisorama} alt="Logisorama" className="h-6 w-auto" />
          </Link>
          {backTo && (
            <Link to={backTo}
              className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg px-2 text-[15px] font-semibold text-[#222222] underline underline-offset-4 transition-colors duration-200 hover:bg-[#f7f7f7]">
              <ChevronLeft className="h-4 w-4" /> Retour
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-16 pt-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
          {badge && (
            <p className="mb-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6a6a6a]">
              <ShieldCheck className="h-4 w-4 text-[#1F7A5C]" strokeWidth={1.8} /> {badge}
            </p>
          )}
          <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[#222222]">{title}</h1>
          {description && <p className="mt-2 text-[16px] leading-relaxed text-[#3f3f3f]">{description}</p>}
          <div className="mt-6">{children}</div>
        </motion.div>

        <div className="mt-10 text-[13px] text-[#6a6a6a]">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 flex-none text-[#1F7A5C]" strokeWidth={1.8} />
            Connexion sécurisée (SSL) · Suisse romande · RGPD
          </p>
          <p className="mt-1">© Immo-Rama.ch — Tous droits réservés</p>
        </div>
      </main>
    </div>
  );
}

export default PremiumAuthLayout;

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Send } from 'lucide-react';

type LandingButtonVariant = 'next' | 'back' | 'submit';

interface LandingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: LandingButtonVariant;
  loading?: boolean;
  children?: ReactNode;
}

export function LandingButton({
  variant,
  loading,
  children,
  className = '',
  disabled,
  ...props
}: LandingButtonProps) {
  if (variant === 'back') {
    return (
      <button
        type="button"
        disabled={disabled || loading}
        {...props}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors ${className}`}
      >
        <ArrowLeft className="h-4 w-4" />
        {children ?? 'Retour'}
      </button>
    );
  }

  if (variant === 'submit') {
    return (
      <button
        type="button"
        disabled={disabled || loading}
        {...props}
        className={`inline-flex items-center gap-3 px-7 py-3.5 rounded-xl font-bold text-base text-white overflow-hidden transition-all ${
          disabled
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-gradient-to-r from-primary to-[hsl(var(--imr-green-light))] shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02]'
        } ${className}`}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        <span>{children ?? 'Envoyer ma demande'}</span>
      </button>
    );
  }

  // next
  return (
    <button
      type="button"
      disabled={disabled || loading}
      {...props}
      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
        disabled
          ? 'bg-muted text-muted-foreground cursor-not-allowed'
          : 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02]'
      } ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      <span>{children ?? 'Continuer'}</span>
      {!loading && <ArrowRight className="h-4 w-4" />}
    </button>
  );
}

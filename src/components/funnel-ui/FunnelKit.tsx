import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronLeft, Loader2, ShieldCheck, type LucideIcon } from 'lucide-react';
import logo from '@/assets/logisorama-logo.png';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/*
 * Kit commun des formulaires publics Logisorama (référence : tunnel /courtier).
 * Langage marketplace type Airbnb : fond blanc, encre #222222, un seul accent vert #1F7A5C
 * (contraste AA sur blanc), coins 14 px, une page par question, barre d'action fixe en bas.
 */
export const ACCENT = '#1F7A5C';
export const FUNNEL_FONT = "Inter, -apple-system, system-ui, Roboto, 'Helvetica Neue', sans-serif";

/* ---------- Étapes dans l'URL (?etape=N) : le bouton retour du téléphone fonctionne ---------- */
export function useFunnelSteps(total: number, firstMissing: number) {
  const [params, setParams] = useSearchParams();
  const [dir, setDir] = useState(1);
  const timer = useRef<number | null>(null);
  const raw = Math.min(Math.max(parseInt(params.get('etape') || '1', 10) || 1, 1), Math.max(total, 1)) - 1;
  const step = Math.max(0, Math.min(raw, firstMissing, total - 1));

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const go = useCallback((to: number) => {
    setDir(to > step ? 1 : -1);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (to <= 0) next.delete('etape'); else next.set('etape', String(to + 1));
      return next;
    });
    window.scrollTo({ top: 0 });
  }, [step, setParams]);

  // Choix unique : on enregistre la réponse puis on avance tout seul (220 ms pour voir la coche).
  const pick = useCallback((fn: () => void, next: number) => {
    fn();
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => go(next), 220);
  }, [go]);

  return { step, dir, go, pick, params };
}

/* ---------- Page ---------- */
export function FunnelPage({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className={`min-h-[100dvh] bg-white text-[#222222] ${className}`} style={{ fontFamily: FUNNEL_FONT }}>
        {children}
      </div>
    </MotionConfig>
  );
}

export function FunnelHeader({ step, total, label, width = 'max-w-xl' }: { step?: number; total?: number; label?: string; width?: string }) {
  return (
    <header className="sticky top-0 z-30 bg-white">
      <div className={`mx-auto flex h-16 ${width} items-center justify-between px-4`}>
        <Link to="/" aria-label="Logisorama, accueil" className="cursor-pointer"><img src={logo} alt="Logisorama" className="h-6 w-auto" /></Link>
        <span className="text-[14px] font-medium text-[#6a6a6a]">
          {label ?? (step !== undefined && total ? `Étape ${step + 1} sur ${total}` : '')}
        </span>
      </div>
    </header>
  );
}

export function FunnelMain({ children, width = 'max-w-xl' }: { children: React.ReactNode; width?: string }) {
  return <main className={`mx-auto ${width} px-4 pb-40 pt-6`}>{children}</main>;
}

/* ---------- Transition entre deux questions ---------- */
export function StepTransition({ stepKey, dir, children }: { stepKey: string | number; dir: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const props = reduce
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: dir * 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: dir * -24 },
        transition: { duration: 0.2, ease: 'easeOut' as const },
      };
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.section key={stepKey} {...props}>{children}</motion.section>
    </AnimatePresence>
  );
}

export function Question({ q, s }: { q: string; s?: string }) {
  return (
    <>
      <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.2px] text-[#222222]">{q}</h2>
      {s && <p className="mt-1.5 text-[16px] text-[#3f3f3f]">{s}</p>}
    </>
  );
}

export function FunnelIntro({ photo, alt, title, text }: { photo?: string; alt?: string; title: string; text?: string }) {
  return (
    <section className="mb-6">
      {photo && (
        <div className="relative overflow-hidden rounded-[14px]">
          <img src={photo} alt={alt ?? ''} className="aspect-[16/9] w-full object-cover" />
        </div>
      )}
      <h1 className="mt-5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[#222222] md:text-[40px]">{title}</h1>
      {text && <p className="mt-2 text-[16px] leading-relaxed text-[#3f3f3f]">{text}</p>}
    </section>
  );
}

/* ---------- Choix (une réponse obligatoire) ---------- */
export function Choice({ selected, onClick, icon, label, hint, index = 0, disabled = false }: {
  selected: boolean; onClick: () => void; icon?: React.ReactNode; label: string; hint?: string; index?: number; disabled?: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.04 * Math.min(index, 8), ease: 'easeOut' }}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'flex w-full cursor-pointer items-center gap-4 rounded-[14px] border bg-white px-4 py-4 text-left transition-[border-color,background-color,box-shadow] duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'border-[#222222] bg-[#f7f7f7] shadow-[inset_0_0_0_1px_#222222]' : 'border-[#dddddd] hover:border-[#222222]', // taste-skill-ignore : contrôle de formulaire
      ].join(' ')}
    >
      {icon && <span className="flex h-6 w-6 flex-none items-center justify-center text-[#222222]">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold leading-tight text-[#222222]">{label}</span>
        {hint && <span className="mt-1 block text-[14px] leading-snug text-[#6a6a6a]">{hint}</span>}
      </span>
      <span
        className={[
          'flex h-6 w-6 flex-none items-center justify-center rounded-full border transition-colors duration-200',
          selected ? 'border-[#222222] bg-[#222222] text-white' : 'border-[#b0b0b0] text-transparent', // taste-skill-ignore : case à cocher
        ].join(' ')}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </motion.button>
  );
}

export function ChoiceList({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 grid gap-3">{children}</div>;
}

/* Petite tuile pour les listes courtes de valeurs (pièces, jours, heures). */
export function Tile({ selected, onClick, children, disabled = false, strike = false, className = '' }: {
  selected: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean; strike?: boolean; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'min-h-12 cursor-pointer rounded-[14px] border px-3 py-2.5 text-center text-[15px] font-semibold transition-[border-color,background-color,box-shadow] duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] focus-visible:ring-offset-2',
        disabled ? 'cursor-not-allowed border-[#ebebeb] bg-[#f7f7f7] text-[#b0b0b0]' : selected
          ? 'border-[#222222] bg-[#f7f7f7] text-[#222222] shadow-[inset_0_0_0_1px_#222222]' // taste-skill-ignore : contrôle de formulaire
          : 'border-[#dddddd] bg-white text-[#222222] hover:border-[#222222]',
        strike ? 'line-through' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/* ---------- Champs : libellé dans le champ (56 px) ---------- */
type FieldProps = {
  id: string; label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; error?: string | null; autoFocus?: boolean;
  min?: string; max?: string; suffix?: string; placeholder?: string; maxLength?: number;
};

const fieldFrame = (error?: string | null) => [
  'relative rounded-lg border bg-white transition-[border-color,box-shadow] duration-150',
  error ? 'border-[#c13515] shadow-[inset_0_0_0_1px_#c13515]' : 'border-[#b0b0b0] focus-within:border-[#222222] focus-within:shadow-[inset_0_0_0_1px_#222222]', // taste-skill-ignore : champ de saisie
].join(' ');

export function Field({ id, label, value, onChange, type = 'text', autoComplete, inputMode, error, autoFocus, min, max, suffix, placeholder, maxLength }: FieldProps) {
  return (
    <div>
      <div className={fieldFrame(error)}>
        <label htmlFor={id} className="pointer-events-none absolute left-3 top-2 text-[12px] font-medium text-[#6a6a6a]">{label}</label>
        <input
          id={id}
          type={type}
          value={value}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          inputMode={inputMode}
          min={min}
          max={max}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className={`h-14 w-full rounded-lg bg-transparent px-3 pb-2 pt-6 text-[16px] text-[#222222] outline-none placeholder:text-[#b0b0b0] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${suffix ? 'pr-16' : ''}`}
        />
        {suffix && <span className="pointer-events-none absolute bottom-2.5 right-3 text-[14px] font-medium text-[#6a6a6a]">{suffix}</span>}
      </div>
      {error && <p className="mt-1.5 text-[13px] text-[#c13515]">{error}</p>}
    </div>
  );
}

export function TextArea({ id, label, value, onChange, rows = 4, error, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; rows?: number; error?: string | null; placeholder?: string;
}) {
  return (
    <div>
      <div className={fieldFrame(error)}>
        <label htmlFor={id} className="pointer-events-none absolute left-3 top-2 text-[12px] font-medium text-[#6a6a6a]">{label}</label>
        <textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-none rounded-lg bg-transparent px-3 pb-2 pt-7 text-[16px] text-[#222222] outline-none placeholder:text-[#b0b0b0]"
        />
      </div>
      {error && <p className="mt-1.5 text-[13px] text-[#c13515]">{error}</p>}
    </div>
  );
}

export function SelectField({ id, label, value, onChange, options, error }: {
  id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; error?: string | null;
}) {
  return (
    <div>
      <div className={fieldFrame(error)}>
        <label htmlFor={id} className="pointer-events-none absolute left-3 top-2 text-[12px] font-medium text-[#6a6a6a]">{label}</label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 w-full cursor-pointer appearance-none rounded-lg bg-transparent px-3 pb-2 pt-6 text-[16px] text-[#222222] outline-none"
        >
          <option value="">Choisir…</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {error && <p className="mt-1.5 text-[13px] text-[#c13515]">{error}</p>}
    </div>
  );
}

/* Case à cocher (consentements, confirmations). */
export function CheckRow({ checked, onChange, children, id }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-[14px] bg-[#f7f7f7] p-4">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={[
          'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-[#222222] peer-focus-visible:ring-offset-2',
          checked ? 'border-[#222222] bg-[#222222] text-white' : 'border-[#b0b0b0] bg-white text-transparent', // taste-skill-ignore : case à cocher
        ].join(' ')}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <span className="text-[15px] leading-snug text-[#222222]">{children}</span>
    </label>
  );
}

/* Rappel des réponses, cliquable pour revenir à la question. */
export function AnswerChips({ items }: { items: { label: string; onClick: () => void; icon?: LucideIcon }[] }) {
  const shown = items.filter((c) => c.label);
  if (!shown.length) return null;
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {shown.map((c, i) => (
        <button key={i} type="button" onClick={c.onClick}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#f2f2f2] px-3 py-1.5 text-[14px] font-medium text-[#222222] transition-colors duration-200 hover:bg-[#e8e8e8]">
          {c.icon && <c.icon className="h-4 w-4" strokeWidth={1.8} />}{c.label}
        </button>
      ))}
    </div>
  );
}

export function Note({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warn' | 'ok' }) {
  const cls = tone === 'warn' ? 'bg-[#fff4ef] text-[#7a2a0c]' : tone === 'ok' ? 'bg-[#eef7f3] text-[#155A43]' : 'bg-[#f7f7f7] text-[#3f3f3f]';
  return <div className={`rounded-[14px] p-4 text-[15px] leading-relaxed ${cls}`}>{children}</div>;
}

export function ConsentNote() {
  return (
    <p className="mt-4 text-[13px] leading-[1.4] text-[#6a6a6a]">
      En continuant, tu acceptes de recevoir par e-mail nos conseils et nouvelles offres (désinscription en un clic).{' '}
      <Link to="/politique-confidentialite" className="cursor-pointer font-medium text-[#222222] underline">Politique de confidentialité</Link>
    </p>
  );
}

export function TrustLine({ children = 'Un service Immo-Rama, agence immobilière à Crissier depuis 2016.' }: { children?: React.ReactNode }) {
  return (
    <div className="mt-10 flex items-center gap-2 text-[15px] text-[#3f3f3f]">
      <ShieldCheck className="h-5 w-5 flex-none" strokeWidth={1.6} style={{ color: ACCENT }} />
      {children}
    </div>
  );
}

/* ---------- Barre d'action fixe : progression, retour, suivant ---------- */
export function FunnelBottomBar({ step, total, onBack, onNext, nextLabel = 'Suivant', nextDisabled = false, loading = false, showBack, width = 'max-w-xl' }: {
  step: number; total: number; onBack?: () => void; onNext: () => void; nextLabel?: React.ReactNode;
  nextDisabled?: boolean; loading?: boolean; showBack?: boolean; width?: string;
}) {
  const back = showBack ?? step > 0;
  const disabled = nextDisabled || loading;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white">
      <div className="flex h-1.5 w-full gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-label="Progression">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="h-full flex-1 bg-[#ebebeb]">
            <div className="h-full bg-[#222222] transition-[width] duration-300 ease-out" style={{ width: i < step ? '100%' : i === step ? '40%' : '0%' }} />
          </div>
        ))}
      </div>
      <div className={`mx-auto flex ${width} items-center justify-between px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4`}>
        {back && onBack ? (
          <button type="button" onClick={onBack}
            className="inline-flex h-12 cursor-pointer items-center gap-1 rounded-lg px-2 text-[16px] font-semibold text-[#222222] underline underline-offset-4 transition-colors duration-200 hover:bg-[#f7f7f7]">
            <ChevronLeft className="h-5 w-5" /> Retour
          </button>
        ) : <span />}
        <PrimaryButton onClick={onNext} disabled={disabled} loading={loading}>{nextLabel}</PrimaryButton>
      </div>
    </div>
  );
}

export function PrimaryButton({ onClick, disabled = false, loading = false, children, type = 'button', full = false }: {
  onClick?: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode; type?: 'button' | 'submit'; full?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'inline-flex h-12 min-w-[150px] cursor-pointer items-center justify-center gap-2 rounded-lg px-6 text-[16px] font-medium text-white transition-colors duration-200',
        full ? 'w-full' : '',
        disabled && !loading ? 'cursor-not-allowed bg-[#ebebeb] !text-[#6a6a6a]' : 'bg-[#1F7A5C] hover:bg-[#1A6B50] active:bg-[#155A43]',
      ].join(' ')}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
    </button>
  );
}

/* Écran de fin (merci) commun. */
export function DoneScreen({ title, children, cta }: { title: string; children: React.ReactNode; cta?: React.ReactNode }) {
  return (
    <FunnelPage>
      <FunnelHeader label="" />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: ACCENT }}>
            <Check className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[#222222]">{title}</h1>
          <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-[#3f3f3f]">{children}</div>
          {cta && <div className="mt-8">{cta}</div>}
        </motion.div>
      </main>
    </FunnelPage>
  );
}

/* ---------- Bouton secondaire (lien souligné) ---------- */
export function SecondaryButton({ onClick, children, type = 'button', disabled = false }: {
  onClick?: () => void; children: React.ReactNode; type?: 'button' | 'submit'; disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="inline-flex h-12 cursor-pointer items-center justify-center gap-1 rounded-lg px-3 text-[16px] font-semibold text-[#222222] underline underline-offset-4 transition-colors duration-200 hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-50">
      {children}
    </button>
  );
}

/* ---------- Fenêtre (feuille du bas sur mobile, fenêtre centrée sur ordinateur) ---------- */
export function SheetDialog({ open, onOpenChange, title, description, icon, children, footer, wide = false }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: React.ReactNode; description?: React.ReactNode;
  icon?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`funnel-skin max-h-[90vh] gap-0 max-sm:pt-3 overflow-y-auto border-0 bg-white p-0 text-[#222222] ${wide ? 'sm:max-w-[560px]' : 'sm:max-w-[480px]'} sm:rounded-[14px]`}
        style={{ fontFamily: FUNNEL_FONT }}
      >
        <div className="px-6 pb-2 pt-6">
          {icon && <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f7f7] text-[#222222]">{icon}</span>}
          <DialogTitle className="pr-8 text-[22px] font-semibold leading-tight tracking-[-0.2px] text-[#222222]">{title}</DialogTitle>
          {description
            ? <DialogDescription className="mt-1.5 text-[15px] leading-snug text-[#3f3f3f]">{description}</DialogDescription>
            : <DialogDescription className="sr-only">{typeof title === 'string' ? title : ''}</DialogDescription>}
        </div>
        {children ? <div className="px-6 py-4">{children}</div> : <div className="h-2" />}
        {footer && (
          <div className="sticky bottom-0 flex flex-col-reverse gap-2 bg-white px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 sm:flex-row sm:items-center sm:justify-between">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Page simple centrée (liens reçus par e-mail, erreurs) ---------- */
export function FunnelCardPage({ children }: { children: React.ReactNode }) {
  return (
    <FunnelPage>
      <FunnelHeader label="" />
      <main className="mx-auto max-w-md px-4 pb-16 pt-8">{children}</main>
    </FunnelPage>
  );
}

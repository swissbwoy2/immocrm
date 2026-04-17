import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          {/* Logo */}
          <div className="relative h-20 w-20 rounded-full bg-card shadow-lg flex items-center justify-center animate-pulse">
            <img
              src={logoImmoRama}
              alt="Logisorama by Immo-rama.ch"
              className="h-14 w-14 object-contain"
              fetchPriority="high"
            />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-semibold text-base text-foreground">Logisorama</span>
          <span className="text-[11px] text-muted-foreground tracking-wide">by Immo-rama.ch</span>
        </div>
        {/* Subtle progress dots */}
        <div className="flex gap-1.5 mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
    </div>
  );
}

import { Gift, ShieldCheck } from 'lucide-react';

export function LandingGuaranteeBanner() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="relative rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 p-5 md:p-6 flex flex-col gap-3">
        <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-primary/10 border border-primary/40">
          <Gift className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-bold tracking-widest text-primary uppercase">
            Garantie 90 jours
          </span>
        </div>

        <h2 className="text-lg md:text-2xl font-bold text-foreground leading-tight max-w-xl">
          Remboursement complet sans succès au bout de{' '}
          <span className="text-primary">90 jours</span> de recherche
        </h2>

        <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>
            Paiement rapide par <strong className="text-foreground">facture QR</strong> ou{' '}
            <strong className="text-foreground">Twint</strong> via{' '}
            <a href="tel:+41764839199" className="text-primary underline underline-offset-2">
              076 483 91 99
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

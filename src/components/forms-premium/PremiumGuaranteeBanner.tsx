import { Gift, ShieldCheck } from 'lucide-react';
import { BorderBeam } from '@/components/public-site/magic/BorderBeam';
import guaranteeImg from '@/assets/guarantee-keys-couple.jpg';

export function PremiumGuaranteeBanner() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-6">
      <div className="relative rounded-2xl overflow-hidden border border-[hsl(38_45%_48%/0.25)] shadow-[0_10px_40px_-10px_hsl(38_45%_48%/0.3)]">
        <BorderBeam duration={10} colorFrom="hsl(38 55% 65%)" colorTo="hsl(28 35% 38%)" />

        {/* Background image */}
        <img
          src={guaranteeImg}
          alt="Couple recevant les clés de leur nouveau logement"
          loading="lazy"
          width={1600}
          height={640}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark gold overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(30_15%_8%/0.95)] via-[hsl(30_15%_8%/0.75)] to-[hsl(30_15%_8%/0.45)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(30_15%_8%/0.6)] to-transparent" />

        {/* Content */}
        <div className="relative z-10 p-5 md:p-7 flex flex-col gap-3 min-h-[180px] md:min-h-[200px]">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-[hsl(38_45%_48%/0.18)] border border-[hsl(38_55%_65%/0.4)] backdrop-blur-sm">
            <Gift className="h-3.5 w-3.5 text-[hsl(38_55%_65%)]" />
            <span className="text-[11px] font-bold tracking-widest text-[hsl(38_55%_65%)] uppercase">
              Garantie 90 jours
            </span>
          </div>

          <h2 className="text-lg md:text-2xl font-bold text-white leading-tight max-w-xl">
            Remboursement complet sans succès au bout de{' '}
            <span className="text-[hsl(38_55%_65%)]">90 jours</span> de recherche
          </h2>

          <div className="flex items-center gap-2 text-xs md:text-sm text-[hsl(40_25%_80%)]">
            <ShieldCheck className="h-4 w-4 text-[hsl(38_55%_65%)] shrink-0" />
            <span>
              Paiement rapide par <strong className="text-white">facture QR</strong> ou{' '}
              <strong className="text-white">Twint</strong> via{' '}
              <a href="tel:+41764839199" className="text-[hsl(38_55%_65%)] underline underline-offset-2">
                076 483 91 99
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

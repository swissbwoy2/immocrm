import React from 'react';
import { Home, Ruler, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { AddressLink } from '@/components/AddressLink';

interface PremiumOffreCardProps {
  offre: any;
  className?: string;
  mode?: 'location' | 'achat';
}

const STAT_TILE = 'p-3 rounded-xl text-center min-w-0 bg-muted/60';

/** Carte d'offre sobre affichée sous un message (même données qu'avant). */
export const PremiumOffreCard: React.FC<PremiumOffreCardProps> = ({ offre, className, mode = 'location' }) => {
  const isAchat = mode === 'achat';
  return (
    <div
      className={cn(
        'mt-2 p-4 rounded-2xl overflow-hidden w-full max-w-full min-w-0 box-border',
        'border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.04)]',
        className
      )}
    >
      <div className="min-w-0">
        {/* En-tête */}
        <div className="flex items-start gap-3 mb-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Home className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <AddressLink
              address={offre.adresse}
              className="text-base font-semibold text-foreground block break-words [overflow-wrap:anywhere]"
              showIcon={false}
            />
            <div className="text-muted-foreground text-xs mt-0.5 break-words">
              <span>{offre.type_bien || 'Appartement'}</span>
            </div>
          </div>
        </div>

        {/* Chiffres clés */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 min-w-0">
          <div className={STAT_TILE}>
            <p className="text-base sm:text-lg font-semibold text-foreground break-words [overflow-wrap:anywhere]">
              {offre.prix?.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground break-words">{isAchat ? 'CHF prix de vente' : 'CHF/mois'}</p>
          </div>

          {offre.surface && (
            <div className={STAT_TILE}>
              <div className="flex items-center justify-center gap-1">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">{offre.surface}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">m²</p>
            </div>
          )}

          {offre.pieces && (
            <div className={STAT_TILE}>
              <div className="flex items-center justify-center gap-1">
                <DoorOpen className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">{offre.pieces}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">pièces</p>
            </div>
          )}
        </div>

        {isAchat && (
          <div className="text-xs text-muted-foreground bg-muted/60 rounded-xl px-3 py-2 mb-3">
            Validation bancaire recommandée avant offre d'achat. Planifiez une visite ou demandez une analyse du bien.
          </div>
        )}

        {/* Aperçu du lien */}
        {offre.lien_annonce && (
          <div className="mt-3 min-w-0 max-w-full overflow-hidden">
            <LinkPreviewCard url={offre.lien_annonce} />
          </div>
        )}
      </div>
    </div>
  );
};

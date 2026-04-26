import * as React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Diamond } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PremiumPricingCardProps {
  title: string;
  value: string;
  valueDescription?: string;
  description: string;
  features?: string[];
  imageSrc: string;
  imageAlt: string;
  highlight?: boolean;
  className?: string;
}

const cardVariants = {
  initial: { y: 0, boxShadow: '0px 0px 0px 0px hsl(38 45% 48% / 0)' },
  hover: {
    y: -6,
    boxShadow: '0px 18px 35px -8px hsl(38 45% 48% / 0.18)',
    transition: { type: 'spring' as const, stiffness: 300, damping: 22 },
  },
};

const imageVariants = {
  initial: { scale: 1, rotate: 0 },
  hover: {
    scale: 1.1,
    rotate: -5,
    transition: { type: 'spring' as const, stiffness: 300, damping: 18 },
  },
};

export const PremiumPricingCard = React.forwardRef<HTMLDivElement, PremiumPricingCardProps>(
  ({ title, value, valueDescription, description, features, imageSrc, imageAlt, highlight = false, className }, ref) => {
    const FeatureIcon = highlight ? Sparkles : Diamond;

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="initial"
        whileHover="hover"
        className={cn(
          'relative rounded-2xl border p-6 md:p-8 flex flex-col gap-5 h-full overflow-hidden backdrop-blur-sm transition-colors',
          highlight
            ? 'bg-gradient-to-b from-[hsl(38_45%_48%/0.08)] to-[hsl(38_45%_48%/0.02)] border-[hsl(38_45%_48%/0.5)] luxury-border-pulse'
            : 'bg-card/60 border-border/50 hover:border-[hsl(38_45%_48%/0.35)]',
          className,
        )}
      >
        {highlight && (
          <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[hsl(38_45%_44%)] to-[hsl(28_35%_38%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[hsl(40_35%_98%)] shadow-md">
            <Sparkles className="h-3 w-3" />
            Rémunération
          </span>
        )}

        {/* Header: titre + image flottante */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              {title}
            </p>
            <p
              className={cn(
                'text-3xl md:text-4xl font-bold font-serif leading-tight',
                highlight ? 'luxury-gradient-text' : 'text-foreground',
              )}
            >
              {value}
            </p>
            {valueDescription && (
              <p className="text-xs text-muted-foreground mt-1">{valueDescription}</p>
            )}
          </div>

          <motion.div variants={imageVariants} className="flex-shrink-0">
            <img
              src={imageSrc}
              alt={imageAlt}
              loading="lazy"
              width={96}
              height={96}
              className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-[0_8px_16px_rgba(184,134,49,0.25)]"
            />
          </motion.div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

        {/* Features */}
        {features && features.length > 0 && (
          <ul className="space-y-2.5 mt-auto pt-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85">
                <FeatureIcon
                  className={cn(
                    'h-4 w-4 flex-shrink-0 mt-0.5',
                    highlight ? 'text-[hsl(38_55%_52%)]' : 'text-[hsl(38_45%_48%)]',
                  )}
                  strokeWidth={highlight ? 2 : 1.75}
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    );
  },
);

PremiumPricingCard.displayName = 'PremiumPricingCard';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, MapPin, Ruler, DoorOpen, ChevronRight, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Offre {
  id: string;
  adresse?: string | null;
  prix?: number | null;
  pieces?: number | null;
  surface?: number | null;
  date_envoi?: string | null;
  lien_annonce?: string | null;
  statut?: string | null;
  titre?: string | null;
  type_bien?: string | null;
}

interface Props {
  offres: Offre[];
  onSeeAll: () => void;
  onOffreClick: (id: string) => void;
}

function OffrePreviewImage({ url }: { url?: string | null }) {
  const [img, setImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-link-preview', { body: { url } });
        if (cancelled) return;
        if (error || !data?.image_url) {
          setErrored(true);
        } else {
          setImg(data.image_url);
        }
      } catch {
        if (!cancelled) setErrored(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return <div className="w-full h-full bg-gradient-to-br from-muted to-muted/40 animate-pulse" />;
  }
  if (errored || !img) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
        <Home className="w-8 h-8 text-primary/40" />
      </div>
    );
  }
  return (
    <img
      src={img}
      alt=""
      loading="lazy"
      onError={() => setErrored(true)}
      className="w-full h-full object-cover"
    />
  );
}

export function DernieresOffresKPI({ offres, onSeeAll, onOffreClick }: Props) {
  const recent = [...offres]
    .sort((a, b) => (new Date(b.date_envoi || 0).getTime()) - (new Date(a.date_envoi || 0).getTime()))
    .slice(0, 3);

  const newCount = offres.filter(o => o.statut === 'envoyee').length;

  return (
    <section className="relative">
      <div className="flex items-end justify-between mb-3 px-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Dernières offres</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {offres.length} reçue{offres.length > 1 ? 's' : ''}
            {newCount > 0 && <span className="text-primary font-semibold"> · {newCount} nouvelle{newCount > 1 ? 's' : ''}</span>}
          </p>
        </div>
        {offres.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onSeeAll} className="text-primary -mr-2">
            Voir tout
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <Home className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucune offre pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((offre, i) => {
            const isNew = offre.statut === 'envoyee';
            return (
              <motion.button
                key={offre.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onOffreClick(offre.id)}
                className={cn(
                  'relative w-full text-left overflow-hidden rounded-2xl',
                  'bg-card/80 backdrop-blur-sm border border-border/60',
                  'hover:border-primary/40 hover:shadow-[0_8px_30px_hsl(217_91%_60%/0.12)]',
                  'transition-all duration-300 group flex'
                )}
              >
                <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 overflow-hidden bg-muted relative">
                  <OffrePreviewImage url={offre.lien_annonce} />
                </div>

                <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-foreground leading-tight line-clamp-2 text-sm sm:text-base">
                        {offre.adresse || offre.titre || 'Bien immobilier'}
                      </h3>
                      {isNew && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-5 shrink-0">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                      {offre.pieces && (
                        <span className="inline-flex items-center gap-1">
                          <DoorOpen className="w-3 h-3" /> {offre.pieces} p.
                        </span>
                      )}
                      {offre.surface && (
                        <span className="inline-flex items-center gap-1">
                          <Ruler className="w-3 h-3" /> {offre.surface} m²
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <div className="text-base sm:text-lg font-bold text-primary tabular-nums">
                      {offre.prix ? `CHF ${offre.prix.toLocaleString('fr-CH')}` : '—'}
                      <span className="text-xs text-muted-foreground font-normal ml-1">/mois</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </section>
  );
}

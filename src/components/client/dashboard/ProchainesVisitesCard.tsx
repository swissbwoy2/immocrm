import { motion } from 'framer-motion';
import { Calendar, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Visite {
  id: string;
  date_visite: string;
  statut: string;
  offres?: { adresse?: string | null; pieces?: number | null; type_bien?: string | null } | null;
}

interface Props {
  visites: Visite[];
  onSeeAll: () => void;
  onVisiteClick?: (id: string) => void;
}

const MOIS = ['JAN','FÉV','MAR','AVR','MAI','JUIN','JUIL','AOÛT','SEP','OCT','NOV','DÉC'];

export function ProchainesVisitesCard({ visites, onSeeAll, onVisiteClick }: Props) {
  const now = new Date();
  const upcoming = visites
    .filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= now)
    .slice(0, 3);

  return (
    <section className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Prochaines visites</h2>
            <p className="text-xs text-muted-foreground">{upcoming.length} à venir</p>
          </div>
        </div>
        {upcoming.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onSeeAll} className="text-primary">
            Tout voir
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {upcoming.length === 0 ? (
        <div className="p-8 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucune visite planifiée</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/40">
          {upcoming.map((v, i) => {
            const d = new Date(v.date_visite);
            const day = d.getDate().toString().padStart(2, '0');
            const month = MOIS[d.getMonth()];
            const time = d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });
            return (
              <motion.li
                key={v.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
              >
                <button
                  onClick={() => onVisiteClick?.(v.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-primary/5 transition-colors text-left group"
                >
                  <div className="flex flex-col items-center justify-center w-14 shrink-0 rounded-xl bg-primary/10 py-2">
                    <span className="text-xl font-black text-primary leading-none">{day}</span>
                    <span className="text-[10px] font-bold text-primary/70 mt-0.5">{month}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate text-sm">
                      {v.offres?.adresse || 'Visite programmée'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {v.offres?.type_bien || 'Logement'}
                      {v.offres?.pieces && ` · ${v.offres.pieces} p.`}
                      {' · '}{time}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

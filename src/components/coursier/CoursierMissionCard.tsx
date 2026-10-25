import type React from 'react';
import { AlertTriangle, Banknote, CheckCircle, ChevronRight, Clock, FileText, Home, Maximize2, Navigation, UserCog, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressLink } from '@/components/AddressLink';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import {
  TON_TEXTE, delaiVisite, heureLabel, jourLabel, lienItineraire, prochaineActionCoursier, retardCompteRendu,
  type EtapeCoursier,
} from './coursierModel';

export type MissionCarte = {
  id: string;
  adresse: string;
  date_visite: string;
  date_visite_fin?: string | null;
  _group: any[];
  _count: number;
  _delegues?: number;
  offres?: { pieces?: number | null; surface?: number | null; prix?: number | null } | null;
  agents?: { profiles?: { prenom?: string | null; nom?: string | null } | null } | null;
  [k: string]: any;
};

interface Props {
  mission: MissionCarte;
  etape: EtapeCoursier;
  onOpen?: (m: MissionCarte) => void;
  onAccept?: (m: MissionCarte) => void;
  onTerminer?: (m: MissionCarte) => void;
  /** Bouton d'appel vidéo (VisitLiveButton) pour une mission en cours. */
  live?: React.ReactNode;
  acceptLabel?: string;
}

/**
 * Une mission de visite = une carte, pensée pour le téléphone :
 * jour et heure en grand, adresse, prochaine action colorée, boutons de 48 px en bas de carte.
 */
export function CoursierMissionCard({ mission: m, etape, onOpen, onAccept, onTerminer, live, acceptLabel = 'Accepter la mission' }: Props) {
  const next = prochaineActionCoursier(etape, m);
  const delai = delaiVisite(m.date_visite);
  const retard = etape === 'a_rendre' ? retardCompteRendu(m) : null;
  const stop = (fn?: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn?.(); };

  return (
    <article
      className={cn(DASH_CARD, 'flex flex-col gap-3 p-4 md:p-5', onOpen && 'cursor-pointer', retard?.enRetard && 'ring-1 ring-amber-500/40')}
      onClick={onOpen ? () => onOpen(m) : undefined}
    >
      {/* Quand */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{jourLabel(m.date_visite)}</p>
          <p className="text-xl font-semibold tabular-nums text-foreground">{heureLabel(m)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {etape === 'terminees' ? (
            <DashBadge tone="success">Terminée</DashBadge>
          ) : etape === 'a_rendre' && retard ? (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              retard.enRetard ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground',
            )}>
              <Clock className="h-3 w-3" /> Visite terminée {retard.label}
            </span>
          ) : (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              delai.tone === 'danger' || delai.tone === 'warning' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground',
            )}>
              <Clock className="h-3 w-3" /> {delai.label}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {m._count} client{m._count > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Où */}
      <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
        <AddressLink address={m.adresse} className="text-[15px] font-semibold" truncate />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {etape === 'disponibles' && (
          <DashBadge tone="primary"><Users className="mr-1 h-3 w-3" />{m._delegues || m._count} client(s) à visiter (délégué)</DashBadge>
        )}
        {m.offres?.pieces && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1"><Home className="h-3 w-3" />{m.offres.pieces}p</span>}
        {m.offres?.surface && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1"><Maximize2 className="h-3 w-3" />{m.offres.surface}m²</span>}
        {m.offres?.prix && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1"><Banknote className="h-3 w-3" />{Number(m.offres.prix).toLocaleString('fr-CH')} CHF</span>}
        {m.agents?.profiles && (
          <span className="inline-flex items-center gap-1"><UserCog className="h-3 w-3" />Agent : {m.agents.profiles.prenom} {m.agents.profiles.nom}</span>
        )}
      </div>

      {/* Prochaine action */}
      <p className={cn('flex items-start gap-1.5 text-sm font-semibold', TON_TEXTE[next.tone])}>
        {next.tone === 'warning' || next.tone === 'danger'
          ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          : <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />}
        {next.texte}
      </p>

      {/* Actions — en bas de carte, zone du pouce */}
      <div className="mt-auto space-y-2 pt-1">
        {etape === 'disponibles' && onAccept && (
          <Button onClick={stop(() => onAccept(m))} className="h-12 w-full rounded-full">
            <CheckCircle className="mr-2 h-4 w-4" /> {acceptLabel}
          </Button>
        )}

        {etape === 'mes_missions' && (
          <>
            {live && <div onClick={(e) => e.stopPropagation()}>{live}</div>}
            <div className={cn('grid gap-2', onTerminer ? 'grid-cols-2' : 'grid-cols-1')}>
              <Button asChild variant="outline" className="h-12 rounded-full">
                <a href={lienItineraire(m.adresse)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <Navigation className="mr-2 h-4 w-4" /> Itinéraire
                </a>
              </Button>
              {onTerminer && (
                <Button onClick={stop(() => onTerminer(m))} className="h-12 rounded-full">
                  <CheckCircle className="mr-2 h-4 w-4" /> Terminer la visite
                </Button>
              )}
            </div>
          </>
        )}

        {etape === 'a_rendre' && onTerminer && (
          <Button onClick={stop(() => onTerminer(m))} className="h-12 w-full rounded-full">
            <FileText className="mr-2 h-4 w-4" /> Terminer la visite
          </Button>
        )}

        {onOpen && (
          <Button variant="ghost" onClick={stop(() => onOpen(m))} className="h-11 w-full rounded-full text-sm">
            Détails et contacts <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </article>
  );
}

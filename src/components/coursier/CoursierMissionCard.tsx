import type React from 'react';
import { AlertTriangle, Banknote, CheckCircle, ChevronRight, Clock, FileText, Home, Maximize2, Navigation, UserCog, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressLink } from '@/components/AddressLink';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import {
  STATUT_ETAPE, TON_TEXTE, delaiVisite, formatChf, heureLabel, jourLabel, lienItineraire, prochaineActionCoursier, retardCompteRendu,
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
  const statut = STATUT_ETAPE[etape];
  const stop = (fn?: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn?.(); };
  const urgent = delai.tone === 'danger' || delai.tone === 'warning';
  /** Visite déjà commencée : l'action principale devient « Terminer la visite ». */
  const enCours = etape === 'mes_missions' && delai.passee && !!onTerminer;

  const itineraire = (cls: string, variant: 'default' | 'outline') => (
    <Button asChild variant={variant} className={cls}>
      <a href={lienItineraire(m.adresse)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        <Navigation className="mr-2 h-4 w-4" /> Itinéraire
      </a>
    </Button>
  );

  return (
    <article
      className={cn(DASH_CARD, 'flex min-w-0 flex-col gap-3 p-4 md:p-5', onOpen && 'cursor-pointer', retard?.enRetard && 'ring-1 ring-amber-500/40')}
      onClick={onOpen ? () => onOpen(m) : undefined}
    >
      {/* Statut + délai */}
      <div className="flex flex-wrap items-center gap-1.5">
        <DashBadge tone={etape === 'a_rendre' && retard?.enRetard ? 'danger' : statut.tone}>{statut.label}</DashBadge>
        {etape === 'a_rendre' && retard ? (
          <DashBadge tone={retard.enRetard ? 'warning' : 'muted'}><Clock className="mr-1 h-3 w-3" />Visite terminée {retard.label}</DashBadge>
        ) : etape !== 'terminees' ? (
          <DashBadge tone={urgent ? 'warning' : 'muted'}><Clock className="mr-1 h-3 w-3" />{delai.label}</DashBadge>
        ) : null}
      </div>

      {/* Quand */}
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">{jourLabel(m.date_visite)}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{heureLabel(m)}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" /> {m._count} client{m._count > 1 ? 's' : ''}
        </span>
      </div>

      {/* Où */}
      <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
        <AddressLink address={m.adresse} className="text-[15px] font-semibold" truncate />
      </div>

      {/* Le bien */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {etape === 'disponibles' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
            <Users className="h-3.5 w-3.5" />{m._delegues || m._count} client{(m._delegues || m._count) > 1 ? 's' : ''} à visiter
          </span>
        )}
        {m.offres?.pieces && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><Home className="h-3.5 w-3.5" />{m.offres.pieces} p.</span>}
        {m.offres?.surface && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><Maximize2 className="h-3.5 w-3.5" />{m.offres.surface} m²</span>}
        {m.offres?.prix && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><Banknote className="h-3.5 w-3.5" />{formatChf(m.offres.prix)} / mois</span>}
      </div>
      {m.agents?.profiles && (
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <UserCog className="h-4 w-4 shrink-0" /><span className="truncate">Agent : {m.agents.profiles.prenom} {m.agents.profiles.nom}</span>
        </p>
      )}

      {/* Prochaine action */}
      <p className={cn('flex items-start gap-1.5 text-sm font-semibold', TON_TEXTE[next.tone])}>
        {next.tone === 'warning' || next.tone === 'danger'
          ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          : <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />}
        {next.texte}
      </p>

      {/* Actions — une action principale, en bas de carte (zone du pouce) */}
      <div className="mt-auto space-y-2 pt-1">
        {etape === 'disponibles' && onAccept && (
          <Button onClick={stop(() => onAccept(m))} className="h-12 w-full">
            <CheckCircle className="mr-2 h-4 w-4" /> {acceptLabel}
          </Button>
        )}

        {etape === 'mes_missions' && (
          <>
            {enCours ? (
              <Button onClick={stop(() => onTerminer?.(m))} className="h-12 w-full">
                <FileText className="mr-2 h-4 w-4" /> Terminer la visite
              </Button>
            ) : itineraire('h-12 w-full', 'default')}
            {live && <div onClick={(e) => e.stopPropagation()}>{live}</div>}
          </>
        )}

        {etape === 'a_rendre' && onTerminer && (
          <Button onClick={stop(() => onTerminer(m))} className="h-12 w-full">
            <FileText className="mr-2 h-4 w-4" /> Rédiger le compte rendu
          </Button>
        )}

        {/* Actions secondaires : côte à côte quand il y en a deux */}
        {(() => {
          const sec: React.ReactNode[] = [];
          if (etape === 'mes_missions' && onTerminer && !enCours) {
            sec.push(
              <Button key="terminer" variant="outline" onClick={stop(() => onTerminer(m))} className="h-11 w-full px-3">
                <CheckCircle className="mr-1.5 h-4 w-4" /> Terminer
              </Button>,
            );
          }
          if (etape === 'mes_missions' && enCours) sec.push(<span key="itin" className="contents">{itineraire('h-11 w-full px-3', 'outline')}</span>);
          if (onOpen) {
            sec.push(
              <Button key="details" variant="ghost" onClick={stop(() => onOpen(m))} className="h-11 w-full px-3 text-sm">
                Détails et contacts <ChevronRight className="ml-1 h-4 w-4" />
              </Button>,
            );
          }
          if (sec.length === 0) return null;
          return <div className={cn('grid gap-2', sec.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>{sec}</div>;
        })()}
      </div>
    </article>
  );
}

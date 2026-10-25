import { useState } from 'react';
import {
  AlertCircle, Calendar, ChevronDown, FileArchive, FileText, Loader2, Pause, RefreshCw, RotateCcw,
  StopCircle, TrendingUp, Undo2, User, UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import { formatTimeRemaining } from '@/utils/calculations';
import { getMandatDates, mandatElapsedFor, mandatRemainingFor } from '@/utils/mandatDates';
import {
  SEUIL_BIENTOT, getMandateStatus, hasCancellationPending, hasRefundPending, isFrozenStatut, nomClient,
  peutRelancer, peutRenouveler, prochaineActionMandat, type Ton,
} from './mandatsModel';

const TON_TEXTE: Record<Ton, string> = {
  neutral: 'text-foreground',
  primary: 'text-primary',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
};

const PHASE_TON: Record<string, Ton> = { nouveau: 'primary', en_cours: 'muted', critique: 'warning', expire: 'danger' };

interface Props {
  client: any;
  agentName: string;
  renewed: boolean;
  latestRenewal: any | undefined;
  downloading: boolean;
  assembling: boolean;
  assemblyProgress: { step: string; current: number; total: number; percent: number } | null | undefined;
  relaunching: boolean;
  onOpenFiche: (client: any) => void;
  onViewMandat: (client: any) => void;
  onAssemble: (client: any) => void;
  onRenew: (client: any) => void;
  onRelaunch: (client: any) => void;
  onUpdateStatus: (client: any, statut: string) => void;
  onCancelRenewal: (client: any, renewal: any) => void;
}

/**
 * Un mandat = une carte. Mobile : tout empilé, boutons pleine largeur (44 px).
 * Grand écran : trois colonnes (client et recherche | échéance et prochaine action | actions).
 */
export function MandatCard({
  client, agentName, renewed, latestRenewal, downloading, assembling, assemblyProgress, relaunching,
  onOpenFiche, onViewMandat, onAssemble, onRenew, onRelaunch, onUpdateStatus, onCancelRenewal,
}: Props) {
  const [plus, setPlus] = useState(false);
  const isReloge = client.statut === 'reloge';
  const isSuspendu = client.statut === 'suspendu';
  const isStoppe = client.statut === 'stoppe';
  const isFrozen = isFrozenStatut(client.statut);

  const daysElapsed = mandatElapsedFor(client as any);
  const daysRemaining = mandatRemainingFor(client as any);
  const progress = isReloge ? 100 : Math.min((daysElapsed / 90) * 100, 100);
  const phase = getMandateStatus(daysElapsed);
  const next = prochaineActionMandat(client);
  const nom = nomClient(client);

  const progressBarColor = isReloge
    ? 'bg-emerald-500'
    : isSuspendu
      ? 'bg-amber-500'
      : isStoppe
        ? 'bg-destructive'
        : !isFrozen && daysRemaining <= 0
          ? 'bg-destructive'
          : !isFrozen && daysRemaining <= SEUIL_BIENTOT
            ? 'bg-amber-500'
            : undefined;

  const echeanceCls = isFrozen
    ? 'text-muted-foreground'
    : daysRemaining <= 0
      ? 'text-destructive'
      : daysRemaining <= SEUIL_BIENTOT
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-foreground';

  const relanceBtn = (primaire: boolean) => (
    <ConfirmDialog
      trigger={
        <Button
          variant={primaire ? 'default' : 'outline'}
          size="sm"
          className="h-11 w-full rounded-full lg:h-9"
          disabled={relaunching}
        >
          {relaunching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
          Relancer une nouvelle recherche (90 jours)
        </Button>
      }
      title="Relancer une nouvelle recherche"
      description={`Un nouveau cycle de 90 jours va démarrer pour ${client.profiles?.prenom} ${client.profiles?.nom}, et une nouvelle facture d'acompte CHF 300.- sera envoyée par email. Continuer ?`}
      confirmText="Relancer"
      onConfirm={() => onRelaunch(client)}
    />
  );

  const renewBtn = (primaire: boolean) => (
    <Button
      onClick={() => onRenew(client)}
      variant={primaire ? 'default' : 'outline'}
      size="sm"
      className="h-11 w-full rounded-full lg:h-9"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Renouveler le mandat
    </Button>
  );

  const ficheBtn = (primaire: boolean, label = 'Fiche client') => (
    <Button
      onClick={() => onOpenFiche(client)}
      variant={primaire ? 'default' : 'outline'}
      size="sm"
      className="h-11 w-full rounded-full lg:h-9"
    >
      <UserRound className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );

  // Bouton principal = prochaine action ; les autres actions existantes restent juste en dessous.
  const primaire =
    next.kind === 'renouveler' && peutRenouveler(client) ? renewBtn(true)
      : next.kind === 'relancer' && peutRelancer(client) ? relanceBtn(true)
        : ficheBtn(true, next.bouton);

  return (
    <article className={cn(DASH_CARD, 'p-4 md:p-5', isFrozen && 'bg-muted/20')}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_240px] lg:items-start lg:gap-6">
        {/* Colonne 1 : client, agent, recherche */}
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenFiche(client)}
              className="min-w-0 truncate text-left text-base font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {nom}
            </button>
            {isReloge ? (
              <DashBadge tone="success">Relogé</DashBadge>
            ) : isSuspendu ? (
              <DashBadge tone="warning">Suspendu</DashBadge>
            ) : isStoppe ? (
              <DashBadge tone="danger">Stoppé</DashBadge>
            ) : (
              <DashBadge tone={PHASE_TON[phase.key] ?? 'muted'}>{phase.label}</DashBadge>
            )}
            {renewed && !isFrozen && <DashBadge tone="success">Renouvelé</DashBadge>}
            {hasRefundPending(client) && <DashBadge tone="danger">Remboursement demandé</DashBadge>}
            {hasCancellationPending(client) && <DashBadge tone="danger">Résiliation demandée</DashBadge>}
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" /> Agent: {agentName}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Recherche:</span> {client.type_bien || 'N/A'} {client.pieces || '-'} pièces
            <span className="mx-1.5">·</span>
            <span className="font-medium text-foreground">Budget:</span> CHF {client.budget_max?.toLocaleString() || 'N/A'}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Début: {(getMandatDates(client as any).cycleStart ?? new Date(client.date_ajout || client.created_at)).toLocaleDateString('fr-CH')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Split: {client.commission_split}%
            </span>
          </div>
        </div>

        {/* Colonne 2 : échéance, progression, prochaine action */}
        <div className="min-w-0 space-y-2.5">
          <div className="flex items-end justify-between gap-3">
            {isFrozen ? (
              <p className={cn('text-lg font-semibold', echeanceCls)}>{isReloge ? 'Relogé' : isSuspendu ? 'Suspendu' : 'Stoppé'}</p>
            ) : (
              <div>
                <p className={cn('text-2xl font-semibold tabular-nums', echeanceCls)}>J+{Math.floor(daysElapsed)}</p>
                <p className={cn('text-xs', daysRemaining <= SEUIL_BIENTOT ? echeanceCls : 'text-muted-foreground')}>
                  {daysRemaining > 0 ? `Fin dans ${formatTimeRemaining(daysRemaining)}` : 'Expiré'}
                </p>
              </div>
            )}
            <span className="text-xs text-muted-foreground tabular-nums">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" indicatorClassName={progressBarColor} aria-label="Progression du mandat" />
          <p className={cn('flex items-start gap-1.5 text-sm font-medium', TON_TEXTE[next.tone])}>
            {(next.tone === 'danger' || next.tone === 'warning') && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {next.texte}
          </p>
          {!isFrozen && daysElapsed > 60 && (
            <p className="text-xs text-destructive">Proche expiration</p>
          )}
        </div>

        {/* Colonne 3 : actions */}
        <div className="space-y-2">
          {primaire}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onViewMandat(client)}
              variant="outline"
              size="sm"
              className="h-11 rounded-full lg:h-9"
              disabled={downloading || assembling}
            >
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Contrat
            </Button>
            <Button
              onClick={() => onAssemble(client)}
              variant="outline"
              size="sm"
              className="h-11 rounded-full lg:h-9"
              disabled={assembling}
            >
              {assembling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {assemblyProgress ? `${Math.round(assemblyProgress.percent)}%` : 'Assemblage...'}
                </>
              ) : (
                <>
                  <FileArchive className="mr-2 h-4 w-4" />
                  Mandat complet
                </>
              )}
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setPlus((o) => !o)}
            aria-expanded={plus}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1 rounded-full text-sm font-medium text-foreground hover:bg-muted lg:min-h-[36px]"
          >
            Autres actions <ChevronDown className={cn('h-4 w-4 transition-transform', plus && 'rotate-180')} />
          </button>

          {plus && (
            <div className="grid gap-2">
              {next.kind !== 'fiche' && ficheBtn(false)}
              {next.kind !== 'renouveler' && peutRenouveler(client) && renewBtn(false)}
              {next.kind !== 'relancer' && peutRelancer(client) && relanceBtn(false)}
              {!isFrozen && latestRenewal && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 w-full rounded-full text-muted-foreground hover:text-destructive lg:h-9"
                  onClick={() => onCancelRenewal(client, latestRenewal)}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  Annuler renouvellement
                </Button>
              )}
              {!isFrozen && client.statut !== 'reloge' && (
                <div className="grid grid-cols-2 gap-2">
                  <ConfirmDialog
                    trigger={
                      <Button variant="outline" size="sm" className="h-11 w-full rounded-full text-amber-700 dark:text-amber-400 lg:h-9">
                        <Pause className="mr-2 h-4 w-4" />
                        Suspendre
                      </Button>
                    }
                    title="Suspendre le mandat"
                    description={`Voulez-vous suspendre le mandat de ${client.profiles?.prenom} ${client.profiles?.nom} ? La progression sera figée.`}
                    confirmText="Suspendre"
                    variant="default"
                    onConfirm={() => onUpdateStatus(client, 'suspendu')}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button variant="outline" size="sm" className="h-11 w-full rounded-full text-destructive lg:h-9">
                        <StopCircle className="mr-2 h-4 w-4" />
                        Stopper
                      </Button>
                    }
                    title="Stopper le mandat"
                    description={`Voulez-vous stopper définitivement le mandat de ${client.profiles?.prenom} ${client.profiles?.nom} ? Cette action est irréversible.`}
                    confirmText="Stopper le mandat"
                    variant="destructive"
                    onConfirm={() => onUpdateStatus(client, 'stoppe')}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progression de l'assemblage du mandat complet */}
      {assembling && assemblyProgress && (
        <div className="mt-3 space-y-1 border-t border-border/70 pt-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{assemblyProgress.step}</span>
            <span>{assemblyProgress.current}/{assemblyProgress.total}</span>
          </div>
          <Progress value={assemblyProgress.percent} className="h-1.5" />
        </div>
      )}
    </article>
  );
}

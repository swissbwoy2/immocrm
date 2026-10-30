import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle, Check, CheckCircle2, ChevronDown, Clock, ExternalLink, FileText, Loader2, Mail,
  Paperclip, ShieldAlert, Trash2, UserRound, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import {
  CANAL, DOSSIER_STATUT, JOB_STATUS, PRIORITY_LABEL, attente, nomClient, prochaineAction,
  type Dossier, type Row, type Ton,
} from './postulationsModel';

/** Anneau de focus clavier commun (boutons texte, liens). */
const FOCUS = 'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const TON_TEXTE: Record<Ton, string> = {
  neutral: 'text-foreground',
  primary: 'text-primary',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
};

/** Frise compacte : Demande → Préparation → Dossier → Déposée. */
function Frise({ r }: { r: Row }) {
  const job = r._job?.status;
  const dos = r._dossier?.statut;
  const deposee = r.statut === 'candidature_deposee';
  const prepOk = deposee || !!dos || job === 'ready' || job === 'completed';
  const prepKo = !deposee && !dos && (job === 'blocked' || job === 'failed');
  const dosOk = deposee || dos === 'envoye' || dos === 'valide';
  const dosKo = !deposee && (dos === 'a_valider' || dos === 'erreur' || dos === 'refuse');
  const etapes: { label: string; etat: 'ok' | 'ko' | 'attente' }[] = [
    { label: 'Demande', etat: 'ok' },
    { label: 'Préparation', etat: prepOk ? 'ok' : prepKo ? 'ko' : 'attente' },
    { label: 'Dossier', etat: dosOk ? 'ok' : dosKo ? 'ko' : 'attente' },
    { label: 'Déposée', etat: deposee ? 'ok' : 'attente' },
  ];
  return (
    <ol className="flex items-center gap-1" aria-label="Avancement">
      {etapes.map((e, i) => (
        <li key={e.label} className="flex min-w-0 flex-1 items-center gap-1">
          <span className="sr-only">{`${e.label} : ${e.etat === 'ok' ? 'fait' : e.etat === 'ko' ? 'à vérifier' : 'en attente'}`}</span>
          <span
            aria-hidden="true"
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
              e.etat === 'ok' && 'bg-primary text-primary-foreground',
              e.etat === 'ko' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
              e.etat === 'attente' && 'border border-border bg-background text-muted-foreground',
            )}
            title={e.label}
          >
            {e.etat === 'ok' ? <Check className="h-3 w-3" /> : e.etat === 'ko' ? '!' : i + 1}
          </span>
          <span aria-hidden="true" className="hidden truncate text-[11px] text-muted-foreground sm:inline">{e.label}</span>
          {i < etapes.length - 1 && <span className={cn('h-px flex-1', e.etat === 'ok' ? 'bg-primary/50' : 'bg-border')} />}
        </li>
      ))}
    </ol>
  );
}

/** Bloc « dossier préparé » (routine Postulation + Surveillance), avec décision. */
export function DossierBloc({ d, busy, onDecider, compact }: {
  d: Dossier;
  busy: boolean;
  onDecider: (d: Dossier, statut: 'valide' | 'refuse') => void;
  compact?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const s = DOSSIER_STATUT[d.statut] ?? DOSSIER_STATUT.prepare;
  const pieces = Array.isArray(d.pieces) ? (d.pieces as unknown[]).length : 0;
  const decidable = d.statut === 'a_valider' || d.statut === 'erreur';
  return (
    <div className={cn('space-y-2', !compact && 'rounded-xl border border-border/70 p-3')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 text-muted-foreground" /> Dossier préparé
        </p>
        <DashBadge tone={s.tone}>{s.label}</DashBadge>
      </div>
      <p className="text-xs text-muted-foreground">
        {CANAL[d.canal] ?? d.canal}
        {d.regie_nom ? ` · ${d.regie_nom}` : ''}
        {d.destinataire_email ? ` · ${d.destinataire_email}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> {pieces} pièce{pieces > 1 ? 's' : ''}</span>
        <span>Préparé le {format(new Date(d.created_at), 'dd.MM.yyyy HH:mm', { locale: fr })}</span>
        {d.envoye_le && <span>Envoyé le {format(new Date(d.envoye_le), 'dd.MM.yyyy HH:mm', { locale: fr })}</span>}
        {d.formulaire_location_ok === false && <span className="text-amber-700 dark:text-amber-400">Formulaire de location incomplet</span>}
      </div>
      {d.motif_blocage && (
        <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-sm text-amber-800 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {d.motif_blocage}
        </p>
      )}
      {(d.rapport || d.brouillon_ref || d.preuve_envoi) && (
        <>
          <button
            type="button"
            className={cn('inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline sm:min-h-[32px]', FOCUS)}
            onClick={() => setOuvert((o) => !o)}
            aria-expanded={ouvert}
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', ouvert && 'rotate-180')} /> Détails du dossier
          </button>
          {ouvert && (
            <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-xs">
              {d.brouillon_ref && <p><span className="font-medium">Brouillon :</span> {d.brouillon_ref}</p>}
              {d.preuve_envoi && <p><span className="font-medium">Preuve d’envoi :</span> {d.preuve_envoi}</p>}
              {d.rapport && <p className="whitespace-pre-line">{d.rapport}</p>}
            </div>
          )}
        </>
      )}
      {decidable && (
        <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:flex-wrap">
          <Button size="sm" className="h-11 rounded-full sm:h-9" disabled={busy} onClick={() => onDecider(d, 'valide')}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
            Valider l’envoi
          </Button>
          <Button size="sm" variant="outline" className="h-11 rounded-full sm:h-9" disabled={busy} onClick={() => onDecider(d, 'refuse')}>
            <XCircle className="mr-1.5 h-4 w-4" /> Refuser
          </Button>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  r: Row;
  scope: 'admin' | 'agent';
  saving: boolean;
  deleting: boolean;
  busyDossier: boolean;
  onDeposer: (r: Row) => void;
  onSupprimer: (r: Row) => void;
  onDecider: (d: Dossier, statut: 'valide' | 'refuse') => void;
  /** Admin : nom de l'agent responsable (affiché sous le client). */
  agentLabel?: string;
  /** Dans un groupe client : le nom du client est déjà dans l'en-tête du groupe. */
  dansGroupe?: boolean;
}

/**
 * Une demande de postulation = une carte. Mobile : tout empilé, action en pleine largeur.
 * Grand écran : trois colonnes (client et bien | avancement et prochaine action | actions).
 */
export function PostulationCard({ r, scope, saving, deleting, busyDossier, onDeposer, onSupprimer, onDecider, agentLabel, dansGroupe }: CardProps) {
  const [voirPrep, setVoirPrep] = useState(false);
  const next = prochaineAction(r);
  const att = attente(r);
  const manquantes = r._job?.ai_result?.missing_items ?? [];
  const resume = r._job?.ai_result?.concise_staff_summary;
  const deposee = r.statut === 'candidature_deposee';
  const lienOffre = `/${scope}/offres-auto?offre=${r.id}`;

  return (
    <article
      data-postulation-card
      tabIndex={-1}
      aria-label={`${nomClient(r._client)} — ${r.adresse ?? 'adresse non renseignée'} — ${next.texte}`}
      className={cn(
        DASH_CARD, 'overflow-hidden scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        att.enRetard && 'ring-1 ring-amber-500/40',
      )}
    >
      <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:items-start lg:gap-6">
        {/* 1. Client et bien */}
        <div className="min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {!dansGroupe && <p className="truncate text-[15px] font-semibold text-foreground">{nomClient(r._client)}</p>}
              {!dansGroupe && r._client?.email && (
                <a href={`mailto:${r._client.email}`} className={cn('inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground', FOCUS)}>
                  <Mail className="h-3 w-3 shrink-0" aria-hidden="true" /> <span className="truncate">{r._client.email}</span>
                </a>
              )}
              {agentLabel && (
                <p className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground">
                  <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" /> <span className="truncate">{agentLabel}</span>
                </p>
              )}
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                att.enRetard ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground',
              )}
              title={r.demande_at ? `Demandé le ${format(new Date(r.demande_at), 'dd.MM.yyyy HH:mm', { locale: fr })}` : undefined}
            >
              <Clock className="h-3 w-3" aria-hidden="true" /> <span className="sr-only">Demande </span>{att.label}
            </span>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="line-clamp-2 text-sm font-medium text-foreground">{r.adresse ?? 'Adresse non renseignée'}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[r.prix ? `${Number(r.prix).toLocaleString('fr-CH')} CHF/mois CC` : null, r.pieces ? `${r.pieces} pièces` : null].filter(Boolean).join(' · ') || '—'}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {r.lien_annonce && (
                <a href={r.lien_annonce} target="_blank" rel="noreferrer" className={cn('inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-primary hover:underline sm:min-h-[28px]', FOCUS)}>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Annonce<span className="sr-only"> (nouvel onglet)</span>
                </a>
              )}
              <Link to={lienOffre} className={cn('inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline sm:min-h-[28px]', FOCUS)}>
                Fiche de l’offre
              </Link>
              {r.client_id && (
                <Link to={'/' + scope + '/clients/' + r.client_id + '/postulation?offre=' + r.id} className={cn('inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline sm:min-h-[28px]', FOCUS)}>
                  Fiche de postulation
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 2. Avancement et prochaine action */}
        <div className="min-w-0 space-y-3">
          <Frise r={r} />
          <p className={cn('flex items-start gap-1.5 text-sm font-semibold', TON_TEXTE[next.tone])}>
            {next.tone === 'warning' || next.tone === 'danger'
              ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            {next.texte}
          </p>

          {r._dossier && <DossierBloc d={r._dossier} busy={busyDossier} onDecider={onDecider} />}

          {r._job && (manquantes.length > 0 || resume || r._job.priority) && (
            <div>
              <button
                type="button"
                className={cn('inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline sm:min-h-[32px]', FOCUS)}
                onClick={() => setVoirPrep((v) => !v)}
                aria-expanded={voirPrep}
              >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', voirPrep && 'rotate-180')} />
                Préparation automatique
                {manquantes.length > 0 && <span className="text-amber-700 dark:text-amber-400">· {manquantes.length} pièce{manquantes.length > 1 ? 's' : ''} manquante{manquantes.length > 1 ? 's' : ''}</span>}
              </button>
              {voirPrep && (
                <div className="mt-1 space-y-1.5 rounded-lg bg-muted/50 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DashBadge tone={JOB_STATUS[r._job.status]?.tone ?? 'neutral'}>{JOB_STATUS[r._job.status]?.label ?? r._job.status}</DashBadge>
                    {r._job.priority && <DashBadge tone="neutral">Priorité {PRIORITY_LABEL[r._job.priority] ?? r._job.priority}</DashBadge>}
                    <span className="text-muted-foreground">Demande : {format(new Date(r._job.created_at), 'dd MMM HH:mm', { locale: fr })}</span>
                  </div>
                  {manquantes.length > 0 && (
                    <ul className="list-disc pl-4 text-amber-700 dark:text-amber-400">
                      {manquantes.slice(0, 6).map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  )}
                  {resume && <p className="text-muted-foreground">{resume}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Actions */}
        <div className="flex items-center gap-2 lg:w-[200px] lg:flex-col lg:items-stretch">
          {deposee ? (
            <DashBadge tone="success"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Déposée</DashBadge>
          ) : (
            <Button
              // Quand une décision sur le dossier est attendue, c'est elle l'action principale.
              variant={next.decision || next.etape === 'en_cours' ? 'outline' : 'default'}
              className="h-11 flex-1 rounded-full lg:h-10 lg:flex-none"
              disabled={saving}
              onClick={() => onDeposer(r)}
              aria-label={`Candidature déposée — ${r.adresse ?? 'logement'}`}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Candidature déposée
            </Button>
          )}
          {scope === 'admin' && (
            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  className="h-11 w-11 shrink-0 rounded-full p-0 text-destructive hover:bg-destructive/10 hover:text-destructive lg:h-10 lg:w-auto lg:px-4"
                  disabled={deleting}
                  aria-label={`Supprimer l'offre — ${r.adresse ?? 'logement'}`}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span className="hidden lg:ml-2 lg:inline">Supprimer</span>
                </Button>
              }
              title="Supprimer l'offre"
              description="Supprimer définitivement cette offre ? Cette action est irréversible et retire aussi la candidature/visite liée."
              confirmText="Supprimer"
              cancelText="Annuler"
              variant="destructive"
              onConfirm={() => onSupprimer(r)}
            />
          )}
        </div>
      </div>
    </article>
  );
}

/** Dossier préparé sans offre en attente (offre déjà traitée, ou historique). */
export function DossierSeulCard({ d, busy, onDecider, scope }: {
  d: Dossier; busy: boolean; scope: 'admin' | 'agent'; onDecider: (d: Dossier, statut: 'valide' | 'refuse') => void;
}) {
  return (
    <article className={cn(DASH_CARD, 'space-y-3 p-4 md:p-5')}>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-foreground">{d.client_nom || 'Client'}</p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{d.adresse_bien || d.objet || 'Bien'}</p>
        {d.offre_id && (
          <Link to={`/${scope}/offres-auto?offre=${d.offre_id}`} className={cn('mt-1 inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline sm:min-h-[28px]', FOCUS)}>
            <ExternalLink className="h-3.5 w-3.5" /> Fiche de l’offre
          </Link>
        )}
      </div>
      <DossierBloc d={d} busy={busy} onDecider={onDecider} compact />
    </article>
  );
}

/**
 * En-tête d'un groupe quand un client a plusieurs demandes dans l'étape :
 * nom, nombre de demandes, repli, et « Tout marquer déposé » (avec confirmation),
 * qui appelle la même action que le bouton de chaque carte, demande par demande.
 */
export function ClientGroupe({ id, client, rows, ouvert, onBasculer, busy, onDeposerTout, children }: {
  id: string;
  client?: Row['_client'];
  rows: Row[];
  ouvert: boolean;
  onBasculer: () => void;
  busy: boolean;
  onDeposerTout: (rows: Row[]) => void;
  children: ReactNode;
}) {
  const aDeposer = rows.filter((r) => r.statut !== 'candidature_deposee');
  const enRetard = rows.filter((r) => attente(r).enRetard).length;
  const nom = nomClient(client);
  const panneau = `groupe-${id}`;
  return (
    <section className="space-y-3 rounded-3xl border border-dashed border-border p-2 sm:p-3" aria-label={`Demandes de ${nom}`}>
      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBasculer}
          aria-expanded={ouvert}
          aria-controls={panneau}
          className={cn('flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left', FOCUS)}
        >
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !ouvert && '-rotate-90')} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-foreground">{nom}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {rows.length} demandes{enRetard > 0 ? ` · ${enRetard} > 24 h` : ''}{client?.email ? ` · ${client.email}` : ''}
            </span>
          </span>
        </button>
        {aDeposer.length > 1 && (
          <ConfirmDialog
            trigger={
              <Button variant="outline" className="h-11 w-full rounded-full sm:h-9 sm:w-auto" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Tout marquer déposé ({aDeposer.length})
              </Button>
            }
            title="Marquer toutes les candidatures déposées"
            description={`${aDeposer.length} candidatures de ${nom} vont passer en « déposée ». Le client recevra une notification pour chacune. Confirmez seulement si elles ont toutes été déposées auprès des régies.`}
            confirmText="Tout marquer déposé"
            cancelText="Annuler"
            onConfirm={() => onDeposerTout(aDeposer)}
          />
        )}
      </div>
      {ouvert && <div id={panneau} className="space-y-3">{children}</div>}
    </section>
  );
}

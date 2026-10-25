import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, ExternalLink, Pencil, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import {
  STATUT_BADGE, depuisLabel, nomClient, offrePrioritaire, prochaineAction, sourceDe, sourceLabel, visiteLabel,
  type Groupe, type Row, type Ton,
} from './offresAutoModel';

const TON_TEXTE: Record<Ton, string> = {
  neutral: 'text-foreground',
  primary: 'text-primary',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
};

function StatutBadge({ s }: { s: string | null }) {
  const v = STATUT_BADGE[s ?? ''] ?? { label: s ?? '—', tone: 'muted' as const };
  return <DashBadge tone={v.tone}>{v.label}</DashBadge>;
}

/**
 * Une annonce = une carte, avec tous les clients qui l'ont reçue.
 * Mobile : tout empilé, bouton principal pleine largeur. Grand écran : trois colonnes
 * (bien | prochaine action et clients | actions).
 */
export function OffreGroupeCard({ g, onEdit }: { g: Groupe; onEdit: (groupe: Row[], offre: Row) => void }) {
  const [details, setDetails] = useState(false);
  const prio = offrePrioritaire(g);
  if (!prio) return null;
  const { offre: ref, next } = prio;
  const source = sourceDe(ref.lien_annonce);
  const missing = g.offres.find((o) => o.needs_agent_action && o.missing_info)?.missing_info;
  const avecCommentaires = g.offres.filter((o) => o.commentaires);

  return (
    <article className={cn(DASH_CARD, 'overflow-hidden', next.enRetard && 'ring-1 ring-amber-500/40')}>
      <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] lg:items-start lg:gap-6">
        {/* 1. Le bien */}
        <div className="min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 min-w-0 text-[15px] font-semibold text-foreground">{ref.adresse ?? 'Adresse non renseignée'}</p>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                next.enRetard ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground',
              )}
              title={`Dernier envoi le ${format(new Date(g.derniere), 'dd MMM HH:mm', { locale: fr })}`}
            >
              <Clock className="h-3 w-3" /> {depuisLabel(g.derniere)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {[ref.prix ? `${ref.prix} CHF` : null, ref.pieces ? `${ref.pieces} pcs` : null].filter(Boolean).join(' · ') || '—'}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <DashBadge tone="muted">{sourceLabel(source)}</DashBadge>
            <span className="text-xs text-muted-foreground">
              Envoyée le {format(new Date(g.derniere), 'dd MMM HH:mm', { locale: fr })}
            </span>
            {ref.lien_annonce && (
              <a href={ref.lien_annonce} target="_blank" rel="noreferrer" className="inline-flex min-h-[28px] items-center gap-1 text-xs font-medium text-primary hover:underline" title="Ouvrir l'annonce externe">
                <ExternalLink className="h-3.5 w-3.5" /> Annonce
              </a>
            )}
          </div>
        </div>

        {/* 2. Prochaine action et clients concernés */}
        <div className="min-w-0 space-y-3">
          <p className={cn('flex items-start gap-1.5 text-sm font-semibold', TON_TEXTE[next.tone])}>
            {next.tone === 'warning' || next.tone === 'danger'
              ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            {next.texte}
          </p>
          {missing && !next.texte.includes(missing) && (
            <p className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">Ce qui manque : {missing}</p>
          )}
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {g.offres.length} client{g.offres.length > 1 ? 's' : ''} concerné{g.offres.length > 1 ? 's' : ''}
            </p>
            <ul className="space-y-2">
              {g.offres.map((o) => {
                const n = prochaineAction(o);
                return (
                  <li key={o.id} className="rounded-xl bg-muted/40 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="min-h-[28px] text-left text-sm font-medium text-foreground underline-offset-4 hover:underline"
                        onClick={() => onEdit(g.offres, o)}
                        title="Gérer l'offre de ce client"
                      >
                        {nomClient(o._client)}
                      </button>
                      <StatutBadge s={o.statut} />
                    </div>
                    {o._client?.email && <p className="truncate text-xs text-muted-foreground">{o._client.email}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">{visiteLabel(o)}</p>
                    {g.offres.length > 1 && <p className={cn('mt-0.5 text-xs font-medium', TON_TEXTE[n.tone])}>{n.texte}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
          {avecCommentaires.length > 0 && (
            <div>
              <button
                type="button"
                className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                onClick={() => setDetails((d) => !d)}
                aria-expanded={details}
              >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', details && 'rotate-180')} /> Commentaires
              </button>
              {details && (
                <div className="mt-1 space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
                  {avecCommentaires.map((o) => (
                    <div key={o.id}>
                      {g.offres.length > 1 && <p className="font-medium">{nomClient(o._client)}</p>}
                      <p className="whitespace-pre-line text-muted-foreground">{o.commentaires}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Action principale */}
        <div className="flex items-center gap-2 lg:w-[200px] lg:flex-col lg:items-stretch">
          <Button
            variant={next.etape === 'cloturees' || next.tone === 'muted' ? 'outline' : 'default'}
            className="h-11 flex-1 rounded-full lg:h-10 lg:flex-none"
            onClick={() => onEdit(g.offres, ref)}
            title="Gérer l'annonce pour tous les clients"
          >
            <Pencil className="mr-2 h-4 w-4" /> {next.bouton}
          </Button>
          {ref.lien_annonce && (
            <Button asChild variant="outline" className="h-11 w-11 shrink-0 rounded-full p-0 lg:h-10 lg:w-auto lg:px-4">
              <a href={ref.lien_annonce} target="_blank" rel="noreferrer" aria-label="Ouvrir l'annonce externe">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden lg:ml-2 lg:inline">Ouvrir l’annonce</span>
              </a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

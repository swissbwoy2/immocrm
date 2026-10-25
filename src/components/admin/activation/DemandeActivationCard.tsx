import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle, Building2, CheckCircle, CheckCircle2, ChevronDown, Clock, CreditCard, Eye, Home,
  Loader2, Mail, Paperclip, Phone, Receipt, RefreshCw, Send, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import {
  STATUT_LABEL, attente, attenteProfil, nbDocuments, nomComplet, prochaineAction,
  type DemandeMandat, type Profile, type Ton,
} from './activationModel';

const TON_TEXTE: Record<Ton, string> = {
  neutral: 'text-foreground',
  primary: 'text-primary',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
};

function Delai({ label, enRetard, title }: { label: string; enRetard: boolean; title?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        enRetard ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground',
      )}
      title={title}
    >
      <Clock className="h-3 w-3" /> {label}
    </span>
  );
}

/** Frise compacte : Demande → Facture → Paiement → Activé. */
function Frise({ statut }: { statut: string }) {
  const rang = { en_attente: 1, facture_envoyee: 2, paye: 3, active: 4 }[statut] ?? 0;
  const etapes = ['Demande', 'Facture', 'Paiement', 'Activé'];
  return (
    <ol className="flex items-center gap-1" aria-label="Avancement">
      {etapes.map((label, i) => {
        const ok = i < rang;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-1">
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                ok ? 'bg-primary text-primary-foreground' : 'border border-border bg-background text-muted-foreground',
              )}
              title={label}
            >
              {ok ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
            </span>
            <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">{label}</span>
            {i < etapes.length - 1 && <span className={cn('h-px flex-1', ok ? 'bg-primary/50' : 'bg-border')} />}
          </li>
        );
      })}
    </ol>
  );
}

interface CardProps {
  d: DemandeMandat;
  creatingInvoice: boolean;
  resendingInvoice: boolean;
  activating: boolean;
  onVoir: (d: DemandeMandat) => void;
  onFacturer: (d: DemandeMandat) => void;
  onRenvoyer: (d: DemandeMandat) => void;
  onPayer: (d: DemandeMandat) => void;
  onActiver: (d: DemandeMandat) => void;
  onSupprimer: (d: DemandeMandat) => void;
}

/**
 * Une demande de mandat = une carte. Mobile : tout empilé, action principale en pleine largeur.
 * Grand écran : trois colonnes (client | avancement et prochaine action | actions).
 */
export function DemandeActivationCard({
  d, creatingInvoice, resendingInvoice, activating,
  onVoir, onFacturer, onRenvoyer, onPayer, onActiver, onSupprimer,
}: CardProps) {
  const [ouvert, setOuvert] = useState(false);
  const next = prochaineAction(d);
  const att = attente(d);
  const statut = STATUT_LABEL[d.statut] ?? { label: d.statut, tone: 'neutral' as Ton };
  const achat = d.type_recherche === 'Acheter';
  const docs = nbDocuments(d);
  const actionnable = d.statut === 'en_attente' || d.statut === 'facture_envoyee' || d.statut === 'paye';

  const peutFacturer = d.statut === 'en_attente';
  const peutRenvoyer = d.statut === 'facture_envoyee' && !!d.abaninja_invoice_id;
  const peutPayer = d.statut === 'en_attente' || d.statut === 'facture_envoyee';
  const peutActiver = d.statut === 'paye';

  const btnFacturer = (principal: boolean) => (
    <Button key="facturer" variant={principal ? 'default' : 'outline'} className="h-11 w-full rounded-full lg:h-10"
      onClick={() => onFacturer(d)} disabled={creatingInvoice}>
      {creatingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Receipt className="mr-2 h-4 w-4" />Facturer</>}
    </Button>
  );
  const btnRenvoyer = (principal: boolean) => (
    <Button key="renvoyer" variant={principal ? 'default' : 'outline'} className="h-11 w-full rounded-full lg:h-10"
      onClick={() => onRenvoyer(d)} disabled={resendingInvoice}>
      {resendingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-2 h-4 w-4" />Renvoyer la facture</>}
    </Button>
  );
  const btnPayer = (principal: boolean) => (
    <Button key="payer" variant={principal ? 'default' : 'outline'} className="h-11 w-full rounded-full lg:h-10"
      onClick={() => onPayer(d)} disabled={activating}>
      {activating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><CreditCard className="mr-2 h-4 w-4" />Payé</>}
    </Button>
  );
  const btnActiver = (principal: boolean) => (
    <Button key="activer" variant={principal ? 'default' : 'outline'} className="h-11 w-full rounded-full lg:h-10"
      onClick={() => onActiver(d)} disabled={activating}>
      {activating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><CheckCircle className="mr-2 h-4 w-4" />Activer</>}
    </Button>
  );

  // Bouton principal = prochaine action ; les autres actions existantes restent en secondaire.
  const boutons: { key: string; ok: boolean; render: (p: boolean) => JSX.Element }[] = [
    { key: 'facturer', ok: peutFacturer, render: btnFacturer },
    { key: 'renvoyer', ok: peutRenvoyer, render: btnRenvoyer },
    { key: 'payer', ok: peutPayer, render: btnPayer },
    { key: 'activer', ok: peutActiver, render: btnActiver },
  ].filter((b) => b.ok);
  const principal = boutons.find((b) => b.key === next.principale) ?? boutons[0];
  const secondaires = boutons.filter((b) => b !== principal);

  return (
    <article className={cn(DASH_CARD, 'overflow-hidden', actionnable && att.enRetard && 'ring-1 ring-amber-500/40')}>
      <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:items-start lg:gap-6">
        {/* 1. Client */}
        <div className="min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onVoir(d)}
                className="block max-w-full truncate text-left text-[15px] font-semibold text-foreground underline-offset-4 hover:underline"
                title="Ouvrir la fiche"
              >
                {nomComplet(d)}
              </button>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <DashBadge tone={statut.tone}>{statut.label}</DashBadge>
                <DashBadge tone={achat ? 'primary' : 'muted'}>
                  {achat ? <Building2 className="mr-1 h-3 w-3" /> : <Home className="mr-1 h-3 w-3" />}
                  {achat ? 'Achat' : 'Location'}
                </DashBadge>
              </div>
            </div>
            {actionnable && (
              <Delai
                label={att.label}
                enRetard={att.enRetard}
                title={`Soumis le ${format(new Date(d.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}`}
              />
            )}
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <a href={`mailto:${d.email}`} className="flex min-h-[28px] max-w-full items-center gap-1.5 hover:text-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{d.email}</span>
            </a>
            {d.telephone && (
              <a href={`tel:${d.telephone}`} className="flex min-h-[28px] items-center gap-1.5 hover:text-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />{d.telephone}
              </a>
            )}
          </div>
        </div>

        {/* 2. Avancement et prochaine action */}
        <div className="min-w-0 space-y-3">
          <Frise statut={d.statut} />
          <p className={cn('flex items-start gap-1.5 text-sm font-semibold', TON_TEXTE[next.tone])}>
            {next.tone === 'warning' || next.tone === 'danger'
              ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            {next.texte}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              {achat ? '2\'500' : d.montant_acompte} CHF
            </span>
            {achat && d.apport_personnel > 0 && (
              <span className="text-primary">Apport: {d.apport_personnel?.toLocaleString()} CHF</span>
            )}
            {d.abaninja_invoice_ref && (
              <span className="inline-flex items-center gap-1">
                <Receipt className="h-3.5 w-3.5" />Facture AbaNinja: {d.abaninja_invoice_ref}
              </span>
            )}
            <span className={cn('inline-flex items-center gap-1', docs === 0 && actionnable && 'text-amber-700 dark:text-amber-400')}>
              <Paperclip className="h-3.5 w-3.5" />
              {docs === 0 ? 'Aucun document joint' : `${docs} document${docs > 1 ? 's' : ''}`}
            </span>
          </div>

          <div>
            <button
              type="button"
              className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
              onClick={() => setOuvert((o) => !o)}
              aria-expanded={ouvert}
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', ouvert && 'rotate-180')} /> Résumé de la recherche
            </button>
            {ouvert && (
              <div className="mt-1 grid gap-1 rounded-lg bg-muted/50 p-3 text-xs sm:grid-cols-2">
                <p><span className="font-medium">Région:</span> {d.region_recherche || '—'}</p>
                <p><span className="font-medium">Budget max:</span> {d.budget_max ? `${d.budget_max.toLocaleString()} CHF` : '—'}</p>
                <p><span className="font-medium">Revenus:</span> {d.revenus_mensuels ? `${d.revenus_mensuels.toLocaleString()} CHF/mois` : '—'}</p>
                <p><span className="font-medium">Pièces:</span> {d.pieces_recherche || '—'}</p>
                <p className="sm:col-span-2 text-muted-foreground">
                  Soumis le {format(new Date(d.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  {d.date_paiement && (
                    <> • Payé le {format(new Date(d.date_paiement), 'dd MMM yyyy', { locale: fr })}</>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Actions */}
        <div className="flex flex-col gap-2 lg:w-[210px]">
          {principal ? principal.render(true) : (
            <Button variant="outline" className="h-11 w-full rounded-full lg:h-10" onClick={() => onVoir(d)}>
              <Eye className="mr-2 h-4 w-4" />Voir la fiche
            </Button>
          )}
          <div className="grid grid-cols-[1fr_auto] gap-2 lg:grid-cols-1">
            <div className="grid gap-2">
              {secondaires.map((b) => b.render(false))}
              {principal && (
                <Button variant="outline" className="h-11 w-full rounded-full lg:h-10" onClick={() => onVoir(d)}>
                  <Eye className="mr-2 h-4 w-4" />Voir la fiche
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              className="h-11 w-11 self-end rounded-full p-0 text-destructive hover:bg-destructive/10 hover:text-destructive lg:h-10 lg:w-full lg:px-4"
              onClick={() => onSupprimer(d)}
              aria-label="Supprimer la demande"
            >
              <Trash2 className="h-4 w-4" /><span className="hidden lg:ml-2 lg:inline">Supprimer</span>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Compte inactif (profil sans demande à traiter) : une action, l'activer. */
export function CompteInactifCard({ p, activating, onActiver }: {
  p: Profile; activating: boolean; onActiver: (profileId: string) => void;
}) {
  const att = attenteProfil(p);
  return (
    <article className={cn(DASH_CARD, 'space-y-3 p-4 md:p-5')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{nomComplet(p)}</p>
          <a href={`mailto:${p.email}`} className="flex min-h-[28px] max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{p.email}</span>
          </a>
        </div>
        <Delai label={att.label} enRetard={att.enRetard}
          title={`Inscrit le ${format(new Date(p.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}`} />
      </div>
      <p className={cn('flex items-start gap-1.5 text-sm font-semibold', att.enRetard ? TON_TEXTE.warning : TON_TEXTE.primary)}>
        {att.enRetard ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
        Vérifier le compte puis l’activer
      </p>
      <Button className="h-11 w-full rounded-full sm:h-10" onClick={() => onActiver(p.id)} disabled={activating}>
        {activating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><CheckCircle className="mr-2 h-4 w-4" />Activer</>}
      </Button>
    </article>
  );
}

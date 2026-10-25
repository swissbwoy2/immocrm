import type { ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, FileCheck, Heart, Home, User, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressLink } from '@/components/AddressLink';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';

/**
 * Versions sobres (style DashPrimitives) des listes du tableau de bord agent.
 * Mêmes données, mêmes textes et mêmes destinations que les anciens composants Premium*
 * (ClientReactionsWidget, PremiumCandidaturesTraitementSection, PremiumProjectionFinanciereSection),
 * qui restent en place et ne sont pas modifiés.
 */

export type ClientReaction = {
  id: string; adresse: string; prix: number | null; pieces: number | null; surface: number | null;
  statut: string; statut_client: string | null; date_envoi: string; clientName: string; client_id: string;
};

const REACTION_CONFIG: Record<string, { label: string; icon: ElementType; tone: 'success' | 'primary' | 'warning' | 'neutral' }> = {
  interesse: { label: 'Intéressé(e)', icon: Heart, tone: 'success' },
  visite_planifiee: { label: 'Visite planifiée', icon: Calendar, tone: 'neutral' },
  candidature_deposee: { label: 'Candidature déposée', icon: FileCheck, tone: 'neutral' },
  demande_postulation: { label: 'Demande postulation', icon: FileCheck, tone: 'warning' },
};

/** Réactions clients aux offres (5 premières + lien vers toutes). */
export function ReactionsList({ reactions, basePath = '/agent' }: { reactions: ClientReaction[]; basePath?: string }) {
  const navigate = useNavigate();
  if (reactions.length === 0) return null;
  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">Réactions clients</h3>
          <p className="text-xs text-muted-foreground">Offres nécessitant votre attention</p>
        </div>
        <DashBadge tone="warning">{reactions.length}</DashBadge>
      </div>
      <div className="divide-y divide-border/60">
        {reactions.slice(0, 5).map((r) => {
          const c = REACTION_CONFIG[r.statut] || REACTION_CONFIG.interesse;
          const Icon = c.icon;
          return (
            <button
              key={r.id} type="button"
              onClick={() => navigate(`${basePath}/offres-envoyees?offreId=${r.id}`)}
              className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-muted/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{r.adresse}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {r.clientName}
                  {r.pieces ? ` · ${r.pieces} pcs` : ''}{r.surface ? ` · ${r.surface} m²` : ''}{r.prix ? ` · ${r.prix.toLocaleString()} CHF` : ''}
                </span>
              </span>
              <DashBadge tone={c.tone}>{c.label}</DashBadge>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>
      {reactions.length > 5 && (
        <Button variant="outline" className="mt-3 h-11 w-full rounded-full sm:h-10" onClick={() => navigate(`${basePath}/offres-envoyees`)}>
          Voir les {reactions.length} réactions
        </Button>
      )}
    </div>
  );
}

type Candidature = { id: string; statut: string; offres?: { adresse: string; pieces?: number; prix?: number }; client_id: string };

const CAND_STATUT: Record<string, { label: string; tone: 'success' | 'warning' | 'primary' | 'neutral' }> = {
  bail_conclu: { label: 'Client prêt à conclure', tone: 'success' },
  attente_bail: { label: 'En attente du bail', tone: 'warning' },
  bail_recu: { label: 'Bail reçu', tone: 'primary' },
  signature_planifiee: { label: 'Signature planifiée', tone: 'neutral' },
  signature_effectuee: { label: 'Signature effectuée', tone: 'success' },
  etat_lieux_fixe: { label: 'État des lieux fixé', tone: 'neutral' },
};

/** Candidatures en cours qui demandent une action (5 premières). */
export function CandidaturesActionList({ candidatures, getClientName }: { candidatures: Candidature[]; getClientName: (clientId: string) => string }) {
  const navigate = useNavigate();
  if (candidatures.length === 0) return null;
  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">Candidatures en cours</h3>
          <p className="text-xs text-muted-foreground">Actions requises</p>
        </div>
        <DashBadge tone="primary">{candidatures.length}</DashBadge>
      </div>
      <div className="divide-y divide-border/60">
        {candidatures.slice(0, 5).map((cand) => {
          const st = CAND_STATUT[cand.statut] || { label: 'En cours', tone: 'neutral' as const };
          return (
            <div key={cand.id} role="button" tabIndex={0}
              onClick={() => navigate('/agent/candidatures')}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/agent/candidatures'); }}
              className="flex cursor-pointer items-center gap-3 py-2.5 hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <AddressLink address={cand.offres?.adresse || ''} className="truncate text-sm font-semibold" iconClassName="w-4 h-4" />
                  <DashBadge tone={st.tone}>{st.label}</DashBadge>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Home className="h-3.5 w-3.5" />{cand.offres?.pieces} pièces</span>
                  <span className="font-medium text-foreground">{cand.offres?.prix?.toLocaleString()} CHF/mois</span>
                  <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{getClientName(cand.client_id)}</span>
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          );
        })}
      </div>
      <Button className="mt-3 h-11 w-full rounded-full sm:h-10" onClick={() => navigate('/agent/candidatures')}>
        <FileCheck className="mr-2 h-4 w-4" /> Gérer toutes les candidatures
      </Button>
    </div>
  );
}

type ProjectionItem = { clientId: string; clientName: string; budgetMax: number; splitAgent: number; partAgent: number };

/** Projection financière : commission potentielle par client actif. */
export function ProjectionList({ projections, totalCommissionPotentielle }: { projections: ProjectionItem[]; totalCommissionPotentielle: number }) {
  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <h3 className="text-base font-semibold text-foreground">
        Projection financière <span className="text-xs font-normal text-muted-foreground">(3 derniers mois)</span>
      </h3>
      <div className="mt-2 max-h-[350px] divide-y divide-border/60 overflow-y-auto pr-1">
        {projections.map((proj) => (
          <div key={proj.clientId} className="flex items-center gap-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"><Users className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{proj.clientName}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><Wallet className="h-3 w-3" />Budget: {proj.budgetMax.toLocaleString('fr-CH')} CHF</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">+{proj.partAgent.toLocaleString('fr-CH')} CHF</p>
              <p className="text-xs text-muted-foreground">{proj.splitAgent}% split</p>
            </div>
          </div>
        ))}
        {projections.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Aucune projection disponible</p>
            <p className="mt-1 text-xs text-muted-foreground">Les projections apparaîtront avec les nouveaux clients</p>
          </div>
        )}
      </div>
      {projections.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
          <div>
            <p className="font-semibold text-foreground">Total potentiel</p>
            <p className="text-xs text-muted-foreground">{projections.length} client{projections.length > 1 ? 's' : ''} actif{projections.length > 1 ? 's' : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold tabular-nums text-foreground">{totalCommissionPotentielle.toLocaleString('fr-CH')} CHF</p>
            <p className="text-xs text-muted-foreground">Commission estimée</p>
          </div>
        </div>
      )}
    </div>
  );
}

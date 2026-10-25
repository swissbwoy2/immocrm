import type React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Bike, CheckCircle, Clock, ExternalLink, Loader2, Mail, Phone, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientInteretBadge } from '@/components/offres/ClientInteretBadge';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import {
  TON_TEXTE, delaiVisite, heureLabel, jourLabel, montantImpaye, nbClients, prochaineActionAdmin, retardCompteRendu,
  type EtapeAdmin, type MissionLike,
} from './coursierModel';

/** Libellés de statut coursier (identiques à l'ancien onglet Missions). */
const STATUT_COURSIER: Record<string, { label: string; tone: 'warning' | 'neutral' | 'success' | 'muted' }> = {
  en_attente: { label: 'En attente', tone: 'warning' },
  accepte: { label: 'Acceptée', tone: 'neutral' },
  termine: { label: 'Terminée', tone: 'success' },
};

interface Props {
  etape: EtapeAdmin;
  rep: MissionLike & Record<string, any>;
  items: MissionLike[];
  coursierNom: string;
  coursierContact?: { tel?: string | null; email?: string | null };
  /** Déléguer (onglet À déléguer). */
  onDelegate?: () => void;
  delegating?: boolean;
  /** Marquer payé (onglet À payer). */
  onMarkPaid?: () => void;
  /** Ouvrir la fiche du coursier. */
  onOpenCoursier?: () => void;
  /** Aller à la liste des coursiers (mission sans coursier). */
  onVoirCoursiers?: () => void;
}

/**
 * Une visite physique (tous les clients regroupés) = une carte avec UNE prochaine action.
 * Mobile : empilé, bouton principal pleine largeur 44 px. Grand écran : trois colonnes.
 */
export function AdminCoursierMissionCard({
  etape, rep: m, items, coursierNom, coursierContact, onDelegate, delegating, onMarkPaid, onOpenCoursier, onVoirCoursiers,
}: Props) {
  const next = prochaineActionAdmin(etape, m, items, coursierNom);
  const delai = delaiVisite(m.date_visite);
  const retard = etape === 'a_rendre' ? retardCompteRendu(m) : null;
  const clients = nbClients(items);
  const delegues = items.filter((i) => i.est_deleguee === true).length;
  const allPaid = items.every((i) => i.paye_coursier);
  const statut = m.statut_coursier ? STATUT_COURSIER[m.statut_coursier] ?? { label: m.statut_coursier, tone: 'muted' as const } : null;
  const urgent = (etape === 'a_deleguer' || etape === 'sans_coursier') && !delai.passee && delai.heures < 24;
  const relance = coursierContact?.tel ? `tel:${coursierContact.tel}` : coursierContact?.email ? `mailto:${coursierContact.email}` : null;

  const chip = (children: React.ReactNode, alerte: boolean) => (
    <span className={cn(
      'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
      alerte ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground',
    )}>
      <Clock className="h-3 w-3" /> {children}
    </span>
  );

  return (
    <article className={cn(DASH_CARD, 'overflow-hidden', (urgent || retard?.enRetard) && 'ring-1 ring-amber-500/40')}>
      <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-start lg:gap-6">
        {/* 1. Visite */}
        <div className="min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{jourLabel(m.date_visite)}</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{heureLabel(m)}</p>
            </div>
            {etape === 'a_rendre' && retard
              ? chip(`Visite terminée ${retard.label}`, retard.enRetard)
              : etape !== 'terminees' && etape !== 'a_payer'
                ? chip(delai.label, delai.tone === 'danger' || delai.tone === 'warning' || (etape === 'sans_coursier' && delai.passee))
                : null}
          </div>
          <p className="line-clamp-2 text-[15px] font-semibold text-foreground">{m.adresse || m.offres?.adresse || 'Adresse non renseignée'}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{clients} client{clients > 1 ? 's' : ''}</span>
            <span>{format(new Date(m.date_visite), 'dd MMM yyyy', { locale: fr })}</span>
            {m.agents?.profiles?.prenom && <span>Agent : {m.agents.profiles.prenom}</span>}
            {m.offres?.lien_annonce && (
              <a href={m.offres.lien_annonce} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[28px] items-center gap-1 font-medium text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> Voir l'offre
              </a>
            )}
          </div>
          {etape === 'a_deleguer' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <ClientInteretBadge statutOffre={m.offres?.statut} />
              {delegues > 0 && <DashBadge tone="primary"><Bike className="mr-1 h-3 w-3" />{delegues} délégué(s)</DashBadge>}
            </div>
          )}
        </div>

        {/* 2. Prochaine action */}
        <div className="min-w-0 space-y-2">
          <p className={cn('flex items-start gap-1.5 text-sm font-semibold', TON_TEXTE[next.tone])}>
            {next.tone === 'warning' || next.tone === 'danger'
              ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              : <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {next.texte}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {statut && <DashBadge tone={statut.tone}>{statut.label}</DashBadge>}
            {m.statut_coursier === 'termine' && (allPaid
              ? <DashBadge tone="success">Payé</DashBadge>
              : <DashBadge tone="danger">Impayé</DashBadge>)}
            {etape === 'a_payer' && <span className="text-sm font-semibold text-foreground">{montantImpaye(items).toFixed(0)} CHF</span>}
          </div>
          {m.coursier_id && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Coursier : <span className="font-medium text-foreground">{coursierNom}</span>
            </p>
          )}
        </div>

        {/* 3. Actions */}
        <div className="flex flex-col gap-2 sm:flex-row lg:w-[210px] lg:flex-col lg:items-stretch">
          {etape === 'a_deleguer' && onDelegate && (
            <Button onClick={onDelegate} disabled={delegating} className="h-11 flex-1 rounded-full lg:h-10 lg:flex-none">
              {delegating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bike className="mr-2 h-4 w-4" />}
              Déléguer
            </Button>
          )}
          {etape === 'sans_coursier' && onVoirCoursiers && (
            <Button variant="outline" onClick={onVoirCoursiers} className="h-11 flex-1 rounded-full lg:h-10 lg:flex-none">
              <Users className="mr-2 h-4 w-4" /> Contacter les coursiers
            </Button>
          )}
          {etape === 'a_rendre' && (relance ? (
            <Button asChild className="h-11 flex-1 rounded-full lg:h-10 lg:flex-none">
              <a href={relance}>
                {coursierContact?.tel ? <Phone className="mr-2 h-4 w-4" /> : <Mail className="mr-2 h-4 w-4" />}
                Relancer le compte-rendu
              </a>
            </Button>
          ) : onOpenCoursier && (
            <Button onClick={onOpenCoursier} className="h-11 flex-1 rounded-full lg:h-10 lg:flex-none">
              Relancer le compte-rendu
            </Button>
          ))}
          {etape === 'en_cours' && coursierContact?.tel && (
            <Button asChild variant="outline" className="h-11 flex-1 rounded-full lg:h-10 lg:flex-none">
              <a href={`tel:${coursierContact.tel}`}><Phone className="mr-2 h-4 w-4" /> Appeler le coursier</a>
            </Button>
          )}
          {etape === 'a_payer' && onMarkPaid && (
            <Button onClick={onMarkPaid} className="h-11 flex-1 rounded-full lg:h-10 lg:flex-none">
              <CheckCircle className="mr-2 h-4 w-4" /> Marquer payé
            </Button>
          )}
          {m.coursier_id && onOpenCoursier && (
            <Button variant="ghost" onClick={onOpenCoursier} className="h-11 flex-1 rounded-full lg:h-10 lg:flex-none">
              Fiche du coursier
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

import { useState } from 'react';
import {
  AlertTriangle, Calendar, Camera, CheckCircle2, ChevronDown, ChevronRight, FileText, Home, Key, Loader2,
  Mail, MapPin, Pencil, Phone, Send, Shield, ShieldCheck, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import {
  RELOUER_STATUS, SEUIL_MANDAT_JOURS, TON_TEXTE, derniereConnexion, initiales, nomComplet,
  type ClientVue, type ProfileLike,
} from './clientsListeModel';

export type CreditsInfo = { mandat_statut: string; coins_mandat: number } | undefined;

/** Fonctions fournies par la page (aucune logique métier ici : uniquement de l'affichage). */
export interface ClientListeCtx {
  agentName: (v: ClientVue) => string;
  credits: (v: ClientVue) => CreditsInfo;
  purchaseStatut: (v: ClientVue) => string | null | undefined;
  selectionMode: boolean;
  isSelected: (clientId: string) => boolean;
  onToggleSelect: (clientId: string) => void;
  onOpen: (v: ClientVue) => void;
  onInvite: (v: ClientVue, e: React.MouseEvent) => void;
  invitingClientId: string | null;
  onAnonymiser: (v: ClientVue, e: React.MouseEvent) => void;
  deletingUserId: string | null;
  setRef: (clientId: string, el: HTMLElement | null) => void;
}

const stop = (e: React.MouseEvent) => e.stopPropagation();

/* ------------------------------------------------------------------------- */
/* Badges de statut (mêmes informations que l'ancienne carte)                 */
/* ------------------------------------------------------------------------- */
export function ClientBadges({ v, ctx }: { v: ClientVue; ctx: ClientListeCtx }) {
  const { client, profile, statut } = v;
  if (v.reloueur) {
    const st = v.request?.status ? (RELOUER_STATUS[v.request.status] ?? { label: v.request.status, tone: 'muted' as const }) : null;
    return (
      <div className="flex flex-wrap gap-1.5">
        <DashBadge tone="neutral"><Key className="mr-1 h-3 w-3" /> Client reloueur</DashBadge>
        {v.isMixed && <DashBadge tone="neutral">+ Chercheur</DashBadge>}
        {!profile.actif && <DashBadge tone="primary">Non activé</DashBadge>}
        {!v.agentId && <DashBadge tone="warning">Sans agent</DashBadge>}
        {st && <DashBadge tone={st.tone}>{st.label}</DashBadge>}
      </div>
    );
  }

  const hasSignature = !!client.mandat_signature_data;
  const hasMandat = !!client.demande_mandat_id;
  const isFullyActivated = hasSignature && hasMandat && statut === 'actif';
  const cr = ctx.credits(v);
  const creditLabel: Record<string, string> = cr ? {
    actif: `Compteur actif · ${cr.coins_mandat} j`,
    essai: 'Essai en cours',
    expire: 'Essai terminé · pas d\'offres',
    aucun: 'Essai non démarré · pas d\'offres',
    suspendu: 'Compteur suspendu · pas d\'offres',
    resilie: 'Mandat résilié · pas d\'offres',
  } : {};
  const creditStopped = cr ? ['expire', 'aucun', 'suspendu', 'resilie'].includes(cr.mandat_statut) : false;

  return (
    <div className="flex flex-wrap gap-1.5">
      {v.manquants.length > 0 && <DashBadge tone="danger">Profil incomplet</DashBadge>}
      {!profile.actif && <DashBadge tone="primary">Non activé</DashBadge>}
      {!v.agentId && <DashBadge tone="warning">Sans agent</DashBadge>}
      {!v.isActivated && <DashBadge tone="muted">En attente</DashBadge>}
      {isFullyActivated && <DashBadge tone="success">Compte activé</DashBadge>}
      {(!hasSignature || !hasMandat) && <DashBadge tone="warning">Période d'essai</DashBadge>}
      {statut === 'reloge' && <DashBadge tone="success">Relogé</DashBadge>}
      {statut === 'stoppe' && <DashBadge tone="danger">Stoppé</DashBadge>}
      {statut === 'suspendu' && <DashBadge tone="warning">Suspendu</DashBadge>}
      {v.isAcheteur
        ? <DashBadge tone="neutral">∞ Crédits illimités</DashBadge>
        : cr && <DashBadge tone={creditStopped ? 'danger' : 'success'}>{creditLabel[cr.mandat_statut] ?? cr.mandat_statut}</DashBadge>}
      {v.isActivated && !v.isFrozen && (
        v.docConfirmed ? <DashBadge tone="success">Dossier à jour</DashBadge> : <DashBadge tone="warning">Non confirmé</DashBadge>
      )}
      {v.isAcheteur ? (
        <DashBadge tone="neutral"><Home className="mr-1 h-3 w-3" />{ctx.purchaseStatut(v) === 'actif' ? 'Mandat actif' : 'Projet achat'}</DashBadge>
      ) : v.solv.isSolvable ? (
        <DashBadge tone="success"><CheckCircle2 className="mr-1 h-3 w-3" />Solvable</DashBadge>
      ) : (
        <DashBadge tone="danger"><AlertTriangle className="mr-1 h-3 w-3" />Non solvable</DashBadge>
      )}
      {client.candidat_garant?.garant_solvable === true && <DashBadge tone="neutral">Garant</DashBadge>}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Mandat / activité                                                          */
/* ------------------------------------------------------------------------- */
function barreTon(v: ClientVue) {
  if (v.isFrozen) return v.statut === 'reloge' ? 'bg-emerald-500' : v.statut === 'suspendu' ? 'bg-amber-500' : 'bg-destructive';
  return v.daysElapsed < 60 ? 'bg-emerald-500' : v.daysElapsed < 90 ? 'bg-amber-500' : 'bg-destructive';
}

export function MandatInfo({ v }: { v: ClientVue }) {
  if (v.reloueur) {
    const st = v.request?.status ? (RELOUER_STATUS[v.request.status] ?? { label: v.request.status, tone: 'muted' as const }) : null;
    return st ? <DashBadge tone={st.tone}>{st.label}</DashBadge> : <span className="text-sm text-muted-foreground">Aucun dossier</span>;
  }
  if (!v.isActivated) return <span className="text-sm text-muted-foreground">Pas encore activé</span>;
  const proche = v.daysRemaining != null && v.daysRemaining <= SEUIL_MANDAT_JOURS;
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-sm font-medium text-foreground">
        J+{Math.floor(v.daysElapsed)}{v.isFrozen ? ' · figé' : ''}
        {v.daysRemaining != null && (
          <span className={cn('ml-1 font-normal', proche ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
            · reste {Math.max(0, v.daysRemaining)} j
          </span>
        )}
      </p>
      <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={cn('h-full rounded-full', barreTon(v))} style={{ width: `${Math.min(v.progressPercent, 100)}%` }} />
      </div>
    </div>
  );
}

export function ActiviteInfo({ v }: { v: ClientVue }) {
  if (v.reloueur) {
    const last = v.request?.updated_at || v.request?.created_at;
    return (
      <div className="min-w-0">
        <p className="text-sm text-foreground">{last ? `Activité : ${new Date(last).toLocaleDateString('fr-CH')}` : '—'}</p>
        <p className={cn('text-xs', (v.joursSansActivite ?? 0) >= 30 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
          {v.joursSansActivite != null ? `J+${v.joursSansActivite} · ` : ''}{v.counts.photos} photos · {v.counts.candidates} candidats
        </p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className={cn('text-sm', v.offresToday > 0 ? 'font-medium text-primary' : 'text-foreground')}>
        {v.offresToday} offre{v.offresToday > 1 ? 's' : ''} aujourd'hui
      </p>
      <p className={cn('text-xs', v.motifs.includes('inactif') ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
        Connexion : {derniereConnexion(v)}
      </p>
    </div>
  );
}

function ProchaineAction({ v }: { v: ClientVue }) {
  const p = v.prochaine;
  return (
    <p className={cn('flex items-start gap-1.5 text-sm font-semibold', TON_TEXTE[p.tone])}>
      {p.tone === 'warning' || p.tone === 'danger'
        ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{p.texte}</span>
    </p>
  );
}

/* ------------------------------------------------------------------------- */
/* Détails secondaires (repliables)                                           */
/* ------------------------------------------------------------------------- */
const Case = ({ label, children, tone }: { label: string; children: React.ReactNode; tone?: 'ok' | 'ko' }) => (
  <div className="rounded-xl bg-muted/40 px-3 py-2">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className={cn('text-sm font-semibold', tone === 'ok' && 'text-primary', tone === 'ko' && 'text-destructive')}>{children}</p>
  </div>
);
const aRenseigner = <span className="font-normal italic text-muted-foreground">À renseigner</span>;

export function ClientDetails({ v }: { v: ClientVue }) {
  const { client, request } = v;
  if (v.reloueur) {
    const rentNet = request?.rent_net ?? null;
    const charges = request?.charges ?? null;
    const rentBrut = rentNet != null && charges != null ? rentNet + charges : null;
    return (
      <div className="space-y-3">
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          {[request?.property_street, request?.property_zip, request?.property_city].filter(Boolean).join(', ') || 'Adresse non renseignée'}
        </p>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-foreground">Logement à relouer</p>
          <div className="grid grid-cols-2 gap-2">
            <Case label="Type">{request?.property_type || aRenseigner}</Case>
            <Case label="Pièces / Surface">{request?.rooms != null ? `${request.rooms} p.` : '—'}{request?.surface ? ` · ${request.surface} m²` : ''}</Case>
            {request?.floor != null && <Case label="Étage">{request.floor}</Case>}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-foreground">Conditions</p>
          <div className="grid grid-cols-2 gap-2">
            <Case label="Loyer net">{rentNet != null ? `CHF ${rentNet.toLocaleString()}` : aRenseigner}</Case>
            <Case label="Charges">{charges != null ? `CHF ${charges.toLocaleString()}` : '—'}</Case>
            <Case label="Loyer brut">{rentBrut != null ? `CHF ${rentBrut.toLocaleString()}` : aRenseigner}</Case>
            <Case label="Disponible">{request?.availability_date ? new Date(request.availability_date).toLocaleDateString('fr-CH') : aRenseigner}</Case>
          </div>
        </div>
        {(request?.agency_name || request?.visit_contact_name) && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {request?.agency_name && (
              <p>Régie : <span className="font-medium text-foreground">{request.agency_name}</span>{request.agency_phone ? ` · ${request.agency_phone}` : ''}</p>
            )}
            {request?.visit_contact_name && (
              <p>Visite : <span className="font-medium text-foreground">{request.visit_contact_name}</span>{request.visit_contact_phone ? ` · ${request.visit_contact_phone}` : ''}</p>
            )}
          </div>
        )}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-foreground">Dossier</p>
          <div className="grid grid-cols-4 gap-1.5">
            {([
              [Camera, 'Photos', v.counts.photos],
              [FileText, 'Documents', v.counts.docs],
              [Calendar, 'Créneaux', v.counts.slots],
              [Users, 'Candidats', v.counts.candidates],
            ] as const).map(([Icon, label, n]) => (
              <div key={label} className="rounded-xl bg-muted/40 p-2 text-center">
                <Icon className={cn('mx-auto mb-0.5 h-3.5 w-3.5', n > 0 ? 'text-primary' : 'text-muted-foreground')} />
                <p className="text-sm font-semibold leading-none">{n}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{client.nationalite || 'Non renseigné'}</span></p>
        <p className={cn('flex items-center gap-1.5', !v.solv.clientHasStableStatus ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
          <Users className="h-3.5 w-3.5 shrink-0" /> Permis : {client.type_permis || '-'}
          {!v.solv.clientHasStableStatus && <AlertTriangle className="h-3.5 w-3.5" aria-label="Statut non stable" />}
        </p>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-foreground">{v.isAcheteur ? 'Profil achat' : 'Finances'}</p>
        {v.isAcheteur ? (
          <div className="grid grid-cols-2 gap-2">
            <Case label="Revenus mensuels">{client.revenus_mensuels ? `CHF ${client.revenus_mensuels.toLocaleString()}` : '—'}</Case>
            <Case label="Mandat achat">6 mois</Case>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Case label="Revenu total">CHF {(v.solv.totalRevenus > 0 ? v.solv.totalRevenus : (v.solv.garantCoverageValid ? v.solv.garantsRevenusTotal : 0)).toLocaleString()}</Case>
              <Case label="Budget max" tone={v.solv.budgetOk ? 'ok' : 'ko'}>CHF {v.solv.budgetDemande.toLocaleString()}</Case>
            </div>
            {v.solv.garantCoverageValid && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Shield className="h-3 w-3" /> Garant valide
              </p>
            )}
            {v.solv.excludedCandidates > 0 && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" /> {v.solv.excludedCandidates} candidat(s) non comptabilisé(s)
              </p>
            )}
          </>
        )}
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-foreground">Recherche</p>
        <div className="flex flex-wrap gap-1.5">
          <DashBadge tone="muted">{client.type_bien || 'Location'}</DashBadge>
          <DashBadge tone="muted">{client.pieces || 0} pièces</DashBadge>
          <DashBadge tone="neutral">{client.region_recherche || 'N/A'}</DashBadge>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" /> Ajouté le {new Date(client.date_ajout || client.created_at || '').toLocaleDateString('fr-CH')}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Actions                                                                    */
/* ------------------------------------------------------------------------- */
export function AnonymiserButton({ profile, disabled, onConfirm, className, label }: {
  profile: ProfileLike; disabled: boolean; onConfirm: (e: React.MouseEvent) => void; className?: string; label?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className={cn('rounded-full text-muted-foreground hover:bg-amber-500/10 hover:text-amber-700', className)}
          onClick={stop}
          disabled={disabled}
          title="Anonymiser (RGPD)"
          aria-label="Anonymiser (RGPD)"
        >
          <ShieldCheck className="h-4 w-4" />
          {label && <span className="ml-2">Anonymiser</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={stop} className="max-w-[95vw] sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600"><ShieldCheck className="h-4 w-4" /></span>
            Anonymiser ce client (RGPD) ?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Conformément au <strong>droit à l'effacement</strong> (art. 17 RGPD / nLPD CH),
                les données personnelles sensibles de <strong>{profile?.prenom} {profile?.nom}</strong> seront effacées :
                dossier, situation financière, documents, conversations, mandat signé.
              </p>
              <p className="text-foreground">
                ✅ <strong>Conservés</strong> pour la comptabilité et les statistiques :
                nom, prénom, email, téléphone, factures et commissions.
              </p>
              <p className="text-amber-700 dark:text-amber-400">
                Le client ne pourra plus se connecter. <strong>Action irréversible.</strong>
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full" onClick={stop}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="rounded-full bg-amber-600 text-white hover:bg-amber-700">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Anonymiser
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ContactLiens({ profile, compact }: { profile: ProfileLike; compact?: boolean }) {
  return (
    <div className={cn('flex min-w-0 flex-col', compact ? 'gap-0.5' : 'gap-1')}>
      {profile.telephone ? (
        <a href={`tel:${profile.telephone}`} onClick={stop} className="inline-flex min-h-[28px] max-w-full items-center gap-1.5 text-sm text-foreground hover:text-primary hover:underline">
          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{profile.telephone}</span>
        </a>
      ) : (
        <span className="inline-flex min-h-[28px] items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0" />-</span>
      )}
      <a href={`mailto:${profile.email}`} onClick={stop} className="inline-flex min-h-[28px] max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline">
        <Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{profile.email}</span>
      </a>
    </div>
  );
}

/** Bouton principal qui correspond à la prochaine action. */
function ActionPrincipale({ v, ctx, className }: { v: ClientVue; ctx: ClientListeCtx; className?: string }) {
  const inviting = ctx.invitingClientId === v.client.id;
  if (v.prochaine.cta === 'inviter') {
    return (
      <Button className={cn('rounded-full', className)} disabled={inviting} onClick={(e) => ctx.onInvite(v, e)}>
        {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Envoyer l'invitation
      </Button>
    );
  }
  if (v.prochaine.cta === 'appeler' && v.profile.telephone) {
    return (
      <Button asChild className={cn('rounded-full', className)}>
        <a href={`tel:${v.profile.telephone}`} onClick={stop}><Phone className="mr-2 h-4 w-4" /> Appeler</a>
      </Button>
    );
  }
  const urgent = v.prochaine.tone === 'warning' || v.prochaine.tone === 'danger' || v.prochaine.tone === 'primary';
  return (
    <Button
      variant={urgent ? 'default' : 'outline'}
      className={cn('rounded-full', className)}
      disabled={v.reloueur && !v.request}
      onClick={(e) => { e.stopPropagation(); ctx.onOpen(v); }}
    >
      {v.reloueur ? <Home className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />}
      {v.reloueur ? 'Voir dossier reloueur' : 'Ouvrir la fiche'}
    </Button>
  );
}

/** Actions secondaires : fiche, invitation, anonymisation (mêmes actions que l'ancienne carte). */
function ActionsSecondaires({ v, ctx, size = 'h-11 w-11 lg:h-9 lg:w-9' }: { v: ClientVue; ctx: ClientListeCtx; size?: string }) {
  const inviting = ctx.invitingClientId === v.client.id;
  const showFiche = v.prochaine.cta !== 'fiche' || (v.reloueur && !v.request);
  return (
    <>
      {showFiche && (
        <Button variant="outline" className={cn('shrink-0 rounded-full p-0', size)} onClick={(e) => { e.stopPropagation(); ctx.onOpen(v); }} title="Ouvrir la fiche" aria-label="Ouvrir la fiche">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {v.prochaine.cta !== 'inviter' && (
        <Button
          variant="outline"
          className={cn('shrink-0 rounded-full p-0', size, !v.profile.actif && 'text-primary')}
          onClick={(e) => ctx.onInvite(v, e)}
          disabled={inviting}
          title={!v.profile.actif ? "Envoyer l'invitation (compte non activé)" : "Renvoyer l'invitation"}
          aria-label={!v.profile.actif ? "Envoyer l'invitation" : "Renvoyer l'invitation"}
        >
          {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      )}
      {!v.reloueur && (
        <AnonymiserButton
          profile={v.profile}
          disabled={ctx.deletingUserId === v.client.user_id}
          onConfirm={(e) => ctx.onAnonymiser(v, e)}
          className={cn('shrink-0 p-0', size)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* Carte (mobile / tablette)                                                  */
/* ------------------------------------------------------------------------- */
export function ClientListeCard({ v, ctx }: { v: ClientVue; ctx: ClientListeCtx }) {
  const [ouvert, setOuvert] = useState(false);
  const selected = ctx.isSelected(v.client.id);
  const alerte = v.prochaine.tone === 'warning' || v.prochaine.tone === 'danger';

  return (
    <article
      ref={(el) => ctx.setRef(v.client.id, el)}
      className={cn(
        DASH_CARD, 'flex cursor-pointer flex-col gap-3 p-4 transition-shadow md:p-5',
        alerte && 'ring-1 ring-amber-500/30',
        selected && 'ring-2 ring-primary',
      )}
      onClick={() => (ctx.selectionMode ? ctx.onToggleSelect(v.client.id) : ctx.onOpen(v))}
    >
      {/* Identité */}
      <div className="flex items-start gap-3">
        {ctx.selectionMode ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center" onClick={(e) => { e.stopPropagation(); ctx.onToggleSelect(v.client.id); }}>
            <Checkbox checked={selected} onCheckedChange={() => ctx.onToggleSelect(v.client.id)} onClick={stop} aria-label="Sélectionner" />
          </span>
        ) : (
          <span className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
            !v.reloueur && !v.solv.isSolvable ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
          )}>
            {initiales(v.profile)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">{nomComplet(v.profile)}</h3>
          <p className="truncate text-xs text-muted-foreground">{v.parcours} · Agent : {v.agentId ? ctx.agentName(v) : 'non assigné'}</p>
        </div>
        <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>

      <ContactLiens profile={v.profile} />

      {/* Mandat + activité */}
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] text-muted-foreground">{v.reloueur ? 'Dossier' : 'Mandat'}</p>
          <MandatInfo v={v} />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[11px] text-muted-foreground">Activité</p>
          <ActiviteInfo v={v} />
        </div>
      </div>

      <ClientBadges v={v} ctx={ctx} />

      <ProchaineAction v={v} />

      {/* Actions : principale pleine largeur sur mobile */}
      <div className="flex items-center gap-2" onClick={stop}>
        <ActionPrincipale v={v} ctx={ctx} className="h-11 flex-1" />
        <ActionsSecondaires v={v} ctx={ctx} size="h-11 w-11" />
      </div>

      <div onClick={stop}>
        <button
          type="button"
          className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', ouvert && 'rotate-180')} />
          {v.reloueur ? 'Logement, conditions et dossier' : 'Finances et recherche'}
        </button>
        {ouvert && <div className="mt-2"><ClientDetails v={v} /></div>}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------------- */
/* Tableau dense (PC)                                                         */
/* ------------------------------------------------------------------------- */
function LigneClient({ v, ctx }: { v: ClientVue; ctx: ClientListeCtx }) {
  const [ouvert, setOuvert] = useState(false);
  const selected = ctx.isSelected(v.client.id);
  const colonnes = ctx.selectionMode ? 8 : 7;
  return (
    <>
      <tr
        ref={(el) => ctx.setRef(v.client.id, el)}
        className={cn('cursor-pointer border-t border-border/60 align-top transition-colors hover:bg-muted/40', selected && 'bg-primary/5')}
        onClick={() => (ctx.selectionMode ? ctx.onToggleSelect(v.client.id) : ctx.onOpen(v))}
      >
        {ctx.selectionMode && (
          <td className="w-10 py-3 pl-4" onClick={(e) => { e.stopPropagation(); ctx.onToggleSelect(v.client.id); }}>
            <Checkbox checked={selected} onCheckedChange={() => ctx.onToggleSelect(v.client.id)} onClick={stop} aria-label="Sélectionner" />
          </td>
        )}
        <td className="max-w-[260px] py-3 pl-4 pr-3">
          <div className="flex items-start gap-2.5">
            <span className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
              !v.reloueur && !v.solv.isSolvable ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
            )}>{initiales(v.profile)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{nomComplet(v.profile)}</p>
              <ContactLiens profile={v.profile} compact />
            </div>
          </div>
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-sm text-foreground">{v.parcours}</td>
        <td className="px-3 py-3 text-sm">
          {v.agentId ? <span className="text-foreground">{ctx.agentName(v)}</span> : <DashBadge tone="warning">Sans agent</DashBadge>}
        </td>
        <td className="px-3 py-3"><MandatInfo v={v} /></td>
        <td className="px-3 py-3"><ActiviteInfo v={v} /></td>
        <td className="min-w-[200px] px-3 py-3"><ProchaineAction v={v} /></td>
        <td className="py-3 pl-3 pr-4" onClick={stop}>
          <div className="flex items-center justify-end gap-1.5">
            <ActionPrincipale v={v} ctx={ctx} className="h-9 px-3 text-xs" />
            <ActionsSecondaires v={v} ctx={ctx} size="h-9 w-9" />
            <Button
              variant="ghost"
              className="h-9 w-9 shrink-0 rounded-full p-0"
              onClick={() => setOuvert((o) => !o)}
              aria-expanded={ouvert}
              aria-label="Détails"
              title="Détails"
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', ouvert && 'rotate-180')} />
            </Button>
          </div>
        </td>
      </tr>
      {ouvert && (
        <tr className="bg-muted/20">
          <td colSpan={colonnes} className="px-4 pb-4 pt-1">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Statuts</p>
                <ClientBadges v={v} ctx={ctx} />
              </div>
              <ClientDetails v={v} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ClientListeTable({ vues, ctx, allSelected, onToggleAll }: {
  vues: ClientVue[]; ctx: ClientListeCtx; allSelected: boolean; onToggleAll: () => void;
}) {
  return (
    <div className={cn(DASH_CARD, 'overflow-hidden')}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
            <tr>
              {ctx.selectionMode && (
                <th className="w-10 py-2.5 pl-4">
                  <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Tout sélectionner" />
                </th>
              )}
              <th className="py-2.5 pl-4 pr-3 font-medium">Client</th>
              <th className="px-3 py-2.5 font-medium">Parcours</th>
              <th className="px-3 py-2.5 font-medium">Agent</th>
              <th className="px-3 py-2.5 font-medium">Mandat / dossier</th>
              <th className="px-3 py-2.5 font-medium">Activité</th>
              <th className="px-3 py-2.5 font-medium">Prochaine action</th>
              <th className="py-2.5 pl-3 pr-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vues.map((v) => <LigneClient key={v.client.id} v={v} ctx={ctx} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { Calendar, Check, Home, User, Banknote, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePreviewImage, type ShowcaseItem } from '@/components/public-site/showcase/useShowcase';
import { canDecideOnOffre } from '@/lib/visitDecision';
import { ACHAT_A_REPONDRE } from '@/lib/achatOffreActions';

/** Même carte que la location : blanc, une ombre, coins arrondis. */
export const ACHAT_CARD =
  'rounded-2xl border border-border/70 bg-card shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.06)]';

function showcaseItem(offre: any): ShowcaseItem {
  return {
    id: offre.id,
    titre: offre.titre ?? null,
    type_bien: offre.type_bien ?? null,
    adresse: offre.adresse ?? null,
    prix: offre.prix ?? null,
    pieces: offre.pieces ?? offre.nombre_pieces ?? null,
    surface: offre.surface ?? null,
    etage: offre.etage ?? null,
    lien_annonce: offre.lien_annonce ?? null,
    medias_galerie: offre.medias_galerie ?? null,
  } as ShowcaseItem;
}

/** Photo du bien (galerie ou aperçu de l'annonce). */
export function AchatOffrePhoto({ offre, ratio = 'aspect-[4/3]', className }: { offre: any; ratio?: string; className?: string }) {
  const item = useMemo(() => showcaseItem(offre), [offre]);
  const img = usePreviewImage(item);
  return (
    <div className={cn(ratio, 'w-full overflow-hidden bg-muted', className)}>
      {img ? (
        <img src={img} alt={offre.adresse || 'Photo du bien'} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Home className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

/** Rappel compact du bien en tête des fenêtres d'action. */
export function AchatOffreResume({ offre }: { offre: any }) {
  const prix = Number(offre?.prix) > 0 ? `CHF ${Number(offre.prix).toLocaleString('fr-CH')}` : null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg">
        <AchatOffrePhoto offre={offre} ratio="h-full" />
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold text-foreground">{offre?.adresse || offre?.titre || 'Bien proposé'}</p>
        {prix && <p className="mt-0.5 text-sm text-muted-foreground">{prix} · prix de vente</p>}
      </div>
    </div>
  );
}

/** Créneau de visite sélectionnable. */
export function AchatSlotOption({ date, selected, onSelect }: { date: string; selected: boolean; onSelect: () => void }) {
  const d = new Date(date);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors duration-150',
        selected ? 'border-foreground ring-1 ring-foreground' : 'border-border hover:border-foreground/50',
      )}
    >
      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted leading-none">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
          {d.toLocaleDateString('fr-CH', { month: 'short', timeZone: 'Europe/Zurich' })}
        </span>
        <span className="text-base font-semibold text-foreground">
          {d.toLocaleDateString('fr-CH', { day: 'numeric', timeZone: 'Europe/Zurich' })}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold capitalize text-foreground">
          {d.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Zurich' })}
        </span>
        <span className="block text-sm text-muted-foreground">
          {d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })}
        </span>
      </span>
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-foreground bg-foreground text-background' : 'border-border',
        )}
        aria-hidden="true"
      >
        {selected && <Check className="h-3 w-3" />}
      </span>
    </button>
  );
}

export type AchatEtape = 'decider' | 'organiser' | 'demande_envoyee' | 'visite_prevue' | 'apres_visite' | 'offre' | 'acceptee' | 'ecarte';

/** Visite à venir réellement retenue (confirmée par le client ou déléguée au conseiller). */
export function visiteRetenue(visitesDuBien: any[]) {
  const now = Date.now();
  return visitesDuBien
    .filter((v) =>
      v.date_visite && new Date(v.date_visite).getTime() >= now &&
      !['annulee', 'refusee', 'proposee'].includes(v.statut) &&
      (v.statut === 'confirmee' || !!v.client_confirme_visite_at || v.est_deleguee === true),
    )
    .sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime())[0];
}

/**
 * Étape du parcours d'achat pour un bien, déduite de l'offre et de ses visites.
 * `demandeEnvoyee` : une demande de visite (sans date) a déjà été transmise au conseiller.
 */
export function etapeAchat(offre: any, visitesDuBien: any[], demandeEnvoyee = false): AchatEtape {
  const s = offre?.statut;
  if (s === 'refusee') return 'ecarte';
  if (s === 'acceptee') return 'acceptee';
  if (s === 'offre_envisagee') return 'offre';
  if (canDecideOnOffre(offre, visitesDuBien)) return 'apres_visite';
  if (visiteRetenue(visitesDuBien) || s === 'visite_planifiee' || s === 'visite_confirmee') return 'visite_prevue';
  if (s === 'interesse') {
    const creneaux = visitesDuBien.some((v) =>
      ['proposee', 'planifiee'].includes(v.statut) && v.est_deleguee !== true && !v.client_confirme_visite_at &&
      v.date_visite && new Date(v.date_visite).getTime() > Date.now());
    return demandeEnvoyee && !creneaux ? 'demande_envoyee' : 'organiser';
  }
  return 'decider';
}

export function prochaineVisite(visitesDuBien: any[]) {
  const now = Date.now();
  return visitesDuBien
    .filter((v) => v.date_visite && new Date(v.date_visite).getTime() >= now && !['annulee', 'refusee'].includes(v.statut))
    .sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime())[0];
}

export function formatVisite(iso: string) {
  return new Date(iso).toLocaleString('fr-CH', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich',
  });
}

export interface AchatActionsHandlers {
  onVisiter: (offre: any) => void;
  onDeleguer: (offre: any) => void;
  onRefuser: (offre: any) => void;
  onInteret: (offre: any) => void;
  onVisiteFaite: (offre: any) => void;
  onFaireOffre: (offre: any) => void;
  onRenoncer: (offre: any) => void;
}

/** Bloc « prochaine étape » : une seule action claire par bien (identique carte et fiche). */
export function AchatProchaineEtape({
  offre, visitesDuBien, handlers, busy, compact, demandeEnvoyee = false,
}: {
  offre: any;
  visitesDuBien: any[];
  handlers: AchatActionsHandlers;
  busy?: boolean;
  compact?: boolean;
  demandeEnvoyee?: boolean;
}) {
  const etape = etapeAchat(offre, visitesDuBien, demandeEnvoyee);
  const prochaine = prochaineVisite(visitesDuBien);
  const retenue = visiteRetenue(visitesDuBien);
  const btn = compact ? 'h-11 w-full rounded-full' : 'h-11 rounded-full';
  const lien = 'mt-2 w-full py-1.5 text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50';

  if (etape === 'decider' || etape === 'organiser') {
    const enAttente = ACHAT_A_REPONDRE.includes(offre.statut);
    return (
      <>
        <p className="text-sm font-semibold text-foreground">
          {enAttente ? 'Ce bien vous intéresse ?' : 'Organisez la visite'}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {prochaine
            ? `Visite proposée le ${formatVisite(prochaine.date_visite)}`
            : 'Visitez avec votre conseiller, ou déléguez-lui la visite.'}
        </p>
        <div className={cn('mt-3 grid gap-2', !compact && 'sm:grid-cols-2')}>
          <Button className={btn} disabled={busy} onClick={() => handlers.onVisiter(offre)}>
            <Calendar className="mr-2 h-4 w-4" />
            Je visite avec mon conseiller
          </Button>
          <Button variant="outline" className={btn} disabled={busy} onClick={() => handlers.onDeleguer(offre)}>
            <User className="mr-2 h-4 w-4" />
            Mon conseiller visite pour moi
          </Button>
        </div>
        <button type="button" disabled={busy} onClick={() => handlers.onRefuser(offre)} className={lien}>
          {enAttente ? 'Pas intéressé' : 'Je ne suis plus intéressé'}
        </button>
      </>
    );
  }

  if (etape === 'demande_envoyee') {
    return (
      <>
        <p className="text-sm font-semibold text-foreground">Demande de visite envoyée</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Votre conseiller convient d'une date avec le vendeur et vous la propose ici et dans votre agenda.
        </p>
        <button type="button" disabled={busy} onClick={() => handlers.onRefuser(offre)} className={lien}>
          Je ne suis plus intéressé
        </button>
      </>
    );
  }

  if (etape === 'visite_prevue') {
    return (
      <>
        <p className="text-sm font-semibold text-foreground">
          {retenue?.est_deleguee ? 'Votre conseiller visite pour vous' : 'Visite planifiée'}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {retenue
            ? `${formatVisite(retenue.date_visite)}${retenue.est_deleguee ? ' · compte-rendu et vidéo ensuite' : ''}`
            : 'La date apparaît dans votre agenda.'}
        </p>
        {retenue ? (
          <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-center text-xs text-muted-foreground">
            {retenue.est_deleguee ? 'Vous serez notifié dès que le compte-rendu est disponible.' : 'La suite vous sera proposée après la visite.'}
          </p>
        ) : (
          <Button variant="outline" className={cn(btn, 'mt-3 w-full')} disabled={busy} onClick={() => handlers.onVisiteFaite(offre)}>
            <Check className="mr-2 h-4 w-4" />
            J'ai fait la visite
          </Button>
        )}
        <button type="button" disabled={busy} onClick={() => handlers.onRefuser(offre)} className={lien}>
          Je ne suis plus intéressé
        </button>
      </>
    );
  }

  if (etape === 'apres_visite') {
    return (
      <>
        <p className="text-sm font-semibold text-foreground">Après la visite, souhaitez-vous faire une offre d'achat ?</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Votre conseiller prépare l'offre et la négociation avec vous.</p>
        <Button className={cn(btn, 'mt-3 w-full')} disabled={busy} onClick={() => handlers.onFaireOffre(offre)}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
          Je souhaite faire une offre
        </Button>
        <button type="button" disabled={busy} onClick={() => handlers.onRenoncer(offre)} className={lien}>
          Ce bien ne me convient pas
        </button>
      </>
    );
  }

  if (etape === 'offre') {
    return (
      <p className="text-sm text-muted-foreground">
        Votre souhait d'offre d'achat est transmis. Votre conseiller vous recontacte pour la préparer et négocier.
      </p>
    );
  }

  if (etape === 'acceptee') {
    return <p className="text-sm font-medium text-foreground">Bonne nouvelle : votre offre d'achat est acceptée.</p>;
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">Vous avez écarté ce bien.</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => handlers.onInteret(offre)}
        className="mt-1 text-sm font-medium text-foreground underline underline-offset-4 disabled:opacity-50"
      >
        Finalement, ce bien m'intéresse
      </button>
    </>
  );
}

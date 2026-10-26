import type React from 'react';
import { Home } from 'lucide-react';
import { offrePhotoUrl } from '@/components/visites/VisitDetailParts';
import type { UnifiedCandidature } from '@/hooks/useCandidatCandidatures';
import { RETENU_BAILLEUR } from '@/hooks/useCandidatCandidatures';

/**
 * Briques visuelles de l'espace candidat (tableau de bord, candidatures, agenda).
 * Purement visuelles : aucune requête, uniquement les données déjà chargées par useCandidatCandidatures.
 */

export const CANDIDATURE_CLOSED = ['refuse', 'refusee', 'desiste'];

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

const SUCCESS = [RETENU_BAILLEUR, 'accepte', 'acceptee', 'bail_signe', 'bail_conclu', 'signature_effectuee', 'etat_lieux_fixe', 'etat_lieux_effectue', 'cles_remises'];
const WARNING = ['documents_demandes'];

/** Couleur de la pastille de statut d'une candidature. */
export function candidatureTone(c: UnifiedCandidature): Tone {
  if (c.annulee) return 'danger';
  if (CANDIDATURE_CLOSED.includes(c.statut)) return 'danger';
  if (SUCCESS.includes(c.statut)) return 'success';
  if (WARNING.includes(c.statut)) return 'warning';
  return 'primary';
}

/** Annonce publique liée (candidature de location). */
export const annonceOf = (c: UnifiedCandidature) => c.raw?.annonces_publiques ?? null;

/** Photo principale connue, sans requête : annonce publique (location) ou galerie de l'offre (candidature agent). */
export function candidaturePhoto(c: UnifiedCandidature): string | null {
  if (c.source === 'location') {
    const a = annonceOf(c);
    if (a?.lien_annonce) return null;
    const p = a?.photos_annonces_publiques as { url: string; est_principale: boolean }[] | undefined;
    if (!p?.length) return null;
    return (p.find((x) => x.est_principale) ?? p[0]).url;
  }
  return offrePhotoUrl({ medias_galerie: c.medias_galerie });
}

/** Libellé « prochaine étape » d'une candidature (affichage seul). */
export function prochaineEtape(c: UnifiedCandidature, now = Date.now()): string {
  if (c.annulee) return 'Visite annulée : une nouvelle date vous sera proposée';
  const visitePassee = !!c.date_visite && new Date(c.date_visite).getTime() < now;
  switch (c.statut) {
    case 'en_attente':
    case 'visite_planifiee':
      if (c.source === 'location' && c.date_visite) {
        if (!visitePassee) return 'Rendez-vous à la visite';
        return c.raw?.visite_confirmee === true ? 'Déposez votre dossier' : 'Confirmez que vous avez visité';
      }
      return 'En attente de réponse';
    case 'visite_effectuee': return 'Déposez votre dossier';
    case 'en_analyse': return 'Dossier en cours d’analyse';
    case 'candidature_deposee': return 'Dossier transmis au bailleur';
    case 'documents_demandes': return 'Transmettez les pièces demandées';
    case RETENU_BAILLEUR:
      if (c.source !== 'location') return 'Transmettez les pièces demandées';
      return c.raw?.candidat_confirme_at ? 'Préparation du bail' : 'Confirmez vouloir conclure';
    case 'accepte':
    case 'acceptee':
    case 'attente_bail': return 'Bail en préparation';
    case 'bail_recu':
    case 'signature_planifiee': return 'Signature du bail';
    case 'bail_signe':
    case 'signature_effectuee':
    case 'bail_conclu': return 'État des lieux à venir';
    case 'etat_lieux_fixe':
    case 'etat_lieux_effectue': return 'Remise des clés';
    case 'cles_remises': return 'Terminé : bienvenue chez vous';
    case 'refuse':
    case 'refusee':
    case 'desiste': return 'Candidature close';
    default: return 'Suivi par l’équipe Immo-Rama';
  }
}

/** Montant suisse : « CHF 2'400 ». */
export function formatChf(v?: number | string | null, suffix = ''): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return `CHF ${new Intl.NumberFormat('fr-CH').format(n).replace(/[  \s]/g, "'")}${suffix}`;
}

/** Vignette photo arrondie (ou pictogramme maison). */
export function CandidatureThumb({ src, alt, className = 'h-14 w-14' }: { src: string | null; alt: string; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted text-muted-foreground ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <Home className="h-6 w-6" aria-hidden="true" />
      )}
    </span>
  );
}

/** Ligne compacte cliquable (tableau de bord) : vignette, adresse, prochaine étape, pastille. */
export function CandidatureRow({ c, badge, sub, onClick }: { c: UnifiedCandidature; badge?: React.ReactNode; sub?: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-muted/50 active:scale-[0.99]"
    >
      <CandidatureThumb src={candidaturePhoto(c)} alt={c.adresse} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">{c.adresse}</span>
        <span className="block truncate text-sm text-muted-foreground">{sub ?? prochaineEtape(c)}</span>
      </span>
      {badge && <span className="hidden shrink-0 sm:block">{badge}</span>}
    </button>
  );
}

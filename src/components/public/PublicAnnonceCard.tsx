import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Bed, Maximize2, Heart, ExternalLink, Sparkles, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { usePublicFavoris } from '@/hooks/usePublicFavoris';
import { ExternalListingPlaceholder } from '@/components/public/ExternalListingPlaceholder';
import { useAuth } from '@/contexts/AuthContext';



interface AnnonceData {
  id: string;
  titre: string;
  slug: string;
  type_transaction: string;
  prix: number;
  charges_mensuelles?: number;
  ville: string;
  canton?: string;
  nombre_pieces?: number;
  nb_chambres?: number;
  surface_habitable?: number;
  nb_vues?: number;
  est_mise_en_avant?: boolean;
  /** Annonce « sourcée » (issue d'un portail externe) : lien de l'annonce d'origine */
  lien_annonce?: string | null;
  disponible_immediatement?: boolean;
  annonceurs?: {
    id?: string;
    nom: string;

    nom_entreprise?: string;
    type_annonceur: string;
    logo_url?: string;
    note_moyenne?: number;
  };
  categories_annonces?: {
    nom: string;
    slug: string;
    icone?: string;
  };
  photos_annonces_publiques?: Array<{
    url: string;
    est_principale: boolean;
  }>;
}

interface PublicAnnonceCardProps {
  annonce: AnnonceData;
  featured?: boolean;
  compact?: boolean;
}

export function PublicAnnonceCard({ annonce, featured, compact }: PublicAnnonceCardProps) {
  const navigate = useNavigate();
  const { userRoles } = useAuth();
  const { isFavorite: isFav, toggleFavorite } = usePublicFavoris();

  const [, setIsHovered] = useState(false);
  const isFavorite = isFav(annonce.id);

  const mainPhoto = annonce.photos_annonces_publiques?.find(p => p.est_principale)?.url 
    || annonce.photos_annonces_publiques?.[0]?.url
    || '/placeholder.svg';

  const formatPrice = (price: number, type: string) => {
    const formatted = new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: 'CHF',
      maximumFractionDigits: 0,
    }).format(price);
    
    return type === 'location' ? `${formatted}/mois` : formatted;
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleFavorite(annonce.id);
  };

  const advertiserName = annonce.annonceurs?.nom_entreprise || annonce.annonceurs?.nom || 'Annonceur';

  // Annonce sourcée + visiteur public : on n'héberge pas la fiche, on renvoie à la source
  const externalOnly = !!annonce.lien_annonce && !userRoles.some((role) => role === 'admin' || role === 'agent');

  const linkCls =
    'block rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background';

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    externalOnly ? (
      <a
        href={annonce.lien_annonce as string}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={linkCls}
      >
        {children}
      </a>
    ) : (
      <Link to={`/annonces/${annonce.slug || annonce.id}`} className={linkCls}>{children}</Link>
    );

  const typeLabel = annonce.type_transaction === 'vente' ? 'À vendre' : 'À louer';
  const chip =
    'inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium leading-4 text-foreground';
  const photoCount = annonce.photos_annonces_publiques?.length ?? 0;

  return (
    <Wrapper>
      <article
        className={cn('group', compact ? 'flex flex-row h-28 gap-3' : 'flex flex-col', featured && 'is-featured')}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Photo */}
        <div
          className={cn(
            'relative overflow-hidden bg-muted',
            compact ? 'w-32 h-full shrink-0 rounded-[10px]' : 'aspect-[4/3] rounded-[14px]',
          )}
        >
          {externalOnly ? (
            <ExternalListingPlaceholder />
          ) : (
            <img
              src={mainPhoto}
              alt={`${annonce.titre} — ${annonce.ville}`}
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src.endsWith('/placeholder.svg')) return;
                img.src = '/placeholder.svg';
              }}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          )}

          {/* Étiquettes : une seule famille, blanches, sans ombre */}
          <div className={cn('absolute flex flex-wrap gap-1.5', compact ? 'top-1.5 left-1.5 right-1.5' : 'top-3 left-3 right-12')}>
            <span className={chip}>{typeLabel}</span>
            {annonce.est_mise_en_avant && (
              <span className={chip}>
                <Sparkles className="h-3 w-3 text-primary fill-current" aria-hidden="true" />
                Excellente offre
              </span>
            )}
            {externalOnly && (
              <span className={chip}>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                Annonce externe
              </span>
            )}
            {annonce.disponible_immediatement && <span className={chip}>Dispo</span>}
          </div>

          {/* Favori */}
          <Button
            variant="ghost"
            size="icon"
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={cn(
              'absolute rounded-full bg-background text-foreground hover:bg-background hover:scale-105 transition-transform duration-150',
              compact ? 'bottom-1.5 right-1.5 h-7 w-7' : 'top-2.5 right-2.5 h-8 w-8',
              isFavorite && 'text-red-500 hover:text-red-500',
            )}
            onClick={handleFavoriteClick}
          >
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
          </Button>

          {/* Bulle annonceur (uniquement si logo/photo) */}
          {!compact && annonce.annonceurs?.logo_url && annonce.annonceurs?.id && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/annonceur/${annonce.annonceurs!.id}`);
              }}
              title={advertiserName}
              aria-label={`Voir toutes les annonces de ${advertiserName}`}
              className="absolute bottom-3 right-3 h-9 w-9 rounded-full overflow-hidden border-2 border-background bg-background hover:scale-105 transition-transform duration-150"
            >
              <img src={annonce.annonceurs.logo_url} alt={advertiserName} className="h-full w-full object-cover" />
            </button>
          )}

          {/* Nombre de photos */}
          {!compact && photoCount > 1 && (
            <span
              className={cn(chip, 'absolute bottom-3 tabular-nums', annonce.annonceurs?.logo_url ? 'right-14' : 'right-3')}
              aria-label={`${photoCount} photos`}
            >
              <Camera className="h-3 w-3" aria-hidden="true" />
              {photoCount}
            </span>
          )}
        </div>

        {/* Texte */}
        <div className={cn('min-w-0', compact ? 'flex flex-1 flex-col justify-center' : 'pt-3')}>
          {compact && (
            <span className="text-sm font-semibold text-foreground tabular-nums mb-0.5">
              {formatPrice(annonce.prix, annonce.type_transaction)}
            </span>
          )}

          <h3
            className={cn(
              'text-foreground line-clamp-2 leading-snug decoration-1 underline-offset-2 group-hover:underline',
              compact ? 'text-xs mb-0.5' : 'text-[15px]',
            )}
          >
            {annonce.titre}
          </h3>

          <p className={cn('flex items-center gap-1 text-muted-foreground', compact ? 'text-xs' : 'mt-1 text-sm')}>
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">
              {annonce.ville}{annonce.canton && `, ${annonce.canton}`}
            </span>
          </p>

          {!compact && (annonce.nombre_pieces || annonce.surface_habitable || annonce.nb_chambres) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground tabular-nums">
              {annonce.nombre_pieces && (
                <span className="inline-flex items-center gap-1">
                  <Bed className="h-3.5 w-3.5" aria-hidden="true" />
                  {annonce.nombre_pieces} p.
                </span>
              )}
              {annonce.surface_habitable && (
                <span className="inline-flex items-center gap-1">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {annonce.surface_habitable} m²
                </span>
              )}
              {annonce.nb_chambres && <span>{annonce.nb_chambres} ch.</span>}
            </p>
          )}

          {!compact && (
            <p className="mt-2 text-base font-semibold text-foreground tabular-nums">
              {formatPrice(annonce.prix, annonce.type_transaction)}
              {annonce.charges_mensuelles && annonce.type_transaction === 'location' && (
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                  + {annonce.charges_mensuelles} CHF/mois
                </span>
              )}
            </p>
          )}

          {compact && (
            <div className="flex items-center gap-1.5 mt-auto">
              {annonce.annonceurs?.logo_url && (
                <img
                  src={annonce.annonceurs.logo_url}
                  alt={advertiserName}
                  className="h-5 w-5 rounded-full object-cover border border-border"
                />
              )}
              <span className="text-xs text-muted-foreground line-clamp-1">{advertiserName}</span>
            </div>
          )}
        </div>
      </article>
    </Wrapper>
  );
}

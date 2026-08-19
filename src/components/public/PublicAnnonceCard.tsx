import { Link } from 'react-router-dom';
import { MapPin, Bed, Maximize2, Building2, Heart, Star, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { usePublicFavoris } from '@/hooks/usePublicFavoris';


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
  /** true si le clic doit ouvrir la fiche interne (client connecté) */
  allowInternalDetail?: boolean;
  disponible_immediatement?: boolean;
  annonceurs?: {
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
  const externalOnly = !!annonce.lien_annonce && !annonce.allowInternalDetail;

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    externalOnly ? (
      <a
        href={annonce.lien_annonce as string}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="block"
      >
        {children}
      </a>
    ) : (
      <Link to={`/annonces/${annonce.slug || annonce.id}`}>{children}</Link>
    );

  return (
    <Wrapper>
      <Card 
        className={cn(
          "group overflow-hidden transition-all duration-200 hover:shadow-lg border-border/50 bg-card",
          featured && "ring-2 ring-primary/20 shadow-md",
          compact ? "flex flex-row h-28" : "hover:-translate-y-0.5"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className={cn(
          "relative overflow-hidden bg-muted",
          compact ? "w-32 h-full shrink-0" : "aspect-[4/3]"
        )}>
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
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}


          {/* Gradient + Price overlay */}
          {!compact && (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-2 rounded-md bg-background/95 backdrop-blur-sm px-2 py-1 text-sm font-bold text-primary shadow-sm">
                {formatPrice(annonce.prix, annonce.type_transaction)}
              </span>
            </>
          )}

          {/* Overlay badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            <Badge 
              variant={annonce.type_transaction === 'vente' ? 'default' : 'secondary'}
              className="text-[10px] font-semibold px-1.5 py-0.5 shadow-sm"
            >
              {annonce.type_transaction === 'vente' ? 'À vendre' : 'À louer'}
            </Badge>
            {featured && annonce.est_mise_en_avant && (
              <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] shadow-sm px-1.5 py-0.5">
                <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                Vedette
              </Badge>
            )}
            {externalOnly && (
              <Badge variant="secondary" className="bg-background/95 text-foreground/80 text-[10px] shadow-sm px-1.5 py-0.5">
                <ExternalLink className="h-2.5 w-2.5 mr-0.5" />
                Annonce externe
              </Badge>
            )}
            {annonce.disponible_immediatement && (
              <Badge variant="outline" className="bg-emerald-500/90 text-white border-0 text-[10px] shadow-sm px-1.5 py-0.5">
                Dispo
              </Badge>
            )}
          </div>

          {/* Favorite button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-2 right-2 h-7 w-7 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-sm transition-all",
              isFavorite && "text-red-500"
            )}
            onClick={handleFavoriteClick}
          >
            <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
          </Button>

          {/* Photo count indicator */}
          {!compact && annonce.photos_annonces_publiques && annonce.photos_annonces_publiques.length > 1 && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="secondary" className="bg-background/95 backdrop-blur-sm text-[10px] font-medium shadow-sm px-1.5 py-0.5">
                {annonce.photos_annonces_publiques.length}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className={cn("flex-1", compact ? "p-2.5 flex flex-col justify-center" : "p-3")}>
          {/* Price - compact mode only */}
          {compact && (
            <span className="font-bold text-primary text-base mb-0.5">
              {formatPrice(annonce.prix, annonce.type_transaction)}
            </span>
          )}

          {/* Title */}
          <h3 className={cn(
            "font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2",
            compact ? "text-xs mb-0.5" : "text-sm mb-1"
          )}>
            {annonce.titre}
          </h3>

          {/* Location */}
          <div className={cn(
            "flex items-center gap-1 text-muted-foreground",
            compact ? "text-[10px] mb-1" : "text-xs mb-2"
          )}>
            <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="line-clamp-1">
              {annonce.ville}{annonce.canton && `, ${annonce.canton}`}
            </span>
          </div>

          {/* Features - compact inline pills */}
          {!compact && (
            <div className="flex items-center flex-wrap gap-2">
              {annonce.nombre_pieces && (
                <div className="flex items-center gap-1 bg-muted/60 rounded-full px-2 py-0.5">
                  <Bed className="h-3 w-3 text-primary/80" />
                  <span className="text-[11px] font-medium">{annonce.nombre_pieces} p.</span>
                </div>
              )}
              {annonce.surface_habitable && (
                <div className="flex items-center gap-1 bg-muted/60 rounded-full px-2 py-0.5">
                  <Maximize2 className="h-3 w-3 text-primary/80" />
                  <span className="text-[11px] font-medium">{annonce.surface_habitable} m²</span>
                </div>
              )}
              {annonce.nb_chambres && (
                <div className="flex items-center gap-1 bg-muted/60 rounded-full px-2 py-0.5">
                  <span className="text-[11px] font-medium">{annonce.nb_chambres} ch.</span>
                </div>
              )}
              {annonce.charges_mensuelles && annonce.type_transaction === 'location' && (
                <span className="text-[10px] text-muted-foreground">
                  + {annonce.charges_mensuelles} CHF/mois
                </span>
              )}
            </div>
          )}

          {/* Compact mode footer */}
          {compact && (
            <div className="flex items-center gap-1.5 mt-auto">
              {annonce.annonceurs?.logo_url ? (
                <img 
                  src={annonce.annonceurs.logo_url} 
                  alt={advertiserName}
                  className="h-5 w-5 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-3 w-3 text-primary" />
                </div>
              )}
              <span className="text-[10px] text-muted-foreground line-clamp-1">{advertiserName}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Wrapper>
  );
}

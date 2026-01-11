import { Link } from 'react-router-dom';
import { MapPin, Bed, Maximize2, Building2, Heart, Star, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

    if (!user) {
      toast.info('Connectez-vous pour ajouter des favoris');
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('favoris_annonces')
          .delete()
          .eq('user_id', user.id)
          .eq('annonce_id', annonce.id);
        setIsFavorite(false);
        toast.success('Retiré des favoris');
      } else {
        await supabase
          .from('favoris_annonces')
          .insert({ user_id: user.id, annonce_id: annonce.id });
        setIsFavorite(true);
        toast.success('Ajouté aux favoris');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour des favoris');
    }
  };

  const advertiserName = annonce.annonceurs?.nom_entreprise || annonce.annonceurs?.nom || 'Annonceur';

  return (
    <Link to={`/annonces/${annonce.slug || annonce.id}`}>
      <Card 
        className={cn(
          "group overflow-hidden transition-all duration-300 hover:shadow-xl border-border/50 bg-card",
          featured && "ring-2 ring-primary/20 shadow-md",
          compact ? "flex flex-row h-32" : "hover:-translate-y-1"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className={cn(
          "relative overflow-hidden bg-muted",
          compact ? "w-36 h-full shrink-0" : "aspect-[16/10]"
        )}>
          <img
            src={mainPhoto}
            alt={annonce.titre}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge 
              variant={annonce.type_transaction === 'vente' ? 'default' : 'secondary'}
              className="text-xs font-semibold px-2.5 py-1 shadow-sm"
            >
              {annonce.type_transaction === 'vente' ? 'À vendre' : 'À louer'}
            </Badge>
            {featured && annonce.est_mise_en_avant && (
              <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-xs shadow-sm">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Vedette
              </Badge>
            )}
            {annonce.disponible_immediatement && (
              <Badge variant="outline" className="bg-emerald-500/90 text-white border-0 text-xs shadow-sm">
                Disponible
              </Badge>
            )}
          </div>

          {/* Favorite button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-3 right-3 h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-sm transition-all",
              isFavorite && "text-red-500"
            )}
            onClick={handleFavoriteClick}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </Button>

          {/* Category badge - Bottom left */}
          {annonce.categories_annonces && !compact && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="secondary" className="bg-background/95 backdrop-blur-sm text-xs font-medium shadow-sm">
                <Building2 className="h-3 w-3 mr-1.5" />
                {annonce.categories_annonces.nom}
              </Badge>
            </div>
          )}

          {/* Photo count indicator */}
          {!compact && annonce.photos_annonces_publiques && annonce.photos_annonces_publiques.length > 1 && (
            <div className="absolute bottom-3 right-3">
              <Badge variant="secondary" className="bg-background/95 backdrop-blur-sm text-xs font-medium shadow-sm">
                {annonce.photos_annonces_publiques.length} photos
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className={cn("flex-1", compact ? "p-3 flex flex-col justify-center" : "p-5")}>
          {/* Price - Large and prominent */}
          <div className="flex items-baseline justify-between mb-2">
            <span className={cn(
              "font-bold text-primary",
              compact ? "text-lg" : "text-2xl"
            )}>
              {formatPrice(annonce.prix, annonce.type_transaction)}
            </span>
            {annonce.charges_mensuelles && annonce.type_transaction === 'location' && !compact && (
              <span className="text-sm text-muted-foreground">
                + {annonce.charges_mensuelles} CHF/mois
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={cn(
            "font-semibold text-foreground group-hover:text-primary transition-colors",
            compact ? "text-sm line-clamp-1 mb-1" : "text-lg line-clamp-2 mb-2"
          )}>
            {annonce.titre}
          </h3>

          {/* Location */}
          <div className={cn(
            "flex items-center gap-1.5 text-muted-foreground",
            compact ? "text-xs mb-1" : "text-sm mb-4"
          )}>
            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
            <span className="line-clamp-1">
              {annonce.ville}{annonce.canton && `, ${annonce.canton}`}
            </span>
          </div>

          {/* Features - Key info in pills */}
          {!compact && (
            <div className="flex items-center flex-wrap gap-3 mb-4">
              {annonce.nombre_pieces && (
                <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5">
                  <Bed className="h-4 w-4 text-primary/80" />
                  <span className="text-sm font-medium">{annonce.nombre_pieces} pièces</span>
                </div>
              )}
              {annonce.surface_habitable && (
                <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5">
                  <Maximize2 className="h-4 w-4 text-primary/80" />
                  <span className="text-sm font-medium">{annonce.surface_habitable} m²</span>
                </div>
              )}
              {annonce.nb_chambres && (
                <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5">
                  <span className="text-sm font-medium">{annonce.nb_chambres} ch.</span>
                </div>
              )}
            </div>
          )}

          {/* Footer - Advertiser info */}
          {!compact && (
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-2.5">
                {annonce.annonceurs?.logo_url ? (
                  <img 
                    src={annonce.annonceurs.logo_url} 
                    alt={advertiserName}
                    className="h-8 w-8 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium line-clamp-1">
                    {advertiserName}
                  </span>
                  {annonce.annonceurs?.note_moyenne && annonce.annonceurs.note_moyenne > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs text-muted-foreground">{annonce.annonceurs.note_moyenne.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
              {annonce.nb_vues && annonce.nb_vues > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">{annonce.nb_vues} vues</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
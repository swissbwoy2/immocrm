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
          "group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50",
          featured && "ring-2 ring-primary/20",
          compact && "flex flex-row"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className={cn(
          "relative overflow-hidden bg-muted",
          compact ? "w-32 h-32 shrink-0" : "aspect-[4/3]"
        )}>
          <img
            src={mainPhoto}
            alt={annonce.titre}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Overlay badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            <Badge 
              variant={annonce.type_transaction === 'vente' ? 'default' : 'secondary'}
              className="text-xs font-semibold"
            >
              {annonce.type_transaction === 'vente' ? 'À vendre' : 'À louer'}
            </Badge>
            {featured && annonce.est_mise_en_avant && (
              <Badge variant="default" className="bg-warning text-warning-foreground text-xs">
                <Star className="h-3 w-3 mr-1" />
                Vedette
              </Badge>
            )}
            {annonce.disponible_immediatement && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                Disponible
              </Badge>
            )}
          </div>

          {/* Favorite button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all",
              isFavorite && "text-destructive"
            )}
            onClick={handleFavoriteClick}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </Button>

          {/* Category badge */}
          {annonce.categories_annonces && !compact && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                {annonce.categories_annonces.nom}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className={cn("p-4", compact && "flex-1")}>
          {/* Price */}
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xl font-bold text-primary">
              {formatPrice(annonce.prix, annonce.type_transaction)}
            </span>
            {annonce.charges_mensuelles && annonce.type_transaction === 'location' && (
              <span className="text-xs text-muted-foreground">
                + {annonce.charges_mensuelles} CHF charges
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
            {annonce.titre}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">
              {annonce.ville}{annonce.canton && `, ${annonce.canton}`}
            </span>
          </div>

          {/* Features */}
          {!compact && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              {annonce.nombre_pieces && (
                <div className="flex items-center gap-1">
                  <Bed className="h-4 w-4" />
                  <span>{annonce.nombre_pieces} pièces</span>
                </div>
              )}
              {annonce.surface_habitable && (
                <div className="flex items-center gap-1">
                  <Maximize2 className="h-4 w-4" />
                  <span>{annonce.surface_habitable} m²</span>
                </div>
              )}
            </div>
          )}

          {/* Footer - Advertiser info */}
          {!compact && (
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                {annonce.annonceurs?.logo_url ? (
                  <img 
                    src={annonce.annonceurs.logo_url} 
                    alt={advertiserName}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-primary" />
                  </div>
                )}
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {advertiserName}
                </span>
                {annonce.annonceurs?.note_moyenne && annonce.annonceurs.note_moyenne > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-warning fill-warning" />
                    <span className="text-xs font-medium">{annonce.annonceurs.note_moyenne.toFixed(1)}</span>
                  </div>
                )}
              </div>
              {annonce.nb_vues && annonce.nb_vues > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  <span>{annonce.nb_vues}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
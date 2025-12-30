import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Maximize2, 
  BedDouble, 
  Heart, 
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  url: string;
  est_principale: boolean;
}

interface Agent {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  avatar_url?: string;
}

interface PremiumAnnonceCardProps {
  immeuble: {
    id: string;
    nom: string;
    type_bien: string;
    commune: string;
    canton: string;
    surface_totale: number;
    nombre_pieces: number;
    prix_vente_demande: number;
    description_commerciale?: string;
    points_forts?: string[];
  };
  photos: Photo[];
  agent?: Agent;
  onInteret: (type: 'interet' | 'visite' | 'brochure') => void;
  isLoading?: boolean;
}

export function PremiumAnnonceCard({ 
  immeuble, 
  photos, 
  agent, 
  onInteret,
  isLoading = false 
}: PremiumAnnonceCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const sortedPhotos = [...photos].sort((a, b) => 
    (b.est_principale ? 1 : 0) - (a.est_principale ? 1 : 0)
  );

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % sortedPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + sortedPhotos.length) % sortedPhotos.length);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: 'CHF',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getTypeBienLabel = (type: string) => {
    const labels: Record<string, string> = {
      appartement: 'Appartement',
      maison: 'Maison',
      villa: 'Villa',
      studio: 'Studio',
      loft: 'Loft',
      attique: 'Attique',
      duplex: 'Duplex',
      chalet: 'Chalet',
      terrain: 'Terrain',
      commercial: 'Local commercial',
      bureau: 'Bureau',
      parking: 'Parking',
      cave: 'Cave'
    };
    return labels[type] || type;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
    >
      {/* Photo Slider */}
      <div className="relative h-64 bg-muted">
        {sortedPhotos.length > 0 ? (
          <>
            <img
              src={sortedPhotos[currentPhotoIndex]?.url}
              alt={`Photo ${currentPhotoIndex + 1}`}
              className="w-full h-full object-cover"
            />
            
            {sortedPhotos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                
                {/* Photo indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {sortedPhotos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        idx === currentPhotoIndex 
                          ? "bg-primary w-4" 
                          : "bg-background/60 hover:bg-background/80"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <span>Aucune photo</span>
          </div>
        )}

        {/* Type badge */}
        <Badge className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm">
          {getTypeBienLabel(immeuble.type_bien)}
        </Badge>

        {/* Price badge */}
        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg font-bold text-lg">
          {formatPrice(immeuble.prix_vente_demande)}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title and location */}
        <div>
          <h3 className="text-xl font-semibold line-clamp-1">{immeuble.nom}</h3>
          <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            <span>{immeuble.commune}, {immeuble.canton}</span>
          </div>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Maximize2 className="h-4 w-4 text-primary" />
            <span>{immeuble.surface_totale} m²</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BedDouble className="h-4 w-4 text-primary" />
            <span>{immeuble.nombre_pieces} pièces</span>
          </div>
        </div>

        {/* Description */}
        {immeuble.description_commerciale && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {immeuble.description_commerciale}
          </p>
        )}

        {/* Points forts */}
        {immeuble.points_forts && immeuble.points_forts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {immeuble.points_forts.slice(0, 3).map((point, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {point}
              </Badge>
            ))}
            {immeuble.points_forts.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{immeuble.points_forts.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Agent info */}
        {agent && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={agent.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {agent.prenom?.[0]}{agent.nom?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{agent.prenom} {agent.nom}</p>
              <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
            </div>
            {agent.telephone && (
              <a 
                href={`tel:${agent.telephone}`}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <Phone className="h-4 w-4 text-primary" />
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onInteret('interet')}
            disabled={isLoading}
            className="flex-1"
          >
            <Heart className="h-4 w-4 mr-2" />
            Intéressé
          </Button>
          <Button
            onClick={() => onInteret('visite')}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Visite
          </Button>
          <Button
            onClick={() => onInteret('brochure')}
            disabled={isLoading}
            variant="ghost"
            size="icon"
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

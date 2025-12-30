import { useState } from 'react';
import { 
  Image, Star, Trash2, GripVertical, ChevronLeft, ChevronRight, X,
  Maximize2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Photo {
  id: string;
  url: string;
  legende: string | null;
  ordre: number;
  est_principale: boolean;
  type_photo: string | null;
}

interface PremiumPhotoGalleryProps {
  photos: Photo[];
  onSetPrimary?: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  onReorder?: (photos: Photo[]) => void;
  readOnly?: boolean;
}

const TYPE_PHOTO_LABELS: Record<string, string> = {
  facade: 'Façade',
  salon: 'Salon',
  cuisine: 'Cuisine',
  chambre: 'Chambre',
  salle_bain: 'Salle de bain',
  exterieur: 'Extérieur',
  vue: 'Vue',
  autre: 'Autre'
};

export function PremiumPhotoGallery({ 
  photos, 
  onSetPrimary, 
  onDelete, 
  readOnly = false 
}: PremiumPhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const sortedPhotos = [...photos].sort((a, b) => a.ordre - b.ordre);

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < sortedPhotos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (photos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Image className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Aucune photo</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedPhotos.map((photo, index) => (
          <Card 
            key={photo.id} 
            className={`group overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
              photo.est_principale ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="relative aspect-[4/3]">
              <img
                src={photo.url}
                alt={photo.legende || `Photo ${index + 1}`}
                className="w-full h-full object-cover"
                onClick={() => openLightbox(index)}
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button 
                  variant="secondary" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openLightbox(index)}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                
                {!readOnly && onSetPrimary && !photo.est_principale && (
                  <Button 
                    variant="secondary" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetPrimary(photo.id);
                    }}
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}
                
                {!readOnly && onDelete && (
                  <Button 
                    variant="secondary" 
                    size="icon"
                    className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(photo.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Primary badge */}
              {photo.est_principale && (
                <Badge className="absolute top-2 left-2 bg-primary">
                  <Star className="w-3 h-3 mr-1" />
                  Principale
                </Badge>
              )}

              {/* Type badge */}
              {photo.type_photo && (
                <Badge variant="secondary" className="absolute top-2 right-2">
                  {TYPE_PHOTO_LABELS[photo.type_photo] || photo.type_photo}
                </Badge>
              )}
            </div>
            
            {photo.legende && (
              <CardContent className="p-2">
                <p className="text-sm text-muted-foreground truncate">
                  {photo.legende}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          {selectedIndex !== null && (
            <div className="relative">
              <img
                src={sortedPhotos[selectedIndex].url}
                alt={sortedPhotos[selectedIndex].legende || 'Photo'}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              
              {/* Navigation */}
              {selectedIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </Button>
              )}
              
              {selectedIndex < sortedPhotos.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40"
                  onClick={goToNext}
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </Button>
              )}

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-white/20 hover:bg-white/40"
                onClick={closeLightbox}
              >
                <X className="w-5 h-5 text-white" />
              </Button>

              {/* Caption */}
              {sortedPhotos[selectedIndex].legende && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-center">
                    {sortedPhotos[selectedIndex].legende}
                  </p>
                </div>
              )}

              {/* Counter */}
              <div className="absolute bottom-4 left-4">
                <Badge variant="secondary">
                  {selectedIndex + 1} / {sortedPhotos.length}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

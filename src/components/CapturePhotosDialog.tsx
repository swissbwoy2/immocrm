import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Camera, ImagePlus, X, Upload, GripVertical, Eye, EyeOff, Lock } from 'lucide-react';
import { useNativeCamera } from '@/hooks/useNativeCamera';

interface CapturedPhoto {
  id: string;
  file: File;
  preview: string;
  type: string;
  legende: string;
  niveau_confidentialite: 'public' | 'interne' | 'confidentiel';
}

const TYPES_PHOTO = [
  { value: 'facade', label: 'Façade' },
  { value: 'entree', label: 'Entrée' },
  { value: 'salon', label: 'Salon' },
  { value: 'cuisine', label: 'Cuisine' },
  { value: 'chambre_1', label: 'Chambre 1' },
  { value: 'chambre_2', label: 'Chambre 2' },
  { value: 'chambre_3', label: 'Chambre 3' },
  { value: 'salle_bain', label: 'Salle de bain' },
  { value: 'salle_eau', label: "Salle d'eau" },
  { value: 'wc', label: 'WC' },
  { value: 'balcon', label: 'Balcon' },
  { value: 'terrasse', label: 'Terrasse' },
  { value: 'jardin', label: 'Jardin' },
  { value: 'garage', label: 'Garage' },
  { value: 'parking', label: 'Parking' },
  { value: 'cave', label: 'Cave' },
  { value: 'vue', label: 'Vue' },
  { value: 'autre', label: 'Autre' },
];

const CONFIDENTIALITE_OPTIONS = [
  { value: 'public', label: 'Public', icon: Eye, description: 'Visible par les acheteurs' },
  { value: 'interne', label: 'Interne', icon: EyeOff, description: 'Agence uniquement' },
  { value: 'confidentiel', label: 'Confidentiel', icon: Lock, description: 'Propriétaire + agence' },
];

interface CapturePhotosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  immeubleId?: string;
  onPhotosReady: (photos: CapturedPhoto[]) => void;
  initialPhotos?: CapturedPhoto[];
}

export function CapturePhotosDialog({
  open,
  onOpenChange,
  immeubleId,
  onPhotosReady,
  initialPhotos = [],
}: CapturePhotosDialogProps) {
  const { user } = useAuth();
  const { takePhoto, pickFromGallery, isNative, loading: cameraLoading } = useNativeCamera();
  const [photos, setPhotos] = useState<CapturedPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTakePhoto = async () => {
    const file = await takePhoto();
    if (file) {
      addPhoto(file);
    }
  };

  const handlePickFromGallery = async () => {
    if (isNative) {
      const file = await pickFromGallery();
      if (file) {
        addPhoto(file);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast.error('Seules les images sont acceptées');
    }
    
    imageFiles.forEach(file => addPhoto(file));
    e.target.value = '';
  };

  const addPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newPhoto: CapturedPhoto = {
        id: crypto.randomUUID(),
        file,
        preview: reader.result as string,
        type: '',
        legende: '',
        niveau_confidentialite: 'public',
      };
      setPhotos(prev => [...prev, newPhoto]);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (selectedPhoto === id) {
      setSelectedPhoto(null);
    }
  };

  const updatePhoto = (id: string, updates: Partial<CapturedPhoto>) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleContinue = async () => {
    if (photos.length === 0) {
      toast.error('Ajoutez au moins une photo');
      return;
    }

    // If immeubleId is provided, upload immediately
    if (immeubleId) {
      setUploading(true);
      try {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const fileExt = photo.file.name.split('.').pop();
          const fileName = `${immeubleId}/${crypto.randomUUID()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('photos-immeubles')
            .upload(fileName, photo.file);

          if (uploadError) {
            // Try documents-immeuble as fallback
            const { error: altError } = await supabase.storage
              .from('documents-immeuble')
              .upload(`photos/${fileName}`, photo.file);
            
            if (altError) throw altError;
            
            const { data: { publicUrl } } = supabase.storage
              .from('documents-immeuble')
              .getPublicUrl(`photos/${fileName}`);

            await supabase.from('photos_immeuble').insert({
              immeuble_id: immeubleId,
              url: publicUrl,
              legende: photo.legende || null,
              type_photo: photo.type || null,
              niveau_confidentialite: photo.niveau_confidentialite,
              est_principale: i === 0,
              ordre: i,
              uploaded_by: user?.id,
            } as any);
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('photos-immeubles')
              .getPublicUrl(fileName);

            await supabase.from('photos_immeuble').insert({
              immeuble_id: immeubleId,
              url: publicUrl,
              legende: photo.legende || null,
              type_photo: photo.type || null,
              niveau_confidentialite: photo.niveau_confidentialite,
              est_principale: i === 0,
              ordre: i,
              uploaded_by: user?.id,
            } as any);
          }
        }

        toast.success(`${photos.length} photo(s) uploadée(s)`);
        onPhotosReady(photos);
        onOpenChange(false);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error("Erreur lors de l'upload");
      } finally {
        setUploading(false);
      }
    } else {
      // Just pass photos to parent (for use in AddBienVenteDialog)
      onPhotosReady(photos);
      onOpenChange(false);
    }
  };

  const selectedPhotoData = photos.find(p => p.id === selectedPhoto);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Capturer les photos du bien
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {isNative && (
              <Button
                type="button"
                variant="outline"
                onClick={handleTakePhoto}
                disabled={cameraLoading}
                className="flex-1 min-w-[140px]"
              >
                {cameraLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 mr-2" />
                )}
                Prendre photo
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handlePickFromGallery}
              disabled={cameraLoading}
              className="flex-1 min-w-[140px]"
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              {isNative ? 'Galerie' : 'Ajouter photos'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Photos grid */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedPhoto === photo.id
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                  onClick={() => setSelectedPhoto(photo.id)}
                >
                  <img
                    src={photo.preview}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(photo.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  {index === 0 && (
                    <Badge className="absolute bottom-1 left-1 text-xs">
                      Principale
                    </Badge>
                  )}
                  {photo.type && (
                    <Badge variant="secondary" className="absolute top-1 left-1 text-xs">
                      {TYPES_PHOTO.find(t => t.value === photo.type)?.label}
                    </Badge>
                  )}
                  <div className="absolute bottom-1 right-1">
                    {photo.niveau_confidentialite === 'public' && (
                      <Eye className="w-4 h-4 text-green-500" />
                    )}
                    {photo.niveau_confidentialite === 'interne' && (
                      <EyeOff className="w-4 h-4 text-orange-500" />
                    )}
                    {photo.niveau_confidentialite === 'confidentiel' && (
                      <Lock className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Prenez des photos ou sélectionnez-les depuis votre galerie
              </p>
            </div>
          )}

          {/* Photo details editor */}
          {selectedPhotoData && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h4 className="font-medium">Détails de la photo sélectionnée</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de pièce</Label>
                  <Select
                    value={selectedPhotoData.type}
                    onValueChange={(value) => updatePhoto(selectedPhotoData.id, { type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_PHOTO.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Confidentialité</Label>
                  <Select
                    value={selectedPhotoData.niveau_confidentialite}
                    onValueChange={(value: 'public' | 'interne' | 'confidentiel') => 
                      updatePhoto(selectedPhotoData.id, { niveau_confidentialite: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONFIDENTIALITE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="w-4 h-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Légende</Label>
                <Input
                  value={selectedPhotoData.legende}
                  onChange={(e) => updatePhoto(selectedPhotoData.id, { legende: e.target.value })}
                  placeholder="Description de la photo"
                />
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{photos.length} photo(s) capturée(s)</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                <Eye className="w-3 h-3" />
                {photos.filter(p => p.niveau_confidentialite === 'public').length} publiques
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleContinue} disabled={uploading || photos.length === 0}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {immeubleId ? 'Uploader les photos' : 'Continuer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

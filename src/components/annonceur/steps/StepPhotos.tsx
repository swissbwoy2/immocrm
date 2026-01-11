import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Image as ImageIcon, 
  Upload, 
  X, 
  Star,
  Camera,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNativeCamera } from '@/hooks/useNativeCamera';
import type { AnnonceFormData } from '@/pages/annonceur/NouvelleAnnonce';

interface StepPhotosProps {
  formData: AnnonceFormData;
  updateFormData: (updates: Partial<AnnonceFormData>) => void;
}

export function StepPhotos({ formData, updateFormData }: StepPhotosProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { takePhoto, pickFromGallery, isNative, loading: cameraLoading } = useNativeCamera();

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const maxFiles = 10 - formData.photos.length;
    if (files.length > maxFiles) {
      toast.error(`Vous ne pouvez ajouter que ${maxFiles} photo(s) supplémentaire(s)`);
      return;
    }

    setUploading(true);
    const newPhotos: Array<{ url: string; est_principale: boolean }> = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} n'est pas une image`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} est trop volumineux (max 5MB)`);
          continue;
        }

        // Upload to Supabase Storage with user ID for RLS compliance
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || 'anonymous';
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `annonces/${userId}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('public-files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Erreur lors de l'upload de ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('public-files')
          .getPublicUrl(filePath);

        newPhotos.push({
          url: publicUrl,
          est_principale: formData.photos.length === 0 && newPhotos.length === 0,
        });
      }

      if (newPhotos.length > 0) {
        updateFormData({ photos: [...formData.photos, ...newPhotos] });
        toast.success(`${newPhotos.length} photo(s) ajoutée(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  }, [formData.photos, updateFormData]);

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    // If removed photo was principal, make first one principal
    if (formData.photos[index].est_principale && newPhotos.length > 0) {
      newPhotos[0].est_principale = true;
    }
    updateFormData({ photos: newPhotos });
  };

  const setAsPrincipal = (index: number) => {
    const newPhotos = formData.photos.map((photo, i) => ({
      ...photo,
      est_principale: i === index,
    }));
    updateFormData({ photos: newPhotos });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  // Handle native camera/gallery photo
  const handleNativePhoto = async (fromCamera: boolean) => {
    if (formData.photos.length >= 10) {
      toast.error('Vous avez atteint le maximum de 10 photos');
      return;
    }

    try {
      const file = fromCamera ? await takePhoto() : await pickFromGallery();
      if (!file) return;

      setUploading(true);

      // Upload to Supabase Storage with user ID for RLS compliance
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'anonymous';
      const fileExt = file.name.split('.').pop() || 'jpeg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `annonces/${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-files')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erreur lors de l\'upload de la photo');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public-files')
        .getPublicUrl(filePath);

      const newPhoto = {
        url: publicUrl,
        est_principale: formData.photos.length === 0,
      };

      updateFormData({ photos: [...formData.photos, newPhoto] });
      toast.success('Photo ajoutée');
    } catch (error) {
      console.error('Native photo error:', error);
      toast.error('Erreur lors de la capture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <ImageIcon className="h-5 w-5" />
        <span>Photos du bien (max 10)</span>
      </div>

      {/* Native Camera Buttons (Mobile) */}
      {isNative && (
        <div className="flex gap-3 mb-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => handleNativePhoto(true)}
            disabled={uploading || cameraLoading || formData.photos.length >= 10}
          >
            <Camera className="h-4 w-4 mr-2" />
            Prendre une photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => handleNativePhoto(false)}
            disabled={uploading || cameraLoading || formData.photos.length >= 10}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Galerie
          </Button>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border",
          (uploading || cameraLoading) && "opacity-50 pointer-events-none"
        )}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="font-medium mb-2">
          {isNative ? 'Ou glissez-déposez vos photos ici' : 'Glissez-déposez vos photos ici'}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          ou cliquez pour sélectionner des fichiers
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
          id="photo-upload"
          disabled={uploading || formData.photos.length >= 10}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('photo-upload')?.click()}
          disabled={uploading || cameraLoading || formData.photos.length >= 10}
        >
          {uploading || cameraLoading ? 'Upload en cours...' : 'Sélectionner des photos'}
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Formats acceptés : JPG, PNG, WebP (max 5MB par image)
        </p>
      </div>

      {/* Photos Grid */}
      {formData.photos.length > 0 && (
        <div className="space-y-3">
          <Label>Photos ajoutées ({formData.photos.length}/10)</Label>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {formData.photos.map((photo, index) => (
              <div
                key={index}
                className={cn(
                  "relative group rounded-lg overflow-hidden border-2",
                  photo.est_principale ? "border-primary" : "border-border"
                )}
              >
                <img
                  src={photo.url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                
                {/* Principal badge */}
                {photo.est_principale && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Principale
                  </div>
                )}

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!photo.est_principale && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setAsPrincipal(index)}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Principale
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Conseils pour de bonnes photos</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
              <li>Prenez des photos en journée avec une bonne luminosité</li>
              <li>Montrez chaque pièce principale sous son meilleur angle</li>
              <li>Rangez et nettoyez avant de photographier</li>
              <li>La photo principale doit être la plus attractive</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

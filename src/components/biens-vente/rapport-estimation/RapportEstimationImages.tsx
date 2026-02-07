import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RAPPORT_IMAGE_KEYS, RapportImageKey } from './types';
import { Upload, X, Image, Loader2, Save } from 'lucide-react';

interface RapportEstimationImagesProps {
  immeubleId: string;
  images: Record<string, string> | null;
  onUpdate: () => void;
}

export function RapportEstimationImages({ immeubleId, images, onUpdate }: RapportEstimationImagesProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [localImages, setLocalImages] = useState<Record<string, string>>(
    (images as Record<string, string>) || {}
  );
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleUpload = async (key: RapportImageKey, file: File) => {
    setUploading(key);
    try {
      const ext = file.name.split('.').pop();
      const path = `rapport-estimation/${immeubleId}/${key}.${ext}`;

      // Remove old file if exists
      if (localImages[key]) {
        const oldPath = localImages[key].split('/documents_immeuble/')[1];
        if (oldPath) {
          await supabase.storage.from('documents_immeuble').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('documents_immeuble')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents_immeuble')
        .getPublicUrl(path);

      const newImages = { ...localImages, [key]: urlData.publicUrl };
      setLocalImages(newImages);

      // Save to DB
      const { error: dbError } = await supabase
        .from('immeubles')
        .update({ rapport_estimation_images: newImages })
        .eq('id', immeubleId);

      if (dbError) throw dbError;

      toast.success('Image uploadée');
      onUpdate();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (key: RapportImageKey) => {
    try {
      if (localImages[key]) {
        const oldPath = localImages[key].split('/documents_immeuble/')[1];
        if (oldPath) {
          await supabase.storage.from('documents_immeuble').remove([oldPath]);
        }
      }

      const newImages = { ...localImages };
      delete newImages[key];
      setLocalImages(newImages);

      await supabase
        .from('immeubles')
        .update({ rapport_estimation_images: Object.keys(newImages).length > 0 ? newImages : null })
        .eq('id', immeubleId);

      toast.success('Image supprimée');
      onUpdate();
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Group by section
  const sections = RAPPORT_IMAGE_KEYS.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof RAPPORT_IMAGE_KEYS[number][]>);

  return (
    <div className="space-y-6">
      {Object.entries(sections).map(([section, items]) => (
        <Card key={section}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4" />
              {section}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div key={item.key} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                  {localImages[item.key] ? (
                    <div className="relative group rounded-lg overflow-hidden border aspect-video">
                      <img
                        src={localImages[item.key]}
                        alt={item.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => fileInputRefs.current[item.key]?.click()}
                        >
                          Remplacer
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemove(item.key as RapportImageKey)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRefs.current[item.key]?.click()}
                      disabled={uploading === item.key}
                      className="w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary cursor-pointer disabled:cursor-not-allowed"
                    >
                      {uploading === item.key ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6" />
                          <span className="text-xs">Cliquer pour uploader</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={(el) => (fileInputRefs.current[item.key] = el)}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(item.key as RapportImageKey, file);
                      e.target.value = '';
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

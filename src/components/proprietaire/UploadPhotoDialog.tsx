import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Upload, Image, X } from 'lucide-react';

const formSchema = z.object({
  legende: z.string().max(200).optional(),
  type_photo: z.string().optional(),
  est_principale: z.boolean().default(false)
});

type FormValues = z.infer<typeof formSchema>;

interface UploadPhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  immeubleId: string;
  lotId?: string;
  onSuccess: () => void;
}

const TYPES_PHOTO = [
  { value: 'facade', label: 'Façade' },
  { value: 'salon', label: 'Salon' },
  { value: 'cuisine', label: 'Cuisine' },
  { value: 'chambre', label: 'Chambre' },
  { value: 'salle_bain', label: 'Salle de bain' },
  { value: 'exterieur', label: 'Extérieur / Jardin' },
  { value: 'vue', label: 'Vue' },
  { value: 'autre', label: 'Autre' }
];

export function UploadPhotoDialog({
  open,
  onOpenChange,
  immeubleId,
  lotId,
  onSuccess
}: UploadPhotoDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      legende: '',
      type_photo: '',
      est_principale: false
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast.error('Seules les images sont acceptées');
    }
    
    setSelectedFiles(prev => [...prev, ...imageFiles]);
    
    // Generate previews
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    if (selectedFiles.length === 0) {
      toast.error('Veuillez sélectionner au moins une photo');
      return;
    }

    setLoading(true);
    try {
      // Get current max order
      const { data: existingPhotos } = await supabase
        .from('photos_immeuble')
        .select('ordre')
        .eq('immeuble_id', immeubleId)
        .order('ordre', { ascending: false })
        .limit(1);

      let currentOrder = existingPhotos?.[0]?.ordre ?? -1;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${immeubleId}/${crypto.randomUUID()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('photos-immeubles')
          .upload(fileName, file);

        if (uploadError) {
          // Try creating the bucket if it doesn't exist
          if (uploadError.message.includes('bucket')) {
            // Bucket doesn't exist, try uploading to documents-immeuble instead
            const { error: altUploadError, data: altUploadData } = await supabase.storage
              .from('documents-immeuble')
              .upload(`photos/${fileName}`, file);
            
            if (altUploadError) throw altUploadError;
            
            const { data: { publicUrl } } = supabase.storage
              .from('documents-immeuble')
              .getPublicUrl(`photos/${fileName}`);

            currentOrder++;

            await supabase.from('photos_immeuble').insert({
              immeuble_id: immeubleId,
              lot_id: lotId || null,
              url: publicUrl,
              legende: i === 0 ? values.legende || null : null,
              type_photo: i === 0 ? values.type_photo || null : null,
              est_principale: i === 0 ? values.est_principale : false,
              ordre: currentOrder,
              uploaded_by: user?.id
            });
          } else {
            throw uploadError;
          }
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('photos-immeubles')
            .getPublicUrl(fileName);

          currentOrder++;

          const { error: insertError } = await supabase.from('photos_immeuble').insert({
            immeuble_id: immeubleId,
            lot_id: lotId || null,
            url: publicUrl,
            legende: i === 0 ? values.legende || null : null,
            type_photo: i === 0 ? values.type_photo || null : null,
            est_principale: i === 0 ? values.est_principale : false,
            ordre: currentOrder,
            uploaded_by: user?.id
          });

          if (insertError) throw insertError;
        }
      }

      toast.success(`${selectedFiles.length} photo(s) ajoutée(s)`);
      form.reset();
      setSelectedFiles([]);
      setPreviews([]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error("Erreur lors de l'upload des photos");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedFiles([]);
    setPreviews([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter des photos</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Upload zone */}
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Cliquez ou glissez-déposez vos photos ici
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP (max 10MB par image)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    {index === 0 && (
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                        Première
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Options for first photo */}
            {selectedFiles.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Options pour la première photo :
                </p>

                <FormField
                  control={form.control}
                  name="type_photo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de photo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TYPES_PHOTO.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legende"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Légende</FormLabel>
                      <FormControl>
                        <Input placeholder="Description de la photo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="est_principale"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-base">Photo principale</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Cette photo sera affichée en premier
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading || selectedFiles.length === 0}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Ajouter {selectedFiles.length > 0 && `(${selectedFiles.length})`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

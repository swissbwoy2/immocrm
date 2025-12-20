import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { FileText, Upload, X, File, Image } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  immeubleId?: string;
  onSuccess?: () => void;
}

interface FormData {
  immeuble_id: string;
  lot_id: string;
  locataire_id: string;
  nom: string;
  type_document: string;
  date_document: string;
  annee: string;
  description: string;
  est_confidentiel: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'bail', label: 'Bail' },
  { value: 'contrat', label: 'Contrat' },
  { value: 'registre_foncier', label: 'Registre foncier' },
  { value: 'plan', label: 'Plan' },
  { value: 'hypotheque', label: 'Hypothèque' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'decompte_charges', label: 'Décompte charges' },
  { value: 'facture', label: 'Facture' },
  { value: 'rapport_technique', label: 'Rapport technique' },
  { value: 'pv_assemblee', label: 'PV assemblée' },
  { value: 'correspondance', label: 'Correspondance' },
  { value: 'photo', label: 'Photo' },
  { value: 'autre', label: 'Autre' },
];

export function UploadDocumentDialog({
  open,
  onOpenChange,
  immeubleId,
  onSuccess,
}: UploadDocumentDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [locataires, setLocataires] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      immeuble_id: immeubleId || '',
      lot_id: '',
      locataire_id: '',
      nom: '',
      type_document: 'autre',
      date_document: '',
      annee: new Date().getFullYear().toString(),
      description: '',
      est_confidentiel: false,
    },
  });

  const selectedImmeubleId = watch('immeuble_id');
  const selectedLotId = watch('lot_id');

  // Load immeubles on mount
  useEffect(() => {
    const loadImmeubles = async () => {
      if (!user) return;

      const { data: proprio } = await supabase
        .from('proprietaires')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!proprio) return;

      const { data } = await supabase
        .from('immeubles')
        .select('id, nom')
        .eq('proprietaire_id', proprio.id)
        .order('nom');

      setImmeubles(data || []);
    };

    if (open) {
      loadImmeubles();
    }
  }, [open, user]);

  // Load lots when immeuble changes
  useEffect(() => {
    const loadLots = async () => {
      if (!selectedImmeubleId) {
        setLots([]);
        setLocataires([]);
        return;
      }

      const { data } = await supabase
        .from('lots')
        .select('id, reference, designation')
        .eq('immeuble_id', selectedImmeubleId)
        .order('reference');

      setLots(data || []);
    };

    loadLots();
  }, [selectedImmeubleId]);

  // Load locataires when lot changes
  useEffect(() => {
    const loadLocataires = async () => {
      if (!selectedLotId) {
        setLocataires([]);
        return;
      }

      const { data } = await supabase
        .from('locataires_immeuble')
        .select('id, nom, prenom')
        .eq('lot_id', selectedLotId)
        .order('nom');

      setLocataires(data || []);
    };

    loadLocataires();
  }, [selectedLotId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        immeuble_id: immeubleId || '',
        lot_id: '',
        locataire_id: '',
        nom: '',
        type_document: 'autre',
        date_document: '',
        annee: new Date().getFullYear().toString(),
        description: '',
        est_confidentiel: false,
      });
      setSelectedFile(null);
    }
  }, [open, immeubleId, reset]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!watch('nom')) {
        setValue('nom', file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [setValue, watch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!watch('nom')) {
        setValue('nom', file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    return <File className="w-8 h-8 text-primary" />;
  };

  const onSubmit = async (data: FormData) => {
    if (!user || !selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);
    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${data.immeuble_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('immeuble-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('immeuble-documents')
        .getPublicUrl(filePath);

      // Insert document record
      const { error: insertError } = await supabase
        .from('documents_immeuble')
        .insert({
          immeuble_id: data.immeuble_id,
          lot_id: data.lot_id || null,
          locataire_id: data.locataire_id || null,
          nom: data.nom || selectedFile.name,
          type_document: data.type_document,
          url: urlData.publicUrl,
          taille: selectedFile.size,
          mime_type: selectedFile.type,
          date_document: data.date_document || null,
          annee: data.annee ? parseInt(data.annee) : null,
          description: data.description || null,
          est_confidentiel: data.est_confidentiel,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success('Document ajouté avec succès');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Ajouter un document
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Drop zone */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${selectedFile ? 'bg-muted/50' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex items-center gap-4">
                {getFileIcon(selectedFile)}
                <div className="flex-1 text-left">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Glissez-déposez un fichier ici ou
                </p>
                <label className="cursor-pointer">
                  <span className="text-primary hover:underline">parcourir</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                  />
                </label>
              </>
            )}
          </div>

          {/* Immeuble */}
          <div className="space-y-2">
            <Label>Immeuble *</Label>
            <Select
              value={selectedImmeubleId}
              onValueChange={(v) => {
                setValue('immeuble_id', v);
                setValue('lot_id', '');
                setValue('locataire_id', '');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un immeuble" />
              </SelectTrigger>
              <SelectContent>
                {immeubles.map((imm) => (
                  <SelectItem key={imm.id} value={imm.id}>
                    {imm.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lot & Locataire */}
          {lots.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lot</Label>
                <Select
                  value={watch('lot_id')}
                  onValueChange={(v) => {
                    setValue('lot_id', v);
                    setValue('locataire_id', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Général</SelectItem>
                    {lots.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.reference || lot.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {locataires.length > 0 && (
                <div className="space-y-2">
                  <Label>Locataire</Label>
                  <Select
                    value={watch('locataire_id')}
                    onValueChange={(v) => setValue('locataire_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Locataire" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-</SelectItem>
                      {locataires.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.prenom} {loc.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Nom & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du document *</Label>
              <Input
                id="nom"
                placeholder="Nom du document"
                {...register('nom', { required: 'Le nom est obligatoire' })}
              />
              {errors.nom && (
                <p className="text-sm text-destructive">{errors.nom.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={watch('type_document')}
                onValueChange={(v) => setValue('type_document', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Année */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_document">Date du document</Label>
              <Input
                id="date_document"
                type="date"
                {...register('date_document')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="annee">Année</Label>
              <Input
                id="annee"
                type="number"
                min="1900"
                max="2100"
                {...register('annee')}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description du document..."
              rows={2}
              {...register('description')}
            />
          </div>

          {/* Confidentiel */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="confidentiel"
              checked={watch('est_confidentiel')}
              onCheckedChange={(checked) => setValue('est_confidentiel', checked as boolean)}
            />
            <Label htmlFor="confidentiel" className="text-sm font-normal cursor-pointer">
              Document confidentiel (accès restreint)
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedImmeubleId || !selectedFile}
            >
              {loading ? 'Upload en cours...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

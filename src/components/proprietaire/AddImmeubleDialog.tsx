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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, X, FileText } from 'lucide-react';
import { GoogleAddressAutocomplete, AddressComponents } from '@/components/GoogleAddressAutocomplete';

const formSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100),
  adresse: z.string().min(1, "L'adresse est requise").max(200),
  code_postal: z.string().max(10).optional(),
  ville: z.string().max(100).optional(),
  canton: z.string().max(50).optional(),
  type_bien: z.string().optional(),
  nb_unites: z.coerce.number().int().positive().optional().or(z.literal('')),
  nombre_pieces: z.coerce.number().positive().optional().or(z.literal('')),
  surface_totale: z.coerce.number().positive().optional().or(z.literal('')),
  annee_construction: z.coerce.number().int().min(1800).max(2100).optional().or(z.literal('')),
  valeur_estimee: z.coerce.number().positive().optional().or(z.literal('')),
  valeur_fiscale: z.coerce.number().positive().optional().or(z.literal('')),
  prix_vente_demande: z.coerce.number().positive().optional().or(z.literal('')),
  numero_parcelle: z.string().max(50).optional(),
  numero_feuillet: z.string().max(50).optional(),
  commune_rf: z.string().max(100).optional(),
  statut: z.string().optional(),
  mode_exploitation: z.string().optional(),
  notes: z.string().max(1000).optional()
});

type FormValues = z.infer<typeof formSchema>;

interface AddImmeubleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proprietaireId: string;
  onSuccess: () => void;
}

interface UploadedDocument {
  name: string;
  file: File;
}

const CANTONS = [
  'Genève', 'Vaud', 'Valais', 'Fribourg', 'Neuchâtel', 'Jura',
  'Berne', 'Zurich', 'Argovie', 'Bâle-Ville', 'Bâle-Campagne',
  'Lucerne', 'Soleure', 'Tessin', 'Autres'
];

const TYPES_BIEN = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison_individuelle', label: 'Maison individuelle' },
  { value: 'villa', label: 'Villa' },
  { value: 'maison_2_3_appartements', label: 'Maison de 2 à 3 appartements' },
  { value: 'immeuble_locatif', label: 'Immeuble locatif (4+ appartements)' },
  { value: 'immeuble_residentiel', label: 'Immeuble résidentiel' },
  { value: 'immeuble_commercial', label: 'Immeuble commercial' },
  { value: 'immeuble_mixte', label: 'Immeuble mixte' },
  { value: 'place_parc_interieur', label: 'Place de parc intérieur' },
  { value: 'place_parc_exterieur', label: 'Place de parc extérieur' },
  { value: 'garage_box', label: 'Garage / Box' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'local_commercial', label: 'Local commercial' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'depot', label: 'Dépôt / Entrepôt' }
];

const STATUTS = [
  { value: 'gere', label: 'Géré' },
  { value: 'en_location', label: 'En location' },
  { value: 'en_vente', label: 'En vente' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'habite_proprietaire', label: 'Habité par le propriétaire' },
  { value: 'en_travaux', label: 'En travaux' },
  { value: 'reserve', label: 'Réservé' }
];

const MODES_EXPLOITATION = [
  { value: 'location', label: 'Location' },
  { value: 'vente', label: 'Vente' },
  { value: 'les_deux', label: 'Location et Vente' }
];

export function AddImmeubleDialog({
  open,
  onOpenChange,
  proprietaireId,
  onSuccess
}: AddImmeubleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom: '',
      adresse: '',
      code_postal: '',
      ville: '',
      canton: '',
      type_bien: '',
      nb_unites: '',
      nombre_pieces: '',
      surface_totale: '',
      annee_construction: '',
      valeur_estimee: '',
      valeur_fiscale: '',
      prix_vente_demande: '',
      numero_parcelle: '',
      numero_feuillet: '',
      commune_rf: '',
      statut: 'gere',
      mode_exploitation: 'location',
      notes: ''
    }
  });

  const handleAddressChange = (address: AddressComponents) => {
    form.setValue('adresse', address.fullAddress);
    form.setValue('code_postal', address.postalCode);
    form.setValue('ville', address.city);
    if (address.canton) {
      // Map canton abbreviation to full name if needed
      const cantonMatch = CANTONS.find(c => 
        c.toLowerCase().includes(address.canton.toLowerCase()) ||
        address.canton.toLowerCase().includes(c.toLowerCase())
      );
      if (cantonMatch) {
        form.setValue('canton', cantonMatch);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newDocs: UploadedDocument[] = [];
      for (let i = 0; i < files.length; i++) {
        newDocs.push({ name: files[i].name, file: files[i] });
      }
      setDocuments([...documents, ...newDocs]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const uploadDocuments = async (immeubleId: string) => {
    const uploadedUrls: { name: string; url: string }[] = [];
    
    for (const doc of documents) {
      const fileExt = doc.file.name.split('.').pop();
      const fileName = `${immeubleId}/${Date.now()}_${doc.name}`;
      
      const { data, error } = await supabase.storage
        .from('documents_immeuble')
        .upload(fileName, doc.file);
      
      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('documents_immeuble')
          .getPublicUrl(fileName);
        
        uploadedUrls.push({
          name: doc.name,
          url: urlData.publicUrl
        });
      }
    }
    
    return uploadedUrls;
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { data: immeubleData, error } = await supabase.from('immeubles').insert({
        proprietaire_id: proprietaireId,
        nom: values.nom,
        adresse: values.adresse,
        code_postal: values.code_postal || null,
        ville: values.ville || null,
        canton: values.canton || null,
        type_bien: values.type_bien || null,
        nb_unites: values.nb_unites ? Number(values.nb_unites) : null,
        nombre_pieces: values.nombre_pieces ? Number(values.nombre_pieces) : null,
        surface_totale: values.surface_totale ? Number(values.surface_totale) : null,
        annee_construction: values.annee_construction ? Number(values.annee_construction) : null,
        valeur_estimee: values.valeur_estimee ? Number(values.valeur_estimee) : null,
        valeur_fiscale: values.valeur_fiscale ? Number(values.valeur_fiscale) : null,
        prix_vente_demande: values.prix_vente_demande ? Number(values.prix_vente_demande) : null,
        numero_parcelle: values.numero_parcelle || null,
        numero_feuillet: values.numero_feuillet || null,
        commune_rf: values.commune_rf || null,
        statut: values.statut || 'gere',
        mode_exploitation: values.mode_exploitation || 'location',
        notes: values.notes || null
      }).select('id').single();

      if (error) throw error;

      // Upload documents if any
      if (documents.length > 0 && immeubleData?.id) {
        const uploadedDocs = await uploadDocuments(immeubleData.id);
        
        // Save document references to database
        for (const doc of uploadedDocs) {
          await supabase.from('documents_immeuble').insert({
            immeuble_id: immeubleData.id,
            nom: doc.name,
            url: doc.url,
            type_document: 'document',
            confidentialite: 'interne'
          });
        }
      }

      toast.success('Immeuble ajouté avec succès');
      form.reset();
      setDocuments([]);
      onSuccess();
    } catch (error) {
      console.error('Error adding immeuble:', error);
      toast.error("Erreur lors de l'ajout de l'immeuble");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un bien</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informations principales */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Informations principales
              </h3>
              
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du bien *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Résidence du Lac" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type_bien"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de bien</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TYPES_BIEN.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="statut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUTS.map((statut) => (
                            <SelectItem key={statut.value} value={statut.value}>
                              {statut.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="mode_exploitation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode d'exploitation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MODES_EXPLOITATION.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Adresse */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Adresse
              </h3>

              <FormField
                control={form.control}
                name="adresse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse *</FormLabel>
                    <FormControl>
                      <GoogleAddressAutocomplete
                        value={field.value}
                        onChange={handleAddressChange}
                        onInputChange={(value) => form.setValue('adresse', value)}
                        placeholder="Commencez à taper l'adresse..."
                        restrictToSwitzerland
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="code_postal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code postal</FormLabel>
                      <FormControl>
                        <Input placeholder="1200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ville"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input placeholder="Genève" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="canton"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canton</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CANTONS.map((canton) => (
                            <SelectItem key={canton} value={canton}>
                              {canton}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Caractéristiques */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Caractéristiques
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="nb_unites"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre d'unités</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nombre_pieces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de pièces</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" placeholder="4.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="surface_totale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surface totale (m²)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="annee_construction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Année de construction</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1990" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Valeurs */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Valeurs
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valeur_estimee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valeur estimée (CHF)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1500000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valeur_fiscale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valeur fiscale (CHF)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1200000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Registre foncier */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Registre foncier
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="numero_parcelle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° de parcelle</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero_feuillet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° de feuillet cadastre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commune_rf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commune RF</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Genève-Plainpalais" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Documents
              </h3>

              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-dashed"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Joindre des documents (PDF, images, Word)
                </Button>

                {documents.length > 0 && (
                  <div className="space-y-2">
                    {documents.map((doc, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[200px]">{doc.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informations complémentaires..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Ajouter le bien
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

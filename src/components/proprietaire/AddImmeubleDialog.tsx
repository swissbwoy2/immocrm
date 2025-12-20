import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100),
  adresse: z.string().min(1, "L'adresse est requise").max(200),
  code_postal: z.string().max(10).optional(),
  ville: z.string().max(100).optional(),
  canton: z.string().max(50).optional(),
  type_bien: z.string().optional(),
  nb_unites: z.coerce.number().int().positive().optional().or(z.literal('')),
  surface_totale: z.coerce.number().positive().optional().or(z.literal('')),
  annee_construction: z.coerce.number().int().min(1800).max(2100).optional().or(z.literal('')),
  valeur_estimee: z.coerce.number().positive().optional().or(z.literal('')),
  valeur_fiscale: z.coerce.number().positive().optional().or(z.literal('')),
  numero_parcelle: z.string().max(50).optional(),
  commune_rf: z.string().max(100).optional(),
  statut: z.string().optional(),
  notes: z.string().max(1000).optional()
});

type FormValues = z.infer<typeof formSchema>;

interface AddImmeubleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proprietaireId: string;
  onSuccess: () => void;
}

const CANTONS = [
  'Genève', 'Vaud', 'Valais', 'Fribourg', 'Neuchâtel', 'Jura',
  'Berne', 'Zurich', 'Argovie', 'Bâle-Ville', 'Bâle-Campagne',
  'Lucerne', 'Soleure', 'Tessin', 'Autres'
];

const TYPES_BIEN = [
  { value: 'immeuble_residentiel', label: 'Immeuble résidentiel' },
  { value: 'immeuble_commercial', label: 'Immeuble commercial' },
  { value: 'immeuble_mixte', label: 'Immeuble mixte' },
  { value: 'maison_individuelle', label: 'Maison individuelle' },
  { value: 'villa', label: 'Villa' },
  { value: 'terrain', label: 'Terrain' }
];

const STATUTS = [
  { value: 'gere', label: 'Géré' },
  { value: 'en_location', label: 'En location' },
  { value: 'en_vente', label: 'En vente' },
  { value: 'vacant', label: 'Vacant' }
];

export function AddImmeubleDialog({
  open,
  onOpenChange,
  proprietaireId,
  onSuccess
}: AddImmeubleDialogProps) {
  const [loading, setLoading] = useState(false);

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
      surface_totale: '',
      annee_construction: '',
      valeur_estimee: '',
      valeur_fiscale: '',
      numero_parcelle: '',
      commune_rf: '',
      statut: 'gere',
      notes: ''
    }
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('immeubles').insert({
        proprietaire_id: proprietaireId,
        nom: values.nom,
        adresse: values.adresse,
        code_postal: values.code_postal || null,
        ville: values.ville || null,
        canton: values.canton || null,
        type_bien: values.type_bien || null,
        nb_unites: values.nb_unites ? Number(values.nb_unites) : null,
        surface_totale: values.surface_totale ? Number(values.surface_totale) : null,
        annee_construction: values.annee_construction ? Number(values.annee_construction) : null,
        valeur_estimee: values.valeur_estimee ? Number(values.valeur_estimee) : null,
        valeur_fiscale: values.valeur_fiscale ? Number(values.valeur_fiscale) : null,
        numero_parcelle: values.numero_parcelle || null,
        commune_rf: values.commune_rf || null,
        statut: values.statut || 'gere',
        notes: values.notes || null
      });

      if (error) throw error;

      toast.success('Immeuble ajouté avec succès');
      form.reset();
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
          <DialogTitle>Ajouter un immeuble</DialogTitle>
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
                    <FormLabel>Nom de l'immeuble *</FormLabel>
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
                      <Input placeholder="Rue et numéro" {...field} />
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

                <FormField
                  control={form.control}
                  name="annee_construction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Année construction</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1990" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numero_parcelle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de parcelle</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 1234" {...field} />
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
                Ajouter l'immeuble
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

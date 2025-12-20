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
  reference: z.string().min(1, 'La référence est requise').max(50),
  designation: z.string().max(100).optional(),
  type_lot: z.string().min(1, 'Le type est requis'),
  etage: z.string().max(20).optional(),
  nb_pieces: z.coerce.number().min(0.5).max(20).optional().or(z.literal('')),
  surface: z.coerce.number().positive().optional().or(z.literal('')),
  loyer_actuel: z.coerce.number().min(0).optional().or(z.literal('')),
  charges_actuelles: z.coerce.number().min(0).optional().or(z.literal('')),
  provisions_chauffage: z.coerce.number().min(0).optional().or(z.literal('')),
  notes: z.string().max(500).optional()
});

type FormValues = z.infer<typeof formSchema>;

interface AddLotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  immeubleId: string;
  onSuccess: () => void;
}

const TYPES_LOT = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'parking', label: 'Parking' },
  { value: 'garage', label: 'Garage' },
  { value: 'cave', label: 'Cave' },
  { value: 'depot', label: 'Dépôt' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'atelier', label: 'Atelier' },
  { value: 'autre', label: 'Autre' }
];

const ETAGES = [
  { value: 'ss2', label: 'Sous-sol -2' },
  { value: 'ss1', label: 'Sous-sol -1' },
  { value: 'rdc', label: 'Rez-de-chaussée' },
  { value: '1', label: '1er étage' },
  { value: '2', label: '2ème étage' },
  { value: '3', label: '3ème étage' },
  { value: '4', label: '4ème étage' },
  { value: '5', label: '5ème étage' },
  { value: '6', label: '6ème étage' },
  { value: 'attique', label: 'Attique' }
];

export function AddLotDialog({
  open,
  onOpenChange,
  immeubleId,
  onSuccess
}: AddLotDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reference: '',
      designation: '',
      type_lot: '',
      etage: '',
      nb_pieces: '',
      surface: '',
      loyer_actuel: '',
      charges_actuelles: '',
      provisions_chauffage: '',
      notes: ''
    }
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const loyer = values.loyer_actuel ? Number(values.loyer_actuel) : null;
      const charges = values.charges_actuelles ? Number(values.charges_actuelles) : null;
      const chauffage = values.provisions_chauffage ? Number(values.provisions_chauffage) : null;
      const totalMensuel = (loyer || 0) + (charges || 0) + (chauffage || 0);

      const { error } = await supabase.from('lots').insert({
        immeuble_id: immeubleId,
        reference: values.reference,
        designation: values.designation || null,
        type_lot: values.type_lot,
        etage: values.etage || null,
        nb_pieces: values.nb_pieces ? Number(values.nb_pieces) : null,
        surface: values.surface ? Number(values.surface) : null,
        loyer_actuel: loyer,
        charges_actuelles: charges,
        provisions_chauffage: chauffage,
        total_mensuel: totalMensuel > 0 ? totalMensuel : null,
        statut: 'vacant',
        notes: values.notes || null
      });

      if (error) throw error;

      toast.success('Lot ajouté avec succès');
      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error adding lot:', error);
      toast.error("Erreur lors de l'ajout du lot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un lot</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Identification */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Identification
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Référence *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: A101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type_lot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TYPES_LOT.map((type) => (
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
              </div>

              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Désignation</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Appartement 3 pièces côté lac" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Caractéristiques */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Caractéristiques
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="etage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Étage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ETAGES.map((etage) => (
                            <SelectItem key={etage.value} value={etage.value}>
                              {etage.label}
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
                  name="nb_pieces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pièces</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" placeholder="3.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="surface"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surface (m²)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="85" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Loyer et charges */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Loyer et charges
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="loyer_actuel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loyer (CHF)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="charges_actuelles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Charges (CHF)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provisions_chauffage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chauffage (CHF)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100" {...field} />
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
                      rows={2}
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
                Ajouter le lot
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

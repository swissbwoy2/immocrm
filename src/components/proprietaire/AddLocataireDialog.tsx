import { useState, useEffect } from 'react';
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
  civilite: z.string().optional(),
  prenom: z.string().max(50).optional(),
  nom: z.string().min(1, 'Le nom est requis').max(50),
  date_naissance: z.string().optional(),
  nationalite: z.string().max(50).optional(),
  email: z.string().email('Email invalide').max(100).optional().or(z.literal('')),
  telephone: z.string().max(20).optional(),
  telephone_urgence: z.string().max(20).optional(),
  profession: z.string().max(100).optional(),
  employeur: z.string().max(100).optional(),
  date_entree: z.string().min(1, "La date d'entrée est requise"),
  loyer: z.coerce.number().min(0).optional().or(z.literal('')),
  charges: z.coerce.number().min(0).optional().or(z.literal('')),
  garantie: z.coerce.number().min(0).optional().or(z.literal('')),
  type_garantie: z.string().optional(),
  notes: z.string().max(500).optional()
});

type FormValues = z.infer<typeof formSchema>;

interface AddLocataireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotId: string | null;
  onSuccess: () => void;
}

const CIVILITES = [
  { value: 'M.', label: 'M.' },
  { value: 'Mme', label: 'Mme' },
  { value: 'Autre', label: 'Autre' }
];

const TYPES_GARANTIE = [
  { value: 'bancaire', label: 'Garantie bancaire' },
  { value: 'depot', label: 'Dépôt de garantie' },
  { value: 'caution_solidaire', label: 'Caution solidaire' },
  { value: 'assurance', label: 'Assurance loyer' }
];

export function AddLocataireDialog({
  open,
  onOpenChange,
  lotId,
  onSuccess
}: AddLocataireDialogProps) {
  const [loading, setLoading] = useState(false);
  const [lotInfo, setLotInfo] = useState<{ reference: string; loyer_actuel: number | null; charges_actuelles: number | null } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      civilite: '',
      prenom: '',
      nom: '',
      date_naissance: '',
      nationalite: '',
      email: '',
      telephone: '',
      telephone_urgence: '',
      profession: '',
      employeur: '',
      date_entree: new Date().toISOString().split('T')[0],
      loyer: '',
      charges: '',
      garantie: '',
      type_garantie: '',
      notes: ''
    }
  });

  // Load lot info when dialog opens
  useEffect(() => {
    if (open && lotId) {
      loadLotInfo();
    }
  }, [open, lotId]);

  const loadLotInfo = async () => {
    if (!lotId) return;
    
    const { data } = await supabase
      .from('lots')
      .select('reference, loyer_actuel, charges_actuelles')
      .eq('id', lotId)
      .single();

    if (data) {
      setLotInfo(data);
      // Pre-fill loyer and charges from lot
      if (data.loyer_actuel) {
        form.setValue('loyer', data.loyer_actuel);
      }
      if (data.charges_actuelles) {
        form.setValue('charges', data.charges_actuelles);
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!lotId) {
      toast.error('Aucun lot sélectionné');
      return;
    }

    setLoading(true);
    try {
      const loyer = values.loyer ? Number(values.loyer) : null;
      const charges = values.charges ? Number(values.charges) : null;
      const totalMensuel = (loyer || 0) + (charges || 0);

      const { error } = await supabase.from('locataires_immeuble').insert({
        lot_id: lotId,
        civilite: values.civilite || null,
        prenom: values.prenom || null,
        nom: values.nom,
        date_naissance: values.date_naissance || null,
        nationalite: values.nationalite || null,
        email: values.email || null,
        telephone: values.telephone || null,
        telephone_urgence: values.telephone_urgence || null,
        profession: values.profession || null,
        employeur: values.employeur || null,
        date_entree: values.date_entree,
        loyer: loyer,
        charges: charges,
        total_mensuel: totalMensuel > 0 ? totalMensuel : null,
        garantie: values.garantie ? Number(values.garantie) : null,
        type_garantie: values.type_garantie || null,
        statut: 'actif',
        solde_locataire: 0,
        notes: values.notes || null
      });

      if (error) throw error;

      // Update lot status to occupied
      await supabase
        .from('lots')
        .update({ statut: 'occupe' })
        .eq('id', lotId);

      toast.success('Locataire ajouté avec succès');
      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error adding locataire:', error);
      toast.error("Erreur lors de l'ajout du locataire");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Ajouter un locataire
            {lotInfo && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - Lot {lotInfo.reference}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Identité */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Identité
              </h3>
              
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="civilite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Civilité</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CIVILITES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
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
                  name="prenom"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Nom *</FormLabel>
                      <FormControl>
                        <Input placeholder="Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date_naissance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de naissance</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationalite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nationalité</FormLabel>
                      <FormControl>
                        <Input placeholder="Suisse" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Contact
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="jean@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input placeholder="+41 79 123 45 67" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="telephone_urgence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone d'urgence</FormLabel>
                    <FormControl>
                      <Input placeholder="+41 79 987 65 43" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Profession */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Situation professionnelle
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profession</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingénieur" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employeur"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employeur</FormLabel>
                      <FormControl>
                        <Input placeholder="Entreprise SA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Bail */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Bail
              </h3>

              <FormField
                control={form.control}
                name="date_entree"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'entrée *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="loyer"
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
                  name="charges"
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
                  name="garantie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Garantie (CHF)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="4500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="type_garantie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de garantie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPES_GARANTIE.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                Ajouter le locataire
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

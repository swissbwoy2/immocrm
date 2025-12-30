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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  civilite: z.string().optional(),
  prenom: z.string().min(1, 'Le prénom est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  type_lien: z.string().min(1, 'Le type de lien est requis'),
  quote_part: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  regime_matrimonial: z.string().optional(),
  etat_civil: z.string().optional(),
  signature_requise: z.boolean().default(true)
});

type FormValues = z.infer<typeof formSchema>;

interface AddCoProprietaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  immeubleId: string;
  onSuccess: () => void;
}

const CIVILITES = ['M.', 'Mme', 'Dr', 'Me'];

const TYPES_LIEN = [
  { value: 'proprietaire_principal', label: 'Propriétaire principal' },
  { value: 'conjoint', label: 'Conjoint(e)' },
  { value: 'co_proprietaire', label: 'Co-propriétaire' },
  { value: 'associe', label: 'Associé(e)' },
  { value: 'heritier', label: 'Héritier(ère)' }
];

const REGIMES_MATRIMONIAUX = [
  { value: 'participation_acquets', label: 'Participation aux acquêts' },
  { value: 'separation_biens', label: 'Séparation de biens' },
  { value: 'communaute_biens', label: 'Communauté de biens' }
];

const ETATS_CIVILS = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)', 'Partenariat enregistré'];

export function AddCoProprietaireDialog({
  open,
  onOpenChange,
  immeubleId,
  onSuccess
}: AddCoProprietaireDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      civilite: '',
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      adresse: '',
      type_lien: '',
      quote_part: '',
      regime_matrimonial: '',
      etat_civil: '',
      signature_requise: true
    }
  });

  const typeLien = form.watch('type_lien');

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('co_proprietaires').insert({
        immeuble_id: immeubleId,
        civilite: values.civilite || null,
        prenom: values.prenom,
        nom: values.nom,
        email: values.email || null,
        telephone: values.telephone || null,
        adresse: values.adresse || null,
        type_lien: values.type_lien,
        quote_part: values.quote_part ? Number(values.quote_part) : null,
        regime_matrimonial: values.regime_matrimonial || null,
        etat_civil: values.etat_civil || null,
        signature_requise: values.signature_requise
      });

      if (error) throw error;

      toast.success('Co-propriétaire ajouté avec succès');
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding co-propriétaire:', error);
      toast.error("Erreur lors de l'ajout du co-propriétaire");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un co-propriétaire</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type de lien */}
            <FormField
              control={form.control}
              name="type_lien"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de lien *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TYPES_LIEN.map((type) => (
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

            {/* Identité */}
            <div className="grid grid-cols-3 gap-3">
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
                        {CIVILITES.map((civ) => (
                          <SelectItem key={civ} value={civ}>
                            {civ}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prenom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
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
                      <Input type="tel" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Quote-part */}
            <FormField
              control={form.control}
              name="quote_part"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quote-part (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      max={100} 
                      placeholder="Ex: 50" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Régime matrimonial (si conjoint) */}
            {typeLien === 'conjoint' && (
              <FormField
                control={form.control}
                name="regime_matrimonial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Régime matrimonial</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGIMES_MATRIMONIAUX.map((regime) => (
                          <SelectItem key={regime.value} value={regime.value}>
                            {regime.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            {/* État civil */}
            <FormField
              control={form.control}
              name="etat_civil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>État civil</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ETATS_CIVILS.map((etat) => (
                        <SelectItem key={etat} value={etat}>
                          {etat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Signature requise */}
            <FormField
              control={form.control}
              name="signature_requise"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-base">Signature requise pour la vente</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Cette personne doit signer pour la vente du bien
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
                Ajouter
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

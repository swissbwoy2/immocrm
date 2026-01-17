import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Phone, MapPin, Mail, Home, MapPinned, Ruler, Banknote, User, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoogleAddressAutocomplete, AddressComponents } from '@/components/GoogleAddressAutocomplete';

const formSchema = z.object({
  type_bien: z.string().min(1, 'Sélectionnez un type de bien'),
  localisation: z.string().min(2, 'Indiquez la localisation').max(100),
  surface: z.string().min(1, 'Indiquez la surface').max(20),
  prix_souhaite: z.string().min(1, 'Indiquez le prix souhaité').max(20),
  nom: z.string().min(2, 'Indiquez votre nom').max(100),
  email: z.string().email('Email invalide').max(255),
  telephone: z.string().min(10, 'Numéro invalide').max(20),
});

type FormData = z.infer<typeof formSchema>;

export function VendeurCTASection() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressComponents, setAddressComponents] = useState<AddressComponents | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const handleAddressChange = (components: AddressComponents | null) => {
    setAddressComponents(components);
    if (components) {
      setValue('localisation', components.fullAddress);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    // Redirect to complete form with pre-filled data
    navigate('/formulaire-vendeur', { 
      state: {
        type_bien: data.type_bien,
        adresse: data.localisation,
        npa: addressComponents?.postalCode || '',
        ville: addressComponents?.city || '',
        surface: data.surface,
        prix_souhaite: data.prix_souhaite,
        nom: data.nom,
        email: data.email,
        telephone: data.telephone
      }
    });
    
    setIsSubmitting(false);
  };

  return (
    <section id="formulaire-vendeur" className="py-24 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Découvrez combien d'acheteurs
                <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  correspondent à votre bien
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Remplissez ce formulaire en 30 secondes. Notre équipe analysera votre bien 
                et vous contactera sous 24h avec le nombre d'acheteurs potentiels.
              </p>

              {/* Trust badges */}
              <div className="space-y-4 mb-8">
                {[
                  '100% gratuit, sans engagement',
                  'Réponse sous 24h',
                  'Aucune annonce publique',
                  '0% de commission vendeur',
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Contact info */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <p className="font-semibold mb-4">Préférez-vous nous appeler ?</p>
                <div className="space-y-3">
                  <a 
                    href="tel:+41216342839" 
                    className="flex items-center gap-3 text-primary hover:underline"
                  >
                    <Phone className="w-5 h-5" />
                    021 634 28 39
                  </a>
                  <a 
                    href="mailto:info@immo-rama.ch" 
                    className="flex items-center gap-3 text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="w-5 h-5" />
                    info@immo-rama.ch
                  </a>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="w-5 h-5 flex-shrink-0" />
                    Chemin de l'Esparcette 5, 1023 Crissier
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Form */}
            <div className="relative">
              <div className="p-8 rounded-3xl bg-card border border-border/50 shadow-2xl shadow-primary/5">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold">Lancer le matching gratuit</h3>
                    <p className="text-muted-foreground">Résultats sous 24h</p>
                  </div>

                  {/* Type de bien */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      Type de bien
                    </Label>
                    <Select onValueChange={(value) => setValue('type_bien', value)}>
                      <SelectTrigger className={errors.type_bien ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Sélectionnez..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appartement">Appartement</SelectItem>
                        <SelectItem value="villa">Villa / Maison</SelectItem>
                        <SelectItem value="immeuble">Immeuble de rapport</SelectItem>
                        <SelectItem value="terrain">Terrain</SelectItem>
                        <SelectItem value="commercial">Local commercial</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.type_bien && <p className="text-sm text-red-500">{errors.type_bien.message}</p>}
                  </div>

                  {/* Localisation with Google Autocomplete */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPinned className="w-4 h-4 text-muted-foreground" />
                      Adresse du bien
                    </Label>
                    <GoogleAddressAutocomplete
                      value={watch('localisation') || ''}
                      onChange={handleAddressChange}
                      onInputChange={(val) => setValue('localisation', val)}
                      placeholder="Entrez l'adresse du bien"
                      className={errors.localisation ? 'border-red-500' : ''}
                      restrictToSwitzerland
                    />
                    {errors.localisation && <p className="text-sm text-red-500">{errors.localisation.message}</p>}
                  </div>

                  {/* Surface & Prix */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        Surface (m²)
                      </Label>
                      <Input 
                        {...register('surface')}
                        placeholder="Ex: 120"
                        className={errors.surface ? 'border-red-500' : ''}
                      />
                      {errors.surface && <p className="text-sm text-red-500">{errors.surface.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-muted-foreground" />
                        Prix souhaité (CHF)
                      </Label>
                      <Input 
                        {...register('prix_souhaite')}
                        placeholder="Ex: 800'000"
                        className={errors.prix_souhaite ? 'border-red-500' : ''}
                      />
                      {errors.prix_souhaite && <p className="text-sm text-red-500">{errors.prix_souhaite.message}</p>}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-card px-4 text-sm text-muted-foreground">Vos coordonnées</span>
                    </div>
                  </div>

                  {/* Nom */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Nom complet
                    </Label>
                    <Input 
                      {...register('nom')}
                      placeholder="Prénom Nom"
                      className={errors.nom ? 'border-red-500' : ''}
                    />
                    {errors.nom && <p className="text-sm text-red-500">{errors.nom.message}</p>}
                  </div>

                  {/* Email & Téléphone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Email
                      </Label>
                      <Input 
                        {...register('email')}
                        type="email"
                        placeholder="votre@email.ch"
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        Téléphone
                      </Label>
                      <Input 
                        {...register('telephone')}
                        type="tel"
                        placeholder="079 xxx xx xx"
                        className={errors.telephone ? 'border-red-500' : ''}
                      />
                      {errors.telephone && <p className="text-sm text-red-500">{errors.telephone.message}</p>}
                    </div>
                  </div>

                  {/* Submit */}
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Lancer le matching gratuit
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    En soumettant ce formulaire, vous acceptez d'être contacté par notre équipe. 
                    Aucune donnée n'est partagée avec des tiers.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

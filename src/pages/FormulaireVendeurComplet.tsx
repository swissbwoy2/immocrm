import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, Send, Home, MapPinned, Ruler, Banknote, User, 
  Mail, Phone, Loader2, CheckCircle, Building2, Calendar,
  Bed, Bath, Car, Trees, Sun, Mountain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FloatingNav } from '@/components/landing/FloatingNav';
import { VendeurFooter } from '@/components/landing/vendeur/VendeurFooter';
import { GoogleAddressAutocomplete, AddressComponents } from '@/components/GoogleAddressAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  // Infos bien (pré-remplies)
  type_bien: z.string().min(1, 'Sélectionnez un type de bien'),
  adresse: z.string().min(2, 'Indiquez l\'adresse'),
  npa: z.string().optional(),
  ville: z.string().optional(),
  surface: z.string().min(1, 'Indiquez la surface'),
  prix_souhaite: z.string().min(1, 'Indiquez le prix souhaité'),
  
  // Détails supplémentaires
  nombre_pieces: z.string().optional(),
  nombre_chambres: z.string().optional(),
  nombre_sdb: z.string().optional(),
  etage: z.string().optional(),
  annee_construction: z.string().optional(),
  
  // Équipements
  balcon: z.boolean().optional(),
  terrasse: z.boolean().optional(),
  jardin: z.boolean().optional(),
  garage: z.boolean().optional(),
  parking: z.boolean().optional(),
  cave: z.boolean().optional(),
  ascenseur: z.boolean().optional(),
  vue_degagee: z.boolean().optional(),
  
  // Motivations
  delai_vente: z.string().optional(),
  motif_vente: z.string().optional(),
  description: z.string().optional(),
  
  // Coordonnées (pré-remplies)
  nom: z.string().min(2, 'Indiquez votre nom'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(10, 'Numéro invalide'),
});

type FormData = z.infer<typeof formSchema>;

interface LocationState {
  type_bien?: string;
  adresse?: string;
  npa?: string;
  ville?: string;
  surface?: string;
  prix_souhaite?: string;
  nom?: string;
  email?: string;
  telephone?: string;
}

export default function FormulaireVendeurComplet() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const prefilledData = (location.state as LocationState) || {};
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type_bien: prefilledData.type_bien || '',
      adresse: prefilledData.adresse || '',
      npa: prefilledData.npa || '',
      ville: prefilledData.ville || '',
      surface: prefilledData.surface || '',
      prix_souhaite: prefilledData.prix_souhaite || '',
      nom: prefilledData.nom || '',
      email: prefilledData.email || '',
      telephone: prefilledData.telephone || '',
      balcon: false,
      terrasse: false,
      jardin: false,
      garage: false,
      parking: false,
      cave: false,
      ascenseur: false,
      vue_degagee: false,
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleAddressChange = (components: AddressComponents | null) => {
    if (components) {
      setValue('adresse', components.fullAddress);
      setValue('npa', components.postalCode || '');
      setValue('ville', components.city || '');
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Build equipment list
      const equipements = [];
      if (data.balcon) equipements.push('Balcon');
      if (data.terrasse) equipements.push('Terrasse');
      if (data.jardin) equipements.push('Jardin');
      if (data.garage) equipements.push('Garage');
      if (data.parking) equipements.push('Parking');
      if (data.cave) equipements.push('Cave');
      if (data.ascenseur) equipements.push('Ascenseur');
      if (data.vue_degagee) equipements.push('Vue dégagée');

      // Build detailed notes
      const notes = [
        `Type: ${data.type_bien}`,
        `Surface: ${data.surface}m²`,
        `Prix souhaité: ${data.prix_souhaite} CHF`,
        data.nombre_pieces ? `Pièces: ${data.nombre_pieces}` : null,
        data.nombre_chambres ? `Chambres: ${data.nombre_chambres}` : null,
        data.nombre_sdb ? `Salles de bain: ${data.nombre_sdb}` : null,
        data.etage ? `Étage: ${data.etage}` : null,
        data.annee_construction ? `Année: ${data.annee_construction}` : null,
        equipements.length > 0 ? `Équipements: ${equipements.join(', ')}` : null,
        data.delai_vente ? `Délai souhaité: ${data.delai_vente}` : null,
        data.motif_vente ? `Motif: ${data.motif_vente}` : null,
        data.description ? `Description: ${data.description}` : null,
      ].filter(Boolean).join(' | ');

      const { error } = await supabase.from('leads').insert({
        email: data.email,
        prenom: data.nom.split(' ')[0] || data.nom,
        nom: data.nom.split(' ').slice(1).join(' ') || '',
        telephone: data.telephone,
        localite: data.ville || data.adresse,
        budget: data.prix_souhaite,
        source: 'formulaire_vendeur_complet',
        notes: notes,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success('Votre bien a été soumis avec succès !');
      
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const equipmentItems = [
    { key: 'balcon', label: 'Balcon', icon: Sun },
    { key: 'terrasse', label: 'Terrasse', icon: Sun },
    { key: 'jardin', label: 'Jardin', icon: Trees },
    { key: 'garage', label: 'Garage', icon: Car },
    { key: 'parking', label: 'Parking', icon: Car },
    { key: 'cave', label: 'Cave', icon: Building2 },
    { key: 'ascenseur', label: 'Ascenseur', icon: Building2 },
    { key: 'vue_degagee', label: 'Vue dégagée', icon: Mountain },
  ];

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <FloatingNav />
        <main className="pt-32 pb-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-6">
                Votre bien a été soumis !
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Notre équipe analyse votre bien et vous contactera sous 24h 
                avec le nombre d'acheteurs potentiels correspondants à votre profil.
              </p>
              <div className="space-y-4">
                <Button onClick={() => navigate('/vendre-mon-bien')} size="lg">
                  Retour à la page vendeur
                </Button>
              </div>
            </div>
          </div>
        </main>
        <VendeurFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      
      <main className="pt-28 pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Back button */}
            <Button 
              variant="ghost" 
              className="mb-6"
              onClick={() => navigate('/vendre-mon-bien')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>

            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Complétez les informations de votre bien
              </h1>
              <p className="text-lg text-muted-foreground">
                Plus vous nous donnez de détails, plus notre matching sera précis.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
              {/* Section 1: Infos de base (pré-remplies) */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Home className="w-5 h-5 text-primary" />
                  Informations principales
                </h2>
                
                <div className="space-y-4">
                  {/* Type de bien */}
                  <div className="space-y-2">
                    <Label>Type de bien *</Label>
                    <Select 
                      value={watch('type_bien')} 
                      onValueChange={(value) => setValue('type_bien', value)}
                    >
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
                  </div>

                  {/* Adresse */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPinned className="w-4 h-4 text-muted-foreground" />
                      Adresse du bien *
                    </Label>
                    <GoogleAddressAutocomplete
                      value={watch('adresse')}
                      onChange={handleAddressChange}
                      onInputChange={(val) => setValue('adresse', val)}
                      placeholder="Entrez l'adresse complète"
                      className={errors.adresse ? 'border-red-500' : ''}
                      restrictToSwitzerland
                    />
                    {errors.adresse && <p className="text-sm text-red-500">{errors.adresse.message}</p>}
                  </div>

                  {/* NPA / Ville (auto-filled) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>NPA</Label>
                      <Input {...register('npa')} placeholder="Auto" readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Ville</Label>
                      <Input {...register('ville')} placeholder="Auto" readOnly className="bg-muted/50" />
                    </div>
                  </div>

                  {/* Surface & Prix */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        Surface (m²) *
                      </Label>
                      <Input 
                        {...register('surface')}
                        placeholder="Ex: 120"
                        className={errors.surface ? 'border-red-500' : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-muted-foreground" />
                        Prix souhaité (CHF) *
                      </Label>
                      <Input 
                        {...register('prix_souhaite')}
                        placeholder="Ex: 800'000"
                        className={errors.prix_souhaite ? 'border-red-500' : ''}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Détails */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Détails du bien
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      Nombre de pièces
                    </Label>
                    <Input {...register('nombre_pieces')} placeholder="Ex: 4.5" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Bed className="w-4 h-4 text-muted-foreground" />
                      Chambres
                    </Label>
                    <Input {...register('nombre_chambres')} placeholder="Ex: 3" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Bath className="w-4 h-4 text-muted-foreground" />
                      Salles de bain
                    </Label>
                    <Input {...register('nombre_sdb')} placeholder="Ex: 2" />
                  </div>
                  <div className="space-y-2">
                    <Label>Étage</Label>
                    <Input {...register('etage')} placeholder="Ex: 3ème" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Année construction
                    </Label>
                    <Input {...register('annee_construction')} placeholder="Ex: 2010" />
                  </div>
                </div>
              </div>

              {/* Section 3: Équipements */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="text-xl font-semibold mb-6">Équipements</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {equipmentItems.map((item) => (
                    <div key={item.key} className="flex items-center space-x-3">
                      <Checkbox
                        id={item.key}
                        checked={watch(item.key as keyof FormData) as boolean}
                        onCheckedChange={(checked) => 
                          setValue(item.key as keyof FormData, checked as boolean)
                        }
                      />
                      <Label htmlFor={item.key} className="flex items-center gap-2 cursor-pointer">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Motivations */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="text-xl font-semibold mb-6">Vos motivations</h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Délai de vente souhaité</Label>
                      <Select onValueChange={(value) => setValue('delai_vente', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">Urgent (- de 3 mois)</SelectItem>
                          <SelectItem value="3-6mois">3 à 6 mois</SelectItem>
                          <SelectItem value="6-12mois">6 à 12 mois</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Motif de vente</Label>
                      <Select onValueChange={(value) => setValue('motif_vente', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="demenagement">Déménagement</SelectItem>
                          <SelectItem value="succession">Succession</SelectItem>
                          <SelectItem value="investissement">Réinvestissement</SelectItem>
                          <SelectItem value="changement">Changement de vie</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description libre (optionnel)</Label>
                    <Textarea 
                      {...register('description')}
                      placeholder="Points forts de votre bien, travaux récents, particularités..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Coordonnées */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Vos coordonnées
                </h2>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom complet *</Label>
                    <Input 
                      {...register('nom')}
                      placeholder="Prénom Nom"
                      className={errors.nom ? 'border-red-500' : ''}
                    />
                    {errors.nom && <p className="text-sm text-red-500">{errors.nom.message}</p>}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Email *
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
                        Téléphone *
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
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Soumettre mon bien
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
      </main>

      <VendeurFooter />
    </div>
  );
}

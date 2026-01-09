import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Home, 
  MapPin, 
  Ruler, 
  Banknote, 
  Zap, 
  Calendar,
  Check,
  X,
  Image as ImageIcon
} from 'lucide-react';
import type { AnnonceFormData } from '@/pages/annonceur/NouvelleAnnonce';

interface StepRecapitulatifProps {
  formData: AnnonceFormData;
  updateFormData: (updates: Partial<AnnonceFormData>) => void;
}

export function StepRecapitulatif({ formData }: StepRecapitulatifProps) {
  const isLocation = formData.type_transaction === 'location';

  const BooleanBadge = ({ value, label }: { value: boolean; label: string }) => (
    <Badge variant={value ? 'default' : 'outline'} className="gap-1">
      {value ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Récapitulatif de votre annonce</h3>
        <p className="text-muted-foreground">Vérifiez les informations avant de soumettre</p>
      </div>

      {/* Photo principale */}
      {formData.photos.length > 0 && (
        <div className="relative rounded-lg overflow-hidden">
          <img
            src={formData.photos.find(p => p.est_principale)?.url || formData.photos[0]?.url}
            alt="Photo principale"
            className="w-full h-48 object-cover"
          />
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="gap-1">
              <ImageIcon className="h-3 w-3" />
              {formData.photos.length} photo(s)
            </Badge>
          </div>
        </div>
      )}

      {/* Titre et type */}
      <div>
        <Badge className="mb-2">
          {isLocation ? 'Location' : 'Vente'} • {formData.sous_type}
        </Badge>
        <h2 className="text-xl font-bold">{formData.titre || 'Sans titre'}</h2>
        {formData.description_courte && (
          <p className="text-muted-foreground mt-1">{formData.description_courte}</p>
        )}
      </div>

      <Separator />

      {/* Localisation */}
      <div className="flex items-start gap-3">
        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <p className="font-medium">Localisation</p>
          <p className="text-muted-foreground">
            {formData.adresse}, {formData.code_postal} {formData.ville}
            {formData.canton && `, ${formData.canton}`}
          </p>
        </div>
      </div>

      {/* Caractéristiques */}
      <div className="flex items-start gap-3">
        <Ruler className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <p className="font-medium">Caractéristiques</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {formData.surface_habitable && (
              <Badge variant="outline">{formData.surface_habitable} m²</Badge>
            )}
            {formData.nombre_pieces && (
              <Badge variant="outline">{formData.nombre_pieces} pièces</Badge>
            )}
            {formData.nb_chambres && (
              <Badge variant="outline">{formData.nb_chambres} chambres</Badge>
            )}
            {formData.etage !== null && formData.etage !== undefined && (
              <Badge variant="outline">Étage {formData.etage}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Prix */}
      <div className="flex items-start gap-3">
        <Banknote className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <p className="font-medium">Prix</p>
          <p className="text-2xl font-bold text-primary">
            {formData.prix?.toLocaleString('fr-CH')} CHF
            {isLocation && '/mois'}
          </p>
          {isLocation && formData.charges_mensuelles && !formData.charges_comprises && (
            <p className="text-sm text-muted-foreground">
              + {formData.charges_mensuelles.toLocaleString('fr-CH')} CHF de charges
            </p>
          )}
        </div>
      </div>

      {/* Énergie */}
      {formData.classe_energetique && (
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">Énergie</p>
            <Badge className="bg-green-600">{formData.classe_energetique}</Badge>
            {formData.type_chauffage && (
              <span className="text-muted-foreground ml-2">{formData.type_chauffage}</span>
            )}
          </div>
        </div>
      )}

      {/* Équipements */}
      <div className="flex items-start gap-3">
        <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <p className="font-medium mb-2">Équipements</p>
          <div className="flex flex-wrap gap-2">
            <BooleanBadge value={formData.balcon} label="Balcon" />
            <BooleanBadge value={formData.terrasse} label="Terrasse" />
            <BooleanBadge value={formData.jardin} label="Jardin" />
            <BooleanBadge value={formData.parking_inclus} label="Parking" />
            <BooleanBadge value={formData.acces_pmr} label="PMR" />
          </div>
        </div>
      </div>

      {/* Disponibilité */}
      <div className="flex items-start gap-3">
        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <p className="font-medium">Disponibilité</p>
          <p className="text-muted-foreground">
            {formData.disponible_immediatement 
              ? 'Disponible immédiatement' 
              : `À partir du ${formData.disponible_des}`}
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            <BooleanBadge value={formData.animaux_autorises} label="Animaux" />
            <BooleanBadge value={formData.fumeurs_acceptes} label="Fumeurs" />
          </div>
        </div>
      </div>

      {/* Contact */}
      <Separator />
      <div>
        <p className="font-medium mb-2">Contact</p>
        <p>{formData.nom_contact}</p>
        <p className="text-muted-foreground">{formData.email_contact}</p>
        {formData.telephone_contact && (
          <p className="text-muted-foreground">{formData.telephone_contact}</p>
        )}
      </div>

      {/* Warning */}
      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          ⚠️ Après soumission, votre annonce sera examinée par notre équipe de modération 
          avant publication. Ce processus prend généralement moins de 24 heures.
        </p>
      </div>
    </div>
  );
}

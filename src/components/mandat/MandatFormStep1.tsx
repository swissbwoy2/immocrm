import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MandatFormData, NATIONALITES, TYPES_PERMIS, ETATS_CIVILS } from './types';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep1({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Informations personnelles</h2>
        <p className="text-sm text-muted-foreground">Vos coordonnées et situation personnelle</p>
      </div>

      {/* Type de recherche */}
      <div className="space-y-3">
        <Label>Type de recherche *</Label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onChange({ type_recherche: 'Louer' })}
            className={`p-4 rounded-lg border-2 transition-all text-center ${
              data.type_recherche === 'Louer'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="text-2xl mb-2 block">🏠</span>
            <span className="font-medium">Louer</span>
            <p className="text-xs text-muted-foreground mt-1">Un logement à louer</p>
          </button>
          <button
            type="button"
            onClick={() => onChange({ type_recherche: 'Acheter' })}
            className={`p-4 rounded-lg border-2 transition-all text-center ${
              data.type_recherche === 'Acheter'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="text-2xl mb-2 block">🔑</span>
            <span className="font-medium">Acheter</span>
            <p className="text-xs text-muted-foreground mt-1">Un bien immobilier</p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="votre.email@example.ch"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telephone">Téléphone *</Label>
          <Input
            id="telephone"
            type="tel"
            value={data.telephone}
            onChange={(e) => onChange({ telephone: e.target.value })}
            placeholder="+41 79 123 45 67"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prenom">Prénom *</Label>
          <Input
            id="prenom"
            value={data.prenom}
            onChange={(e) => onChange({ prenom: e.target.value })}
            placeholder="Prénom"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nom">Nom de famille *</Label>
          <Input
            id="nom"
            value={data.nom}
            onChange={(e) => onChange({ nom: e.target.value })}
            placeholder="Nom"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="adresse">Adresse actuelle *</Label>
          <Input
            id="adresse"
            value={data.adresse}
            onChange={(e) => onChange({ adresse: e.target.value })}
            placeholder="Rue, numéro, code postal, ville"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_naissance">Date de naissance *</Label>
          <Input
            id="date_naissance"
            type="date"
            value={data.date_naissance}
            onChange={(e) => onChange({ date_naissance: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nationalite">Nationalité *</Label>
          <Select value={data.nationalite} onValueChange={(value) => onChange({ nationalite: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {NATIONALITES.map((nat) => (
                <SelectItem key={nat} value={nat}>{nat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type_permis">Type de permis de séjour *</Label>
          <Select value={data.type_permis} onValueChange={(value) => onChange({ type_permis: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {TYPES_PERMIS.map((permis) => (
                <SelectItem key={permis.value} value={permis.value}>{permis.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="etat_civil">État civil *</Label>
          <Select value={data.etat_civil} onValueChange={(value) => onChange({ etat_civil: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {ETATS_CIVILS.map((etat) => (
                <SelectItem key={etat} value={etat}>{etat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MandatFormData, NATIONALITES, TYPES_PERMIS, ETATS_CIVILS } from './types';
import { User, Mail, Phone, MapPin, Calendar, Globe, Shield, Heart } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep1({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4 relative">
          <User className="h-8 w-8 text-primary" />
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-75" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Informations personnelles
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Vos coordonnées et situation personnelle</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email */}
        <div className="space-y-2 group">
          <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4 text-primary/70" />
            E-mail <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="votre.email@example.ch"
            required
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
          />
        </div>

        {/* Téléphone */}
        <div className="space-y-2 group">
          <Label htmlFor="telephone" className="flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4 text-primary/70" />
            Téléphone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="telephone"
            type="tel"
            value={data.telephone}
            onChange={(e) => onChange({ telephone: e.target.value })}
            placeholder="+41 79 123 45 67"
            required
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
          />
        </div>

        {/* Prénom */}
        <div className="space-y-2 group">
          <Label htmlFor="prenom" className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4 text-primary/70" />
            Prénom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="prenom"
            value={data.prenom}
            onChange={(e) => onChange({ prenom: e.target.value })}
            placeholder="Prénom"
            required
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
          />
        </div>

        {/* Nom */}
        <div className="space-y-2 group">
          <Label htmlFor="nom" className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4 text-primary/70" />
            Nom de famille <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nom"
            value={data.nom}
            onChange={(e) => onChange({ nom: e.target.value })}
            placeholder="Nom"
            required
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
          />
        </div>

        {/* Adresse - Full width */}
        <div className="space-y-2 md:col-span-2 group">
          <Label htmlFor="adresse" className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary/70" />
            Adresse actuelle <span className="text-destructive">*</span>
          </Label>
          <Input
            id="adresse"
            value={data.adresse}
            onChange={(e) => onChange({ adresse: e.target.value })}
            placeholder="Rue, numéro, code postal, ville"
            required
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
          />
        </div>

        {/* Date de naissance */}
        <div className="space-y-2 group">
          <Label htmlFor="date_naissance" className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-primary/70" />
            Date de naissance <span className="text-destructive">*</span>
          </Label>
          <Input
            id="date_naissance"
            type="date"
            value={data.date_naissance}
            onChange={(e) => onChange({ date_naissance: e.target.value })}
            required
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
          />
        </div>

        {/* Nationalité */}
        <div className="space-y-2 group">
          <Label htmlFor="nationalite" className="flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4 text-primary/70" />
            Nationalité <span className="text-destructive">*</span>
          </Label>
          <Select value={data.nationalite} onValueChange={(value) => onChange({ nationalite: value })}>
            <SelectTrigger className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-popover/95">
              {NATIONALITES.map((nat) => (
                <SelectItem key={nat} value={nat} className="cursor-pointer hover:bg-primary/10">{nat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type de permis */}
        <div className="space-y-2 group">
          <Label htmlFor="type_permis" className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-primary/70" />
            Type de permis de séjour <span className="text-destructive">*</span>
          </Label>
          <Select value={data.type_permis} onValueChange={(value) => onChange({ type_permis: value })}>
            <SelectTrigger className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-popover/95">
              {TYPES_PERMIS.map((permis) => (
                <SelectItem key={permis.value} value={permis.value} className="cursor-pointer hover:bg-primary/10">{permis.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* État civil */}
        <div className="space-y-2 group">
          <Label htmlFor="etat_civil" className="flex items-center gap-2 text-sm font-medium">
            <Heart className="h-4 w-4 text-primary/70" />
            État civil <span className="text-destructive">*</span>
          </Label>
          <Select value={data.etat_civil} onValueChange={(value) => onChange({ etat_civil: value })}>
            <SelectTrigger className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-popover/95">
              {ETATS_CIVILS.map((etat) => (
                <SelectItem key={etat} value={etat} className="cursor-pointer hover:bg-primary/10">{etat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

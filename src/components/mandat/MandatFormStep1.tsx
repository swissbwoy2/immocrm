import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MandatFormData, NATIONALITES, TYPES_PERMIS, ETATS_CIVILS } from './types';
import { User, Mail, Phone, MapPin, Calendar, Globe, Shield, Heart } from 'lucide-react';
import { GoogleAddressAutocomplete, AddressComponents } from '@/components/GoogleAddressAutocomplete';

// Constantes pour les sélecteurs de date
const MONTHS = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

// Années de 2010 à 1920 (ordre décroissant)
const YEARS = Array.from({ length: 91 }, (_, i) => String(2010 - i));

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep1({ data, onChange }: Props) {
  // Parser la date existante
  const dateParts = useMemo(() => {
    if (data.date_naissance && data.date_naissance.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = data.date_naissance.split('-');
      return { day, month, year };
    }
    return { day: '', month: '', year: '' };
  }, [data.date_naissance]);

  // Calculer les jours disponibles selon le mois/année
  const getDaysInMonth = (month: string, year: string) => {
    if (!month) return 31;
    const m = parseInt(month, 10);
    const y = year ? parseInt(year, 10) : 2000;
    if ([4, 6, 9, 11].includes(m)) return 30;
    if (m === 2) {
      const isLeapYear = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
      return isLeapYear ? 29 : 28;
    }
    return 31;
  };

  const daysInMonth = getDaysInMonth(dateParts.month, dateParts.year);
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));

  const handleDatePartChange = (part: 'day' | 'month' | 'year', value: string) => {
    let newDay = part === 'day' ? value : dateParts.day;
    const newMonth = part === 'month' ? value : dateParts.month;
    const newYear = part === 'year' ? value : dateParts.year;

    // Ajuster le jour si nécessaire
    if (newDay && newMonth) {
      const maxDays = getDaysInMonth(newMonth, newYear);
      if (parseInt(newDay, 10) > maxDays) {
        newDay = String(maxDays).padStart(2, '0');
      }
    }

    // Construire la date si toutes les parties sont remplies
    if (newDay && newMonth && newYear) {
      onChange({ date_naissance: `${newYear}-${newMonth}-${newDay}` });
    } else {
      // Stocker partiellement pour garder la sélection
      const partialDate = `${newYear || '0000'}-${newMonth || '00'}-${newDay || '00'}`;
      onChange({ date_naissance: partialDate });
    }
  };
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

        {/* Adresse - Full width with autocomplete */}
        <div className="space-y-2 md:col-span-2 group">
          <Label htmlFor="adresse" className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary/70" />
            Adresse actuelle <span className="text-muted-foreground text-xs">(optionnel)</span>
          </Label>
          <GoogleAddressAutocomplete
            value={data.adresse}
            onChange={(address: AddressComponents) => onChange({ adresse: address.fullAddress })}
            onInputChange={(value) => onChange({ adresse: value })}
            placeholder="Commencez à taper votre adresse..."
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
          />
        </div>

        {/* Date de naissance - 3 sélecteurs */}
        <div className="space-y-2 group md:col-span-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-primary/70" />
            Date de naissance <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {/* Jour */}
            <Select value={dateParts.day} onValueChange={(v) => handleDatePartChange('day', v)}>
              <SelectTrigger className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                <SelectValue placeholder="Jour" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-popover/95 max-h-[200px]">
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d} className="cursor-pointer hover:bg-primary/10">{parseInt(d, 10)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mois */}
            <Select value={dateParts.month} onValueChange={(v) => handleDatePartChange('month', v)}>
              <SelectTrigger className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-popover/95 max-h-[200px]">
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="cursor-pointer hover:bg-primary/10">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Année */}
            <Select value={dateParts.year} onValueChange={(v) => handleDatePartChange('year', v)}>
              <SelectTrigger className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-popover/95 max-h-[200px]">
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y} className="cursor-pointer hover:bg-primary/10">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Nationalité */}
        <div className="space-y-2 group">
          <Label htmlFor="nationalite" className="flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4 text-primary/70" />
            Nationalité <span className="text-muted-foreground text-xs">(optionnel)</span>
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
            État civil <span className="text-muted-foreground text-xs">(optionnel)</span>
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

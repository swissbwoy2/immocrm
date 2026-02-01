import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { MandatFormData, TYPES_EXPLOITATION } from './types';
import { Building, Building2, Briefcase, Wallet, Calendar, Hash, Users2 } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function CommercialFieldsStep3({ data, onChange }: Props) {
  const isPersonnel = data.location_type === 'personnel';
  const isSociete = data.location_type === 'societe';

  return (
    <div className="space-y-6">
      {/* Location type selection */}
      <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Building className="h-4 w-4 text-primary" />
            Louez-vous en nom propre ou au nom d'une société ? <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            value={data.location_type || ''}
            onValueChange={(value) => onChange({ location_type: value as 'personnel' | 'societe' })}
            className="grid grid-cols-2 gap-4 mt-3"
          >
            <Label
              htmlFor="loc-personnel"
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isPersonnel ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
              }`}
            >
              <RadioGroupItem value="personnel" id="loc-personnel" className="sr-only" />
              <Briefcase className={`h-8 w-8 ${isPersonnel ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`font-medium text-center ${isPersonnel ? 'text-primary' : ''}`}>En nom propre</span>
              <span className="text-xs text-muted-foreground text-center">Personne physique</span>
            </Label>
            <Label
              htmlFor="loc-societe"
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSociete ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
              }`}
            >
              <RadioGroupItem value="societe" id="loc-societe" className="sr-only" />
              <Building2 className={`h-8 w-8 ${isSociete ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`font-medium text-center ${isSociete ? 'text-primary' : ''}`}>Au nom d'une société</span>
              <span className="text-xs text-muted-foreground text-center">Personne morale</span>
            </Label>
          </RadioGroup>
        </div>
      </Card>

      {/* Personal fields - shown when "En nom propre" */}
      {isPersonnel && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div className="space-y-2 group">
            <Label htmlFor="profession" className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4 text-primary/70" />
              Profession <span className="text-destructive">*</span>
            </Label>
            <Input
              id="profession"
              value={data.profession}
              onChange={(e) => onChange({ profession: e.target.value })}
              placeholder="Votre profession"
              required
              className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
            />
          </div>

          <div className="space-y-2 group">
            <Label htmlFor="employeur" className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-primary/70" />
              Employeur <span className="text-destructive">*</span>
            </Label>
            <Input
              id="employeur"
              value={data.employeur}
              onChange={(e) => onChange({ employeur: e.target.value })}
              placeholder="Nom de l'entreprise"
              required
              className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
            />
          </div>

          <div className="space-y-2 group">
            <Label htmlFor="revenus_mensuels" className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-4 w-4 text-primary/70" />
              Revenu mensuel net (CHF) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="revenus_mensuels"
                type="number"
                value={data.revenus_mensuels || ''}
                onChange={(e) => onChange({ revenus_mensuels: Number(e.target.value) })}
                placeholder="Ex: 5000"
                required
                className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                CHF
              </span>
            </div>
          </div>

          <div className="space-y-2 group">
            <Label htmlFor="date_engagement" className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-primary/70" />
              Date d'engagement au poste
            </Label>
            <Input
              id="date_engagement"
              type="date"
              value={data.date_engagement}
              onChange={(e) => onChange({ date_engagement: e.target.value })}
              className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
            />
          </div>
        </div>
      )}

      {/* Company fields - shown when "Au nom d'une société" */}
      {isSociete && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div className="space-y-2 group md:col-span-2">
            <Label htmlFor="raison_sociale" className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-primary/70" />
              Raison sociale <span className="text-destructive">*</span>
            </Label>
            <Input
              id="raison_sociale"
              value={data.raison_sociale}
              onChange={(e) => onChange({ raison_sociale: e.target.value })}
              placeholder="Nom de l'entreprise"
              required
              className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
            />
          </div>

          <div className="space-y-2 group">
            <Label htmlFor="numero_ide" className="flex items-center gap-2 text-sm font-medium">
              <Hash className="h-4 w-4 text-primary/70" />
              Numéro IDE <span className="text-destructive">*</span>
            </Label>
            <Input
              id="numero_ide"
              value={data.numero_ide}
              onChange={(e) => onChange({ numero_ide: e.target.value })}
              placeholder="CHE-xxx.xxx.xxx"
              required
              className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
            />
            <p className="text-xs text-muted-foreground">
              Numéro d'identification des entreprises (format: CHE-xxx.xxx.xxx)
            </p>
          </div>

          <div className="space-y-2 group">
            <Label htmlFor="chiffre_affaires" className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-4 w-4 text-primary/70" />
              Chiffre d'affaires annuel (CHF) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="chiffre_affaires"
                type="number"
                value={data.chiffre_affaires || ''}
                onChange={(e) => onChange({ chiffre_affaires: Number(e.target.value) })}
                placeholder="Ex: 500000"
                required
                className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                CHF
              </span>
            </div>
          </div>

          <div className="space-y-2 group">
            <Label htmlFor="type_exploitation" className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4 text-primary/70" />
              Type d'exploitation <span className="text-destructive">*</span>
            </Label>
            <Select value={data.type_exploitation} onValueChange={(value) => onChange({ type_exploitation: value })}>
              <SelectTrigger className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                <SelectValue placeholder="Sélectionnez" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-popover/95">
                {TYPES_EXPLOITATION.map((type) => (
                  <SelectItem key={type} value={type} className="cursor-pointer hover:bg-primary/10">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 group">
            <Label htmlFor="nombre_employes" className="flex items-center gap-2 text-sm font-medium">
              <Users2 className="h-4 w-4 text-primary/70" />
              Nombre d'employés
            </Label>
            <Input
              id="nombre_employes"
              type="number"
              value={data.nombre_employes || ''}
              onChange={(e) => onChange({ nombre_employes: Number(e.target.value) })}
              placeholder="Ex: 5"
              className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

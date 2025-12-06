import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { MandatFormData, UTILISATIONS_LOGEMENT } from './types';
import { Briefcase, Building2, Wallet, Calendar, Home, AlertTriangle, Scale, CreditCard } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep3({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4 relative">
          <Briefcase className="h-8 w-8 text-primary" />
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-75" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Situation financière et professionnelle
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Vos revenus et informations professionnelles</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profession */}
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

        {/* Employeur */}
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

        {/* Revenus mensuels */}
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

        {/* Date d'engagement */}
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

        {/* Utilisation du logement */}
        <div className="space-y-2 group md:col-span-2">
          <Label htmlFor="utilisation_logement" className="flex items-center gap-2 text-sm font-medium">
            <Home className="h-4 w-4 text-primary/70" />
            Utilisation du logement à titre <span className="text-destructive">*</span>
          </Label>
          <Select value={data.utilisation_logement} onValueChange={(value) => onChange({ utilisation_logement: value })}>
            <SelectTrigger className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-popover/95">
              {UTILISATIONS_LOGEMENT.map((util) => (
                <SelectItem key={util} value={util} className="cursor-pointer hover:bg-primary/10">{util}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Questions financières */}
      <div className="space-y-4 pt-6 border-t border-border/50">
        {/* Charges extraordinaires */}
        <Card className={`p-4 backdrop-blur-sm transition-all duration-300 ${
          data.charges_extraordinaires 
            ? 'bg-orange-500/10 border-orange-500/30' 
            : 'bg-background/50 border-border/50'
        }`}>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className={`h-4 w-4 ${data.charges_extraordinaires ? 'text-orange-500' : 'text-primary/70'}`} />
              Avez-vous des charges extraordinaires ? <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">Leasing, crédit, pension alimentaire, etc.</p>
            <RadioGroup
              value={data.charges_extraordinaires ? 'oui' : 'non'}
              onValueChange={(value) => onChange({ charges_extraordinaires: value === 'oui' })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oui" id="charges-oui" className="border-2" />
                <Label htmlFor="charges-oui" className="font-normal cursor-pointer">Oui</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non" id="charges-non" className="border-2" />
                <Label htmlFor="charges-non" className="font-normal cursor-pointer">Non</Label>
              </div>
            </RadioGroup>
          </div>

          {data.charges_extraordinaires && (
            <div className="mt-4 pl-4 border-l-2 border-orange-500/50 animate-fade-in">
              <Label htmlFor="montant_charges_extra" className="text-sm font-medium">
                Montant des charges / échéance (CHF)
              </Label>
              <div className="relative mt-2">
                <Input
                  id="montant_charges_extra"
                  type="number"
                  value={data.montant_charges_extra || ''}
                  onChange={(e) => onChange({ montant_charges_extra: Number(e.target.value) })}
                  placeholder="Ex: 500"
                  className="transition-all duration-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-background/50 backdrop-blur-sm pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  CHF
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Poursuites */}
        <Card className={`p-4 backdrop-blur-sm transition-all duration-300 ${
          data.poursuites 
            ? 'bg-destructive/10 border-destructive/30 shadow-lg shadow-destructive/10' 
            : 'bg-background/50 border-border/50'
        }`}>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className={`h-4 w-4 ${data.poursuites ? 'text-destructive animate-pulse' : 'text-primary/70'}`} />
              Avez-vous des poursuites ou actes de défaut de biens ? <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={data.poursuites ? 'oui' : 'non'}
              onValueChange={(value) => onChange({ poursuites: value === 'oui' })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oui" id="poursuites-oui" className="border-2" />
                <Label htmlFor="poursuites-oui" className="font-normal cursor-pointer">Oui</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non" id="poursuites-non" className="border-2" />
                <Label htmlFor="poursuites-non" className="font-normal cursor-pointer">Non</Label>
              </div>
            </RadioGroup>
          </div>
        </Card>

        {/* Curatelle */}
        <Card className={`p-4 backdrop-blur-sm transition-all duration-300 ${
          data.curatelle 
            ? 'bg-destructive/10 border-destructive/30' 
            : 'bg-background/50 border-border/50'
        }`}>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Scale className={`h-4 w-4 ${data.curatelle ? 'text-destructive' : 'text-primary/70'}`} />
              Êtes-vous sous curatelle ? <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={data.curatelle ? 'oui' : 'non'}
              onValueChange={(value) => onChange({ curatelle: value === 'oui' })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oui" id="curatelle-oui" className="border-2" />
                <Label htmlFor="curatelle-oui" className="font-normal cursor-pointer">Oui</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non" id="curatelle-non" className="border-2" />
                <Label htmlFor="curatelle-non" className="font-normal cursor-pointer">Non</Label>
              </div>
            </RadioGroup>
          </div>
        </Card>
      </div>
    </div>
  );
}

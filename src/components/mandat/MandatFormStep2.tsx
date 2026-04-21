import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MandatFormData } from './types';
import { Home, Building, Phone, Wallet, Calendar, Grid, MessageSquare } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep2({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4 relative">
          <Home className="h-8 w-8 text-primary" />
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-75" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold font-serif bg-gradient-to-r from-[hsl(38_55%_70%)] via-[hsl(38_55%_60%)] to-[hsl(38_45%_48%)] bg-clip-text text-transparent">
          Situation actuelle
        </h2>
        <p className="text-sm text-foreground/70 mt-1">Informations sur votre logement actuel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gérance actuelle */}
        <div className="space-y-2 group">
          <Label htmlFor="gerance_actuelle" className="flex items-center gap-2 text-sm font-medium text-foreground/90">
            <Building className="h-4 w-4 text-[hsl(38_55%_60%)]" />
            Gérance ou propriétaire actuel(le) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="gerance_actuelle"
            value={data.gerance_actuelle}
            onChange={(e) => onChange({ gerance_actuelle: e.target.value })}
            placeholder="Nom de la gérance ou du propriétaire"
            required
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/80 backdrop-blur-sm border-[hsl(38_45%_48%/0.3)] focus:border-[hsl(38_55%_60%)] text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Contact gérance */}
        <div className="space-y-2 group">
          <Label htmlFor="contact_gerance" className="flex items-center gap-2 text-sm font-medium text-foreground/90">
            <Phone className="h-4 w-4 text-[hsl(38_55%_60%)]" />
            Contact gérance <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact_gerance"
            value={data.contact_gerance}
            onChange={(e) => onChange({ contact_gerance: e.target.value })}
            placeholder="Téléphone ou email"
            required
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/80 backdrop-blur-sm border-[hsl(38_45%_48%/0.3)] focus:border-[hsl(38_55%_60%)] text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Loyer actuel */}
        <div className="space-y-2 group">
          <Label htmlFor="loyer_actuel" className="flex items-center gap-2 text-sm font-medium text-foreground/90">
            <Wallet className="h-4 w-4 text-[hsl(38_55%_60%)]" />
            Loyer brut actuel (CHF) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="loyer_actuel"
              type="number"
              value={data.loyer_actuel || ''}
              onChange={(e) => onChange({ loyer_actuel: Number(e.target.value) })}
              placeholder="Ex: 1500"
              required
              className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/80 backdrop-blur-sm border-[hsl(38_45%_48%/0.3)] focus:border-[hsl(38_55%_60%)] text-foreground placeholder:text-muted-foreground/60 pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              CHF
            </span>
          </div>
        </div>

        {/* Depuis le */}
        <div className="space-y-2 group">
          <Label htmlFor="depuis_le" className="flex items-center gap-2 text-sm font-medium text-foreground/90">
            <Calendar className="h-4 w-4 text-[hsl(38_55%_60%)]" />
            Depuis le <span className="text-destructive">*</span>
          </Label>
          <Input
            id="depuis_le"
            type="date"
            value={data.depuis_le}
            onChange={(e) => onChange({ depuis_le: e.target.value })}
            required
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/80 backdrop-blur-sm border-[hsl(38_45%_48%/0.3)] focus:border-[hsl(38_55%_60%)] text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Nombre de pièces */}
        <div className="space-y-2 group">
          <Label htmlFor="pieces_actuel" className="flex items-center gap-2 text-sm font-medium text-foreground/90">
            <Grid className="h-4 w-4 text-[hsl(38_55%_60%)]" />
            Nombre de pièces actuel <span className="text-destructive">*</span>
          </Label>
          <Input
            id="pieces_actuel"
            type="number"
            step="0.5"
            value={data.pieces_actuel || ''}
            onChange={(e) => onChange({ pieces_actuel: Number(e.target.value) })}
            placeholder="Ex: 3.5"
            required
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/80 backdrop-blur-sm border-[hsl(38_45%_48%/0.3)] focus:border-[hsl(38_55%_60%)] text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Motif du changement - Full width */}
        <div className="space-y-2 md:col-span-2 group">
          <Label htmlFor="motif_changement" className="flex items-center gap-2 text-sm font-medium text-foreground/90">
            <MessageSquare className="h-4 w-4 text-[hsl(38_55%_60%)]" />
            Motif du changement de domicile <span className="text-destructive">*</span>
          </Label>
          <Input
            id="motif_changement"
            value={data.motif_changement}
            onChange={(e) => onChange({ motif_changement: e.target.value })}
            placeholder="Ex: Agrandissement de la famille, rapprochement travail..."
            required
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/80 backdrop-blur-sm border-[hsl(38_45%_48%/0.3)] focus:border-[hsl(38_55%_60%)] text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      </div>
    </div>
  );
}
